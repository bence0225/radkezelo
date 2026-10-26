-- Raktárkezelő v0.7 — teljes séma (7 tábla + trigger + RLS)
-- Futtatás: Supabase Dashboard → SQL Editor → New query → beillesztés → Run.
-- Egyszer kell lefuttatni egy üres projekten (Postgres 15+ szükséges, a Supabase alapból ilyen).
--
-- Ha a Run mégis "unterminated dollar-quoted string" hibát ad: a Studio SQL Editor
-- RLS-asszisztense told bele sorokat a szkriptbe, és ez töri el. Ilyenkor a legbiztosabb
-- megoldás a Supabase CLI-vel futtatni, ami nem nyúl a szöveghez:
--   supabase db execute -f supabase/schema.sql --linked
-- vagy psql-lel a Dashboard → Project Settings → Database → Connection string alapján:
--   psql "<connection string>" -f supabase/schema.sql

-- ============================================================
-- 1. Táblák
-- ============================================================

-- Profil-tábla a Supabase beépített auth.users-éhez kapcsolva
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  nev        text not null,
  szerepkor  text not null default 'FELHASZNALO' check (szerepkor in ('ADMIN', 'FELHASZNALO')),
  aktiv      boolean not null default true
);

create table public.locations (
  id    bigint generated always as identity primary key,
  nev   text not null,
  aktiv boolean not null default true
);

create table public.user_locations (
  user_id     uuid   not null references public.users (id) on delete cascade,
  location_id bigint not null references public.locations (id) on delete cascade,
  primary key (user_id, location_id)
);

create table public.kategoriak (
  id               bigint generated always as identity primary key,
  nev              text not null unique,
  lot_kotelezo     boolean not null default false,
  lejarat_kotelezo boolean not null default false,
  aktiv            boolean not null default true
);

-- Felhasználási helyek: ahol a kivett anyagot ténylegesen felhasználják (pl. CT, MR, átvilágító)
create table public.felhasznalasi_helyek (
  id    bigint generated always as identity primary key,
  nev   text not null unique,
  aktiv boolean not null default true
);

create table public.products (
  id            bigint generated always as identity primary key,
  nev           text not null,
  cikkszam      text,                       -- EOS azonosító, csak szabad szöveg
  mertekegyseg  text not null,              -- pl. db, ml
  kategoria_id  bigint not null references public.kategoriak (id),
  min_mennyiseg numeric(12, 3),
  aktiv         boolean not null default true
);

create table public.stock (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id),
  location_id bigint not null references public.locations (id),
  lot         text,
  lejarat     date,
  mennyiseg   numeric(12, 3) not null default 0,
  -- egy termék+lerakat+LOT+lejárat kombináció csak egyszer; a NULL-ok is egyenlőnek számítanak
  unique nulls not distinct (product_id, location_id, lot, lejarat)
);

create table public.stock_movements (
  id                 bigint generated always as identity primary key,
  tipus              text not null check (tipus in ('BEVET', 'KIVET', 'JAVITAS')),
  product_id         bigint not null references public.products (id),
  location_id        bigint not null references public.locations (id),
  lot                text,
  lejarat            date,
  mennyiseg          numeric(12, 3) not null,     -- előjeles: bevét +, kivét −
  felhasznalo_id     uuid not null references public.users (id),
  idopont            timestamptz not null default now(),
  egysegar           numeric(12, 2),
  megjegyzes         text,
  javitott_mozgas_id bigint references public.stock_movements (id),
  felhasznalasi_hely_id bigint references public.felhasznalasi_helyek (id)  -- KIVET-nél: hová ment
);

create index on public.stock_movements (product_id);
create index on public.stock_movements (location_id);
create index on public.stock_movements (idopont desc);
create index on public.stock (location_id);
create index on public.stock_movements (felhasznalasi_hely_id);

-- RLS-t rögtön a táblák után kapcsoljuk be (mielőtt bármilyen $$-idézéses függvény jönne) —
-- a Studio SQL Editor a Run gombnál automatikusan RLS-bekapcsoló sorokat told a szkript
-- végére, ha RLS nélküli táblát lát, és ezt egy dollár-idézésre nem tekintő, naiv
-- szövegkereséssel teszi, ami PL/pgSQL függvénytörzsek közepébe tudja szúrni a beillesztést
-- és eltöri a $$ párosítást. Így elkerüljük, hogy egyáltalán beavatkozzon.
alter table public.users           enable row level security;
alter table public.locations       enable row level security;
alter table public.user_locations  enable row level security;
alter table public.kategoriak      enable row level security;
alter table public.felhasznalasi_helyek enable row level security;
alter table public.products        enable row level security;
alter table public.stock           enable row level security;
alter table public.stock_movements enable row level security;

-- ============================================================
-- 1b. Auth-szinkron trigger
-- ============================================================

-- A Dashboard → Authentication → Add user csak az auth.users táblába tesz sort —
-- a mi profil-táblánkba (public.users) semmi nem szinkronizálja automatikusan.
-- Enélkül egy újonnan felvett bejelentkezés sosem jelenne meg a Felhasználók fülön.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, nev, szerepkor, aktiv)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'FELHASZNALO',
    true
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================
-- 2. Trigger: mozgás beszúrásakor frissül a stock
-- ============================================================

