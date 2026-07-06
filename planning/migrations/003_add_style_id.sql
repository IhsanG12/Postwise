-- Adds the style anchor column so every image in a slideshow job can share
-- one consistent visual style (see web/lib/generation/styles.ts). Nullable —
-- video jobs don't use it (styleId is ignored for format="video").
-- Run in Supabase SQL editor or via `supabase db push`.

alter table public.jobs
  add column if not exists style_id text;
