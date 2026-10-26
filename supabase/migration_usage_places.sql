-- Felhasználási helyek (pl. CT, MR, átvilágító): kivételnél rögzíthető, hová ment az anyag.
-- Egyszer futtatandó egy már élő projekten (új projektnél a frissített schema.sql már
-- eleve tartalmazza ugyanezt).

create table public.felhasznalasi_helyek (
  id    bigint generated always as identity primary key,
  nev   text not null unique,
  aktiv boolean not null default true
);

-- RLS rögtön a tábla után (lásd schema.sql: a Studio RLS-asszisztense miatt)
alter table public.felhasznalasi_helyek enable row level security;

create policy felhasznalasi_helyek_read  on public.felhasznalasi_helyek for select to authenticated using (true);
create policy felhasznalasi_helyek_admin on public.felhasznalasi_helyek for all    to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.felhasznalasi_helyek from anon;
grant select, insert, update, delete on public.felhasznalasi_helyek to authenticated;

-- A mozgás opcionálisan hivatkozik rá (a régi soroknál üres marad). A napló-védelmi trigger
-- csak update/delete-re fut, az oszlop hozzáadását nem akadályozza.
alter table public.stock_movements
  add column felhasznalasi_hely_id bigint references public.felhasznalasi_helyek (id);

create index on public.stock_movements (felhasznalasi_hely_id);

-- Kivételnél a felhasználási hely kötelező (a régi, hely nélküli KIVET sorokat nem érinti,
-- mert a trigger csak beszúráskor fut). A függvény többi része változatlan a schema.sql-hez képest.
create or replace function public.check_movement_requirements() returns trigger
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
