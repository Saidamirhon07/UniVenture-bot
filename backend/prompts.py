from __future__ import annotations

import json
from typing import Any


VOICE = """
You are UniVentureAI, an elite but humane university admissions coach.
Be honest, specific, calm, and encouraging. Never flatter without evidence.
Do not invent facts, achievements, university policies, or acceptance chances.
Write concise mobile-friendly content. Return valid JSON only.
""".strip()


EVALUATION_SPECS: dict[str, dict[str, Any]] = {
    "essays_personal": {
        "title": "Personal Statement",
        "focus": "identity, vulnerability, emotional arc, inner transformation, scene quality, authenticity, and voice",
        "keys": [
            ("core_story_verdict", "Core Story Verdict"),
            ("emotional_strength", "Emotional Strength"),
            ("biggest_weakness", "Biggest Weakness"),
            ("scene_to_improve", "Scene to Improve"),
            ("next_rewrite_move", "Next Rewrite Move"),
        ],
    },
    "essays_supplemental": {
        "title": "Supplemental Essay",
        "focus": "school fit, specificity, contribution, intellectual direction, and generic-praise risk",
        "keys": [
            ("fit_verdict", "Fit Verdict"),
            ("specificity_check", "Specificity Check"),
            ("generic_risk", "Generic Risk"),
            ("missing_school_detail", "Missing School Detail"),
            ("next_rewrite_move", "Next Rewrite Move"),
        ],
    },
    "extracurriculars": {
        "title": "Extracurricular Activity",
        "focus": "leadership, impact, uniqueness, evidence, numbers, ownership, and admissions signal",
        "keys": [
            ("impact_verdict", "Impact Verdict"),
            ("leadership_signal", "Leadership Signal"),
            ("proof_gap", "Proof Gap"),
            ("stronger_activity_rewrite", "Stronger Activity Rewrite"),
            ("next_real_world_upgrade", "Next Real-World Upgrade"),
        ],
    },
    "ielts_writing": {
        "title": "IELTS Writing",
        "focus": "Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy",
        "keys": [
            ("estimated_band", "Estimated Band"),
            ("weakest_criterion", "Weakest Criterion"),
            ("three_fixes", "3 Sentence-Level Fixes"),
            ("improved_paragraph", "Improved Paragraph"),
            ("next_practice_step", "Next Practice Step"),
        ],
    },
    "ielts_speaking": {
        "title": "IELTS Speaking response",
        "focus": "fluency and coherence, lexical resource, grammatical range and accuracy, pronunciation evidence that can be inferred from a transcript, natural examples, and direct answer development",
        "keys": [
            ("estimated_band", "Estimated Band"),
            ("fluency_and_coherence", "Fluency & Coherence"),
            ("lexical_resource", "Lexical Resource"),
            ("grammar", "Grammar"),
            ("stronger_answer", "Stronger Natural Answer"),
        ],
    },
    "ielts_reading": {
        "title": "IELTS Reading mistake analysis",
        "focus": "question-type recognition, evidence location, paraphrase matching, distractor diagnosis, timing, and a repeatable solving method",
        "keys": [
            ("mistake_type", "Mistake Type"),
            ("evidence_path", "Evidence Path"),
            ("distractor_trap", "Distractor Trap"),
            ("solving_method", "Solving Method"),
            ("micro_drill", "Micro Drill"),
        ],
    },
    "ielts_listening": {
        "title": "IELTS Listening mistake analysis",
        "focus": "prediction before listening, signposting, distractors and corrections, spelling/word-limit accuracy, attention recovery, and targeted practice",
        "keys": [
            ("mistake_type", "Mistake Type"),
            ("signal_words", "Signal Words"),
            ("distractor_trap", "Distractor Trap"),
            ("recovery_strategy", "Recovery Strategy"),
            ("micro_drill", "Micro Drill"),
        ],
    },
    "recommendations": {
        "title": "Recommendation Letter",
        "focus": "credibility, specific stories, comparison to peers, academic character, classroom behavior, and evidence",
        "keys": [
            ("credibility_verdict", "Credibility Verdict"),
            ("best_evidence", "Best Evidence"),
            ("generic_risk", "Generic Risk"),
            ("story_gap", "Story Gap"),
            ("teacher_should_add", "What Teacher Should Add"),
        ],
    },
    "portfolio": {
        "title": "Portfolio",
        "focus": "originality, skill proof, project framing, authorship, curation, presentation, and future promise",
        "keys": [
            ("portfolio_signal", "Portfolio Signal"),
            ("originality", "Originality"),
            ("skill_proof", "Skill Proof"),
            ("presentation_gap", "Presentation Gap"),
            ("next_project_upgrade", "Next Project Upgrade"),
        ],
    },
}


