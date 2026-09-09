# UniVentureAI V14 — Question Factory and Portfolio Reliability

## Portfolio fix

- Profile now loads from a dedicated authenticated `/api/portfolio` endpoint.
- Incomplete server responses no longer leave the screen loading forever.
- A visible error and retry action replace the permanent loader if a request fails.

## Reviewed question factory

The private Founder Pulse dashboard now contains a content engine with these targets:

- SAT Math: 150
- SAT Reading and Writing: 150
- IELTS Reading: 100
- IELTS Listening: 100
- IELTS Writing: 50
- IELTS Speaking: 50

Every generated batch follows this release gate:

1. Strong AI generation for one exact category.
2. Separate AI assessment-editor review.
3. Schema, length, answer-index and four-unique-option validation.
4. Exact normalized duplicate rejection.
5. Minimum 90% reviewer confidence.
6. Founder preview with individual Publish or Reject controls.
7. Optional bulk publication of all verified questions.

Generated material is never shown to students until it is published by an admin. It is original practice and is not represented as official SAT or IELTS material.

## Student selection

- Published objective questions join the existing question bank immediately.
- Published IELTS Writing and Speaking prompts appear in their correct studios.
- Each student has an individual seen-question record.
- Unseen questions are selected first for free and Premium users.
- Missed questions can return for deliberate review.
- Free users retain separate daily SAT and IELTS allowances.

## Persistence and capacity

- Generated content is stored at `QUESTION_BANK_PATH` on `/data`.
- Writes are atomic.
- The three most recent question-bank versions are retained as compressed rotating backups.
- Student recordings remain local to the device and are not uploaded or stored.
- Existing user profiles, payments, analytics and practice records are preserved.

## Important launch truth

The release contains the factory and the existing seed bank. It does not pretend that 556 additional questions were human-approved in this build environment. Use Founder Pulse to generate, inspect and publish batches until each target is reached. Generation and review use your configured OpenAI account and therefore consume API credits.

## Verification

- Production TypeScript/Vite build passed.
- Python compilation passed.
- 47 executable Python tests passed; 9 API integration tests are included but skipped in this workspace because FastAPI is unavailable here.
- 8 practice-selection checks passed.
- Live Telegram, live OpenAI generation and Railway-volume restoration still require the acceptance test in `V14_APPLY_STEPS.md`.
