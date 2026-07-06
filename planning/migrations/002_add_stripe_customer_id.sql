-- Adds the column the Stripe webhook has needed since Phase 4 (see
-- frontend/app/api/webhooks/stripe/route.ts) to look up a user by their
-- Stripe customer id — required for customer.subscription.deleted to work
-- and for the billing portal endpoint to open the right customer's portal.
-- Run in Supabase SQL editor or via `supabase db push`.

alter table public.users
  add column if not exists stripe_customer_id text unique;

create index if not exists users_stripe_customer_id_idx
  on public.users(stripe_customer_id);
