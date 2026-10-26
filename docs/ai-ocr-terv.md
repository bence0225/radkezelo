# Terv: AI-alapú, fotózással segített bevételezés

> Státusz: **tervezési fázis, nincs implementálva.** Ez a dokumentum csak rögzíti a
> döntéseket és a nyitott kérdéseket, hogy mikor a csapat úgy dönt, hogy megépítjük,
> ne a nulláról induljunk.

## A döntés, ami már megszületett

A szállítólevelet/számlát lefényképezve egy AI **előtölti** a Bevételezés űrlapot
(termék, mennyiség, LOT, lejárat soronként), de **a felhasználónak végig kell
néznie és jóvá kell hagynia mentés előtt** — nincs automatikus, emberi ellenőrzés
nélküli mentés. Ez klinikai készletnél (gyógyszer/kontrasztanyag LOT és lejárat)
nem engedhető el: egy félreolvasott karakter a nyilvántartást tévesen vinné be.

## Tervezett adatfolyam

```
1. Felhasználó lefényképezi a szállítólevelet (mobil kamera / fájlfeltöltés)
2. A kép egy Supabase Edge Function-nek megy (nem a böngészőből hívjuk az AI-t —
   a titkos API-kulcsot sosem szabad a frontendben tárolni, ugyanaz az elv, mint
   a riasztás-e-mailek tervénél a specifikációban, 5. fejezet)
3. Az Edge Function egy AI vision modellnek küldi a képet, és egy strukturált
   választ kér vissza: termék neve/cikkszáma, mennyiség, mértékegység, LOT,
   lejárat, egységár — soronként, ha a dokumentum több tételt is tartalmaz
4. A frontend minden kiolvasott sorhoz megpróbálja megfeleltetni egy meglévő
   products-beli terméket (név/cikkszám alapján, elgépelés-tűrő kereséssel)
5. A Bevételezés űrlap egy szerkeszthető, soronkénti előnézetet mutat:
   - sikeresen megfeleltetett termékek előtöltve
   - nem megfeleltethető termékek kiemelve, kézi kiválasztásra/javításra várva
   - a LOT/lejárat kötelezettség ugyanúgy érvényesül soronként, mint a kézi
     bevételezésnél (a termék kategóriája dönt)
6. A felhasználó ellenőriz, javít, majd jóváhagyja — ezután a meglévő insert-logika
   fut le soronként (ugyanaz a stock_movements beszúrás, mint most)
```

## Előfeltétel, amit előbb úgyis meg kell építeni

A nem megfeleltethető termékeknél a felhasználónak tudnia kell **új terméket
felvenni menet közben** — ez a Törzsadatok képernyő jelenleg hiányzó
termék-létrehozó űrlapjától függ (ezt korábban külön feladatként félretettük).
Ezt érdemes **előbb** megépíteni, különben az AI-folyamat minden ismeretlen
terméknél zsákutcába fut.

## Nyitott kérdések (ezeket kell eldönteni, mielőtt elkezdjük építeni)

- **Melyik AI-szolgáltató/modell?** Kell hozzá egy fiók és API-kulcs (pl.
  Anthropic Claude, ami multimodális — képet és szöveget is ért), amit a
  Supabase Edge Function titkos környezeti változójaként kell tárolni. Ez
  valós, hívásonkénti költséggel jár — nem ingyenes, ellentétben a most
  megépített diagrammal.
- **Dokumentum-formátumok.** Mennyire egységesek a beszállítók szállítólevelei?
  Ha nagyon eltérő elrendezésűek, a kiolvasás megbízhatósága ingadozhat —
  érdemes néhány valódi mintadokumentumot összegyűjteni a tervezés előtt.
  (Scan + fénykép is lehet.)
- **Több oldal / több tétel egy dokumentumon.** Hogyan listázzuk, ha egy
  szállítólevél 10+ sort tartalmaz — lapozható előnézet, vagy mind egyben?
  (Javaslat: mind egyben, mert úgyis soronként kell jóváhagyni.)
- **Mi történik a fényképpel mentés után?** Eldobjuk-e, vagy megőrizzük
  (pl. a `megjegyzes` mezőhöz csatolva, auditálhatóság miatt)? Ha megőrizzük,
  kell hozzá Supabase Storage bucket és RLS policy is.
- **Pontossági elvárás / hibakezelés.** Mi történik, ha az AI nem tud
  kiolvasni egy mezőt (pl. elmosódott LOT-szám)? Javaslat: azt a mezőt
  üresen hagyja, pirossal jelölje, és kötelezze a felhasználót a kézi
  kitöltésre — sose generáljon találgatott értéket.

## Durva lépéslista, amikor elkezdjük építeni

1. Törzsadatok: termék-létrehozó űrlap (előfeltétel, lásd fent)
2. AI-szolgáltató és API-kulcs kiválasztása, Supabase Edge Function secret
   beállítása
3. Edge Function: kép → strukturált JSON kiolvasás
4. Frontend: fotó feltöltő/kamera komponens a Bevételezés képernyőn
5. Frontend: termék-megfeleltetés + szerkeszthető, soronkénti előnézet
6. Éles tesztelés valódi szállítólevelekkel, mielőtt bárki ténylegesen
   erre támaszkodna a napi munkában
