# UniVentureAI Mini App — Premium V8 Practice Studios

## V8: creative Home + meaningful practice

- Stronger navy mission hero, live progress, dedicated SAT/IELTS cards, six visible application tools, a compact path and opportunity entry point.
- 24 original SAT questions, 12 original IELTS reading/listening questions, five writing prompts and three speaking cue cards.
- Learning, timed and mistake-review modes; skill focus; question navigation; flags; explanations and saved session history.
- Server grading, duplicate-save protection within the retained 60-session history, and per-question practice records. Missed questions are immediately reviewable; successful questions become due in three days.
- IELTS writing workspace: Task 1/2 prompts, timers, word count, saved drafts, self-review checklist and existing AI evaluation.
- IELTS speaking: preparation/response timers, optional local microphone recording, playback/download, saved transcript and text-only feedback.
- Account-persistent drafts, daily practice records, and guards against accidental navigation away from unsaved work.
- File import errors are visible across the application; enlarged tool labels, selected-state semantics and reduced-motion styles.
- Existing Railway, Telegram, billing and profile systems remain. New practice fields are additive.
- Production frontend build, 21 Python unit tests, eight JavaScript checks and Python compilation pass. Six API integration tests need the full runtime; browser checks require the included Mac runner. Neither is claimed as passed here.

## Historical V6 changes

## Clarity pass

- Home now contains only the student's current task, four quick tools, one compact progress card, and one All Tools action.
- The navigation uses the shortest clear labels: **Home, Plan, Tools, Explore, Profile**.
- Tools displays all 12 workspaces by default in four plain-language groups. No category filter hides available features.
- **EC Evaluation** and **Recommendation Letters** are explicitly visible alongside Essay Review, Brainstorm, Rewrite, SAT, IELTS, School Finder, Portfolio Review, Profile & Awards, Application Plan, and Quick Checks.
- Search remains available as an optional shortcut and recognizes student language such as “essay”, “EC”, “letters”, “SAT”, and “plan”.
- Plan preserves the gamified progress loop while reducing it to readiness, XP, streak, today's mission, five steps, and two weekly tasks.
- Top-level and specialist screen titles use shorter names and supporting text.
- The existing premium cream, navy, cobalt, teal, gold, coral, and violet visual language remains intact.
- Telegram authentication, paid access, shared memory, reminders, notifications, streaks, and Railway storage are unchanged.

## Premium V5 navigation upgrade

## Find → act → progress

- Global navigation is now organized around the student's five real jobs: **Today, Roadmap, Tools, Discover, and Profile**.
- **Tools** is the elevated center action and opens a searchable, filterable directory of 12 focused workspaces.
- Essay Evaluation, Brainstorm, and Rewrite are visible as distinct key actions; Brainstorm and Rewrite open in the correct mode immediately.
- The tool directory supports plain-language search and goal categories: Writing, Tests, Profile, and Strategy.
- A profile-aware shortcut surfaces the student's current recommended move above the directory.
- The new **Admission Roadmap** turns live preparation data into five chapters with Strong, Now, and Ahead states.
- Momentum XP is calculated from real profile completion, readiness, and completed SAT/IELTS sessions. It is explicitly separated from admission odds.
- The Roadmap includes a daily quest, streak, level progress, chapter map, weekly questline, and direct Flight Plan entry.
- Specialist-screen back actions return to their true parent hub, while active bottom-navigation states remain consistent.
- No new database, Railway variable, payment change, or memory migration is required.

## Premium V4 reliability and engagement pass

- Home actions are now classified from the actual generated task instead of the weakest readiness category. Essays, SAT, IELTS, school research, ECs, recommendations, portfolio work, and general planning open the correct workspace.
- Logistics moves such as SAT registration or test-date planning open a reminder sheet with useful times and a related-tool fallback instead of dropping the student into Essay Lab.
- The bell opens a real signal desk for priority tasks, saved reminders, deadline/profile gaps, daily-practice nudges, and verified opportunities. Read state is saved with the student.
- Venture responses render as friendly paragraphs, compact action bullets, and one highlighted next move. Older raw JSON responses are cleaned by the client, while new responses use a strict student-friendly backend contract.
- SAT and IELTS quests now feed one persistent daily streak. Completion is idempotent per skill and day, and the same streak appears in Prep, SAT, IELTS, Home, and bell nudges.
- Onboarding keeps Back visible and now always shows a clear Next button on multi-step profile questions.
- The Flight Plan deadline/capacity row is protected from iOS date-input overflow and stacks on narrow phones.
- `.gitignore` now ignores only the root runtime `/data/` directory, so `frontend/src/data/catalogs.ts` cannot disappear from Railway builds again.

