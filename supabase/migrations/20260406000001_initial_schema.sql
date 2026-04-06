-- ============================================================
-- PlainVoice — Initial Schema
-- Session 2 (corrected): organizations, organization_members,
--   voice_agents, phone_numbers, calls, contacts
-- ============================================================

-- ── updated_at trigger function ──────────────────────────────
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Organizations ────────────────────────────────────────────
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

-- ── Organization Members ─────────────────────────────────────
create table organization_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references organizations(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null default 'member'
                         check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create index organization_members_user_id_idx on organization_members(user_id);

-- ── Voice Agents ─────────────────────────────────────────────
create table voice_agents (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references organizations(id) on delete cascade,
  vapi_agent_id text,
  name          text        not null,
  status        text        not null default 'active'
                            check (status in ('active', 'inactive', 'draft')),
  language      text        not null default 'fr-CA',
  system_prompt text,
  first_message text,
  voice_id      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger voice_agents_updated_at
  before update on voice_agents
  for each row execute procedure trigger_set_updated_at();

create index voice_agents_org_id_status_idx on voice_agents(org_id, status);

-- ── Phone Numbers ────────────────────────────────────────────
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

create index phone_numbers_org_id_idx on phone_numbers(org_id);

-- ── Contacts (before calls — no FK dependency issue) ─────────
create table contacts (
  id                  uuid        primary key default gen_random_uuid(),
  org_id              uuid        not null references organizations(id) on delete cascade,
  first_name          text,
  last_name           text,
  phone               text,
  email               text,
  company             text,
  language_preference text        not null default 'fr'
                                  check (language_preference in ('fr', 'en')),
  tags                text[]      not null default '{}',
  lead_score          integer     not null default 0
                                  check (lead_score between 0 and 100),
  do_not_call         boolean     not null default false,
  consent_given_at    timestamptz,
  total_calls         integer     not null default 0,
  last_call_at        timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(org_id, phone)
);

create trigger contacts_updated_at
  before update on contacts
  for each row execute procedure trigger_set_updated_at();

create index contacts_org_id_phone_idx on contacts(org_id, phone);

-- ── Calls ────────────────────────────────────────────────────
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

create index calls_org_id_created_at_idx on calls(org_id, created_at desc);
create index calls_vapi_call_id_idx      on calls(vapi_call_id);
