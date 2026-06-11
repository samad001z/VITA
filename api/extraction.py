"""Gemini-powered OCR + structured extraction for medical reports."""

import os

from google import genai
from google.genai import types

from schemas import ExtractionResult

_PROMPT = """\
You are a meticulous medical-records data clerk. Extract structured data from
this medical report (lab report, prescription, discharge summary, or scan
report). Rules:

- Extract every test result you can read: name, value, unit, reference range.
- Use the exact names and values printed on the report. Never invent, infer,
  or correct values. If a value is illegible, skip it.
- Set flagged=true ONLY when the report itself marks a value as abnormal
  (H/L markers, asterisks, bold out-of-range, "high"/"low" notes).
- Dates in ISO format (YYYY-MM-DD). Omit dates you cannot read.
- The summary must neutrally describe what the report contains. Do NOT
  diagnose, interpret, or give medical advice anywhere in the output.
- If the document is not a medical report, return an empty observations list
  and say so in the summary.
"""


def _wire_schema() -> dict:
    """JSON schema sent to Vertex, with serving-incompatible constraints removed.

    Vertex constrained decoding rejects schemas with string length bounds,
    array size limits, and date formats ("too many states for serving").
    We strip those from the wire schema; the strict Pydantic model still
    enforces every constraint when the response is validated.
    """
    schema = ExtractionResult.model_json_schema()

    def strip(node: object) -> None:
        if isinstance(node, dict):
            for key in ("minLength", "maxLength", "minItems", "maxItems", "format"):
                node.pop(key, None)
            for value in node.values():
                strip(value)
        elif isinstance(node, list):
            for value in node:
                strip(value)

    strip(schema)
    return schema


def extract_report(file_bytes: bytes, mime_type: str) -> ExtractionResult:
    """Run Gemini extraction (via Vertex AI) and validate against the schema.

    Auth comes from the service account JSON referenced by
    GOOGLE_APPLICATION_CREDENTIALS. Raises pydantic.ValidationError or
    google.genai errors on failure; the caller marks the report failed.
    """
    client = genai.Client(
        vertexai=True,
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
    )
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            _PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=_wire_schema(),
            temperature=0.0,
        ),
    )

    # Re-validate from raw JSON even though the SDK parses it — the Pydantic
    # gate before any DB write is non-negotiable.
    return ExtractionResult.model_validate_json(response.text or "{}")
