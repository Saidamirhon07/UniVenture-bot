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


class NameUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Enter your name.")
        return cleaned


class OnboardingRequest(BaseModel):
    grade: str = Field(min_length=1, max_length=40)
    graduation_year: int = Field(ge=2026, le=2035)
    country: str = Field(min_length=2, max_length=100)
    curriculum: str = Field(min_length=2, max_length=100)
    intended_major: str = Field(min_length=2, max_length=160)
    target_countries: list[str] = Field(min_length=1, max_length=8)
    gpa: str = Field(min_length=1, max_length=50)
    sat: str | None = Field(default=None, max_length=30)
    ielts: str | None = Field(default=None, max_length=30)
    needs_aid: bool = True
    annual_budget: str = Field(min_length=1, max_length=100)
    weekly_hours: int = Field(ge=1, le=80)
    nearest_deadline: str | None = Field(default=None, max_length=40)
    application_round: str = Field(default="Undecided", max_length=60)

    @field_validator("target_countries")
    @classmethod
    def clean_target_countries(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip()[:80] for value in values if value.strip()]
        if not cleaned:
            raise ValueError("Choose at least one target country.")
        return cleaned


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
    skill: Literal["writing", "speaking", "reading", "listening"] = "writing"
    task_type: Literal["task_1", "task_2"] | None = "task_2"
    content: str = Field(min_length=30, max_length=20_000)
    question: str | None = Field(default=None, max_length=3_000)
    target_band: str | None = Field(default=None, max_length=20)


class CoachRequest(BaseModel):
    mode: Literal["brainstorm", "rewrite"]
    topic: Literal["personal_statement", "supplemental", "extracurricular", "portfolio", "general"] = "general"
    content: str = Field(min_length=20, max_length=30_000)
    goal: str | None = Field(default=None, max_length=1_000)


class SATCoachRequest(BaseModel):
    section: Literal["math", "reading_writing"]
    mode: Literal["study_plan", "mistake_lab"] = "study_plan"
    current_score: int | None = Field(default=None, ge=200, le=800)
    target_score: int | None = Field(default=None, ge=200, le=800)
    weak_skills: list[str] = Field(default_factory=list, max_length=8)
    content: str | None = Field(default=None, max_length=12_000)


class FeedbackRequest(BaseModel):
    category: Literal["idea", "bug", "confusing", "love"] = "idea"
    rating: int = Field(ge=1, le=5)
    message: str = Field(min_length=5, max_length=2_000)


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
    application_round: str | None = Field(default=None, max_length=80)
    target_intake: str | None = Field(default=None, max_length=80)
    school_count: int | None = Field(default=None, ge=1, le=40)
    available_days: list[str] = Field(default_factory=list, max_length=7)
    exam_dates: str | None = Field(default=None, max_length=1_000)
    recommender_status: str | None = Field(default=None, max_length=500)
    energy_pattern: str | None = Field(default=None, max_length=200)
    plan_style: Literal["balanced", "intensive", "low_stress"] = "balanced"


class PlanTaskStatusRequest(BaseModel):
    plan_id: str = Field(min_length=8, max_length=80)
    task_key: str = Field(min_length=3, max_length=160)
    done: bool


class CopilotMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2_000)


class CopilotRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2_000)
    current_screen: str = Field(default="home", max_length=80)
    history: list[CopilotMessage] = Field(default_factory=list, max_length=8)


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
