# Raktárkezelő (SZTE Radiológiai Klinika) — frontend váz

React + Vite + TypeScript, Supabase háttérrel (spec v0.7).

## Indítás

1. Másold ki a Supabase projekt URL-jét és anon/publishable kulcsát (Project Settings → API) a `.env.local` fájlba
   (minta: `.env.example`).
2. `npm install` · `npm run dev`

## Felépítés

- `src/lib/supabase.ts` — kliens; `src/lib/tables.ts` — táblanevek egy helyen; `src/lib/types.ts` — a 7 tábla típusai
- `src/auth/AuthProvider.tsx` — Supabase Auth (e-mail + jelszó), profil a `users` táblából, elérhető lerakatok
- `src/pages/` — Bevételezés, Kivét, Készlet, Napló, Törzsadatok (csak lista), Riportok és leltár

## Feltételezések a Supabase sémáról

- `users.id` = `auth.users.id`; oszlopok: `email, nev, szerepkor (ADMIN/FELHASZNALO), aktiv`
- A `stock` táblát DB-trigger frissíti a `stock_movements` insertekor — a frontend csak a mozgást írja be
- RLS szűri a lerakat-hozzáférést; a `stock_movements`-en nincs UPDATE/DELETE policy
- Foreign key-ek: `products.kategoria_id → kategoriak`, `stock/stock_movements.product_id → products`, `.location_id → locations`
