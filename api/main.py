"""VITA extraction API.

POST /extract  — authenticated; reads a report file from Supabase storage,
runs Gemini extraction validated by Pydantic, writes observations and a
timeline event, and updates report status.

Auth model: the mobile app sends the user's Supabase JWT. We verify it by
asking Supabase Auth for the user. All writes use the service-role client but
are explicitly scoped to the verified user's id — the API can never write
one user's data under another user's account.
"""

import datetime as dt
import hashlib
import json
import logging
import os
import secrets
import tempfile
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, TypeAdapter, ValidationError
from supabase import Client, create_client

from chat import answer_question, answer_voice, build_context
from extraction import extract_report
from schemas import ExtractionResult

load_dotenv()

# Allow GOOGLE_APPLICATION_CREDENTIALS to be relative to this directory.
_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if _creds and not os.path.isabs(_creds):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), _creds
    )

# Serverless hosts have no credentials file on disk — the service-account
# JSON arrives in GOOGLE_SA_JSON and is materialized into the temp dir so
# google-auth can read a file path as usual.
_sa_json = os.environ.get("GOOGLE_SA_JSON")
if _sa_json and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    _sa_path = os.path.join(tempfile.gettempdir(), "sa-vertex.json")
    with open(_sa_path, "w", encoding="utf-8") as _fh:
        _fh.write(_sa_json)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _sa_path

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
    # User's UI language; the model answers in it (en/te/hi, default en).
    language: Literal["en", "te", "hi"] = "en"


class Citation(BaseModel):
    report_id: str
    title: str
    occurred_at: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]


class VoiceChatResponse(ChatResponse):
    transcript: str


class ShareCreateResponse(BaseModel):
    share_url: str
    expires_at: str


class ShareRedeemRequest(BaseModel):
    token: str = Field(min_length=20, max_length=100)


class SharedObservationOut(BaseModel):
    test_name: str
    value: str
    unit: str | None
    reference_range: str | None
    flagged: bool
    observed_at: str | None


class SharedReportOut(BaseModel):
    title: str
    occurred_at: str
    summary: str | None
    observations: list[SharedObservationOut]


class ShareSnapshot(BaseModel):
    patient_name: str | None
    generated_at: str
    reports: list[SharedReportOut]


class ExtractRequest(BaseModel):
    report_id: str


class ExtractResponse(BaseModel):
    report_id: str
    status: str
    observation_count: int


@app.get("/health")
def health() -> dict[str, object]:
    # Presence booleans only — never values. Lets a fresh deployment be
    # checked for wiring without leaking configuration.
    return {
        "status": "ok",
        "config": {
            "supabase": bool(os.environ.get("SUPABASE_URL"))
            and bool(os.environ.get("SUPABASE_SECRET_KEY")),
            "vertex": bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
            and bool(os.environ.get("GOOGLE_CLOUD_PROJECT")),
        },
    }


def _load_grounding(db: Client, user_id: str) -> tuple[list[dict], str]:
    """Load the user's timeline + observations and render the grounding
    context. Returns (events, context). select("*") keeps this working
    whether or not the Phase 8 migration (metric column) has been applied."""
    events = (
        db.table("timeline_events")
        .select("*")
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
    try:
        rollups = (
            db.table("metric_daily_rollups")
            .select("metric, day, value, unit")
            .eq("user_id", user_id)
            .order("day", desc=True)
            .limit(220)
            .execute()
        ).data
    except Exception:  # table absent until the Phase 7 migration is pushed
        rollups = []

    by_report: dict[str, list[dict]] = {}
    for obs in observations:
        by_report.setdefault(obs["report_id"], []).append(obs)
    return events, build_context(events, by_report, rollups)


def _validated_citations(events: list[dict], citation_report_ids: list[str]) -> list[Citation]:
    """Only cite reports that really belong to this user's timeline."""
    event_by_report = {e["report_id"]: e for e in events if e["report_id"] is not None}
    return [
        Citation(
            report_id=rid,
            title=event_by_report[rid]["title"],
            occurred_at=event_by_report[rid]["occurred_at"],
        )
        for rid in dict.fromkeys(citation_report_ids)
        if rid in event_by_report
    ]


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, user_id: str = Depends(_verify_user)) -> ChatResponse:
    db = _service_client()
    events, context = _load_grounding(db, user_id)

    # Grounded Gemini turn, Pydantic-validated.
    try:
        result = answer_question(
            [m.model_dump() for m in body.messages], context, body.language
        )
    except Exception as exc:
        logger.exception("Chat failed for user %s", user_id)
        raise HTTPException(status_code=502, detail="Chat failed") from exc

    return ChatResponse(
        answer=result.answer,
        citations=_validated_citations(events, result.citation_report_ids),
    )


_VOICE_MAX_BYTES = 4 * 1024 * 1024  # ~8 min of 64kbps mono AAC; serverless-safe
_VOICE_MIMES = {"audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/mpeg", "audio/wav"}
_history_adapter = TypeAdapter(list[ChatMessage])


