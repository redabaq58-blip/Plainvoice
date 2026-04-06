-- ============================================================
-- PlainVoice — Initial Schema
-- Session 2: core tables + indexes
-- ============================================================

-- ── Trigger helper ──────────────────────────────────────────
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Organizations (tenants) ──────────────────────────────────
create table organizations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on organizations
  for each row execute procedure trigger_set_updated_at();

-- ── Profiles (extends auth.users) ───────────────────────────
create table profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  org_id     uuid        not null references organizations(id) on delete cascade,
  role       text        not null default 'member'
                         check (role in ('owner', 'admin', 'member')),
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure trigger_set_updated_at();

create index profiles_org_id_idx on profiles(org_id);

-- ── Voice Agents (Vapi agent configurations) ────────────────
create table voice_agents (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references organizations(id) on delete cascade,
  vapi_agent_id text,
  name          text        not null,
  language      text        not null default 'fr-CA',
  system_prompt text,
  first_message text,
  voice_id      text,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger voice_agents_updated_at
  before update on voice_agents
  for each row execute procedure trigger_set_updated_at();

create index voice_agents_org_id_idx on voice_agents(org_id);

-- ── Phone Numbers (Twilio) ───────────────────────────────────
create table phone_numbers (
  id             uuid        primary key default gen_random_uuid(),
  org_id         uuid        not null references organizations(id) on delete cascade,
  twilio_sid     text        unique,
  phone_number   text        not null unique,
  friendly_name  text,
  voice_agent_id uuid        references voice_agents(id),
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger phone_numbers_updated_at
  before update on phone_numbers
  for each row execute procedure trigger_set_updated_at();

create index phone_numbers_org_id_idx on phone_numbers(org_id);

-- ── Calls (Vapi call logs) ───────────────────────────────────
create table calls (
  id               uuid        primary key default gen_random_uuid(),
  org_id           uuid        not null references organizations(id) on delete cascade,
  vapi_call_id     text        unique,
  voice_agent_id   uuid        references voice_agents(id),
  phone_number_id  uuid        references phone_numbers(id),
  caller_number    text,
  direction        text        not null check (direction in ('inbound', 'outbound')),
  status           text        not null default 'queued',
  duration_seconds integer,
  transcript       text,
  summary          text,
  recording_url    text,
  started_at       timestamptz,
  ended_at         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger calls_updated_at
  before update on calls
  for each row execute procedure trigger_set_updated_at();

create index calls_org_id_idx      on calls(org_id);
create index calls_vapi_call_id_idx on calls(vapi_call_id);
create index calls_started_at_idx  on calls(started_at desc);

-- ── Subscriptions (Stripe) ───────────────────────────────────
create table subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  org_id                 uuid        not null unique references organizations(id) on delete cascade,
  stripe_customer_id     text        unique,
  stripe_subscription_id text        unique,
  status                 text        not null default 'inactive',
  plan                   text        not null default 'starter',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure trigger_set_updated_at();

create index subscriptions_org_id_idx            on subscriptions(org_id);
create index subscriptions_stripe_customer_id_idx on subscriptions(stripe_customer_id);
