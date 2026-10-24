# web

The whole app — one Next.js (React) + TypeScript project. UI and API routes
live side by side; there's no separate backend service.

```
app/            pages and UI
app/api/        API routes — the backend. Owns AI provider calls, DB access, secrets.
lib/            server-side helpers: AI generation, Supabase client, auth
components/     shared UI components
mockup/         index.html — approved visual + behavioral reference (prototype, not the app)
```

## Setup

```
npm install
cp .env.example .env   # fill in real values — never commit .env
npm run dev
npm test
```

See `.env.example` for the full list of required keys (Supabase, Gemini, Stripe,
cron secret, etc.).

## Rules

- **Frontend UI never calls an AI provider directly.** Only call our own
  `/api/...` endpoints defined in `../docs/api-contract.md`.
- **No API keys in UI code or shipped to the browser.** Secrets live in
  `app/api/`'s server-side code and `.env` only.
- **No caption/hashtag/sound/image logic in the UI** — render what the job returns.
- **Contract-first:** if an endpoint's shape needs to change, edit
  `../docs/api-contract.md` first, then code both sides to match.

## Design

Clean / minimal. Off-white `#FAFAF7`, near-black `#0B0B0C`, one champagne accent
`#B8945F`. Inter for UI, Instrument Serif (italic) for the hero word only.
Full reference: `mockup/index.html`.
