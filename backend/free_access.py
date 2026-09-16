from __future__ import annotations

from typing import Any


FREE_FEATURES: dict[str, str] = {
    "ec_review": "EC Evaluation",
    "ielts_feedback": "IELTS AI Feedback",
    "recommendation": "Recommendation Letters",
    "portfolio_review": "Portfolio Review",
    "school_finder": "School Finder",
    "application_plan": "Application Plan",
    "brainstorm": "Brainstorm Studio",
    "rewrite": "Rewrite Studio",
    "sat_coach": "SAT Coach",
    "boost_wow_factor": "Wow Factor Check",
    "boost_power_words": "Power Words",
    "boost_insider_tips": "Insider Tips",
}


def access_snapshot(miniapp: dict[str, Any], premium: bool, essay_limit: int) -> dict[str, dict[str, Any]]:
    raw_usage = miniapp.get("free_feature_uses")
    usage = raw_usage if isinstance(raw_usage, dict) else {}
    result: dict[str, dict[str, Any]] = {}
    for key, label in FREE_FEATURES.items():
        used = max(0, int(usage.get(key, 0) or 0))
        result[key] = {
            "label": label,
            "limit": None if premium else 1,
            "used": used,
            "remaining": None if premium else max(0, 1 - used),
        }
    essay_used = max(0, int(miniapp.get("free_essay_evaluations_used", 0) or 0))
    result["essay_review"] = {
        "label": "Essay Review",
        "limit": None if premium else essay_limit,
        "used": essay_used,
        "remaining": None if premium else max(0, essay_limit - essay_used),
    }
    return result


def reserve(miniapp: dict[str, Any], feature: str) -> bool:
    if feature not in FREE_FEATURES:
        raise KeyError(feature)
    raw_usage = miniapp.get("free_feature_uses")
    usage = raw_usage if isinstance(raw_usage, dict) else {}
    used = max(0, int(usage.get(feature, 0) or 0))
    if used >= 1:
        return False
    usage[feature] = used + 1
    miniapp["free_feature_uses"] = usage
    return True


def release(miniapp: dict[str, Any], feature: str) -> None:
    raw_usage = miniapp.get("free_feature_uses")
    usage = raw_usage if isinstance(raw_usage, dict) else {}
    usage[feature] = max(0, int(usage.get(feature, 1) or 1) - 1)
    miniapp["free_feature_uses"] = usage
