-- 005: pivot from Larp AI to Postwise.
--
-- Every job now starts from the creator's own brief ("5 study tips for finals
-- week"). The backend turns the brief into a post plan, and everything the
-- job produces (images, slide text, captions, hashtags, sound vibe) comes
-- from that plan instead of a hardcoded scene catalog.
--
-- Run in the Supabase SQL editor or via `supabase db push`.

-- The paid tier was called "larper". Renaming the enum value keeps existing
-- subscribers on the same plan with no data migration.
alter type plan_type rename value 'larper' to 'creator';

-- What the creator asked for, and the plan the planner made from it.
-- Rerolls read `plan` so a redrawn slide stays part of the same post.
alter table public.jobs
  add column if not exists brief text,
  add column if not exists plan  jsonb;

-- On-screen text for each slide (slide 1 is the hook). Null for video.
alter table public.assets
  add column if not exists slide_text text;
