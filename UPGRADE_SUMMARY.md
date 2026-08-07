# UniVentureAI Mini App — Refined Product Upgrade

## What changed

- The selected premium home design is implemented: cream editorial canvas, navy display type, Uzbek gold ornament, cobalt doorway, compact Application Twin, full trajectory, curated deadline, daily agenda, and five color-coded journeys.
- The complete default command center fits in one 390 × 844 Telegram viewport; the fixed navigation no longer hides the agenda.
- Application Twin dimensions are interactive and use live portfolio readiness data. Identity, Evidence, Academics, and Voice each open the relevant workspace.
- The trajectory now reads the student's real weakest readiness area and saved application deadline instead of functioning as decorative copy.
- Family Brief is a real compact toggle with a parent-friendly explanation and recommended action.
- Portfolio now has structured, editable activity and award cards. Five slots appear immediately and students can add up to ten in each section.
- The full-review persistence bug is fixed. Additive Mini App memory is preserved when the legacy chatbot reloads or later saves a cached user record.
- The Portfolio editor is rendered outside the animated page stack, and its coral Save Section action is pinned above the device safe area and global navigation.
- First launch asks every student to type the name UniVentureAI should use. Telegram still provides secure identity, but not the displayed name.
- Global navigation is now Home, Discover, Prep, AI Coach, and Portfolio. Portfolio is the rightmost item.
- Discover is visible to all authenticated students, including expired users. It includes opportunity filters and visual deadline cards that link to official university pages.
- AI Coach restores the chatbot-style Brainstorm Ideas and Rewrite My Text workflows using shared memory and topic-specific RAG.
- SAT Studio supports Math and Reading & Writing with a seven-day sprint and a mistake-analysis mode.
- IELTS is a four-skill lab: Writing, Speaking, Reading, and Listening each receive a distinct coaching lens.
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
- All backend unit tests passed.
- The React/TypeScript production build completed successfully.
- Browser-rendered QA passed at 390 × 844 with all primary home interactions, five global navigation items, Family Brief, five activity slots, five award slots, and the pinned editor action verified.
- Browser console and page errors: none in the local application harness.
