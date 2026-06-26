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
├─ CLAUDE.md          standing instructions — READ FIRST (both devs)
├─ docs/
│  ├─ larp-ai-api-contract.md   the frontend↔backend agreement (SOURCE OF TRUTH)
│  └─ larp-ai-handoff-brief.md  full project summary / context
├─ frontend/          Next.js app (frontend dev)
│  └─ mockup/index.html         visual + behavioral reference (prototype, not the app)
└─ backend/           API + AI orchestration (backend dev)
```

## Where to start

**Both of you, every session:** read `CLAUDE.md` and
`docs/larp-ai-api-contract.md` first. The contract doc is the law — same field
names, same shapes. **If a change is needed, edit the contract doc first, then code.**

- **Frontend dev:** build in `/frontend` from the mockup. You can develop fully
  against a mock API layer that returns the contract's shapes before the backend
  exists, then swap mocks for real `fetch` calls.
- **Backend dev:** build in `/backend` to the contract. Hold all secret keys in
  `.env` (gitignored — never commit them). Generation is async: create job →
  return `jobId` → client polls. Captions + sounds are generated server-side
  inside the job.

## Workflow

- One shared private repo. **Pull before you start, commit small, push often.**
- The contract doc is the source of truth; code follows the doc.
- When unsure whether something crosses a safety rule in `CLAUDE.md`, stop and
  flag it rather than guessing.
