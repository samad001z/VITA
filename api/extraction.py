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


def extract_report(file_bytes: bytes, mime_type: str) -> ExtractionResult:
    """Run Gemini extraction and validate the result against the schema.

    Raises pydantic.ValidationError or google.genai errors on failure;
    the caller is responsible for marking the report as failed.
    """
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            _PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractionResult,
            temperature=0.0,
        ),
    )

    # Re-validate from raw JSON even though the SDK parses it — the Pydantic
    # gate before any DB write is non-negotiable.
    return ExtractionResult.model_validate_json(response.text or "{}")
