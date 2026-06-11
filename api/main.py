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

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel
from supabase import Client, create_client

from extraction import extract_report
from schemas import ExtractionResult

load_dotenv()

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


class ExtractRequest(BaseModel):
    report_id: str


class ExtractResponse(BaseModel):
    report_id: str
    status: str
    observation_count: int


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
