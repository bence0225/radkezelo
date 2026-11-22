# Munkanapló

> **Megjegyzés:** az alábbi óraszámok **becslések**, a projekten végzett munka tartalmi
> súlya alapján lettek szétosztva egy-egy teljes (hétfő–péntek) hétre — nem valós, percre
> pontos időmérésből származnak. A dokumentum **folyamatban van**: eddig 9 hét / ~288 óra
> szerepel benne, a teljesítendő 320 órához még kb. 1 további hét hiányzik — ezt a
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

## 6. hét

Időszak kezdete: 2026. 10. 26. (hétfő)
Időszak vége: 2026. 10. 30. (péntek)

Munkával töltött órák száma: **32 óra**

Ezen a héten a rendszer élesítésén dolgoztam, hogy a klinikán böngészőből, telepítés nélkül
is elérhető legyen. A tárhely a Cloudflare lett, a forráskód a GitHubra került.

Az első élesített változatban a bejelentkezés nem működött, mert az oldal nem érte el a
Supabase-t. Kiderült, hogy a Vite a Supabase címét és kulcsát a buildelés pillanatában
építi be a kódba, a `.env.local` fájl viszont szándékosan csak a saját gépemen van meg, a
Cloudflare nem látja. Megoldásként a két értéket (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) a Cloudflare build-változói közé kellett felvenni. Hogy ez a hiba
később azonnal felismerhető legyen, a bejelentkező képernyőn egy figyelmeztetés jelenik meg,
ha a beállítások hiányoznak, és a README-be is bekerült a telepítés leírása.

Ezután elkészült a Cloudflare Workers konfiguráció (`wrangler.jsonc`): a kész `dist` mappát
szolgálja ki, és bármelyik útvonalon az alkalmazás töltődik be, így oldalfrissítéskor sem jön
404-es hiba. A kódot feltöltöttem a GitHub repóba, amiből a Cloudflare minden feltöltés után
automatikusan új verziót épít. Közben észrevettem, hogy a `node_modules` mappa is felkerült a
repóba (közel 1300 fájl), ami a Mac-re telepített csomagok miatt a Cloudflare linuxos
buildjét is megzavarhatta volna. Ezt kivettem a repóból, és a `.gitignore` gondoskodik róla,
hogy többé ne kerüljön vissza. A titkos kulcsokat tartalmazó `.env.local` nem került fel.

## 7. hét

Időszak kezdete: 2026. 11. 02. (hétfő)
Időszak vége: 2026. 11. 06. (péntek)

Munkával töltött órák száma: **32 óra**

A héten a Törzsadatok képernyő használhatóságán és a bejelentkezés biztonságán dolgoztam.

Az „Aktív”, a „LOT kötelező” és a „Lejárat kötelező” beállítás eddig egy jelölőnégyzet volt,
ami ráadásul nem a felirata mellett, hanem alatta, középre igazítva jelent meg. Ezeket egy
közös, újrahasznosítható ki/be kapcsoló csúszkára cseréltem: a felirat és a kapcsoló egy
sorban van, az egész sorra lehet kattintani, és világos/sötét módban is a meglévő türkiz
színeket használja.

Ezután átalakítottam a Törzsadatok űrlapjait. Eddig mind az öt fülön a lista fölött állandóan
ott volt a felvevő/szerkesztő űrlap, ami sok helyet foglalt, és nem volt egyértelmű, hogy
éppen új elemet veszünk fel vagy egy meglévőt szerkesztünk. Mostantól a lista fölötti
„+ Új …” gomb és a sorok „Szerkesztés” gombja egy felugró ablakot nyit meg, egyértelmű
címmel. Az ablak Esc-re vagy a Mégse gombbal bezárható, a háttérre kattintás szándékosan
nem zárja be, hogy egy félig kitöltött űrlap ne vesszen el. Sikeres mentés után az ablak
bezárul, és a lista fölött megjelenik a „Mentve.” üzenet, hiba esetén nyitva marad a
hibaüzenettel. Telefonon az ablak a teljes képernyőt kitölti. Ehhez egy közös `Modal`
komponenst írtam a böngésző beépített `<dialog>` elemére építve, így a fókuszkezelés is
helyesen működik.

A bejelentkezésnél felmerült, hogy ne lehessen tetszőleges e-mail-címmel bejutni. Átnéztük:
a bejelentkezés eddig is csak az Admin által felvett fiókokkal működött, de a Supabase
alapból engedélyezte a nyilvános regisztrációt, így a felületet megkerülve bárki
létrehozhatott volna magának fiókot. Ezt a Supabase beállításaiban kikapcsoltuk, új fiókot
mostantól csak a Dashboardon lehet felvenni. A bejelentkezés angol hibaüzeneteit lefordítottam
magyarra; rossz e-mail-cím és rossz jelszó esetén ugyanaz az üzenet jelenik meg, így az oldal
nem árulja el, mely címek léteznek. A `schema.sql`-ben javítottam az első Admin beállításának
lépését is, ami a profilt automatikusan létrehozó trigger mellett hibára futott volna.

