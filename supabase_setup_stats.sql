-- ============================================================
--  Projekt Guessr — Gesamtpunkte-Zähler (Startseite)
--  Einmal im Supabase SQL-Editor ausführen. Idempotent.
-- ============================================================

-- Summe aller je erspielten Punkte (Solo-Bestenliste wels_scores).
create or replace function public.wels_total_points()
returns bigint
language sql
stable
security definer
as $$
  select coalesce(sum(score), 0)::bigint from public.wels_scores
$$;

grant execute on function public.wels_total_points() to anon, authenticated;
