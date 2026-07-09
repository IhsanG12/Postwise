-- The 001_initial_schema.sql file and the app's own signup grant
-- (SIGNUP_FREE_CREDITS in web/app/api/me/route.ts) both agree new users get
-- 3 free credits, but the column default on the already-applied table drifted
-- to 0. Harmless today since the app always sets credits explicitly on first
-- login rather than relying on the column default, but this closes the gap
-- so a future insert outside that code path doesn't silently create a
-- 0-credit user. Run in Supabase SQL editor or via `supabase db push`.

alter table public.users
  alter column credits set default 3;
