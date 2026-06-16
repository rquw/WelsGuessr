-- ============================================================
--  Projekt Guessr — Profile (Bild, Banner, Kontonummer)
--  Einmal im Supabase SQL-Editor ausführen (geteiltes Projekt für
--  alle drei Seiten — players ist NICHT prefixed). Idempotent.
-- ============================================================

-- 1) Avatar + Profil-Banner (Bilder liegen auf Cloudinary, hier nur die Links)
alter table public.players add column if not exists avatar_url        text;
alter table public.players add column if not exists profile_banner_url text;

-- 2) Kontonummer (fortlaufend, in Reihenfolge der Erstellung)
alter table public.players add column if not exists account_number int;

-- Bestehende Accounts in Erstellungsreihenfolge (id steigt mit jeder Anmeldung) durchnummerieren
update public.players p
set account_number = sub.rn
from (select id, row_number() over (order by id) rn from public.players) sub
where p.id = sub.id and p.account_number is null;

-- Sequenz für neue Accounts, beginnend nach der höchsten vorhandenen Nummer
create sequence if not exists players_acct_seq;
select setval('players_acct_seq', coalesce((select max(account_number) from public.players), 0) + 1, false);
alter table public.players alter column account_number set default nextval('players_acct_seq');

-- eindeutige, schnelle Suche per Nummer
create unique index if not exists players_account_number_uniq on public.players (account_number);
