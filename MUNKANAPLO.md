# Munkanapló

> **Megjegyzés:** az alábbi óraszámok **becslések**, a projekten végzett munka tartalmi
> súlya alapján lettek szétosztva egy-egy teljes (hétfő–péntek) hétre — nem valós, percre
> pontos időmérésből származnak. A dokumentum **folyamatban van**: eddig 5 hét / ~160 óra
> szerepel benne, a teljesítendő 320 órához még kb. 5 további hét hiányzik — ezeket a
> specifikáció következő funkcióinak fejlesztése közben, a tényleges munkavégzés ütemében
> töltjük fel.

Projekt: **Raktárkezelő rendszer** — SZTE Szent-Györgyi Albert Klinikai Központ, Radiológiai
Klinika (specifikáció v0.7 alapján). Technikai megvalósítás: React + Vite + TypeScript
frontend, Supabase (PostgreSQL + Auth + Row Level Security) háttér.

---

## 1. hét

Időszak kezdete: 2026. 09. 21. (hétfő)
Időszak vége: 2026. 09. 25. (péntek)

Munkával töltött órák száma: **32 óra**

Ezen a héten a raktárkezelő rendszer specifikációjának (v0.7) áttekintésével kezdtem: hat
funkció (bevételezés, kivét, készletlista, kritikus készlet- és lejárat-riasztás, FIFO-javaslat
kivételnél, egyszerű riportok és leltár-munkalap), a hét táblás adatmodell és a két szerepkör
(Admin, Felhasználó) alapján állt össze a terv.

Felépítettem a React + Vite + TypeScript frontend vázát: Supabase klienst (`lib/supabase.ts`),
egy helyen tartott táblaneveket (`lib/tables.ts`), a séma TypeScript típusait (`lib/types.ts`),
egy `AuthProvider`-t (Supabase Auth e-mail/jelszó bejelentkezéssel, profil betöltése a `users`
táblából, elérhető lerakatok lekérdezése szerepkör szerint), valamint a hat képernyőt
(Bevételezés, Kivét, Készlet, Napló, Riportok és leltár, Törzsadatok).

Ezután megírtam a teljes Supabase adatbázis-sémát: a hét táblát, egy adatbázis-triggert, ami a
`stock_movements` táblába történő beszúráskor automatikusan frissíti a `stock` táblát, Row
Level Security policy-kat (Admin mindenhez fér, Felhasználó csak a hozzárendelt
lerakataihoz), és a napló írásvédelmét (a `stock_movements` táblába csak új sor kerülhet be,
módosítás/törlés tiltva — hibás rögzítést csak ellentétes előjelű, hivatkozó sorral lehet
javítani).

A séma első futtatásakor hibába ütköztem: a Supabase Studio SQL Editor egy beépített
RLS-asszisztense a dollár-idézéses (`$$...$$`) PL/pgSQL függvénytörzsek közepébe szúrt be
sorokat, ami szintaktikai hibát okozott. A szkriptet úgy szerveztem át, hogy a táblák
létrehozása után azonnal bekapcsoljuk az RLS-t, mielőtt bármilyen függvénydefiníció
következne — ezzel a probléma megszűnt. A táblák sikeresen létrejöttek, felvettem az első
Admin felhasználót, javítottam egy hibát a `.env.local` fájlban (a Supabase URL-hez
véletlenül egy `/rest/v1/` végződés is bekerült), és sikerült elérni az első működő
bejelentkezést és adatlekérést.

## 2. hét

Időszak kezdete: 2026. 09. 28. (hétfő)
Időszak vége: 2026. 10. 02. (péntek)

Munkával töltött órák száma: **32 óra**

A héten a felület design-jának kialakítását kezdtem el, a navigációs sávon kezdve: cél egy jó
betűméret/betűstílus és finom gomb-effektusok kialakítása volt.

Mielőtt saját stílust írtam volna, megbeszélés alapján felkutattam néhány elismert, nyilvánosan
letölthető, bizonyítható eredetű CSS design rendszert (Bootstrap 5, Bulma, Pico.css, IBM Carbon
Design System), és összevetettem őket klinikai/enterprise alkalmazás szempontjából. Az IBM
Carbon Design System mellett döntöttünk — ezt integráltam a projektbe (`@carbon/react`,
`@carbon/icons-react`, saját tárhelyről szolgáltatott IBM Plex Sans/Mono betűtípusok).

Integráció közben két háttérproblémát találtam és javítottam:
- a Carbon és az IBM Plex csomagok `postinstall` szkriptje telepítéskor anonim használati
  adatot küldött volna egy IBM-végpontra — ezt egy `.npmrc` beállítással (`ignore-scripts=true`)
  letiltottam, és tiszta újratelepítést végeztem;
