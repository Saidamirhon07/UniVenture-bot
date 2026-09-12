# UniVentureAI V15.3 — Critical AI Runtime Fix

- Fixed the confirmed missing `asyncio` import in `backend/legacy.py`.
- Restored RAG loading for Essay Review, EC Evaluation, Brainstorm, Rewrite, recommendations, portfolio review, and other AI-backed Mini App tools.
- Prevented INFO-level `httpx` logs from printing Telegram request URLs containing the bot token.
- Preserved the V15 visual upgrade and V15.1/V15.2 AI diagnostics and retries.
- Does not alter payments, permissions, user profiles, subscriptions, question history, Chroma data, or `/data` storage.

Verification completed: direct `load_rag` async regression check, Python compilation, TypeScript compilation, eight practice-selection checks, and ZIP integrity. Production credentials remain testable only after Railway deployment.