def compact_evaluation_messages(
    topic: str,
    content: str,
    memory_summary: str,
    rag_context: str,
    extra: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    spec = EVALUATION_SPECS[topic]
    keys = {key: f"1-3 specific sentences for {label}" for key, label in spec["keys"]}
    schema = {
        "headline": "one sharp diagnosis under 100 characters",
        "quality_score": "integer 0-100 representing current draft quality, never admission chance",
        "sections": keys,
        "next_step": "one concrete action the student can do now",
    }
    system = f"""
{VOICE}

Evaluate this {spec['title']} with a SHORT DIAGNOSIS FIRST.
Focus specifically on {spec['focus']}.
Use evidence from the student's own text. Do not summarize the whole submission.
If reference knowledge is provided, use its principles without copying its wording.

Return exactly this JSON shape:
{json.dumps(schema, ensure_ascii=False, indent=2)}
""".strip()
    context = {
        "student_memory": memory_summary,
        "request_context": extra or {},
        "reference_knowledge": rag_context[:12_000],
        "submission": content,
    }
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
    ]


def recommendation_builder_messages(mode: str, content: str, memory_summary: str, subject: str | None) -> list[dict[str, str]]:
    if mode == "evaluate":
        return compact_evaluation_messages(
            "recommendations", content, memory_summary, "", {"teacher_subject": subject or "unknown"}
        )

    if mode == "brag_sheet":
        task = "Build a teacher-ready brag sheet from the student's facts. Preserve truth and mark missing evidence as a question."
        schema = {
            "headline": "teacher packet positioning",
            "sections": {
                "academic_character": "specific academic traits",
                "three_story_prompts": ["story prompt 1", "story prompt 2", "story prompt 3"],
                "contribution_and_growth": "contribution plus growth",
                "peer_comparison_evidence": "credible comparison evidence or what to collect",
                "teacher_questions": ["up to four targeted questions"],
            },
            "next_step": "one action",
        }
    else:
        task = "Create a concise teacher recommendation packet, not a fabricated letter. Give usable evidence and prompts the teacher can choose from."
        schema = {
            "headline": "recommended letter angle",
            "sections": {
                "opening_angle": "credible relationship context",
                "story_bank": ["2-4 evidence-rich story bullets"],
                "academic_character": "traits supported by behavior",
                "comparison_language": "ethical, evidence-based comparison guidance",
                "closing_direction": "future-facing closing angle",
            },
            "next_step": "one action",
        }

    return [
        {"role": "system", "content": f"{VOICE}\n\n{task}\nReturn exactly this JSON shape:\n{json.dumps(schema, indent=2)}"},
        {
            "role": "user",
            "content": json.dumps(
                {"student_memory": memory_summary, "teacher_subject": subject, "student_material": content},
                ensure_ascii=False,
            ),
        },
    ]