- a Carbon alapból a teljes, 201 MB méretű `@ibm/plex` csomagra hivatkozó `@font-face`
  szabályokat generált, ami feloldatlan hivatkozást hagyott a build-ben — ezt egy
  konfigurációs kapcsolóval (`$css--font-face: false`) kikapcsoltam.

Felépítettem a fejlécet/navigációt a Carbon `Header`, `HeaderNavigation`, `SideNav`
komponenseivel, saját ikonkészlettel, reszponzív (tablet-biztos) viselkedéssel. A build és a
típusellenőrzés hibátlanul lefutott, a fejlesztői szerveren keresztül ellenőriztem is a
működést. A hét végén visszajelzés érkezett, hogy a Carbon vizuális stílusa (sötét,
"enterprise-szürke" fejléc) nem illik egy klinikai alkalmazás hangulatához.

## 3. hét

Időszak kezdete: 2026. 10. 05. (hétfő)
Időszak vége: 2026. 10. 09. (péntek)

Munkával töltött órák száma: **32 óra**

A hét elején a Carbon Design System-mel kapcsolatos visszajelzés alapján teljesen
eltávolítottam a Carbon és az IBM Plex függőségeket (és a hozzájuk tartozó `.npmrc`
beállítást), és visszaálltam egy könnyű, saját CSS-alapra.

Ezután egy teljesen egyedi, saját tervezésű design mellett döntöttünk a letölthető
keretrendszer helyett. Kialakítottam egy saját design-rendszert: türkiz színpalettát világos és
sötét módra, egy saját kézzel rajzolt, egységes stílusú ikonkészletet a hat menüponthoz
(Készlet, Bevételezés, Kivét, Napló, Riportok és leltár, Törzsadatok) és a kilépéshez,
rendszer-betűtípusra épülő tipográfiát (nincs külső betöltés), pirula alakú navigációs
gombokat hover/aktív/fókusz-effektusokkal (háttértint, finom emelkedés, kattintásra
összehúzódás, látható fókusz-gyűrű billentyűzetes navigációhoz), valamint reszponzív,
görgethető navigációt keskeny (tablet) képernyőre.

A változtatásokat típusellenőrzéssel, lint-teléssel és production build-del ellenőriztem,
majd elindítottam a fejlesztői szervert a vizuális ellenőrzéshez. A hét végén elkészült ez a
munkanapló is.

## 4. hét

Időszak kezdete: 2026. 10. 12. (hétfő)
Időszak vége: 2026. 10. 16. (péntek)

Munkával töltött órák száma: **32 óra**

A hét egy kollégával tartott megbeszéléssel indult, ahol átnéztük az addig elkészült
rendszert, és összegyűjtöttük a hiányosságokat. Ezek alapján dolgoztam a héten.

Az első és legfontosabb kérés a törlés funkció volt. A Törzsadatok mind a négy fülén
(Termékek, Lerakatok, Kategóriák, Felhasználók) létrejött egy „Törlés” gomb, megerősítő
kérdéssel. A törlés csak akkor sikerül, ha semmi nem hivatkozik az adott sorra: például
mozgással rendelkező terméket vagy lerakatot a napló visszakereshetősége miatt nem lehet
törölni. Ilyenkor a rendszer érthető hibaüzenetben jelzi az okot, és az inaktiválást
javasolja. Felhasználó törlésekor a bejelentkezést (`auth.users`) is törölni kell, ehhez a
böngészőnek nincs jogosultsága. Ezért egy szerveroldali, Admin-ellenőrzést végző
adatbázis-függvényt írtam (`admin_delete_user`), ami kaszkádolva törli a profilt és a
lerakat-hozzárendeléseket is, saját magát pedig senki nem törölheti. A Napló mozgásai
szándékosan továbbra sem törölhetők, ott a meglévő Javítás funkció marad.

A második kérés a felhasználási helyek bevezetése volt, vagyis annak rögzítése, hogy a
kivett anyagot hol használják fel (pl. CT, MR). Ehhez új adatbázis-táblát
(`felhasznalasi_helyek`) hoztam létre RLS-védelemmel, a mozgásokhoz pedig egy hivatkozó
oszlopot. A Törzsadatokban új fül készült a helyek kezelésére. A Kivét képernyőn
kiválasztható a hely, a Napló új oszlopban mutatja és szűrni is lehet rá, a Riportok
felhasználási statisztikája pedig helyre is szűrhető. Egyeztetés után a hely kiválasztása
kötelező lett: a felületen és adatbázis-szinten is, a mozgásokat ellenőrző triggerben, így
a szabály nem kerülhető meg. A régi, hely nélküli kivételeket ez nem érinti. Az élő
adatbázishoz a változtatásokat külön migrációs fájlokba tettem
(`migration_delete_user.sql`, `migration_usage_places.sql`), és a teljes `schema.sql`-t is
frissítettem.