A változtatásokat típusellenőrzéssel és lint-teléssel ellenőriztem.

## 8. hét

Időszak kezdete: 2026. 11. 09. (hétfő)
Időszak vége: 2026. 11. 13. (péntek)

Munkával töltött órák száma: **32 óra**

A héten a készlet-értesítéseket valósítottam meg: ha egy termék készlete egy lerakaton
majdnem kifogy, elfogy vagy negatívba megy, az érintettek az oldalon és e-mailben is
értesítést kapnak.

Az adatbázisban egy új táblát (`ertesitesek`) és egy triggert hoztam létre. A trigger minden
mozgás után kiszámolja a termék összkészletét az adott lerakaton, és három esetben hoz létre
értesítést: ha a készlet a termékhez megadott minimum alá esik, ha elfogy, vagy ha negatívba
megy. Az alacsony és az elfogyott készletnél csak a határ átlépésekor szól, így egy már
alacsony készletnél nem érkezik minden további kivétnél újabb értesítés. A negatív készlet
viszont nyilvántartási hibát jelez, ezért ott minden további csökkentés újabb értesítést küld.
Bevételezés után is érkezik értesítés, ha a készlet még mindig a minimum alatt van, a hiányzó
mennyiséggel együtt, így kiderül, ha egy rendelés kevésnek bizonyult. Az értesítést az Adminok és az adott lerakathoz rendelt
felhasználók kapják. A sorrendre külön figyelni kellett: a PostgreSQL a triggereket
névsorrendben futtatja, ezért a trigger nevét úgy választottam meg, hogy a készletet
frissítő trigger után fusson, és már a friss mennyiséget lássa. RLS-sel mindenki csak a saját
értesítéseit látja, és csak az „olvasva” állapotukat módosíthatja.

A felületen a fejlécben, a felhasználó neve mellett megjelent egy csengő ikon, rajta piros
jelvénnyel az olvasatlan értesítések számával. A csengőre kattintva lenyílik a lista:
típus szerint színezett jelöléssel (piros: elfogyott/negatív, sárga: alacsony), az olvasatlanok
kiemelve, „Mind olvasott” gombbal. Egy értesítésre kattintva az olvasottnak jelölődik, és a
Készlet képernyő nyílik meg. Az új értesítések a Supabase Realtime segítségével oldalfrissítés
nélkül, azonnal megjelennek. Belépéskor, ha van olvasatlan értesítés, a csengő alól egy kis
figyelmeztető buborék ugrik le („3 olvasatlan értesítésed van. Nézd meg a csengőnél!”), ami
belépésenként egyszer jelenik meg, és néhány másodperc után magától eltűnik. Ha bejelentkezve,
használat közben érkezik új értesítés, a csengő alatt egy felugró kártya azonnal mutatja a
tartalmát; erre kattintva lenyílik a teljes lista.

Az e-mail küldéséhez egy Supabase Edge Function-t írtam (`ertesites-email`), amit egy
Database Webhook hív meg minden új értesítésnél, és a Resend szolgáltatással elküldi a levelet
a címzett bejelentkezési e-mail-címére. A függvényt egy titkos fejléc védi, hogy kívülről ne
lehessen leveleket küldetni vele, a Resend API-kulcsa pedig a Supabase titkos beállításai
között van, nem a kódban.

A változtatásokat típusellenőrzéssel, lint-teléssel és production build-del ellenőriztem.

---

## 9. hét

Időszak kezdete: 2026. 11. 16. (hétfő)
Időszak vége: 2026. 11. 20. (péntek)

Munkával töltött órák száma: **32 óra**

A hetet a Készlet képernyő mobilos megjelenítésével kezdtem: telefonon az ötoszlopos táblázat
kilógott a képernyőről, és csak oldalra görgetve látszott a lejárat és a mennyiség. Keskeny
kijelzőn ezért minden készletsor kártyaként jelenik meg (felül a terméknév, alatta
címke–érték párokban a lerakat, a LOT, a lejárat és a mennyiség), asztali nézetben a táblázat
változatlan maradt. A korábbi hetek munkáját (értesítések, Törzsadatok modálok,
login-szigorítás) ezzel együtt feltöltöttem a GitHub-repóba, ahonnan a Cloudflare építi az
éles változatot; feltöltés előtt ellenőriztem, hogy titkos kulcs ne kerüljön a repóba.

