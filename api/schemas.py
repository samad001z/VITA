"""Pydantic schemas for AI extraction.

Every value extracted by Gemini is validated against these models before
anything is written to the database. Validation failure -> report marked
failed; partial/invalid data never lands in extracted_observations.
"""

import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Category = Literal[
    "hematology",
    "biochemistry",
    "lipids",
    "liver",
    "kidney",
    "thyroid",
    "diabetes",
    "vitamins",
    "urine",
    "cardiac",
    "imaging",
    "general",
]


class ExtractedObservation(BaseModel):
    """One test result pulled out of a medical report."""

    test_name: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1, max_length=200)
    unit: Optional[str] = Field(default=None, max_length=50)
    reference_range: Optional[str] = Field(default=None, max_length=100)
    date: Optional[dt.date] = Field(
        default=None, description="Date the test was performed, if printed on the report"
    )
    category: Category = "general"
    flagged: bool = Field(
        default=False,
        description="True only if the report itself marks the value abnormal/out of range",
    )

    @field_validator("test_name", "value")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    def numeric_value(self) -> Optional[float]:
        """Best-effort numeric parse of the value for trend math."""
        cleaned = self.value.replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None


class ExtractionResult(BaseModel):
    """Structured output schema enforced on the Gemini response."""

    report_title: str = Field(
        min_length=1,
        max_length=120,
        description="Short human title, e.g. 'Complete Blood Count' or 'Lipid Profile'",
    )
    report_date: Optional[dt.date] = Field(
        default=None, description="Primary date of the report, if present"
    )
    summary: str = Field(
        min_length=1,
        max_length=500,
        description=(
            "One or two neutral sentences describing what the report contains. "
            "Describe the data only — no diagnosis, no medical advice."
        ),
    )
    observations: list[ExtractedObservation] = Field(default_factory=list, max_length=200)
