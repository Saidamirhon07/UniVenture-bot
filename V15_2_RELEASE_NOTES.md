# UniVentureAI V15.2 — Structured AI Hotfix

- Detects when OpenAI stops because the response token limit was reached.
- Automatically retries truncated structured results with a larger response budget.
- Validates JSON before sending a result to the application.
- Automatically retries malformed JSON once with a strict repair instruction.
- Extends `/health` to test both the fast and strong models in JSON mode.
- Preserves the V15 visual upgrade and all V15.1 diagnostics.
- Does not modify user profiles, subscriptions, payments, questions, Chroma, or `/data` files.

Verification completed: TypeScript compilation, Vite production build, Python compilation, JSON validation checks, eight practice-selection checks, and ZIP integrity. Live fast/strong OpenAI checks require the Railway credentials and are covered by the post-deployment `/health` test.
