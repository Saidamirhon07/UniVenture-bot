"""Original practice content and deterministic, server-scored learning records.

These exercises are not official tests or calibrated score predictors.
"""
import json
from datetime import date, timedelta
from pathlib import Path

BANK = json.loads(Path(__file__).with_name("practice_bank.json").read_text())
QUESTIONS = {question["id"]: question for question in BANK}


def grade_session(exam, answers, questions=None):
    catalog = questions or QUESTIONS
    seen = set()
    graded = []
    for answer in answers:
        question = catalog.get(answer["question_id"])
        if not question or question["exam"] != exam:
            raise ValueError("Question does not belong to this practice exam.")
        if question["id"] in seen:
            raise ValueError("A question can appear only once per session.")
        seen.add(question["id"])
        choice = answer["choice"]
        if choice is not None and (type(choice) is not int or not 0 <= choice < len(question["options"])):
            raise ValueError("Invalid answer choice.")
        graded.append({"question_id": question["id"], "choice": choice,
                       "correct": choice == question["answer"], "skill": question["skill"],
                       "section": question["section"]})
    if not graded or len(graded) > 40:
        raise ValueError("Submit between 1 and 40 questions.")
    return graded


def record_session(practice, payload, today: date, timestamp: int, questions=None):
    sessions = practice.setdefault("sessions", [])
    existing = next((s for s in sessions if s["id"] == payload["session_id"]), None)
    if existing:
        if existing["exam"] != payload["exam"] or existing["mode"] != payload["mode"] or [
            {"question_id": a["question_id"], "choice": a["choice"]} for a in existing["answers"]
        ] != payload["answers"]:
            raise ValueError("This session ID was already used for different answers.")
        return existing
    answers = grade_session(payload["exam"], payload["answers"], questions)
    session = {"id": payload["session_id"], "exam": payload["exam"], "mode": payload["mode"],
               "seconds": payload["seconds"], "created_at": timestamp, "answers": answers,
               "correct": sum(a["correct"] for a in answers), "total": len(answers)}
    sessions.append(session)
    practice["sessions"] = sessions[-60:]
    records = practice.setdefault("questions", {})
    for answer in answers:
        record = records.setdefault(answer["question_id"], {"attempts": 0, "correct": 0})
        record["attempts"] += 1
        record["correct"] += int(answer["correct"])
        record["last_correct"] = answer["correct"]
        record["last_choice"] = answer["choice"]
        record["last_seen"] = today.isoformat()
        record["review_due"] = (today + timedelta(days=3 if answer["correct"] else 1)).isoformat()
    # Only attempted work can earn a practice-day record; empty timed runs cannot.
    if any(a["choice"] is not None for a in answers):
        days = practice.setdefault("days", {})
        skills = days.setdefault(today.isoformat(), [])
        if payload["exam"] not in skills:
            skills.append(payload["exam"])
        cutoff = (today - timedelta(days=180)).isoformat()
        practice["days"] = {day: skills for day, skills in days.items() if day >= cutoff}
    return session
