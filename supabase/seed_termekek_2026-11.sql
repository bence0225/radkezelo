-- Termékek tömeges felvitele (2026. november, kapott terméklista alapján)
-- Futtatás: Supabase Dashboard → SQL Editor → beillesztés → Run.
-- Többször is futtatható: a már meglévő cikkszámú termékeket nem veszi fel újra,
-- csak a kategóriájukat igazítja a listához.
--
-- Kategóriák:
--   'Lejáratos fogyóeszköz' (új): lejárat kötelező, LOT nem — steril/egészségügyi
--      eszközök (fecskendők, tűk, kanülök, kesztyűk, vércsövek, tesztcsík, gél stb.)
--   'Fogyóeszköz': lejárat nélküli termékek (irodaszer, papíráru, nem steril pólyák stb.)
-- Mértékegység: db.

insert into public.kategoriak (nev, lot_kotelezo, lejarat_kotelezo)
values ('Lejáratos fogyóeszköz', false, true)
on conflict (nev) do nothing;

-- Egyetlen utasítás: felveszi az új termékeket, a már meglévőknél pedig igazítja a kategóriát
with v(cikkszam, lejaratos, nev) as (values
  ('26000209', false, 'Mullpólya szegett 15cmx5m nem steril 100db/dob_917934'),
  ('26000568', false, 'Gömbtörlő 10x10cm (30mm/szilva) RTG csík nélkül nem steril nem szőtt Mesoft 100 db_156700'),
  ('26000702', false, 'Rugalmas pólya 14cmx5m WOLF 50db/csom_T04757'),
  ('26000766', true, 'Kanülrögzítő szett Tegaderm CHG 20 db/dob_1877R-2100'),
  ('26003006', true, 'Ragtapasz 2,5cmx9,1m Selyem_1538-1'),
  ('26003010', true, 'Kötésrögzítő flísz 10cmx10m Pharmafix Hypoallergén_320057'),
  ('26003019', true, 'Ragtapasz 5cmx9,2m Testszínű hypoallergén ragasztóval ellátott_001-0013'),
  ('26003065', false, 'Vatta papír, WOLF 100% 1000 g-os, 30 cm x 30 cm_T06195'),
  ('27770955', true, 'EKG elektróda felnőtt MR kompatibilis, 42x45mm, ovális_F9069RM'),
  ('27771494', true, 'Ultrahang gél 5literes Bluescan-Aquasonic PARKER 01-50'),
  ('27771541', true, 'Steril UH zselé Transonic 20g, 48db/cs_G-15E'),
  ('27771542', true, 'Steril UH Cover probe 14x120cm 100db/cs'),
  ('27779021', true, 'Szike penge EH 11-es 100db/dob_PF-201500011'),
  ('28010132', true, 'Fecskendő 3 részes 10ml műanyag luer Omnifix /Cito/100db/csom_4616103V'),
  ('28010133', true, 'Fecskendő 3 részes 20ml luer Omnifix /Cito/100db/csom_4616200V'),
  ('28010135', true, 'BD MDS Emerald fecskendő 2ml 3r.Luer 100db/dz_307727'),
  ('28010158', true, 'Fecskendő 2R 10ml tovább mércézett luer excentr. DuoNEX 100db/dob_010ML-2CZ-G'),
  ('28010748', true, 'Fecskendő a Medrad Mark 7 Arterion - DSA injektorhoz, 150 ml_100205'),
  ('28020465', true, 'Atr.tű Dafilon blue 2/0 DS24 75cm_C0935360'),
  ('28021302', true, 'EH.tű 18G 2 SB 100db/dob_CH18200'),
  ('28030100', true, 'Felszívó tüske Mini-Spike zöld színű zárókupakos_4550242'),
  ('28030103', true, 'Fecskendő 200ml(Apollo) A80200 azonosító cimkével 50db/cs'),
  ('28030105', true, 'Octoflux(Vygon) betegösszekötő 1 szeleppel 120cm 50db/cs_MA15'),
  ('28030114', true, 'Fecskendő készlet 24 órás, MRXPERION, XP-MP_88256050'),
  ('28030115', true, 'MRXP betegösszekötő, XP-SP_88206061'),
  ('28030211', true, 'Háromutas csap Discofix C kék 3 járatú csap_16494C'),
  ('28030391', true, 'Infúziós szerelék levegőzővel közdarab nélkül túlnyomásos és gravitációs infúziókhoz 150 cm Intrafix primeline LL_4062957E'),
  ('28030714', true, 'Eh. visszafolyást gátló szelep_KR370'),
  ('28051904', true, 'Intravénás kanül 20G/33mm Vasofix 50db/dob_4268113B'),
  ('28051909', true, 'Intravénás kanül 22G/25mm Vasofix 50db/dob_4268091B'),
  ('28071014', true, 'Orrszonda 150cm/200cm vez.(RG-1417)_ZA-CTND-200'),
  ('28130199', false, 'EH BOROTVA DUPLA ÉLŰ 100db/dob_1465K-MC'),
  ('28150421', true, 'Vizeletgyűjtő zsák_WMD2000-150'),
  ('28170114', false, 'Füldugó, 3M, narancssárga_1100'),
  ('28180120', true, 'E.H. S méretű nem steril vizsgáló kesztyű nitril alapanyagú, pormentes_100 db/dob._RD30019002'),
  ('28180121', true, 'E.H. M méretű nem steril vizsgáló kesztyű nitril alapanyagú, pormentes_100 db/dob._RD30019003'),
  ('28180122', true, 'E.H. L méretű nem steril vizsgáló kesztyű nitril alapanyagú, pormentes_100 db/dob._RD30019004'),
  ('28180344', true, 'EH. steril sebészeti kesztyű latex, Comfort Powdered, porozott, 6,0 (RC11001060)_RC11072060'),
  ('28180346', true, 'EH. steril sebészeti kesztyű latex, Comfort Powdered, porozott, 7,0 (RC11001070)_RC11072070'),
  ('28180347', true, 'EH. steril sebészeti kesztyű latex, Comfort Powdered, porozott, 7,5 (RC11001075)_RC11072075'),
  ('28180348', true, 'EH. steril sebészeti kesztyű latex, Comfort Powdered, porozott, 8,0 (RC11001080)_RC11072080'),
  ('28190131', true, 'Sebészi maszk orrmerevítős, gumis_kék_4311'),
  ('28200464', false, 'Védőköpeny (látogató köpeny) nem steril kék XL 50db/cs_CRIE4001B'),
  ('28200479', false, 'Cipővédő_170µm_17*38 cm talphosszméret_kék_BT-010-B'),
  ('28210240', false, 'Orvosi papírlepedő 2 rétegű, 60cm×100m 3tek/cs_04058K'),
  ('28260308', true, 'NA-CITRIKUM 3,2% cső 3,5ml 50db/dob_454327'),
  ('28260310', true, 'EDTA K3 CSŐ 3ml 50db/dob_454086'),
  ('28260351', true, 'VÉRVÉTELI TŰ 21G 1 1/2 ZÖLD 100db/dob_450076'),
  ('28260353', true, 'BIZT. SZÁRNYASTŰ LUER ADAPTERREL 21 G 3/4, 90db/dob_450081V1'),
  ('55080017', false, 'Univerzális irodai papír A/4 80 g/m2 (500 ív/1 csomag)_ppap23_002_01'),
  ('55080112', false, 'Archiváló doboz 100 mm x 250x350 mm ppap23_144'),
  ('55080122', false, 'Lefűzhető, gerinc nélküli genotherm A4, narancsos, minimum 40 mikron ppap23_181'),
  ('55080265', false, 'Nem cserélhető betétes golyóstoll, hatszögletű - kék ppap23_450_02'),
  ('55080315', false, 'Szövegkiemelő lapos test 4 színű készlet ppap23_526'),
  ('55080391', false, 'Elem tartós LR6 1,5V,(AA) (4db/1csomag) ppap23_709'),
  ('55080392', false, 'Elem tartós LR03 1,5V,(AAA) (4db/1csomag) ppap23_710'),
  ('61007306', true, 'Accuchek Active vércukor tesztcsík, (38221900)_07124112220'),
  ('93002713', false, 'Papír kéztörlő "V" hajtogatású, 250 lap/cs, 20 cs/krt_40204'),
  ('93002719', false, 'WC papír közepes tekercs, 2 rétegű, 12 tek/krt_SCA120280')
),
m as (
  select v.cikkszam, v.nev, k.id as kategoria_id
  from v
  join public.kategoriak k
    on k.nev = case when v.lejaratos then 'Lejáratos fogyóeszköz' else 'Fogyóeszköz' end
),
igazitas as (
  update public.products p
  set kategoria_id = m.kategoria_id
  from m
  where p.cikkszam = m.cikkszam and p.kategoria_id <> m.kategoria_id
  returning p.id
)
insert into public.products (cikkszam, nev, mertekegyseg, kategoria_id)
select m.cikkszam, m.nev, 'db', m.kategoria_id
from m
where not exists (select 1 from public.products p where p.cikkszam = m.cikkszam);
