"""Timeline-grounded chat over the user's extracted health records.

The model only ever sees the records we hand it; the system prompt forbids
diagnosis and outside knowledge, and every answer must cite the reports it
used. Citations are validated against the user's real report ids before
anything reaches the client.
"""

import os

from google import genai
from google.genai import types

from extraction import wire_schema
from schemas import ChatAnswer

_SYSTEM = """\
You are VITA, a calm health companion. You help the user understand their own
medical records, which are provided below as their complete health timeline.

Rules — all of them are hard requirements:
- Answer ONLY from the records below. If the records don't contain the answer,
  say so plainly and suggest the user add the relevant report.
- NEVER diagnose, predict disease, or give treatment/medication advice. When a
  value is flagged or the user worries, recommend discussing it with their
  doctor — without alarm.
- Quote values exactly as recorded, with their units and dates.
- Explain in plain, warm language a non-doctor understands. Be concise.
- In citation_report_ids, list the id of every report whose data you used.
  Use the exact ids from the records. If you used none, return an empty list.
- If asked something unrelated to the user's health records, politely steer
  back to their health data.

The user's health records:

"""

_NO_RECORDS = "No reports on file yet."


def build_context(
    events: list[dict],
    observations_by_report: dict[str, list[dict]],
) -> str:
    """Render the user's timeline as a compact grounding document."""
    if not events:
        return _NO_RECORDS
    blocks: list[str] = []
    for event in events:
        report_id = event.get("report_id")
        lines = [
            f'REPORT id={report_id} "{event["title"]}" date={event["occurred_at"]}',
        ]
        if event.get("summary"):
            lines.append(f"  summary: {event['summary']}")
        for obs in observations_by_report.get(report_id or "", []):
            unit = f" {obs['unit']}" if obs.get("unit") else ""
            ref = f" (ref {obs['reference_range']})" if obs.get("reference_range") else ""
            flag = " FLAGGED" if obs.get("flagged") else ""
            date = f" [{obs['observed_at']}]" if obs.get("observed_at") else ""
            lines.append(f"  - {obs['test_name']}: {obs['value']}{unit}{ref}{flag}{date}")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def answer_question(history: list[dict], context: str) -> ChatAnswer:
    """Run the grounded chat turn and validate the structured response.

    `history` is the conversation as [{"role": "user"|"assistant", "content": str}].
    Raises pydantic.ValidationError or google.genai errors on failure.
    """
    client = genai.Client(
        vertexai=True,
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
    )
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    contents = [
        types.Content(
            role="user" if msg["role"] == "user" else "model",
            parts=[types.Part(text=msg["content"])],
        )
        for msg in history
    ]

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM + context,
            response_mime_type="application/json",
            response_json_schema=wire_schema(ChatAnswer),
            temperature=0.2,
        ),
    )

    return ChatAnswer.model_validate_json(response.text or "{}")
