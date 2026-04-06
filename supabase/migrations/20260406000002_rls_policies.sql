-- ============================================================
-- PlainVoice — Row Level Security Policies
-- Session 2: RLS on all tables
-- ============================================================

-- ── Helper functions (security definer = bypasses RLS) ──────

create or replace function get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ── Enable RLS on all tables ─────────────────────────────────
alter table organizations  enable row level security;
alter table profiles        enable row level security;
alter table voice_agents    enable row level security;
alter table phone_numbers   enable row level security;
alter table calls           enable row level security;
alter table subscriptions   enable row level security;

-- ── ORGANIZATIONS ────────────────────────────────────────────

-- Members can read their org
create policy "organizations_select" on organizations
  for select to authenticated
  using (id = get_my_org_id());

-- Owners can update their org
create policy "organizations_update" on organizations
  for update to authenticated
  using  (id = get_my_org_id() and get_my_role() = 'owner')
  with check (id = get_my_org_id());

-- Only service role can insert orgs (signup flow via API)
create policy "organizations_insert_service" on organizations
  for insert to service_role
  with check (true);

-- ── PROFILES ─────────────────────────────────────────────────

-- Users can see all profiles in their org (e.g. team listing)
create policy "profiles_select" on profiles
  for select to authenticated
  using (org_id = get_my_org_id());

-- Users can update only their own profile
create policy "profiles_update_own" on profiles
  for update to authenticated
  using  (id = auth.uid())
  with check (id = auth.uid());

-- Only service role can insert profiles (signup trigger)
create policy "profiles_insert_service" on profiles
  for insert to service_role
  with check (true);

-- ── VOICE AGENTS ─────────────────────────────────────────────

create policy "voice_agents_select" on voice_agents
  for select to authenticated
  using (org_id = get_my_org_id());

create policy "voice_agents_insert" on voice_agents
  for insert to authenticated
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'admin'));

create policy "voice_agents_update" on voice_agents
  for update to authenticated
  using  (org_id = get_my_org_id() and get_my_role() in ('owner', 'admin'))
  with check (org_id = get_my_org_id());

create policy "voice_agents_delete" on voice_agents
  for delete to authenticated
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'admin'));

-- ── PHONE NUMBERS ────────────────────────────────────────────

create policy "phone_numbers_select" on phone_numbers
  for select to authenticated
  using (org_id = get_my_org_id());

create policy "phone_numbers_insert" on phone_numbers
  for insert to authenticated
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'admin'));

create policy "phone_numbers_update" on phone_numbers
  for update to authenticated
  using  (org_id = get_my_org_id() and get_my_role() in ('owner', 'admin'))
  with check (org_id = get_my_org_id());

create policy "phone_numbers_delete" on phone_numbers
  for delete to authenticated
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'admin'));

-- ── CALLS ────────────────────────────────────────────────────

-- All org members can read calls
create policy "calls_select" on calls
  for select to authenticated
  using (org_id = get_my_org_id());

-- Only service role inserts/updates calls (via Vapi webhooks in API)
create policy "calls_insert_service" on calls
  for insert to service_role
  with check (true);

create policy "calls_update_service" on calls
  for update to service_role
  using  (true)
  with check (true);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────

-- Org members can read their subscription
create policy "subscriptions_select" on subscriptions
  for select to authenticated
  using (org_id = get_my_org_id());

-- Only service role manages subscriptions (Stripe webhook handler)
create policy "subscriptions_insert_service" on subscriptions
  for insert to service_role
  with check (true);

create policy "subscriptions_update_service" on subscriptions
  for update to service_role
  using  (true)
  with check (true);
