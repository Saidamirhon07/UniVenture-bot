"""Persistent, review-gated AI question bank stored on the Railway volume."""
from __future__ import annotations

import hashlib
import gzip
import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
QUESTION_BANK_PATH = Path(os.getenv("QUESTION_BANK_PATH", str(DATA_DIR / "generated_question_bank.json")))
_lock = threading.RLock()

TARGETS = {
    "sat_math": 150,
    "sat_reading_writing": 150,
    "ielts_reading": 100,
    "ielts_listening": 100,
    "ielts_writing": 50,
    "ielts_speaking": 50,
}
BASELINE_COUNTS = {
    "sat_math": 12,
    "sat_reading_writing": 12,
    "ielts_reading": 6,
    "ielts_listening": 6,
    "ielts_writing": 5,
    "ielts_speaking": 3,
}
OBJECTIVE_CATEGORIES = {"sat_math", "sat_reading_writing", "ielts_reading", "ielts_listening"}
PROMPT_CATEGORIES = {"ielts_writing", "ielts_speaking"}


def _empty() -> dict[str, Any]:
    return {"version": 1, "items": []}


def _load(path: Path = QUESTION_BANK_PATH) -> dict[str, Any]:
    candidates = [path, *(Path(f"{path}.bak{index}.gz") for index in range(1, 4))]
    for candidate in candidates:
        try:
            if not candidate.exists():
                continue
            if candidate.suffix == ".gz":
                with gzip.open(candidate, "rt", encoding="utf-8") as source:
                    payload = json.load(source)
            else:
                payload = json.loads(candidate.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and isinstance(payload.get("items"), list):
                return payload
        except Exception:
            continue
    return _empty()


def _save(payload: dict[str, Any], path: Path = QUESTION_BANK_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        for index in range(3, 1, -1):
            previous = Path(f"{path}.bak{index - 1}.gz")
            target = Path(f"{path}.bak{index}.gz")
            if previous.exists():
                os.replace(previous, target)
        backup_temp = Path(f"{path}.bak1.gz.tmp")
        with path.open("rb") as source, gzip.open(backup_temp, "wb", compresslevel=6) as target:
            target.write(source.read())
        os.replace(backup_temp, Path(f"{path}.bak1.gz"))
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, path)


def _fingerprint(item: dict[str, Any]) -> str:
    text = " ".join(str(item.get(key, "")) for key in ("passage", "audio", "prompt"))
    normalized = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


def validate_candidate(category: str, item: Any) -> tuple[dict[str, Any] | None, str]:
    if category not in TARGETS or not isinstance(item, dict):
        return None, "Unsupported category or payload."
    prompt = str(item.get("prompt") or "").strip()
    if len(prompt) < 20 or len(prompt) > 2_800:
        return None, "Prompt length is invalid."
    level = str(item.get("level") or "medium").lower()
    if level not in {"easy", "medium", "hard"}:
        return None, "Difficulty must be easy, medium or hard."
    clean: dict[str, Any] = {"category": category, "prompt": prompt, "level": level}
    if category in OBJECTIVE_CATEGORIES:
        options = item.get("options")
        answer = item.get("answer")
        explanation = str(item.get("explanation") or "").strip()
        if not isinstance(options, list) or len(options) != 4 or len({str(value).strip() for value in options}) != 4:
            return None, "Exactly four unique options are required."
        if type(answer) is not int or not 0 <= answer < 4:
            return None, "Answer index is invalid."
        if len(explanation) < 45:
            return None, "Explanation is too short."
        mapping = {
            "sat_math": ("sat", "math"),
            "sat_reading_writing": ("sat", "reading_writing"),
            "ielts_reading": ("ielts", "reading"),
            "ielts_listening": ("ielts", "listening"),
        }
        exam, section = mapping[category]
        clean.update({
            "exam": exam,
            "section": section,
            "skill": str(item.get("skill") or section.replace("_", " ")).strip()[:80],
            "options": [str(value).strip()[:500] for value in options],
            "answer": answer,
            "explanation": explanation[:2_000],
        })
        passage = str(item.get("passage") or "").strip()
        audio = str(item.get("audio") or "").strip()
        if category in {"sat_reading_writing", "ielts_reading"} and len(passage) < 80:
            return None, "A sufficient original passage is required."
        if category == "ielts_listening" and len(audio) < 80:
            return None, "A sufficient original listening transcript is required."
        if passage:
            clean["passage"] = passage[:4_000]
        if audio:
            clean["audio"] = audio[:4_000]
    else:
        task_type = str(item.get("task_type") or ("speaking" if category == "ielts_speaking" else "task_2"))
        allowed = {"task_1", "task_2"} if category == "ielts_writing" else {"speaking"}
        if task_type not in allowed:
            return None, "IELTS prompt type is invalid."
        clean.update({"kind": category, "task_type": task_type})
    clean["fingerprint"] = _fingerprint(clean)
    return clean, ""


def add_reviewed_batch(category: str, candidates: list[Any], reviews: list[Any], path: Path = QUESTION_BANK_PATH) -> dict[str, int]:
    now = datetime.now(timezone.utc).isoformat()
    review_map = {int(row.get("index")): row for row in reviews if isinstance(row, dict) and str(row.get("index", "")).isdigit()}
    added = rejected = duplicates = 0
    with _lock:
        store = _load(path)
        known = {str(item.get("fingerprint")) for item in store["items"]}
        for index, candidate in enumerate(candidates):
            clean, reason = validate_candidate(category, candidate)
            review = review_map.get(index, {})
            confidence = float(review.get("confidence", 0) or 0)
            approved = review.get("approved") is True and confidence >= 0.9
            if not clean or not approved:
                rejected += 1
                continue
            if clean["fingerprint"] in known:
                duplicates += 1
                continue
            clean.update({
                "id": f"qf_{uuid.uuid4().hex[:16]}",
                "status": "verified",
                "verification_confidence": round(confidence, 3),
                "verification_note": str(review.get("reason") or reason)[:500],
                "created_at": now,
            })
            store["items"].append(clean)
            known.add(clean["fingerprint"])
            added += 1
        _save(store, path)
    return {"added": added, "rejected": rejected, "duplicates": duplicates}


def publish_verified(path: Path = QUESTION_BANK_PATH) -> int:
    published = 0
    with _lock:
        store = _load(path)
        for item in store["items"]:
            if item.get("status") == "verified":
                item["status"] = "published"
                item["published_at"] = datetime.now(timezone.utc).isoformat()
                published += 1
        _save(store, path)
    return published


def decide(item_id: str, action: str, path: Path = QUESTION_BANK_PATH) -> bool:
    with _lock:
        store = _load(path)
        item = next((row for row in store["items"] if row.get("id") == item_id), None)
        if not item or item.get("status") != "verified" or action not in {"publish", "reject"}:
            return False
        item["status"] = "published" if action == "publish" else "rejected"
        item[f"{action}ed_at"] = datetime.now(timezone.utc).isoformat()
        _save(store, path)
    return True


def published_objective(path: Path = QUESTION_BANK_PATH) -> list[dict[str, Any]]:
    with _lock:
        items = _load(path)["items"]
    keys = {"id", "exam", "section", "skill", "level", "prompt", "options", "answer", "explanation", "passage", "audio"}
    return [{key: value for key, value in item.items() if key in keys} for item in items if item.get("status") == "published" and item.get("category") in OBJECTIVE_CATEGORIES]


def published_prompts(path: Path = QUESTION_BANK_PATH) -> dict[str, list[str]]:
    result = {"writing_task_1": [], "writing_task_2": [], "speaking": []}
    with _lock:
        items = _load(path)["items"]
    for item in items:
        if item.get("status") != "published" or item.get("category") not in PROMPT_CATEGORIES:
            continue
        key = "speaking" if item["category"] == "ielts_speaking" else f"writing_{item.get('task_type', 'task_2')}"
        result[key].append(str(item.get("prompt")))
    return result


def snapshot(path: Path = QUESTION_BANK_PATH) -> dict[str, Any]:
    with _lock:
        items = _load(path)["items"]
    categories = {}
    for category, target in TARGETS.items():
        rows = [item for item in items if item.get("category") == category]
        published = BASELINE_COUNTS[category] + sum(item.get("status") == "published" for item in rows)
        categories[category] = {
            "target": target,
            "verified": sum(item.get("status") == "verified" for item in rows),
            "published": published,
            "remaining": max(0, target - published),
        }
    review_queue = [{key: item.get(key) for key in ("id", "category", "prompt", "level", "verification_confidence", "verification_note")} for item in reversed(items) if item.get("status") == "verified"][:30]
    return {"categories": categories, "review_queue": review_queue, "total_items": len(items), "storage_path": str(path)}


def generation_messages(category: str, count: int) -> list[dict[str, str]]:
    specs = {
        "sat_math": "Digital SAT Math; cover Algebra, Advanced Math, Problem-Solving/Data Analysis, or Geometry/Trigonometry.",
        "sat_reading_writing": "Digital SAT Reading and Writing; use one short original passage per question and test information/ideas, craft/structure, expression of ideas, or standard English conventions.",
        "ielts_reading": "IELTS Academic-style Reading; use an original passage and evidence-based comprehension or language question.",
        "ielts_listening": "IELTS-style Listening; supply an original realistic transcript in audio and a question answerable from it.",
        "ielts_writing": "IELTS Academic Writing Task 1 or Task 2 prompt. For Task 1, include all fictional chart/table data in text.",
        "ielts_speaking": "IELTS Speaking Part 2 cue card with prompts and one related Part 3 follow-up.",
    }
    objective_schema = {"questions": [{"prompt": "question", "passage": "when required", "audio": "when required", "skill": "specific skill", "level": "easy|medium|hard", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "worked evidence-based explanation"}]}
    prompt_schema = {"questions": [{"prompt": "complete original prompt", "task_type": "task_1|task_2|speaking", "level": "easy|medium|hard"}]}
    schema = objective_schema if category in OBJECTIVE_CATEGORIES else prompt_schema
    return [{"role": "system", "content": f"You create original, non-copied exam practice. {specs[category]} Produce exactly {count} distinct items. Never claim they are official. Verify every answer before returning. Return JSON only in this shape: {json.dumps(schema)}"}]


def review_messages(category: str, candidates: list[Any]) -> list[dict[str, str]]:
    return [{"role": "system", "content": "Act as an independent senior assessment editor. Check relevance to the named exam section, originality, ambiguity, answer correctness, distractor quality, explanation accuracy, and sufficient source evidence. Reject any uncertain item. Return JSON only: {\"reviews\":[{\"index\":0,\"approved\":true,\"confidence\":0.95,\"reason\":\"short reason\"}]}"}, {"role": "user", "content": json.dumps({"category": category, "candidates": candidates}, ensure_ascii=False)}]
