# Backend

Serverless API routes / functions. Holds all secrets and all AI orchestration.

## Source of truth
`../docs/larp-ai-api-contract.md`. Implement these exact endpoints, field names,
and shapes. **If a change is needed, edit the contract doc first, then code.**

Endpoints to implement:
- `POST /api/generations` → returns `jobId` immediately (async, does not wait)
- `GET  /api/generations/{jobId}` → poll until `status: "complete"`
- `POST /api/generations/{jobId}/assets/{assetId}/reroll` → re-generate one asset
- `POST /api/uploads` → selfie upload (multipart), returns `uploadId`
- `GET  /api/me` → plan + credits + rerolls for the nav indicator

## Rules
- **API keys live only in `.env`** (gitignored). Never in code, never committed,
  never shipped to the browser. Add a `.env.example` with key names only.
- **Generation is async:** create job → return `jobId` → client polls.
- **Captions + sounds are generated here, inside the job**, informed by the
  `sceneTag`s actually produced + the platform. The frontend has no such logic.
- Owns model choice, credit cost, temporary selfie storage + deletion, safety.

## Safety (see `../CLAUDE.md` — non-negotiable)
Generate fake, never alter real. Selfie = user's own face, deleted after use.
No real brand logos/trademarks. Prop money only. No fake financial documents.
No earnings/income claims. When unsure, stop and flag.

## AI providers (swappable, backend-only)
Image model (stills), short-video model (clips), text model (captions). Pick on
current cost/quality/ToS — re-check, they change fast.
