# UniVentureAI Mini App — Refined Product Upgrade

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
- Global navigation is now Home, Discover, Prep, AI Coach, and Portfolio. Portfolio is the rightmost item.
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
- The earlier V3 browser evidence remains in `qa-v3/`. Current V4 browser capture is pending because this workspace did not expose its cloud browser; `design-qa.md` records that limitation rather than reusing stale screenshots as proof.
