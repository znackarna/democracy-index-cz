# Veřejné mínění — read-only kontext

Sekce „Veřejné mínění" na dashboardu zobrazuje data z průzkumů veřejného mínění **jako doplňkový kontext** vedle pilířového indexu. Klíčové pravidlo: **tyto hodnoty nevstupují do score function ani do žádného automatizovaného rozhodování o závažnosti událostí.** Slouží lidskému čtenáři ke kontextovému porovnání: jak veřejnost vnímá demokracii vs. kde má index skutečné institucionální signály.

## Proč read-only a NE input do skóre

Při návrhu této sekce jsem zvažoval tři úrovně integrace:

| Úroveň | Co | Proč ne / proč ano |
|---|---|---|
| **A. Read-only display** ✅ | Polly se zobrazí na dashboardu, ale neovlivní žádné číslo. | Implementováno — vidíme korelaci, žádné causal claim, žádný feedback loop. |
| **B. Quarterly validation** | Polly jako external benchmark vedle V-Dem/EIU. | Možné v budoucí iteraci. Jasná hypothesis-test sémantika. |
| **C. Direct input do skóre** ❌ | Polly jako subkomponenta civil pilíře. | **Odmítnuto.** Tři důvody: |

**Důvody pro odmítnutí přímé integrace (C):**

1. **Causality direction:** polly měří *vnímání*, ne institucionální realitu. Nízká důvěra v soudy nemusí znamenat, že soudy fungují hůř — může jít o důsledek mediálního pokrytí, polarizace, nebo single high-profile case. Index má reflektovat institucionální posuny, ne mediální atmosféru.

2. **Feedback loop:** kdyby polly počítaly do skóre, špatná publicita → low score → ještě horší pokrytí → ještě nižší skóre. Index by se proměnil v mood ring místo democracy gauge.