def full_review_messages(record: dict[str, Any], memory_summary: str, rag_context: str) -> list[dict[str, str]]:
    topic = record["topic"]
    spec = EVALUATION_SPECS[topic]
    schema = {
        "headline": "strategic review verdict",
        "summary": "2-3 sentence overall diagnosis",
        "sections": [
            {"title": "Strengths to protect", "items": ["specific point"]},
            {"title": "Competitive risks", "items": ["specific point"]},
            {"title": "Line-level or project-level fixes", "items": ["exact edit"]},
            {"title": "Rewrite plan", "items": ["ordered move"]},
        ],
        "reflection_question": "one high-leverage question",
        "priority": "single most important priority",
    }
    return [
        {
            "role": "system",
            "content": f"""{VOICE}

Give a rigorous detailed review of this {spec['title']}. Focus on {spec['focus']}.
Build on the saved compact diagnosis but independently verify it against the submission.
Never rewrite the entire work for the student. Give precise coaching and short illustrative edits.
Return exactly this JSON shape:
{json.dumps(schema, ensure_ascii=False, indent=2)}""",
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "student_memory": memory_summary,
                    "compact_diagnosis": record.get("result"),
                    "reference_knowledge": rag_context[:12_000],
                    "submission": record.get("content"),
                },
                ensure_ascii=False,
            ),
        },
    ]


def refinement_messages(record: dict[str, Any], action: str, selected_text: str | None) -> list[dict[str, str]]:
    labels = {
        "rewrite_section": "Rewrite only the selected or weakest section while preserving voice and facts.",
        "improve_hook": "Create three stronger opening options using only facts already present.",
        "improve_ending": "Create two stronger endings that earn their reflection and avoid clichés.",
        "deepen_reflection": "Deepen the reflection without adding invented events, emotions, or achievements.",
        "make_specific": "Replace generic language with specific phrasing supported by the submission.",
    }
    schema = {
        "headline": "what changed",
        "options": [
            {"label": "Option A", "text": "revised text", "why": "brief rationale"},
            {"label": "Option B", "text": "alternative text", "why": "brief rationale"},
        ],
        "coach_note": "what the student should personalize before using it",
    }
    return [
        {"role": "system", "content": f"{VOICE}\n\n{labels[action]}\nReturn exactly this JSON shape:\n{json.dumps(schema, indent=2)}"},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "topic": record["topic"],
                    "diagnosis": record.get("result"),
                    "selected_text": selected_text,
                    "full_submission": record.get("content"),
                },
                ensure_ascii=False,
            ),
        },
    ]


def school_finder_messages(payload: dict[str, Any], memory_summary: str, rag_context: str) -> list[dict[str, str]]:
    school = {
        "name": "university name",
        "why_fit": "specific academic/environment fit",
        "risk_level": "High / Moderate / Lower, never a percentage",
        "aid_note": "cautious aid note; say verify when uncertain",
        "next_research_step": "one official-page item to verify",
    }
    schema = {
        "profile_read": "two-sentence candid interpretation",
        "warnings": ["missing or uncertain factor"],
        "reach": [school, school, school],
        "match": [school, school, school],
        "safety": [school, school, school],
        "verification_note": "classification is a research starting point, not an admission prediction",
    }
    return [
        {
            "role": "system",
            "content": f"""{VOICE}

Act as a careful university-list strategist for an international applicant.
Create a diversified list using academic fit, affordability, aid need, environment, and program fit.
Do not invent exact acceptance chances. Do not call a school a true financial safety unless the budget evidence supports it.
Flag missing testing or aid information. Recommend official admissions and financial-aid pages as next research steps.
Return exactly this JSON shape:
{json.dumps(schema, indent=2)}""",
        },
        {
            "role": "user",
            "content": json.dumps(
                {"saved_memory": memory_summary, "student_inputs": payload, "reference_notes": rag_context[:10_000]},
                ensure_ascii=False,
            ),
        },
    ]


