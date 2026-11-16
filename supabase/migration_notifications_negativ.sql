-- Javítás a migration_notifications.sql-hez:
--   * negatív készletnél eddig csak az első negatívba lépéskor jött értesítés, mostantól
--     minden további csökkentésnél is;
--   * bevételezés után is jön értesítés, ha a készlet még mindig a minimum alatt van.
-- Csak akkor kell futtatni, ha a migration_notifications.sql már le lett futtatva
-- (különben az eleve a javított változatot tartalmazza). Többször is futtatható.

-- Mozgás után megnézzük a termék összkészletét az adott lerakaton. A minimum alá esésnél és
-- az elfogyásnál csak a határ ÁTLÉPÉSEKOR szólunk (egy már alacsony készletnél nem jön minden
-- további kivétnél újabb értesítés). A negatív készlet viszont hiba a nyilvántartásban, ezért
-- ott minden olyan mozgásnál szólunk, ami után a készlet negatív, és ami csökkentette.
-- Bevételezés után is szólunk, ha a készlet még mindig a minimum alatt van (kevés volt a rendelés).
create or replace function public.notify_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p          public.products;
  hely       text;
  utana      numeric;
  elotte     numeric;
  v_tipus    text;
  v_uzenet   text;
begin
  select * into p from public.products where id = new.product_id;
  select nev into hely from public.locations where id = new.location_id;
  select coalesce(sum(mennyiseg), 0) into utana from public.stock
    where product_id = new.product_id and location_id = new.location_id;
  elotte := utana - new.mennyiseg;

  if utana < 0 and new.mennyiseg < 0 then
    v_tipus := 'NEGATIV';
    v_uzenet := format(
      case when elotte < 0 then '%s (%s): tovább csökkent a negatív készlet, jelenleg %s %s.'
           else '%s (%s): a készlet negatívba ment, jelenleg %s %s.' end,
      p.nev, hely, trim_scale(utana), p.mertekegyseg);
  elsif new.tipus = 'BEVET' and p.min_mennyiseg is not null and utana < p.min_mennyiseg then
    -- a beérkezett rendelés sem volt elég: a készlet bevételezés után is a minimum alatt van
    v_tipus := 'ALACSONY';
    v_uzenet := format('%s (%s): bevételezés után is a minimum alatt van, %s %s (minimum: %s, hiányzik: %s).',
      p.nev, hely, trim_scale(utana), p.mertekegyseg, trim_scale(p.min_mennyiseg), trim_scale(p.min_mennyiseg - utana));
  elsif utana = 0 and elotte > 0 then
    v_tipus := 'ELFOGYOTT';
    v_uzenet := format('%s (%s): elfogyott a készlet.', p.nev, hely);
  elsif p.min_mennyiseg is not null and utana > 0 and utana < p.min_mennyiseg and elotte >= p.min_mennyiseg then
    v_tipus := 'ALACSONY';
    v_uzenet := format('%s (%s): majdnem kifogyott, %s %s maradt (minimum: %s).',
      p.nev, hely, trim_scale(utana), p.mertekegyseg, trim_scale(p.min_mennyiseg));
  else
    return new;
  end if;

  insert into public.ertesitesek (user_id, tipus, product_id, location_id, mennyiseg, min_mennyiseg, uzenet)
  select u.id, v_tipus, new.product_id, new.location_id, utana, p.min_mennyiseg, v_uzenet
  from public.users u
  where u.aktiv
    and (u.szerepkor = 'ADMIN'
         or exists (select 1 from public.user_locations ul where ul.user_id = u.id and ul.location_id = new.location_id));
  return new;
end $$;
