# UniVentureAI V8 — Creative Home & Practice Studios

## Implemented

Home now has a navy-and-gold mission hero using the existing doorway artwork, live preparation/profile/streak signals, direct SAT and IELTS cards, six named application shortcuts, a three-step path preview and an Explore entry. The 12-tool directory and five-tab navigation remain.

SAT Studio contains 24 original questions across Math and Reading & Writing. Students can choose a skill, learn with immediate explanations, take a short timed set, or revisit missed/due questions. They can flag questions, navigate within a set, submit early, inspect every explanation, and reopen saved results. Timed sets use 90 seconds per question as a practice pacing aid; this is not official SAT timing or an adaptive full-length mock.

IELTS Studio has four distinct workspaces:

- Writing: five original prompts (two Academic Task 1 tables, three Task 2 tasks), 20/40-minute practice timers, word counts, saved account drafts, self-checklists, and existing AI feedback.
- Speaking: three original Part 2 cue cards with follow-up questions, a one-minute preparation timer and a two-minute response timer; optional local recording, playback and download; saved typed transcripts and transcript-only feedback.
- Reading: six original evidence/detail/inference exercises with explanations.
- Listening: six original short briefings using device text-to-speech, with replay for learning and transcript recovery when audio is unavailable. These are not recorded exam audio or full IELTS Listening sections.

Practice sessions are graded on the server against the bundled question bank. Question-level attempts and errors persist in existing student memory. Missed questions are immediately available in Review; the due date is tomorrow for a miss and three days later for a correct answer. Selection prioritizes unseen items, errors and due items; it is a simple scheduling rule, not calibrated adaptivity.

Recent session history retains 60 sessions. Repeating a save with the same retained session ID does not count twice; conflicting answers for that ID are rejected. Session-based accuracy includes repeated and unanswered items. Full sessions are saved only when submitted; leaving mid-set warns about losing unsaved answers. Writing/speaking drafts are explicitly saved, not silently autosaved. Recordings are never uploaded and must be downloaded before leaving.

## Reliability and whole-app changes

- File-import failures now display useful errors; files over 5 MB are rejected before reading/uploading.
- Segmented controls expose selected state; new controls have larger touch targets and focus outlines.
- Reduced-motion CSS is included, though assistive-technology and device testing is still required.
- Shared unsaved-work navigation guards protect active sets, draft edits and recordings.
- Speaking prompts explicitly prohibit inferring pronunciation, accent or real-time fluency from text.
- Root runtime data remains ignored without hiding source catalogs or browser-check source files.

## Preserved systems

Telegram authentication, the original bot, paid access, existing evaluations, profiles, 10 EC/award slots, application planning, the opportunity/university catalogs, Venture, and Railway configuration are preserved. New practice data is additive under `miniapp.practice`: `sessions`, `questions`, and `drafts`, beside existing `days`. No new secrets, variables, database, or migration are required. Keep the current `/data` volume.

New routes: `GET /api/practice/library`, `POST /api/practice/session`, `POST /api/practice/draft`. History/library reads require authentication; new writes use the existing paid-access dependency. Original practice content exposes its answer key for self-study; this is not a secure proctored assessment system.

## Verification and limitations

- TypeScript check and Vite production build: passed.
- Python compilation: passed.
- Python unit tests: 21 passed.
- JavaScript practice-selection assertions: 8 passed.
- Browser runner syntax: checked, but browser tests were not executed here.
- Six actual API integration tests: supplied, skipped here because Python runtime dependencies are absent. They use in-memory users and do not start Telegram or call AI when run with dependencies installed.
- No current screenshots, Telegram/WebKit checks, real microphone tests, live AI quality evaluation, production payment test, or deployment was performed.

The local browser download was blocked with HTTP 403. The user authorized delivery with code-level verification and a Mac browser-check runner. This package is a release candidate; complete the checks in V8_APPLY_STEPS.md before production launch.

## Honest product boundary

This is a stronger admissions product with short practice studios, not a replacement for specialist platforms' large validated content banks. It does not predict official scores, guarantee admission, certify proficiency, promise sales, or establish investor readiness. Before a paid launch: have subject experts review the original content, test every paid flow, validate AI feedback against expert ratings, and run a small learner pilot to measure repeat usage and learning outcomes.

## Official reference points checked

- [College Board: Bluebook full-length practice and targeted review](https://satsuite.collegeboard.org/practice/practice-tests/bluebook). Use official tests for full-length assessment.
- [IELTS Academic Writing format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing).
- [IELTS Speaking format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking).

These references inform boundaries and practice timing, not a claim of affiliation or official content licensing. All bundled exercise text is original.