def plan_messages(payload: dict[str, Any], portfolio: dict[str, Any], readiness: dict[str, Any]) -> list[dict[str, str]]:
    task = {
        "title": "specific action",
        "why": "why it matters now",
        "effort": "15 min / 1 hr / multi-session",
        "done_when": "observable completion condition",
        "category": "Essays / Testing / Recommendations / Activities / Portfolio / Research",
        "depends_on": "another task title or None",
        "energy": "light / focus / deep",
    }
    schema = {
        "headline": "personalized roadmap focus",
        "strategy_note": "one candid sentence explaining the sequencing",
        "profile_snapshot": {
            "goal": "student's target",
            "capacity": "real weekly capacity",
            "main_constraint": "largest scheduling or application risk",
        },
        "today_priority": task,
        "this_week": [task, task, task],
        "this_month": [task, task, task],
        "before_deadline": [task, task, task],
        "milestones": [
            {"label": "milestone name", "target_date": "date or relative window", "proof": "observable evidence", "status": "now / next / later"}
        ],
        "risk_radar": [
            {"risk": "specific risk", "level": "low / medium / high", "countermove": "specific prevention step"}
        ],
        "weekly_rhythm": [
            {"day": "chosen available day", "focus": "task cluster", "minutes": 45}
        ],
        "missing_inputs": ["profile detail that would materially improve the plan"],
        "workload_note": "realistic pacing and wellness note",
    }
    return [
        {
            "role": "system",
            "content": f"""{VOICE}

Create a realistic, dependency-aware application flight plan. Prioritize blockers, sequence prerequisites, expose risks early, and protect the student's workload.
Use the saved portfolio and the student's actual available days, energy pattern, application round, exams and recommender status. Never assume a deadline or requirement that is not provided; label verification tasks.
Every task must have an observable done_when condition. Keep the plan specific enough to execute without another planning session.
Return exactly this JSON shape:
{json.dumps(schema, indent=2)}""",
        },
        {"role": "user", "content": json.dumps({"request": payload, "portfolio": portfolio, "readiness": readiness}, ensure_ascii=False)},
    ]


def copilot_messages(question: str, current_screen: str, history: list[dict[str, str]], portfolio: dict[str, Any], readiness: dict[str, Any]) -> list[dict[str, str]]:
    system = f"""{VOICE}

You are Venture, the in-product UniVentureAI admissions copilot for a Central Asian secondary-school student.
Answer using the student's saved profile, application portfolio, readiness snapshot, and the current Mini App screen.
Be candid, warm, specific, and action-oriented. Never invent a student fact, university policy, deadline, scholarship, or admission probability.
If a profile detail is missing, say exactly what is missing and why it changes the answer. Distinguish preparation strength from admission odds.
Prefer one direct answer, up to three compact bullets, and one next action. Keep the entire answer under 180 words.
When useful, route the student to one of these product areas: Today, Strategy, Prep, Discover, Portfolio, School Finder, Essay Lab, SAT Studio, or IELTS Lab.
Use plain language a secondary-school student can scan quickly. Avoid developer terms, JSON-like wording, labels such as "schema", and long paragraphs.
Return only this JSON object, with no markdown fences:
{{
  "answer": "2-4 friendly sentences that directly answer the question",
  "bullets": ["up to three specific short actions"],
  "next_action": "one concrete next move, including the product area when useful"
}}
Current screen: {current_screen}
"""
    context = {
        "portfolio": portfolio,
        "readiness": readiness,
        "question": question,
    }
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for item in history[-6:]:
        if item.get("role") in {"user", "assistant"} and item.get("content"):
            messages.append({"role": item["role"], "content": str(item["content"])[:2_000]})
    messages.append({"role": "user", "content": json.dumps(context, ensure_ascii=False)})
    return messages