## What changed

- The selected premium home design is restored and refined: cream editorial canvas, navy display type, Uzbek gold ornament, cobalt doorway, full Application Twin, trajectory, major-matched opportunity, daily agenda, and five color-coded journeys.
- Home copy is deliberately shorter while the mission title, readiness score, four Application Twin dimensions, and section labels use stronger visual hierarchy. The fixed navigation and Venture button no longer hide agenda controls.
- Application Twin dimensions are interactive and use live portfolio readiness data. Identity, Evidence, Academics, and Voice each open the relevant workspace.
- The trajectory now reads the student's real weakest readiness area and saved application deadline instead of functioning as decorative copy.
- Family Brief is a real compact toggle with a parent-friendly explanation and recommended action.
- Portfolio now has structured, editable activity and award cards. Ten slots appear immediately in each section.
- The full-review persistence bug is fixed. Additive Mini App memory is preserved when the legacy chatbot reloads or later saves a cached user record.
- The Portfolio editor is rendered outside the animated page stack, and its coral Save Section action is pinned above the device safe area and global navigation.
- First launch asks every student to type the name UniVentureAI should use. Telegram still provides secure identity, but not the displayed name.
- Global navigation now prioritizes Today, a gamified Roadmap, the central Tools directory, Discover, and Profile.
- Discover is visible to all authenticated students, including expired users. It includes 36 filterable opportunities and visual deadline cards that link to official sources.
- AI Coach restores the chatbot-style Brainstorm Ideas and Rewrite My Text workflows using shared memory and topic-specific RAG.
- The richer command-center Home remains the primary direction. It keeps one next move, Application Twin, trajectory, one curated signal, and a compact two-action agenda without the explanatory copy that previously made the page feel crowded.
- A guided 90-second intake collects grade, curriculum, major, countries, grades, tests, aid, budget, capacity, round, and deadline signals for personalization.
- Application Flight Plan is dependency-aware and capacity-aware, with pace protection, milestones, risk radar, weekly rhythm, task completion, and missing-input prompts.
- School Fit includes a 30-university atlas and only reveals profile-derived Reach, Match, and Lower-risk groupings after the student provides enough academic, direction, and affordability data. It does not claim admission probabilities.
- Venture is a profile-aware admissions copilot available from overview surfaces and grounded in saved Mini App data.
- SAT Quest combines original mini-challenges, attempt-first explanations, trap diagnosis, a seven-day sprint, and mistake analysis.
- IELTS Skill Arcade gives Writing, Speaking, Reading, and Listening a distinct interactive mission before AI coaching.
- Feedback is stored in the user's Mini App memory and forwarded to configured Telegram admins.
- PDF, DOCX, TXT, and Markdown import is available in Essay Lab, AI Coach, EC Builder, IELTS, Recommendation Center, Portfolio Builder, Boost Tools, and SAT Mistake Lab.

## Deployment

Your current `UniVenture-bot` repository deploys from its top level. Merge the contents of this handoff into the repository root on the `admissions-mini-app` branch; do not keep a second nested `univenture_admissions_hub` copy. Railway should keep:

- Root Directory: blank
- Networking target port: `8080`
- Existing `/data` volume
- Existing production variables, including `RUN_TELEGRAM_BOT=1`

No data migration or new environment variable is required.

## Verification completed

- Python compilation completed successfully.
- All 10 backend/product-flow unit tests passed.
- The React/TypeScript production build completed successfully.
- The earlier V3 browser evidence remains in `qa-v3/`. Current V5 browser capture is pending because this workspace did not expose its cloud browser; `design-qa.md` records that limitation rather than reusing stale screenshots as proof.
