# UniVentureAI V15.1 — AI Reliability Hotfix

- Fixed the shared OpenAI wrapper hiding authentication, quota, model, timeout, and connection failures.
- Added safe user-facing error categories and short support reference IDs.
- Added automatic fallback to `gpt-4o-mini` when a configured model is unavailable.
- Added clear handling for Railway 502, 503, 504, 500, network, and overload responses.
- Corrected `/health` so a failed OpenAI call can no longer be reported as healthy.
- Restricted `/health` to `ADMIN_IDS`.
- Preserved V15 visuals, payments, freemium access, Venture, profiles, analytics, questions, and `/data` storage.

Verification completed: TypeScript compilation, Vite production build, Python compilation, eight practice-selection checks, and ZIP integrity. Python unit tests remain unavailable in this workspace because `pytest` is not installed. A live OpenAI call requires the production Railway credentials and must be checked with the included `/health` acceptance steps.