Ezután átnéztem a Napló szűrőit, és élesben le is teszteltük őket. A termék, lerakat,
felhasználó és felhasználási hely szerinti szűrés helyesen működik. A tesztelés során
kiderült, hogy a dátumszűrő fordított időszakot is elfogadott („Ettől” későbbi, mint
„Eddig”), ilyenkor pedig hibaüzenet nélkül üres listát mutatott. Ezt javítottam: ilyenkor
piros hibaüzenet jelenik meg, és a naptárban eleve nem választhatók a lehetetlen napok.
Az átnézés során három további hibát is feljegyeztem, ezek javítása még hátravan: a
dátumszűrő 2 órás időzóna-eltolódása (UTC a magyar idő helyett), a Javítás gomb
újramegjelenése egy már javított soron szűrés közben, valamint a lista jelzés nélküli,
500 soros korlátja.

A változtatásokat típusellenőrzéssel, lint-teléssel és production build-del ellenőriztem.

## 5. hét

Időszak kezdete: 2026. 10. 19. (hétfő)
Időszak vége: 2026. 10. 23. (péntek)

Munkával töltött órák száma: **32 óra**

A héten a Törzsadatok képernyőt tettem teljes értékűvé: a korábbi, csak listázó nézet helyett
mind a négy fülön (Termékek, Lerakatok, Kategóriák, Felhasználók) elkészültek a felvevő és
szerkesztő űrlapok. A termékeknél megadható a név, a cikkszám (EOS), a mértékegység, a
kategória, a minimum mennyiség és az aktív állapot, a kategóriáknál pedig az, hogy a LOT és a
lejárat megadása kötelező-e. A felhasználóknál a szerepkör és az aktív állapot mellett
jelölőnégyzetekkel állítható be, hogy melyik lerakatokhoz férhet hozzá. A lerakatok
módosítása után a többi képernyő (Bevételezés, Kivét stb.) azonnal az új listát látja.

Közben kiderült, hogy a Supabase Dashboardon felvett új bejelentkezések nem jelentek meg a
Felhasználók fülön, mert az eredeti séma semmit nem szinkronizált az `auth.users` táblából a
saját profil-táblánkba. Ezt egy adatbázis-triggerrel javítottam, ami minden új
bejelentkezéshez automatikusan létrehozza a profilt (alapból Felhasználó szerepkörrel). Egy
migrációs fájlban (`migration_auth_sync.sql`) a már korábban felvett, profil nélküli
felhasználókat is visszamenőleg pótoltam, és a `schema.sql`-t is frissítettem.

A Riportok képernyőre elkészült a készletmozgás-diagram: egy kiválasztott termék és lerakat
készletszintjét mutatja az idő függvényében, a mozgásokból visszaszámolva. Külső
diagramkönyvtár nélkül, saját SVG-rajzolással készült, „kerek” tengelyosztásokkal, és egy
pontra mutatva megjelenik az adott mozgás részlete (típus, mennyiség, LOT, időpont).

A hét végén megírtam egy tervdokumentumot (`docs/ai-ocr-terv.md`) egy későbbi, AI-alapú
bevételezésről: a szállítólevelet lefényképezve egy AI előtöltené a Bevételezés űrlapot, de
mentés előtt a felhasználónak minden sort ellenőriznie és jóvá kell hagynia. A dokumentum
rögzíti a tervezett adatfolyamot (az AI-hívás egy Supabase Edge Function-ön keresztül, hogy
a titkos API-kulcs ne kerüljön a böngészőbe), az előfeltételeket és a nyitott kérdéseket
(szolgáltató és költség, dokumentum-formátumok, a fénykép megőrzése, hibakezelés). Ez még
csak terv, nincs megvalósítva.

---

## Óraszámok összesítése (folyamatban)

| 1. hét | 2. hét | 3. hét | 4. hét | 5. hét | 6–10. hét | Eddig összesen | Cél |
|---|---|---|---|---|---|---|---|
| 32 | 32 | 32 | 32 | 32 | *(még nem történt meg)* | **160** | 320 |

*A további heteket a specifikáció hátralévő funkcióinak (riasztások, a 4. héten
feljegyzett napló-hibák javítása stb.) fejlesztése közben, a tényleges munkavégzés ütemében töltjük fel — nem
előre kitalálva.*