Ezután felvittem a klinikától kapott első terméklistát. A listát képként kaptuk meg, ebből
olvastam ki az 59 termék cikkszámát és megnevezését (egy tétel kétszer szerepelt), és egy
többször is lefuttatható SQL-szkriptet írtam belőle, ami a meglévő cikkszámokat kihagyja. A
lejárati idővel rendelkező termékekhez (fecskendők, tűk, kanülök, kesztyűk, vércsövek,
tesztcsík, gélek stb., összesen 41 tétel) új kategóriát vettem fel („Lejáratos fogyóeszköz”:
lejárat kötelező, LOT nem), a többi a „Fogyóeszköz” kategóriába került; a besorolás a
Törzsadatoknál termékenként módosítható. Az első változat a Supabase SQL Editorában
ideiglenes tábla miatt hibát adott, ezért egyetlen utasításra írtam át. A hosszú terméknevek
miatt a Törzsadatok és a Készlet táblázatában a név oszlopot tördelhetővé tettem.

A Törzsadatokban a termék törlése nem működött, ha a termékhez már tartozott készlet vagy
napló-mozgás, mert a napló sorait egy trigger védi. Írtam egy Admin-ellenőrzéses
adatbázis-függvényt (`admin_delete_product`), ami a terméket a készletsoraival, a
mozgásaival és az értesítéseivel együtt törli; a napló védelme minden más esetben
változatlan maradt. Az alkalmazás törlés előtt kiírja, hány napló-bejegyzés vész el vele.

A Készlet képernyőn a negatív készletű sor addig csak akkor lett piros, ha a terméknek volt
minimum mennyisége; ezt javítottam, a negatív készlet most minimumtól függetlenül mindig
kiemelt. Az értesítésekre kattintva az alkalmazás most a Készlet képernyőn az adott termékre
ugrik: a lerakat-szűrő az értesítés lerakatára áll, a lista odagörget, és a termék sorai
felvillanó kerettel kiemelődnek.

Átdolgoztam a leltárív nyomtatási nézetét: a nyomat a képernyő témájától függetlenül mindig
fehér alapú és fekete keretes, a fejlécben a lerakat neve, a dátum és a leltározás napjának
helye szerepel (minden oldalon megismételve), a hosszú nevek tördelődnek, a „Számlált” mellé
„Eltérés” oszlop került, alul pedig aláírás-helyek vannak a leltározónak és az ellenőrzőnek.
A böngésző saját fejléce (lapcím, webcím) nem kerül a nyomatra, PDF-mentésnél pedig a fájl
neve a lerakatot és a dátumot tartalmazza.

A fejlécbe a csengő mellé világos/sötét mód kapcsoló került: amíg a felhasználó nem választ,
a rendszerbeállítást követi, a választást a böngésző megjegyzi. Elkészítettem az elfelejtett
jelszó funkciót is (visszaállító levél küldése, új jelszó megadása), de mivel a levélküldéshez
még nincs beállított levelezőszolgáltatás (Resend vagy SMTP), egyelőre kivettük az
alkalmazásból.

A változtatásokat típusellenőrzéssel, lint-teléssel és production build-del ellenőriztem, a
felületi változásokat helyi fejlesztői szerveren néztük át.

---

## 10. hét *(tervezett — a tényleges munka után töltjük ki)*

Időszak kezdete: 2026. 11. 23. (hétfő)
Időszak vége: 2026. 11. 27. (péntek)

Munkával töltött órák száma: *(a hét végén kerül be)*

Tervezett feladatok:

- a rendszer átfogó tesztelése: bevételezés, kivét, készletlista, napló és javítás,
  riportok és leltárív, Törzsadatok (felvétel, szerkesztés, törlés), értesítések,
  jogosultságok Admin és Felhasználó szerepkörrel, mobilos nézet;
- a tesztelés során talált hibák javítása;
- elfelejtett jelszó funkció visszaépítése, ha addigra a levélküldés (Resend vagy SMTP)
  beállításra kerül;
- egyéb, menet közben felmerülő kisebb fejlesztések.

---

## Óraszámok összesítése (folyamatban)

| 1. hét | 2. hét | 3. hét | 4. hét | 5. hét | 6. hét | 7. hét | 8. hét | 9. hét | 10. hét | Eddig összesen | Cél |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 32 | 32 | 32 | 32 | 32 | 32 | 32 | 32 | 32 | *(tervezett: tesztelés)* | **288** | 320 |

*A hátralévő hetet a specifikáció hátralévő funkcióinak (lejárat-riasztás, a
4. héten feljegyzett napló-hibák javítása stb.) fejlesztése közben, a tényleges munkavégzés ütemében töltjük fel — nem
előre kitalálva.*
