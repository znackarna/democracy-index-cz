# Zdroje dat

Index demokracie ČR čerpá ze dvou nezávislých datových vrstev — **strukturální** (pomalá, ročně/kvartálně se aktualizující) a **týdenní** (rychlá, event-driven). Tahle stránka mapuje obě.

Zdrojem pravdy je [`config/sources.yaml`](https://github.com/znackarna/personal-democracy/blob/main/config/sources.yaml). Tabulky níže se generují přímo z něj při buildu — ručně se nepíšou, takže nemůžou rozjet.

## Strukturální baseline (kvartálně)

Strukturální skóre vychází z šesti zavedených mezinárodních indexů, které se v projektu mapují na šest pilířů (volby, vládnutí, justice, média, svobody, korupce):

| Index | Vydavatel | Frekvence | Pilíř(e) |
|---|---|---|---|
| [V-Dem Democracy Report](https://v-dem.net/) | University of Gothenburg | ročně (jaro) | overall + electoral + civil |
| [EIU Democracy Index](https://www.eiu.com/topic/democracy-index) | Economist Intelligence Unit | ročně | overall |
| [Freedom in the World](https://freedomhouse.org/report/freedom-world) | Freedom House | ročně (březen) | electoral + civil |
| [RSF World Press Freedom Index](https://rsf.org/en/index) | Reporters Without Borders | ročně (květen) | media |
| [TI Corruption Perceptions Index](https://www.transparency.org/en/cpi) | Transparency International | ročně (leden/únor) | corruption |
| [WJP Rule of Law Index](https://worldjusticeproject.org/rule-of-law-index/) | World Justice Project | ročně (říjen/listopad) | judicial + governance |

Detail toho, jak se z těchto šesti indexů složí pillarscores 0–100, popisuje [strukturální mapping](/methodology/structural-mapping/). Aktuální baseline je ve souboru `data/structural/2026-Q2.json` v repu.

## Týdenní zdroje (event monitoring)

Týdenní pipeline (`weekly-pipeline` GitHub Actions workflow, pondělí 06:00 UTC) prochází všechny aktivní zdroje, předfiltruje články přes Claude Haiku 4.5, klasifikuje je přes Claude Sonnet 4.6 a navrhne události s odůvodněním podle [rubric závažnosti](/methodology/severity/). Stav „aktivní" znamená, že zdroj má funkční adapter — buď je to RSS feed (čte se přes `rss-parser`), nebo má dedikovaný TypeScript adapter v [`src/lib/`](https://github.com/znackarna/personal-democracy/tree/main/src/lib). Stav „nezapojený" je placeholder — zdroj je v yamlu evidovaný pro budoucí adapter, ale momentálně se z něj nečte.

<!-- SOURCES_TABLE -->

## Proč právě tyhle zdroje

**Česká média.** Záměrně širší ideologické spektrum: od levicovějšího A2larmu přes centristický Deník N po konzervativní Hospodářské noviny. Investigace.cz má pomalejší kadenci, ale velmi vysokou per-item relevanci. Veřejnoprávní ČT24 i iROZHLAS slouží jako nezávislý referenční bod. Cílem rozmanitosti je [anti-bias](/methodology/governance/) — žádný jeden outlet nesmí dominovat sourcům více než 50 % týdenních events.

**Otevřená data státu.** Strukturální events (přerušená schůze PSP, ústavní nález, proplacená sponzorská smlouva) jsou hodnotnější než mediální komentář — dají se ověřit přímo u zdroje. Hlídač státu (zdarma po registraci na hlidacstatu.cz/api) zpřístupňuje databázi sponzoringu, smluv s anomáliemi a dotací. PSP nemá RSS, čteme přehled schůzí HTML scraperem. Ústavní soud má nedokumentovaný, ale stabilní RSS feed.

**Watchdog organizace.** Transparency International ČR a Frank Bold jsou domácí experti na korupci a vládu zákona. Slouží primárně jako sanity-check pro pillar `corruption` a `judicial`.

**Mezinárodní zdroje.** Pět redakčních (POLITICO Europe, BBC News Europe, Euronews, Visegrad Insight, Brno Daily) plus čtyři instituce (GRECO, Venice Commission, EK Rule of Law, ESLP) — ty institucionální jsou zatím nezapojené, čekají na implementaci adapterů. Smysl: outside-in perspektiva, často s důrazem na CEE kontext, který lokální média někdy přehlížejí. Visegrad Insight má per-item nejvyšší CZ-relevanci ze všech zahraničních zdrojů.

## Jak se zdroje mění

Přidání nového zdroje je dvouminutový commit do [`config/sources.yaml`](https://github.com/znackarna/personal-democracy/blob/main/config/sources.yaml). Pokud má feed RSS, žádný kód se nemění — stačí ho dopsat do `--sources` defaultu ve [`weekly-pipeline.yml`](https://github.com/znackarna/personal-democracy/blob/main/.github/workflows/weekly-pipeline.yml). Pro non-RSS zdroj (HTML scrape nebo API) je potřeba napsat dedikovaný adapter v `src/lib/` a zaregistrovat ho v [`src/pipeline/fetch-sources.ts`](https://github.com/znackarna/personal-democracy/blob/main/src/pipeline/fetch-sources.ts).

Odstranění zdroje proběhne, jakmile jeho feed přestane fungovat (typicky HTTP 5xx déle než dva týdny). Příklad: Iuridicum Remedium byl dropped 2026-04-29 po trvalém HTTP 500 — záznam zůstává v yamlu jako komentář, aby šel snadno vrátit, až svůj feed opraví.

Změny zdrojů se nelogují v [methodology CHANGELOG](/methodology/changelog/), který je rezervovaný pro úpravy metodiky (váhy, rubric, pilíře, governance). Historii zdrojů zjistíš `git log -- config/sources.yaml`.
