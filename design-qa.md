# UniVentureAI Premium V6 — Design QA

## Evidence

- Source visual truth: `/workspace/scratch/1c9e578a9128/upload/Screenshot 2026-09-06 at 7.07.53 PM.png` for the current bottom navigation, plus the existing cream/navy/cobalt visual system in the product source.
- Prior V3 browser evidence: `qa-v3/01-home-refined-390x844.png` and `qa-v3/03-flight-plan-builder-viewport-390x844.png`.
- Current V6 browser-rendered implementation screenshot: unavailable.
- Intended viewport: 390 × 844 CSS px at device scale factor 1, plus 360 × 800 and 430 × 932 responsive checks.
- State: authenticated paid student viewing simplified Home, the complete Tools directory, compact Plan, and persistent navigation.

## Findings

- [P2] Current visual comparison is unavailable.
  - Location: V6 Home, Tools, Plan, and bottom navigation.
  - Evidence: this Work session does not expose a cloud browser or current implementation capture. Prior screenshots do not contain the V6 simplified screens and cannot be reused as proof.
  - Impact: production build and code-level responsive safeguards pass, but exact Telegram WebView wrapping and spacing have not been checked from current pixels.
  - Fix: capture Home, Tools, Plan, EC Evaluation, and Recommendation Letters at 390 × 844 in Telegram/WebKit or an approved browser; check console errors and compare against the source visual system.

## Required fidelity surfaces

- Fonts and typography: existing Georgia/Inter-style hierarchy is preserved; new labels use compact optical weights and line clamps; current pixel verification is blocked.
- Spacing and layout rhythm: the 560 px shell and mobile spacing tokens are preserved; new rows use 54–92 px tap surfaces and the center Tools control has safe-area-aware clearance; current pixel verification is blocked.
- Colors and visual tokens: existing cream/navy/cobalt/teal/gold system is extended with the established violet Tools accent; current pixel verification is blocked.
- Image quality and asset fidelity: existing doorway and Uzbek motif assets are unchanged; no new raster assets were needed.
- Copy and content: Home removes duplicated trajectory, opportunity, agenda, and detailed dimension copy; all 12 tools use short student-facing names; current wrapping verification is blocked.

## Functional verification

- React/TypeScript production build: passed.
- Python compilation: passed.
- Backend/product-flow unit tests: 10 passed.
- V6 navigation routes compile with distinct direct Brainstorm and Rewrite entries.
- Tool directory contains 12 named workspaces across four goal categories.
- Roadmap derives progress from live dashboard data without adding a new persistence contract.
- Exact SAT-logistics classification: reminder mode with SAT Quest fallback.
- `.gitignore` catalog regression: fixed by anchoring the runtime data exclusion to `/data/`.

## Implementation checklist

- [x] Task-aware Home routing and reminder fallback
- [x] Structured, readable Venture responses and visible teal caret
- [x] Clear onboarding Next action
- [x] Persistent SAT/IELTS streak
- [x] Useful bell signal desk and saved read state
- [x] iOS-safe Flight Plan deadline row
- [x] Five-purpose global navigation with shorter labels
- [x] Elevated searchable Tools hub with every tool visible by default
- [x] Direct Essay Evaluation, Brainstorm and Rewrite actions
- [x] Data-grounded XP, levels, five steps, daily mission and compact weekly list
- [x] Simplified Home with no duplicated dashboard sections
- [ ] Browser-rendered V6 capture and visual comparison

final result: blocked
