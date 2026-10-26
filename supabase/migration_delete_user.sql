-- Felhasználó törlése a Törzsadatok → Felhasználók fülről.
-- Egyszer futtatandó egy már élő projekten (új projektnél a frissített schema.sql már
-- eleve tartalmazza ugyanezt a függvényt).
--
-- A böngészőből az auth.users táblához nem lehet hozzányúlni (ahhoz service_role kulcs
-- kellene), ezért egy SECURITY DEFINER függvény végzi, ami előbb ellenőrzi, hogy a hívó Admin.
-- Az auth.users sor törlése kaszkádolva viszi a public.users profilt és a user_locations
-- sorokat. Ha a felhasználó már rögzített mozgást, a stock_movements FK-ja megakadályozza
-- a törlést (23503) — a napló visszakereshetősége miatt ilyenkor inaktiválni kell.

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
