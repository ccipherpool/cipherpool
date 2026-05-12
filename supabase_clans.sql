-- ══════════════════════════════════════════════════════════════
-- CipherPool — Clans & Clan Members tables
-- Run this in your Supabase SQL editor
-- ══════════════════════════════════════════════════════════════

-- 1. CLANS
create table if not exists public.clans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tag           text not null,
  description   text,
  rules         text,
  requirements  text,
  logo_url      text,
  accent_color  text not null default '#a855f7',
  is_open       boolean not null default true,
  leader_id     uuid not null references public.profiles(id) on delete cascade,
  points        integer not null default 0,
  wins          integer not null default 0,
  losses        integer not null default 0,
  discord_link  text,
  whatsapp_link text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint clans_name_unique unique (name),
  constraint clans_tag_unique  unique (tag)
);

-- 2. CLAN_MEMBERS
create table if not exists public.clan_members (
  id        uuid primary key default gen_random_uuid(),
  clan_id   uuid not null references public.clans(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member'
              check (role in ('leader', 'co-leader', 'member')),
  joined_at timestamptz not null default now(),
  constraint clan_members_user_unique unique (user_id)
);

-- 3. INDEXES
create index if not exists clan_members_clan_id_idx on public.clan_members(clan_id);
create index if not exists clan_members_user_id_idx on public.clan_members(user_id);
create index if not exists clans_points_idx         on public.clans(points desc);
create index if not exists clans_leader_id_idx      on public.clans(leader_id);

-- 4. AUTO updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clans_set_updated_at on public.clans;
create trigger clans_set_updated_at
  before update on public.clans
  for each row execute procedure public.set_updated_at();

-- 5. RLS
alter table public.clans        enable row level security;
alter table public.clan_members enable row level security;

-- ── CLANS policies ──
drop policy if exists "clans_select"        on public.clans;
drop policy if exists "clans_insert"        on public.clans;
drop policy if exists "clans_update_leader" on public.clans;
drop policy if exists "clans_delete_leader" on public.clans;
drop policy if exists "clans_admin_all"     on public.clans;

create policy "clans_select" on public.clans
  for select using (true);

create policy "clans_insert" on public.clans
  for insert with check (auth.uid() = leader_id);

create policy "clans_update_leader" on public.clans
  for update using (auth.uid() = leader_id);

create policy "clans_delete_leader" on public.clans
  for delete using (auth.uid() = leader_id);

create policy "clans_admin_all" on public.clans
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- ── CLAN_MEMBERS policies ──
drop policy if exists "members_select"        on public.clan_members;
drop policy if exists "members_insert"        on public.clan_members;
drop policy if exists "members_delete_self"   on public.clan_members;
drop policy if exists "members_leader_manage" on public.clan_members;
drop policy if exists "members_admin_all"     on public.clan_members;

create policy "members_select" on public.clan_members
  for select using (true);

create policy "members_insert" on public.clan_members
  for insert with check (auth.uid() = user_id);

create policy "members_delete_self" on public.clan_members
  for delete using (auth.uid() = user_id);

create policy "members_leader_manage" on public.clan_members
  for all using (
    exists (
      select 1 from public.clans
      where id = clan_id and leader_id = auth.uid()
    )
  );

create policy "members_admin_all" on public.clan_members
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
