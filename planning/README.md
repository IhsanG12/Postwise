# Planning

Session docs and database migrations for Larp AI. Nothing in here is runnable
code — the app lives in `/web`. Read the root `CLAUDE.md` and
`docs/larp-ai-api-contract.md` first; this folder is history and reference, not
the source of truth.

## Files

- **`backend-TODO.md`** — phased build plan for the API routes / backend work
  (`web/app/api/`, `web/lib/`). Checked off as work completes.
- **`backend-PROMPTS.md`** — the session-by-session prompts used to build the
  backend, copy-pasted into Claude Code in order.
- **`frontend-TODO.md`** — same idea, for the UI (`web/app/`,
  `web/components/`).
- **`frontend-PROMPTS.md`** — session prompts for the frontend work.
- **`STATUS.md`** — running session log ("Session N completed..."). Gitignored —
  local only, not shared history.
- **`migrations/`** — SQL migration files, applied manually via the Supabase SQL
  editor (or `supabase db push`). Numbered in application order.
