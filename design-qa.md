# UniVentureAI Premium V4 — Design QA

## Evidence

- Source visual truth: `/workspace/scratch/1c9e578a9128/upload/image(9).png`, `/workspace/scratch/1c9e578a9128/upload/image(10).png`, and `/workspace/scratch/1c9e578a9128/upload/telegram-cloud-photo-size-2-5454415897226321633-w.jpg`.
- Prior V3 browser evidence: `qa-v3/01-home-refined-390x844.png` and `qa-v3/03-flight-plan-builder-viewport-390x844.png`.
- Current V4 browser-rendered implementation screenshot: unavailable.
- Intended viewport: 390 × 844 CSS px at device scale factor 1, plus 360 × 800 and 430 × 932 responsive checks.
- State: authenticated paid student, populated profile, SAT-logistics next move, notification center, reminder sheet, Venture response, onboarding step, and Flight Plan intake.

## Findings

- [P2] Current visual comparison is unavailable.
  - Location: V4 Home overlays, onboarding navigation, streak surfaces, Venture response card, and Flight Plan mobile form.
  - Evidence: source screenshots are available, but this Work session did not expose a cloud browser or current implementation capture. Prior V3 screenshots do not contain the new states and cannot be reused as V4 proof.
  - Impact: production build and code-level responsive safeguards pass, but exact WebKit rendering, focus caret visibility, and overlay spacing have not been compared from pixels.
  - Fix: capture the six V4 states in Telegram/WebKit or an approved browser at 390 × 844, check console/network failures, and compare them with the attached references.

## Required fidelity surfaces

- Fonts and typography: unchanged premium Georgia/Inter-style hierarchy; current pixel verification blocked.
- Spacing and layout rhythm: existing tokens retained; the iOS-sensitive deadline row now stacks below 430 px; current pixel verification blocked.
- Colors and visual tokens: existing cream/navy/cobalt/teal/gold system retained; Venture caret explicitly uses teal `#0a8a7d`; current pixel verification blocked.
- Image quality and asset fidelity: existing doorway and Uzbek motif assets are unchanged; no new raster assets were needed.
- Copy and content: Venture uses plain student-facing content, dynamic action labels, short notification copy, and explicit reminder choices; current wrapping verification blocked.

## Functional verification

- React/TypeScript production build: passed.
- Python compilation: passed.
- Backend/product-flow unit tests: 10 passed.
- Exact SAT-logistics classification: reminder mode with SAT Quest fallback.
- `.gitignore` catalog regression: fixed by anchoring the runtime data exclusion to `/data/`.

## Implementation checklist

- [x] Task-aware Home routing and reminder fallback
- [x] Structured, readable Venture responses and visible teal caret
- [x] Clear onboarding Next action
- [x] Persistent SAT/IELTS streak
- [x] Useful bell signal desk and saved read state
- [x] iOS-safe Flight Plan deadline row
- [ ] Browser-rendered V4 capture and visual comparison

final result: blocked
