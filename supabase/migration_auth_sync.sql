-- Utólagos javítás: a schema.sql eredetileg nem tartalmazott auth-szinkron triggert,
-- ezért a Dashboardon felvett bejelentkezésekhez sosem jött létre public.users sor.
-- Ez a fájl egyszer futtatandó egy már élő projekten (új projektnél a frissített
-- schema.sql már eleve tartalmazza ugyanezt a triggert).

-- 1) Trigger mostantól: minden új auth.users sorhoz automatikusan létrejön a profil
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

-- 2) Visszamenőleges pótlás: minden auth.users sor, aminek eddig nem volt párja
--    a public.users táblában (pl. a most felvett "vendég" felhasználó) — alapból
--    Felhasználó szerepkörrel és aktívan jön létre, ezt utána a Felhasználók fülön
--    át lehet állítani.
insert into public.users (id, email, nev, szerepkor, aktiv)
select au.id, au.email, coalesce(au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)), 'FELHASZNALO', true
from auth.users au
where not exists (select 1 from public.users pu where pu.id = au.id);

-- Ellenőrzés: most már minden auth.users sornak kell legyen párja
select au.email, pu.nev, pu.szerepkor, pu.aktiv
from auth.users au
left join public.users pu on pu.id = au.id
order by au.created_at;
