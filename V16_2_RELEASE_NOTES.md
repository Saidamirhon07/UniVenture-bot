# UniVentureAI V16.2 — Copyable AI Results

V16.2 contains the complete V16.1 release and adds consistent copy controls to generated results.

## Changes

- Every structured AI report now has **Copy full feedback**.
- Every result section has its own **Copy** action.
- Rewritten extracurricular descriptions have **Copy rewrite**.
- Essay Rewrite results, targeted essay revisions, brainstorm outputs, recommendation material, EC reports, portfolio reviews, SAT coaching, IELTS feedback and Quick Checks inherit the shared controls.
- Copy buttons confirm success with **Copied** and Telegram haptic feedback.
- A hidden selection fallback supports Telegram/iOS environments where the modern Clipboard API is unavailable.
- Failed copying shows **Select manually** instead of silently doing nothing. The generated text remains selectable.
- Copy controls stay compact on narrow screens and retain accessible labels when their visible text is hidden.

## Verification

- Production TypeScript and Vite build passed.
- Result rendering checks passed for full-report, section and rewritten-activity copy actions.
- Plain-text conversion includes rewritten essay content.
- Existing practice selection checks passed.
- Browser execution remains pending because Chromium could not be installed in this environment. Confirm copy behavior on a real iPhone and Android device after deployment.

No Railway variables or database migration are required. Existing profiles, payments and `/data` contents are preserved.