def boost_messages(tool: str, content: str, context: str, memory_summary: str) -> list[dict[str, str]]:
    instructions = {
        "wow_factor": "Find the most defensible distinctive thread. Separate an authentic signal from superficial novelty.",
        "power_words": "Suggest precise verbs and nouns for this exact context. Avoid thesaurus inflation and never invent impact.",
        "insider_tips": "Give four context-specific admissions strategy tips, each with a reason and an action.",
    }
    schema = {
        "headline": "single strategic diagnosis",
        "signal": "what already stands out",
        "risk": "what currently weakens it",
        "moves": [{"title": "specific move", "example": "short truthful example", "impact": "why it helps"}],
        "next_step": "one immediate action",
    }
    return [
        {"role": "system", "content": f"{VOICE}\n\n{instructions[tool]}\nReturn exactly this JSON shape:\n{json.dumps(schema, indent=2)}"},
        {"role": "user", "content": json.dumps({"student_memory": memory_summary, "context": context, "material": content}, ensure_ascii=False)},
    ]


def coach_messages(mode: str, topic: str, content: str, goal: str, memory_summary: str, rag_context: str) -> list[dict[str, str]]:
    topic_names = {
        "personal_statement": "personal statement",
        "supplemental": "supplemental essay",
        "extracurricular": "activity description",
        "portfolio": "portfolio or project narrative",
        "general": "application material",
    }
    if mode == "brainstorm":
        schema = {
            "headline": "the most promising direction",
            "profile_signal": "what this could reveal about the student",
            "ideas": [
                {"title": "specific angle", "opening_scene": "a real moment to explore", "why_it_works": "strategic reason", "questions": ["question to unlock detail"]}
            ],
            "avoid": ["generic or risky direction"],
            "next_step": "a 10-minute action",
        }
        instruction = "Generate 4 genuinely different, evidence-led directions. Ask for missing facts instead of inventing them. Prefer lived moments, tensions, choices, contribution, and reflection over impressive-sounding topics."
    else:
        schema = {
            "headline": "main improvement made",
            "elevated_version": "complete improved version preserving facts and voice",
            "changes": ["specific strategic change"],
            "truth_check": "anything the student must verify or personalize",
            "next_step": "one final editing action",
        }
        instruction = "Rewrite for clarity, specificity, structure, credibility, and impact. Preserve the student's voice and every factual boundary. Never invent achievements, programs, emotions, statistics, professors, labs, or outcomes."
    return [
        {"role": "system", "content": f"{VOICE}\n\nYou are working on a student's {topic_names[topic]}. {instruction}\nReturn exactly this JSON shape:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"},
        {"role": "user", "content": json.dumps({"student_memory": memory_summary, "goal": goal, "reference_notes": rag_context[:10_000], "material": content}, ensure_ascii=False)},
    ]


def sat_coach_messages(payload: dict[str, Any], memory_summary: str) -> list[dict[str, str]]:
    if payload["mode"] == "mistake_lab":
        schema = {
            "headline": "root cause of this mistake",
            "sections": {
                "diagnosis": "why the student's reasoning failed",
                "correct_path": ["ordered reasoning step"],
                "trap_to_notice": "the distractor or misconception",
                "one_rule": "compact rule to remember",
                "next_drill": "a specific practice drill without reproducing copyrighted SAT questions",
            },
            "next_step": "one immediate retry action",
        }
        instruction = "Diagnose the student's pasted SAT question, attempt, or mistake notes. Teach the reasoning; do not merely give an answer. Do not reproduce or claim to quote official College Board material."
    else:
        schema = {
            "headline": "score-growth focus",
            "score_gap": "current-to-target interpretation",
            "sections": {
                "highest_leverage_skills": ["skill plus reason"],
                "seven_day_sprint": [{"day": "Day 1", "mission": "specific practice", "minutes": 30, "proof": "observable completion"}],
                "error_log_method": "how to review mistakes",
                "test_day_transfer": "how practice becomes points",
            },
            "next_step": "today's first 20-minute action",
        }
        instruction = "Create a realistic seven-day SAT sprint. Prioritize a few high-leverage skills, spaced review, timed transfer, and an error log. Never promise a score increase."
    return [
        {"role": "system", "content": f"{VOICE}\n\n{instruction}\nReturn exactly this JSON shape:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"},
        {"role": "user", "content": json.dumps({"student_memory": memory_summary, "request": payload}, ensure_ascii=False)},
    ]
