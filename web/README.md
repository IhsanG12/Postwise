# Frontend

Next.js (React) + TypeScript. Built from `mockup/index.html`, which is the
approved visual + behavioral reference (a prototype with placeholder data — NOT
the real frontend).

## Rules
- **Never call an AI provider directly.** Only call our own `/api/...` endpoints
  defined in `../docs/larp-ai-api-contract.md`.
- **No API keys, ever.** Nothing secret in frontend code or the browser.
- **No caption/sound/image logic** client-side — render what the job returns.

## Build approach
Develop fully against a **mock API layer** that returns the contract's shapes
before the backend exists. Swap mocks for real `fetch` calls once endpoints are
live, then test the full async flow (create job → poll → render → reroll).

## Design
Clean / minimal. Off-white `#FAFAF7`, near-black `#0B0B0C`, one champagne accent
`#B8945F`. Inter for UI, Instrument Serif (italic) for the hero word only.
Full reference: `mockup/index.html`.
