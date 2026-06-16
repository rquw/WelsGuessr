-- ============================================================
--  Projekt Guessr — Gesamtpunkte-Zähler + Details + Meilenstein
--  Einmal im Supabase SQL-Editor ausführen. Idempotent.
-- ============================================================

-- 1) Kleine Konfig-Tabelle (z.B. Meilenstein), permissiv wie der Rest
create table if not exists public.wels_config (key text primary key, value text);
alter table public.wels_config enable row level security;
do $cfg$
begin
  execute 'drop policy if exists wels_config_all on public.wels_config';
  execute 'create policy wels_config_all on public.wels_config for all to anon, authenticated using (true) with check (true)';
end
$cfg$;
grant all on public.wels_config to anon, authenticated;
insert into public.wels_config(key, value) values ('milestone', '') on conflict (key) do nothing;

-- 2) Kombinierte Statistik für den Zähler + Detail-Popup
create or replace function public.wels_points_stats()
returns json
language sql
stable
security definer
as $$
  with vm as (
    select ((now() at time zone 'Europe/Vienna')::date)::timestamp at time zone 'Europe/Vienna' as t
  ),
  topc as (
    select name, sum(score) s from public.wels_scores group by name order by sum(score) desc limit 1
  )
  select json_build_object(
    'total',      coalesce((select sum(score) from public.wels_scores), 0),
    'today',      coalesce((select sum(score) from public.wels_scores, vm where created_at >= vm.t), 0),
    'top_name',   (select name from topc),
    'top_points', coalesce((select s from topc), 0),
    'milestone',  (select value from public.wels_config where key = 'milestone')
  )
$$;
grant execute on function public.wels_points_stats() to anon, authenticated;
