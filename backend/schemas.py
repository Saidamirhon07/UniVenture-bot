from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class AuthRequest(BaseModel):
    init_data: str = Field(min_length=10, max_length=20_000)


class DevAuthRequest(BaseModel):
    user_id: int = 848_967_1503
    first_name: str = Field(default="Saidamirkhon", min_length=1, max_length=128)
    username: str = Field(default="local_student", max_length=64)


PortfolioSection = Literal[
    "academic_profile",
    "test_scores",
    "essays",
    "extracurriculars",
    "awards",
    "projects",
    "recommendations",
    "preferences",
    "financial_aid",
    "deadlines",
    "wellness",
]


class ProfileUpdateRequest(BaseModel):
    section: PortfolioSection
    data: dict[str, Any]


class EssayEvaluationRequest(BaseModel):
    essay_type: Literal["personal_statement", "supplemental"]
    content: str = Field(min_length=80, max_length=30_000)
    school_name: str | None = Field(default=None, max_length=160)
    prompt: str | None = Field(default=None, max_length=2_000)


class ECEvaluationRequest(BaseModel):
    activity: str = Field(min_length=30, max_length=12_000)
    role: str | None = Field(default=None, max_length=300)
    hours_per_week: float | None = Field(default=None, ge=0, le=168)
    weeks_per_year: int | None = Field(default=None, ge=0, le=52)


class IELTSEvaluationRequest(BaseModel):
    task_type: Literal["task_1", "task_2"]
    content: str = Field(min_length=80, max_length=20_000)
    question: str | None = Field(default=None, max_length=3_000)


class RecommendationRequest(BaseModel):
    mode: Literal["evaluate", "brag_sheet", "teacher_packet"] = "evaluate"
    content: str = Field(min_length=30, max_length=25_000)
    teacher_subject: str | None = Field(default=None, max_length=160)


class PortfolioEvaluationRequest(BaseModel):
    field: str = Field(min_length=2, max_length=160)
    projects: str = Field(min_length=30, max_length=25_000)
    target_program: str | None = Field(default=None, max_length=240)


class SchoolFinderRequest(BaseModel):
    intended_major: str = Field(min_length=2, max_length=160)
    gpa: str = Field(min_length=1, max_length=50)
    sat_act: str | None = Field(default=None, max_length=80)
    english_test: str | None = Field(default=None, max_length=80)
    target_countries: list[str] = Field(min_length=1, max_length=8)
    budget: str = Field(min_length=1, max_length=160)
    needs_aid: bool = False
    environment: str = Field(default="No strong preference", max_length=300)
    preferences: str | None = Field(default=None, max_length=1_500)

    @field_validator("target_countries")
    @classmethod
    def clean_countries(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip()[:80] for value in values if value.strip()]
        if not cleaned:
            raise ValueError("Choose at least one target country.")
        return cleaned


class SaveSchoolRequest(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    category: Literal["reach", "match", "safety"]
    why_fit: str = Field(default="", max_length=1_000)
    aid_note: str = Field(default="", max_length=1_000)


class ApplicationPlanRequest(BaseModel):
    deadline: str | None = Field(default=None, max_length=120)
    weekly_hours: int | None = Field(default=None, ge=1, le=80)
    extra_context: str | None = Field(default=None, max_length=3_000)


class FullReviewRequest(BaseModel):
    evaluation_id: str = Field(min_length=8, max_length=80)


class RefineRequest(BaseModel):
    evaluation_id: str = Field(min_length=8, max_length=80)
    action: Literal[
        "rewrite_section",
        "improve_hook",
        "improve_ending",
        "deepen_reflection",
        "make_specific",
    ]
    selected_text: str | None = Field(default=None, max_length=8_000)


class BoostRequest(BaseModel):
    tool: Literal["wow_factor", "power_words", "readiness", "insider_tips"]
    content: str | None = Field(default=None, max_length=12_000)
    context: str | None = Field(default=None, max_length=2_000)


class ExtractedFileResponse(BaseModel):
    filename: str
    text: str

