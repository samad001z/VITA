"""VITA extraction API.

POST /extract  — authenticated; reads a report file from Supabase storage,
runs Gemini extraction validated by Pydantic, writes observations and a
timeline event, and updates report status.

Auth model: the mobile app sends the user's Supabase JWT. We verify it by
asking Supabase Auth for the user. All writes use the service-role client but
are explicitly scoped to the verified user's id — the API can never write
one user's data under another user's account.
"""

import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from supabase import Client, create_client

from chat import answer_question, build_context
from extraction import extract_report
from schemas import ExtractionResult

load_dotenv()

# Allow GOOGLE_APPLICATION_CREDENTIALS to be relative to this directory.
_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if _creds and not os.path.isabs(_creds):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), _creds
    )

logger = logging.getLogger("vita.api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="VITA extraction API", docs_url=None, redoc_url=None)

_MIME_BY_EXT = {
    "pdf": "application/pdf",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "heic": "image/heic",
}


def _service_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])


def _verify_user(authorization: str | None = Header(default=None)) -> str:
    """Validate the caller's Supabase JWT and return their user id."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        user_response = _service_client().auth.get_user(token)
    except Exception as exc:  # invalid/expired token
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    if user_response is None or user_response.user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_response.user.id


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


class Citation(BaseModel):
    report_id: str
    title: str
    occurred_at: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]


class ExtractRequest(BaseModel):
    report_id: str


class ExtractResponse(BaseModel):
    report_id: str
    status: str
    observation_count: int


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, user_id: str = Depends(_verify_user)) -> ChatResponse:
    db = _service_client()

    # 1. Load the user's timeline and observations as grounding context.
    events = (
        db.table("timeline_events")
        .select("report_id, title, summary, occurred_at")
        .eq("user_id", user_id)
        .order("occurred_at", desc=True)
        .limit(40)
        .execute()
    ).data
    observations = (
        db.table("extracted_observations")
        .select("report_id, test_name, value, unit, reference_range, observed_at, flagged")
        .eq("user_id", user_id)
        .limit(600)
        .execute()
    ).data

    by_report: dict[str, list[dict]] = {}
    for obs in observations:
        by_report.setdefault(obs["report_id"], []).append(obs)
    context = build_context(events, by_report)

    # 2. Grounded Gemini turn, Pydantic-validated.
    try:
        result = answer_question([m.model_dump() for m in body.messages], context)
    except Exception as exc:
        logger.exception("Chat failed for user %s", user_id)
        raise HTTPException(status_code=502, detail="Chat failed") from exc

    # 3. Only cite reports that really belong to this user's timeline.
    event_by_report = {e["report_id"]: e for e in events if e["report_id"] is not None}
    citations = [
        Citation(
            report_id=rid,
            title=event_by_report[rid]["title"],
            occurred_at=event_by_report[rid]["occurred_at"],
        )
        for rid in dict.fromkeys(result.citation_report_ids)
        if rid in event_by_report
    ]

    return ChatResponse(answer=result.answer, citations=citations)


@app.post("/extract", response_model=ExtractResponse)
def extract(body: ExtractRequest, user_id: str = Depends(_verify_user)) -> ExtractResponse:
    db = _service_client()

    # 1. Load the report and confirm ownership.
    report_rows = (
        db.table("reports").select("*").eq("id", body.report_id).eq("user_id", user_id).execute()
    )
    if not report_rows.data:
        raise HTTPException(status_code=404, detail="Report not found")
    report = report_rows.data[0]

    db.table("reports").update({"status": "processing", "error_message": None}).eq(
        "id", body.report_id
    ).execute()

    try:
        # 2. Download the file from the private bucket.
        file_bytes = db.storage.from_("reports").download(report["file_path"])
        ext = report["file_path"].rsplit(".", 1)[-1].lower()
        mime = _MIME_BY_EXT.get(ext, "application/pdf")

        # 3. Gemini extraction, Pydantic-validated.
        result: ExtractionResult = extract_report(file_bytes, mime)

        # 4. Replace any previous observations for this report (retry-safe).
        db.table("extracted_observations").delete().eq("report_id", body.report_id).eq(
            "user_id", user_id
        ).execute()

        rows = [
            {
                "report_id": body.report_id,
                "user_id": user_id,
                "test_name": obs.test_name,
                "value": obs.value,
                "value_numeric": obs.numeric_value(),
                "unit": obs.unit,
                "reference_range": obs.reference_range,
                "observed_at": (obs.date or result.report_date).isoformat()
                if (obs.date or result.report_date)
                else None,
                "category": obs.category,
                "flagged": obs.flagged,
            }
            for obs in result.observations
        ]
        if rows:
            db.table("extracted_observations").insert(rows).execute()

        # 5. Upsert the timeline event for this report.
        event_date = result.report_date or report.get("report_date")
        db.table("timeline_events").delete().eq("report_id", body.report_id).eq(
            "user_id", user_id
        ).execute()
        db.table("timeline_events").insert(
            {
                "user_id": user_id,
                "report_id": body.report_id,
                "event_type": "report",
                "title": result.report_title,
                "summary": result.summary,
                "occurred_at": (
                    event_date.isoformat() if hasattr(event_date, "isoformat") else event_date
                )
                or report["created_at"][:10],
            }
        ).execute()

        # 6. Mark processed.
        db.table("reports").update(
            {
                "status": "processed",
                "title": result.report_title,
                "report_date": result.report_date.isoformat() if result.report_date else None,
            }
        ).eq("id", body.report_id).execute()

        return ExtractResponse(
            report_id=body.report_id,
            status="processed",
            observation_count=len(rows),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Extraction failed for report %s", body.report_id)
        db.table("reports").update(
            {"status": "failed", "error_message": str(exc)[:500]}
        ).eq("id", body.report_id).execute()
        raise HTTPException(status_code=502, detail="Extraction failed") from exc