3. **Double-count:** strukturální baseline z V-Dem a EIU **už polly nepřímo obsahuje** (V-Dem syntézuje experti za pomoci surveys, EIU má „Political Culture" subscale založenou na WVS/Eurobarometer). Přidat polly podruhé by znamenalo počítat ten samý signál dvakrát.

## Zdroje a jejich profil

| Zdroj | Frekvence | Typ | Použití |
|---|---|---|---|
| **CVVM (Sociologický ústav AV ČR)** | měsíčně | akademický, transparentní metodologie | hlavní time-series graf — důvěra ústavním institucím |
| **STEM** | nepravidelně | komerční s veřejným archivem, stoletá tradice (od 1990) | topical findings cards — ad-hoc šetření |
| **Median** | nepravidelně | komerční | topical findings cards — ad-hoc šetření |
| **Eurobarometer (EK)** | 2× ročně | EU-standardizovaný, comparable napříč 27 členy | **defer:** není zde, viz „Známé mezery" |

**Záměrně vynecháno:**
- *Voting intent / preference stran* — index demokracie není predikce voleb; politické preference jsou orthogonální k institucionální zdraví.
- *Popularita konkrétních politiků* — politizované, krátkozraké, nevypovídá o institucionálním stavu.
- *Single-issue topical surveys* (např. „souhlasíte s důchodovou reformou?") — too topical.

Drží se **trust in institutions + perceived corruption + satisfaction with democracy** napříč všemi zdroji se stejnou škálou.

## CVVM jako primární zdroj

CVVM je `gold standard` pro Czech opinion research z těchto důvodů:

- **Akademická afilace** (Sociologický ústav Akademie věd ČR) — žádný komerční klient, žádná politická loajalita
- **Transparentní metodologie** — sample size, fieldwork, váhy publikované
- **Dlouhodobá řada** — měsíční měření „Důvěra ústavním institucím" probíhá od 90. let
- **Standardizovaná otázka** — formulace stabilní napříč desetiletími, srovnatelnost zachována
- **Veřejně dostupné** — tiskové zprávy + mikrodata zdarma, citation requirement

**Měřené instituce:** prezident, vláda, Poslanecká sněmovna, Senát, krajská zastupitelstva, krajští hejtmani, obecní zastupitelstva, starostové.

**Důležité upozornění (2025-11):** CVVM v listopadu/prosinci 2025 změnil metodologii sběru (přechod CAPI → online panel). Dashboardová křivka je viditelně zalomená červenou referenční čárou — datapointy před a po této hranici **nejsou přímo srovnatelné**. Pro analýzu trendu vyhodnocovat každou éru samostatně.

## STEM a Median jako doplňkový kontext

Komerční pollery zařazené záměrně, navzdory inicializačním obavám o bias. Důvody pro inkluzi:

- **Topical agility** — komerční pollery reagují na události výrazně rychleji než akademické (CVVM má lag 1-3 měsíce mezi sběrem a publikací; STEM/Median publikují někdy do 2 týdnů od události)
- **Cross-source transparency** — zobrazit polly **vedle sebe** je metodologicky více transparentní než cherry-pick jednoho zdroje. Pokud STEM a Median publikují různá čísla pro stejnou otázku, je to feature (= užívateli vidí, že polly nejsou unanimní), ne bug.
- **Read-only safety** — bias komerčních pollerů se týká primárně situace, kdy data ovlivňují závažné rozhodnutí (volební prognóza, policy). Pro doplňkový dashboard kontext bez vlivu na skóre je risk minimální.

Komerční pollery jsou v dashboardu prezentovány jako **„Aktuální nálezy"** — karty s headline finding + odkazem na originální zprávu, **NE jako data pointy v grafu**. Důvod: jejich publikace je nepravidelná (žádný stabilní time series), formát výstupu se liší (procenta, změny v procentech, kvalitativní kategorie).

**Záměrně vynechané komerční pollery:**
- **Kantar CZ, NMS Market Research, Ipsos CZ** — nemají veřejně dostupný archiv průběžných šetření o důvěře institucím; jejich data se publikují primárně přes média (sekundární citace), nepřesné pro přímý ingest.

## Známé mezery (TODO budoucí iterace)

### Eurobarometer (EK)

Eurobarometer publikuje 2× ročně (jaro + podzim) Standard EB se sekcí „Trust in national institutions" + „Perceived corruption" pro všechny členské státy. Český fact sheet (~20 stran PDF) má všechny relevantní hodnoty.

**Proč zatím není v dashboardu:**
- Web `europa.eu/eurobarometer` je SPA s JS-rendered obsahem — `WebFetch` (LLM-friendly content extraction) nedosáhne
- EU open data portál `data.europa.eu` má dataset entries, ale vyhledávání je také JS-driven
- Manual ingest z PDF country fact sheetů je možný (~10 minut na survey), ale vyžaduje pravidelný human-in-the-loop

**Plánovaný workflow:**
1. Při publikaci nového Standard EB (květen + listopad) ručně stáhnout PDF Czechia country fact sheet
2. Vyextrahovat „Trust in [parliament, government, courts, police, EU]" + „Corruption perception"
3. Přidat do `data/public_opinion/eurobarometer.json` per stejný shape jako CVVM file

Implementovatelné, jen čeká, až bude bandwidth na manual ingest.

### GLOBSEC Trends

Roční report (květen) zaměřený na V4 (CZ, SK, PL, HU). Měří demokratické postoje, vnímání ohrožení, postoje k EU/NATO. Dostupné jako PDF + tisková zpráva.

**Proč zatím chybí:** roční cadence + ad-hoc otázky znamenají, že `time series` nelze stavit jen z GLOBSEC — vždy by to byl 3-4 datapointy. Vhodné spíš jako kvalitativní topical card, zatím defer.

### Mikrodata pro re-analýzu

CVVM publikuje surová mikrodata k mediánovému zpoždění ~1 rok po terénu. Plný re-analýza vlastní agregací (jiné kohorty, jiné weighting) je možná, ale výrazně nad rámec dashboardu. Defer.

## Update workflow

CVVM publikuje nový report měsíčně (typicky 2-3 týdny po skončení terénu). Workflow přidání nového data pointu:

1. Sledovat [CVVM kategorii „Instituce a politici"](https://cvvm.soc.cas.cz/cz/tiskove-zpravy/politicke/instituce-a-politici)
2. Najít novou tiskovou zprávu „Důvěra ústavním institucím – [období]"
3. Otevřít, vyextrahovat % důvěra pro každou instituci
4. Přidat nový objekt do `data/public_opinion/cvvm-trust.json` v poli `data` (sorted ascending by `period`)
5. Commit + push — Vercel re-deployne, dashboard ukáže nový bod

Pro STEM/Median (topical findings):
1. Při významné publikaci přidat objekt do `data/public_opinion/topical.json` v poli `items`
2. Doporučená retence: posledních ~6-10 nálezů; starší přesunout do archivu nebo smazat
3. Commit + push

Žádný cron, žádná automatizace — manuální ingest s human review zajišťuje kvalitu a zabraňuje falešným positives při změně zdrojové struktury.