-- BEVET esetén a kategória szerint kötelező a LOT / lejárat (spec 4.1), KIVET-nél a
-- felhasználási hely — DB-szinten is
create function public.check_movement_requirements() returns trigger
language plpgsql set search_path = public as $$
declare k public.kategoriak;
begin
  if new.tipus = 'BEVET' then
    select c.* into k from public.kategoriak c
      join public.products p on p.kategoria_id = c.id where p.id = new.product_id;
    if k.lot_kotelezo and coalesce(btrim(new.lot), '') = '' then
      raise exception 'Ennél a kategóriánál (%) a LOT megadása kötelező', k.nev;
    end if;
    if k.lejarat_kotelezo and new.lejarat is null then
      raise exception 'Ennél a kategóriánál (%) a lejárat megadása kötelező', k.nev;
    end if;
  end if;
  if new.tipus = 'KIVET' and new.felhasznalasi_hely_id is null then
    raise exception 'Kivételnél a felhasználási hely megadása kötelező';
  end if;
  return new;
end $$;

create trigger movement_requirements before insert on public.stock_movements
  for each row execute function public.check_movement_requirements();

-- SECURITY DEFINER: a felhasználók nem írhatnak közvetlenül a stock táblába, csak ez a trigger
create function public.apply_movement_to_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.stock (product_id, location_id, lot, lejarat, mennyiseg)
  values (new.product_id, new.location_id, new.lot, new.lejarat, new.mennyiseg)
  on conflict (product_id, location_id, lot, lejarat)
  do update set mennyiseg = public.stock.mennyiseg + excluded.mennyiseg;
  return new;
end $$;

create trigger movement_updates_stock after insert on public.stock_movements
  for each row execute function public.apply_movement_to_stock();

-- A napló csak bővíthető: update/delete senkinek (a service role-nak sem) — csak új, javító sor
create function public.block_movement_changes() returns trigger
language plpgsql as $$
begin
  raise exception 'A stock_movements tábla sorai nem módosíthatók — használd a Javítás mozgást';
end $$;

create trigger movement_immutable before update or delete on public.stock_movements
  for each row execute function public.block_movement_changes();

-- ============================================================
-- 3. RLS policy-k (a bekapcsolás már az 1. szakasz végén megtörtént)
-- ============================================================

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and szerepkor = 'ADMIN' and aktiv);
$$;

-- Admin mindenhez fér, a Felhasználó csak a hozzárendelt lerakataihoz
create function public.has_location(loc bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (
        select 1 from public.user_locations ul
        join public.users u on u.id = ul.user_id
        where ul.user_id = auth.uid() and ul.location_id = loc and u.aktiv
      );
$$;

-- users: a napló megjelenítéséhez minden bejelentkezett látja a neveket; módosítani csak Admin
create policy users_read  on public.users for select to authenticated using (true);
create policy users_admin on public.users for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy locations_read  on public.locations for select to authenticated using (public.has_location(id));
create policy locations_admin on public.locations for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy user_locations_read  on public.user_locations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_locations_admin on public.user_locations for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy kategoriak_read  on public.kategoriak for select to authenticated using (true);
create policy kategoriak_admin on public.kategoriak for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy felhasznalasi_helyek_read  on public.felhasznalasi_helyek for select to authenticated using (true);
create policy felhasznalasi_helyek_admin on public.felhasznalasi_helyek for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_read  on public.products for select to authenticated using (true);
create policy products_admin on public.products for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- stock: csak olvasható (a triggerek írják)
create policy stock_read on public.stock for select to authenticated using (public.has_location(location_id));

-- stock_movements: olvasás + beszúrás a saját lerakatra, saját névre; update/delete policy nincs
create policy movements_read on public.stock_movements for select to authenticated
  using (public.has_location(location_id));
create policy movements_insert on public.stock_movements for insert to authenticated
  with check (
    public.has_location(location_id)
    and felhasznalo_id = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and aktiv)
  );

-- Felhasználó törlése (Törzsadatok → Felhasználók): az auth.users-hez a böngésző nem fér
-- hozzá, ezért ez a függvény végzi, Admin-ellenőrzéssel. Kaszkádolva viszi a profilt és a
-- lerakat-hozzárendelést; mozgással rendelkező felhasználónál az FK megakadályozza (23503).
create function public.admin_delete_user(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Felhasználót csak Admin törölhet';
  end if;
  if uid = auth.uid() then
    raise exception 'Saját magadat nem törölheted';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Jogosultságok (bejelentkezés nélkül semmi; a többit az RLS szűri)
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.stock from authenticated;
revoke update, delete on public.stock_movements from authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================
-- 4. Induló adatok
-- ============================================================

insert into public.kategoriak (nev, lot_kotelezo, lejarat_kotelezo) values
  ('Fogyóeszköz', false, false),
  ('Gyógyszer',   true,  true);

insert into public.locations (nev) values ('Központi Raktár');

-- ============================================================
-- 5. Első Admin — LÉPÉSEK:
--   a) Dashboard → Authentication → Users → Add user (e-mail + jelszó, "Auto Confirm User" bejelölve)
--   b) Írd át lent az e-mailt és a nevet, vedd ki a kommentet, és futtasd külön:
-- ============================================================

-- insert into public.users (id, email, nev, szerepkor)
-- select id, email, 'Teljes Név', 'ADMIN' from auth.users where email = 'te@example.com';
