from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def practice_snapshot(days: Any, today: date) -> dict[str, Any]:
    if not isinstance(days, dict):
        days = {}
    valid_days = {
        str(day): sorted({str(skill) for skill in skills if str(skill) in {"sat", "ielts"}})
        for day, skills in days.items()
        if isinstance(skills, list)
    }
    today_key = today.isoformat()
    completed_today = bool(valid_days.get(today_key))
    cursor = today if completed_today else today - timedelta(days=1)
    current_streak = 0
    while valid_days.get(cursor.isoformat()):
        current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = 0
    running = 0
    previous: date | None = None
    for day_key in sorted(valid_days):
        try:
            current = date.fromisoformat(day_key)
        except ValueError:
            continue
        running = running + 1 if previous and current == previous + timedelta(days=1) else 1
        longest_streak = max(longest_streak, running)
        previous = current

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "completed_today": completed_today,
        "today_skills": valid_days.get(today_key, []),
        "last_completed_date": max(valid_days, default=None),
        "total_sessions": sum(len(skills) for skills in valid_days.values()),
    }


def task_action(task: dict[str, Any], blocker_key: str = "planning") -> dict[str, Any]:
    text = " ".join(str(task.get(key) or "") for key in ("title", "why", "category", "done_when")).lower()
    logistics = any(term in text for term in ("registration", "register", "test date", "logistics", "book ", "schedule", "confirm date"))
    route: str | None = None
    label = "Open the right workspace"
    if "ielts" in text:
        route, label = "ielts", "Open IELTS Lab"
    elif any(term in text for term in ("sat", "digital sat", "act score", "act test")):
        route, label = "sat", "Open SAT Quest"
    elif any(term in text for term in ("personal statement", "supplemental", "essay", "common app story")):
        route, label = "essay", "Open Essay Lab"
    elif any(term in text for term in ("school list", "university list", "college list", "school fit", "universit")):
        route, label = "school", "Open School Finder"
    elif any(term in text for term in ("extracurricular", "activity list", "activities", " ec ")):
        route, label = "ec", "Open EC Builder"
    elif "recommend" in text:
        route, label = "recommendation", "Open Recommendation Lab"
    elif any(term in text for term in ("portfolio", "project", "award")):
        route, label = "portfolio", "Open Portfolio"

    if logistics:
        return {
            "mode": "reminder",
            "label": "Plan this move",
            "screen": route or "plan",
            "secondary_label": label if route else "Open Flight Plan",
        }

    if not route:
        route = {
            "essays": "essay",
            "activities": "ec",
            "academics": "prep",
            "testing": "prep",
            "schools": "school",
            "recommendations": "recommendation",
            "planning": "plan",
        }.get(blocker_key, "plan")
        label = {
            "essay": "Open Essay Lab",
            "ec": "Open EC Builder",
            "prep": "Open Prep Lab",
            "school": "Open School Finder",
            "recommendation": "Open Recommendation Lab",
            "plan": "Open Flight Plan",
        }.get(route, label)
    return {"mode": "navigate", "label": label, "screen": route}
