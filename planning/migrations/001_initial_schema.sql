-- Larp AI initial schema
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────────────────────

create type plan_type    as enum ('free', 'larper', 'pro');
create type job_status   as enum ('processing', 'complete', 'failed');
create type platform_type as enum ('instagram', 'tiktok');
create type format_type  as enum ('slideshow', 'video');
create type asset_type   as enum ('image', 'video');

-- ── Tables ───────────────────────────────────────────────────────────────────

-- Mirrors auth.users; one row per authenticated user.
create table public.users (
  id                 uuid         primary key references auth.users(id) on delete cascade,
  email              text         not null unique,
  plan               plan_type    not null default 'free',
  credits            int          not null default 3,
  rerolls_remaining  int          not null default 5,
  unlimited          bool         not null default false,
  created_at         timestamptz  not null default now()
);

-- Temporary selfie uploads; deleted after generation (see retention policy).
create table public.uploads (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  url         text        not null,
  expires_at  timestamptz not null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- One row per generation request.
create table public.jobs (
  id                uuid          primary key default uuid_generate_v4(),
  user_id           uuid          not null references public.users(id) on delete cascade,
  status            job_status    not null default 'processing',
  progress          float         not null default 0,
  platform          platform_type not null,
  format            format_type   not null,
  with_face         bool          not null default false,
  selfie_upload_id  uuid          references public.uploads(id) on delete set null,
  count             int           not null default 1,
  error             text,
  created_at        timestamptz   not null default now(),
  completed_at      timestamptz
);

-- Individual images or video clips produced by a job.
create table public.assets (
  id          uuid        primary key default uuid_generate_v4(),
  job_id      uuid        not null references public.jobs(id) on delete cascade,
  type        asset_type  not null,
  url         text        not null,
  thumb_url   text,
  width       int,
  height      int,
  scene_tag   text,
  rerollable  bool        not null default true,
  created_at  timestamptz not null default now()
);

-- Caption suggestions generated alongside each job.
create table public.captions (
  id      uuid  primary key default uuid_generate_v4(),
  job_id  uuid  not null references public.jobs(id) on delete cascade,
  text    text  not null,
  tone    text  not null
);

-- Trending sound suggestions generated alongside each job.
create table public.sounds (
  id        uuid          primary key default uuid_generate_v4(),
  job_id    uuid          not null references public.jobs(id) on delete cascade,
  title     text          not null,
  meta      text,
  platform  platform_type not null,
  open_url  text          not null
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index on public.jobs(user_id);
create index on public.jobs(status);
create index on public.uploads(user_id);
create index on public.assets(job_id);
create index on public.captions(job_id);
create index on public.sounds(job_id);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.users    enable row level security;
alter table public.uploads  enable row level security;
alter table public.jobs     enable row level security;
alter table public.assets   enable row level security;
alter table public.captions enable row level security;
alter table public.sounds   enable row level security;

-- users: own row only
create policy "users_own"
  on public.users for all
  using (id = auth.uid());

-- uploads: own rows only
create policy "uploads_own"
  on public.uploads for all
  using (user_id = auth.uid());

-- jobs: own rows only
create policy "jobs_own"
  on public.jobs for all
  using (user_id = auth.uid());

-- assets: readable/writable only if the parent job belongs to the user
create policy "assets_via_job"
  on public.assets for all
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = assets.job_id
        and jobs.user_id = auth.uid()
    )
  );

-- captions: same via job
create policy "captions_via_job"
  on public.captions for all
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = captions.job_id
        and jobs.user_id = auth.uid()
    )
  );

-- sounds: same via job
create policy "sounds_via_job"
  on public.sounds for all
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = sounds.job_id
        and jobs.user_id = auth.uid()
    )
  );
