# Larp AI

Web app that makes "larp" content — fun, aspirational, AI-generated luxury photos
and short videos for social media. Pick a platform (Instagram / TikTok), pick a
format (slideshow / short video), optionally add a selfie or go faceless, and get
a ready-to-post set of images/clips plus caption ideas and trending-sound
suggestions.

It is an **entertainment / lifestyle content tool**. Never sold as a way to make
money or achieve real-world success. See the safety rules in `CLAUDE.md`.

## Repo structure

```
/                     repo root
├─ CLAUDE.md          standing instructions — READ FIRST
├─ docs/
│  ├─ larp-ai-api-contract.md   the frontend↔backend agreement (SOURCE OF TRUTH)
│  └─ larp-ai-handoff-brief.md  full project summary / context
├─ web/               the whole app — one Next.js project
│  ├─ app/                     pages and UI
│  ├─ app/api/                 API routes (the backend)
│  ├─ lib/                     server-side helpers, AI generation, DB client
│  └─ mockup/index.html        visual + behavioral reference (prototype, not the app)
└─ planning/          session docs, TODO lists, migrations — not code
```

## Where to start

Read `CLAUDE.md` and `docs/larp-ai-api-contract.md` first, every session. The
contract doc is the law — same field names, same shapes. **If a change is
needed, edit the contract doc first, then code.**

Build in `/web`. UI work lives in `app/` and `components/`; API routes and
server-side logic live in `app/api/` and `lib/`. Copy `web/.env.example` to
`web/.env` and fill in real values (never commit `.env`). Generation is
async: create job → return `jobId` → client polls. Captions + sounds are
generated server-side inside the job.

## Workflow

- One shared repo. **Pull before you start, commit small, push often.**
- The contract doc is the source of truth; code follows the doc.
- When unsure whether something crosses a safety rule in `CLAUDE.md`, stop and
  flag it rather than guessing.
