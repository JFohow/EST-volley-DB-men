-- Applied manually to production on 2026-11-12. Do not re-run: the column rename is not repeatable.
--
-- Splits sets_played / sets_started into ALL and AM versions and keeps them
-- up to date with triggers on player_match_stats and appearances.

-- 1. Rename the existing columns and add the AM columns
alter table public.appearances rename column sets_played to sets_played_all;
alter table public.appearances rename column sets_started to sets_started_all;
alter table public.appearances alter column sets_played_all drop default;
alter table public.appearances alter column sets_played_all drop not null;
alter table public.appearances alter column sets_started_all drop default;
alter table public.appearances alter column sets_started_all drop not null;
alter table public.appearances add column sets_played_am integer null;
alter table public.appearances add column sets_started_am integer null;

-- 2. Recalculate every appearance in one match
create or replace function public.refresh_match_sets(p_match_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with pos as (
    select a.appearance_id,
           a.player_position_in_match = 'LIB' as is_lib,
           s.stats_version as ver,
           s.set1_position as p1, s.set2_position as p2, s.set3_position as p3,
           s.set4_position as p4, s.set5_position as p5, s.set6_position as p6
    from public.appearances a
    join public.player_match_stats s on s.appearance_id = a.appearance_id
    where a.match_id = p_match_id
  ),
  unpiv as (
    select pos.appearance_id, pos.is_lib, pos.ver, v.k, v.p
    from pos
    cross join lateral (values (1, pos.p1), (2, pos.p2), (3, pos.p3),
                               (4, pos.p4), (5, pos.p5), (6, pos.p6)) as v(k, p)
  ),
  flagged as (
    select u.appearance_id, u.ver, u.k, u.p,
           u.is_lib,
           count(*) filter (where u.is_lib and u.p is not null)
             over (partition by u.ver, u.k) as lib_entries
    from unpiv u
  ),
  agg as (
    select f.appearance_id, f.ver,
           count(*) filter (where f.p is not null) as played,
           count(*) filter (where f.p is not null and f.p <> '*') as started_plain,
           count(*) filter (where f.p = '*' and f.is_lib and f.lib_entries = 1) as started_lib_star
    from flagged f
    group by f.appearance_id, f.ver
  )
  update public.appearances a
  set
    sets_played_all  = (select g.played from agg g where g.appearance_id = a.appearance_id and g.ver = 'ALL'),
    sets_started_all = (select g.started_plain + g.started_lib_star from agg g where g.appearance_id = a.appearance_id and g.ver = 'ALL'),
    sets_played_am   = (select g.played from agg g where g.appearance_id = a.appearance_id and g.ver = 'AM'),
    sets_started_am  = (select g.started_plain + g.started_lib_star from agg g where g.appearance_id = a.appearance_id and g.ver = 'AM')
  where a.match_id = p_match_id;
end;
$$;

-- 3. Stats-row changes (insert, edit, delete) recalculate that match
create or replace function public.trg_player_match_stats_sets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m_old bigint;
  m_new bigint;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select match_id into m_old from public.appearances where appearance_id = old.appearance_id;
    if m_old is not null then perform public.refresh_match_sets(m_old); end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select match_id into m_new from public.appearances where appearance_id = new.appearance_id;
    if m_new is not null and m_new is distinct from m_old then perform public.refresh_match_sets(m_new); end if;
  end if;
  return null;
end;
$$;

drop trigger if exists player_match_stats_sets on public.player_match_stats;
create trigger player_match_stats_sets
after insert or update or delete on public.player_match_stats
for each row execute function public.trg_player_match_stats_sets();

-- 4. Appearance role or match changes, and appearance deletes, recalculate the match
create or replace function public.trg_appearances_sets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_match_sets(old.match_id);
    return null;
  end if;
  perform public.refresh_match_sets(new.match_id);
  if tg_op = 'UPDATE' and old.match_id is distinct from new.match_id then
    perform public.refresh_match_sets(old.match_id);
  end if;
  return null;
end;
$$;

drop trigger if exists appearances_sets on public.appearances;
create trigger appearances_sets
after update of player_position_in_match, match_id on public.appearances
for each row execute function public.trg_appearances_sets();

drop trigger if exists appearances_sets_delete on public.appearances;
create trigger appearances_sets_delete
after delete on public.appearances
for each row execute function public.trg_appearances_sets();

-- 5. Backfill every match
select public.refresh_match_sets(match_id) from (select distinct match_id from public.appearances) m;
