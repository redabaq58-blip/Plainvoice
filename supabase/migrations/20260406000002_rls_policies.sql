-- ============================================================
-- PlainVoice — Row Level Security Policies
-- Session 2 (corrected): multi-org pattern via organization_members
-- ============================================================

-- ── Helper: returns all org_ids the current user belongs to ──
-- Returns uuid[] (array) so it works inside RLS policy expressions
-- with = ANY(...). setof uuid is not allowed in policy contexts.
create or replace function get_user_org_ids()
returns uuid[]
language sql
security definer
stable
as $$
  select coalesce(array_agg(org_id), '{}')
  from organization_members
  where user_id = auth.uid();
$$;

-- ── Enable RLS on all 6 tables ───────────────────────────────
alter table organizations        enable row level security;
alter table organization_members enable row level security;
alter table voice_agents         enable row level security;
alter table phone_numbers        enable row level security;
alter table calls                enable row level security;
alter table contacts             enable row level security;

-- ── ORGANIZATIONS ────────────────────────────────────────────

create policy "organizations_select" on organizations
  for select to authenticated
  using (id = any(get_user_org_ids()));

create policy "organizations_insert" on organizations
  for insert to authenticated
  with check (true);

create policy "organizations_update" on organizations
  for update to authenticated
  using  (id = any(get_user_org_ids()))
  with check (id = any(get_user_org_ids()));

create policy "organizations_delete" on organizations
  for delete to authenticated
  using (id = any(get_user_org_ids()));

-- ── ORGANIZATION MEMBERS ─────────────────────────────────────

create policy "organization_members_select" on organization_members
  for select to authenticated
  using (org_id = any(get_user_org_ids()));

create policy "organization_members_insert" on organization_members
  for insert to authenticated
  with check (org_id = any(get_user_org_ids()));

create policy "organization_members_update" on organization_members
  for update to authenticated
  using  (org_id = any(get_user_org_ids()))
  with check (org_id = any(get_user_org_ids()));

create policy "organization_members_delete" on organization_members
  for delete to authenticated
  using (org_id = any(get_user_org_ids()));

-- ── VOICE AGENTS ─────────────────────────────────────────────

create policy "voice_agents_select" on voice_agents
  for select to authenticated
  using (org_id = any(get_user_org_ids()));

create policy "voice_agents_insert" on voice_agents
  for insert to authenticated
  with check (org_id = any(get_user_org_ids()));

create policy "voice_agents_update" on voice_agents
  for update to authenticated
  using  (org_id = any(get_user_org_ids()))
  with check (org_id = any(get_user_org_ids()));

create policy "voice_agents_delete" on voice_agents
  for delete to authenticated
  using (org_id = any(get_user_org_ids()));

-- ── PHONE NUMBERS ────────────────────────────────────────────

create policy "phone_numbers_select" on phone_numbers
  for select to authenticated
  using (org_id = any(get_user_org_ids()));

create policy "phone_numbers_insert" on phone_numbers
  for insert to authenticated
  with check (org_id = any(get_user_org_ids()));

create policy "phone_numbers_update" on phone_numbers
  for update to authenticated
  using  (org_id = any(get_user_org_ids()))
  with check (org_id = any(get_user_org_ids()));

create policy "phone_numbers_delete" on phone_numbers
  for delete to authenticated
  using (org_id = any(get_user_org_ids()));

-- ── CALLS ────────────────────────────────────────────────────

create policy "calls_select" on calls
  for select to authenticated
  using (org_id = any(get_user_org_ids()));

create policy "calls_insert" on calls
  for insert to authenticated
  with check (org_id = any(get_user_org_ids()));

create policy "calls_update" on calls
  for update to authenticated
  using  (org_id = any(get_user_org_ids()))
  with check (org_id = any(get_user_org_ids()));

create policy "calls_delete" on calls
  for delete to authenticated
  using (org_id = any(get_user_org_ids()));

-- ── CONTACTS ─────────────────────────────────────────────────

create policy "contacts_select" on contacts
  for select to authenticated
  using (org_id = any(get_user_org_ids()));

create policy "contacts_insert" on contacts
  for insert to authenticated
  with check (org_id = any(get_user_org_ids()));

create policy "contacts_update" on contacts
  for update to authenticated
  using  (org_id = any(get_user_org_ids()))
  with check (org_id = any(get_user_org_ids()));

create policy "contacts_delete" on contacts
  for delete to authenticated
  using (org_id = any(get_user_org_ids()));
