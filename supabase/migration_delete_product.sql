-- Termék végleges törlése (Törzsadatok → Termékek → Törlés).
-- Egyszer futtatandó: Supabase Dashboard → SQL Editor → beillesztés → Run.
--
-- Eddig a termék nem volt törölhető, ha már tartozott hozzá készletsor vagy napló-mozgás:
-- a napló (stock_movements) védett, sorai nem törölhetők. Ez a függvény Admin-ellenőrzés után
-- a termékkel együtt törli a készletsorait, a napló-mozgásait és az értesítéseit.
-- A napló védelme minden más esetben változatlan: a védőtrigger csak akkor enged törlést,
-- ha ez a függvény a saját tranzakciójában jelzi (app.termek_torles = 'on').

create or replace function public.block_movement_changes() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('app.termek_torles', true) = 'on' then
    return old;
  end if;
  raise exception 'A stock_movements tábla sorai nem módosíthatók — használd a Javítás mozgást';
end $$;

create or replace function public.admin_delete_product(pid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Terméket csak Admin törölhet';
  end if;
  if not exists (select 1 from public.products where id = pid) then
    raise exception 'A termék nem létezik (talán már törölték)';
  end if;

  -- csak erre a tranzakcióra engedi a napló-sorok törlését
  perform set_config('app.termek_torles', 'on', true);

  delete from public.stock_movements where product_id = pid;
  delete from public.stock where product_id = pid;
  delete from public.products where id = pid;  -- az értesítések kaszkádolva törlődnek

  perform set_config('app.termek_torles', 'off', true);
end $$;

revoke execute on function public.admin_delete_product(bigint) from public, anon;
grant execute on function public.admin_delete_product(bigint) to authenticated;