@app.post("/voice", response_model=VoiceChatResponse)
async def voice_chat(
    audio: UploadFile = File(...),
    history: str = Form("[]"),
    language: str = Form("en"),
    user_id: str = Depends(_verify_user),
) -> VoiceChatResponse:
    """Voice turn: transcribe the spoken question and answer it, grounded in
    the user's records, in a single Gemini call. `history` is the prior text
    turns as JSON; the audio clip itself is the newest user turn."""
    if language not in ("en", "te", "hi"):
        language = "en"
    try:
        prior_turns = _history_adapter.validate_python(json.loads(history))[:30]
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail="Bad history") from exc

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Empty audio")
    if len(audio_bytes) > _VOICE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Audio too long")
    mime = audio.content_type if audio.content_type in _VOICE_MIMES else "audio/mp4"

    db = _service_client()
    events, context = _load_grounding(db, user_id)

    try:
        result = answer_voice(
            audio_bytes,
            mime,
            [m.model_dump() for m in prior_turns],
            context,
            language,
        )
    except Exception as exc:
        logger.exception("Voice chat failed for user %s", user_id)
        raise HTTPException(status_code=502, detail="Voice chat failed") from exc

    return VoiceChatResponse(
        answer=result.answer,
        citations=_validated_citations(events, result.citation_report_ids),
        transcript=result.transcript.strip(),
    )


SHARE_TTL_MINUTES = 30
_DOCTOR_PAGE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "doctor-web", "index.html"
)


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _parse_ts(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


@app.post("/share", response_model=ShareCreateResponse)
def create_share(request: Request, user_id: str = Depends(_verify_user)) -> ShareCreateResponse:
    """Mint a single-use 30-minute share token. One live share at a time."""
    db = _service_client()
    now = _utcnow()

    # Revoke any still-active tokens so a new QR always supersedes old ones.
    db.table("share_tokens").update({"revoked_at": now.isoformat()}).eq(
        "user_id", user_id
    ).is_("used_at", "null").is_("revoked_at", "null").gt(
        "expires_at", now.isoformat()
    ).execute()

    # Only the hash is stored; the raw token lives solely in the QR code.
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = now + dt.timedelta(minutes=SHARE_TTL_MINUTES)
    # created_at is set explicitly so the DB's 30-minute TTL check constraint
    # is evaluated against the same clock that produced expires_at.
    db.table("share_tokens").insert(
        {
            "user_id": user_id,
            "token_hash": token_hash,
            "created_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "scope": {"reports": "all"},
        }
    ).execute()

    # Behind a TLS-terminating proxy the ASGI scope says http; the QR link
    # must carry the real public scheme or phones will refuse to open it.
    base = str(request.base_url).rstrip("/")
    if request.headers.get("x-forwarded-proto") == "https" and base.startswith("http:"):
        base = "https:" + base[len("http:"):]
    return ShareCreateResponse(share_url=f"{base}/share/{token}", expires_at=expires.isoformat())


@app.get("/share/{token}")
def share_page(token: str) -> FileResponse:
    """Serve the doctor view shell. Redemption only happens via POST, so
    link-preview bots fetching this URL can't consume the token."""
    return FileResponse(_DOCTOR_PAGE, media_type="text/html")


@app.post("/share/redeem", response_model=ShareSnapshot)
def redeem_share(body: ShareRedeemRequest) -> ShareSnapshot:
    """Exchange a raw token for a one-time, read-only snapshot."""
    db = _service_client()
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    rows = db.table("share_tokens").select("*").eq("token_hash", token_hash).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="invalid")
    record = rows[0]
    now = _utcnow()

    if record["revoked_at"] is not None:
        raise HTTPException(status_code=410, detail="revoked")
    if record["used_at"] is not None:
        raise HTTPException(status_code=410, detail="used")
    if _parse_ts(record["expires_at"]) <= now:
        raise HTTPException(status_code=410, detail="expired")

    # Burn the token atomically — the guarded update loses any race.
    burned = (
        db.table("share_tokens")
        .update({"used_at": now.isoformat()})
        .eq("id", record["id"])
        .is_("used_at", "null")
        .execute()
    )
    if not burned.data:
        raise HTTPException(status_code=410, detail="used")

    user_id = record["user_id"]
    profile_rows = (
        db.table("profiles").select("full_name").eq("id", user_id).execute().data
    )
    events = (
        db.table("timeline_events")
        .select("report_id, title, summary, occurred_at")
        .eq("user_id", user_id)
        .order("occurred_at", desc=True)
        .execute()
    ).data
    observations = (
        db.table("extracted_observations")
        .select("report_id, test_name, value, unit, reference_range, observed_at, flagged")
        .eq("user_id", user_id)
        .execute()
    ).data

    by_report: dict[str, list[dict]] = {}
    for obs in observations:
        by_report.setdefault(obs["report_id"], []).append(obs)

    return ShareSnapshot(
        patient_name=profile_rows[0]["full_name"] if profile_rows else None,
        generated_at=now.isoformat(),
        reports=[
            SharedReportOut(
                title=event["title"],
                occurred_at=event["occurred_at"],
                summary=event["summary"],
                observations=[
                    SharedObservationOut(**obs_fields(o))
                    for o in by_report.get(event["report_id"] or "", [])
                ],
            )
            for event in events
        ],
    )


def obs_fields(o: dict) -> dict:
    return {
        "test_name": o["test_name"],
        "value": o["value"],
        "unit": o["unit"],
        "reference_range": o["reference_range"],
        "flagged": o["flagged"],
        "observed_at": o["observed_at"],
    }


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
