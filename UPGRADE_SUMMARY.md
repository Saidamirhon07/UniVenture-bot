# UniVentureAI Mini App — Refined Product Upgrade

## What changed

- Portfolio now has structured, editable activity and award cards. Five slots appear immediately and students can add up to ten in each section.
- The full-review persistence bug is fixed. Additive Mini App memory is preserved when the legacy chatbot reloads or later saves a cached user record.
- The Portfolio editor is rendered outside the animated page stack, and its Save Section action is pinned above the device safe area.
- First launch asks every student to type the name UniVentureAI should use. Telegram still provides secure identity, but not the displayed name.
- Global navigation is now Home, Discover, Prep, AI Coach, and Portfolio. Portfolio is the rightmost item.
- Discover is visible to all authenticated students, including expired users. It includes opportunity filters and visual deadline cards that link to official university pages.
- AI Coach restores the chatbot-style Brainstorm Ideas and Rewrite My Text workflows using shared memory and topic-specific RAG.
- SAT Studio supports Math and Reading & Writing with a seven-day sprint and a mistake-analysis mode.
- IELTS is a four-skill lab: Writing, Speaking, Reading, and Listening each receive a distinct coaching lens.
- Feedback is stored in the user's Mini App memory and forwarded to configured Telegram admins.
- PDF, DOCX, TXT, and Markdown import is available in Essay Lab, AI Coach, EC Builder, IELTS, Recommendation Center, Portfolio Builder, Boost Tools, and SAT Mistake Lab.

## Deployment

Replace the existing `univenture_admissions_hub` folder on the `admissions-mini-app` branch with this version, commit it, and push. Railway should keep:

- Root Directory: `univenture_admissions_hub`
- Networking target port: `8080`
- Existing `/data` volume
- Existing production variables, including `RUN_TELEGRAM_BOT=1`

No data migration or new environment variable is required.

## Verification completed

- Python compilation completed successfully.
- All backend unit tests passed.
- The React/TypeScript production build completed successfully.
