# Methodology issues

Sem zapisuje **Claude i lidé** problémy a otázky, které během práce s metodikou narazily, ale které **nesmí** být řešeny změnou metodiky bez explicitního souhlasu (viz [`CHANGELOG.md`](CHANGELOG.md)).

Formát:

```
## YYYY-MM-DD — krátký název

**Kontext:** Co se stalo, kde, jaký event nebo PR to vyvolalo.

**Problém:** Co konkrétně v metodice je nejasné, sporné, nebo se ukázalo nedostatečné.

**Návrh řešení (volitelně):** Pokud má autor návrh; jinak nechat prázdné, nechť rozhodne reviewer.

**Status:** open | discussed | resolved (s odkazem na CHANGELOG entry).
```

---

## 2026-04-28 — Strukturální baseline 2026-Q2 je placeholder

**Kontext:** Iterace 3 vytvořila `data/structural/2026-Q2.json` aby se mohl spustit první end-to-end běh pipeline. Hodnoty pilířů jsou věrohodně vypadající čísla pro ČR kontext, ale **nejsou** odvozeny z publikovaných extrakcí V-Dem/EIU/FH/RSF/TI/WJP.

**Problém:** Mapování externích indexů na našich 6 pilířů je metodologicky netriviální:
- V-Dem má desítky komponent — které z nich patří do `judicial`, které do `governance`?
- EIU má 5 kategorií — jak je promítnout na 6 pilířů?
- TI CPI je jediné číslo — celé do `corruption`?
- WJP Rule of Law má 8 faktorů — jak je rozdělit?

Bez explicitního dokumentovaného mapování (per pilíř: které externí komponenty, s jakými vahami, jak normalizované do 0–100) nelze publikovat veřejně skóre se ctí. Placeholder je v pořádku pro vývoj a end-to-end validaci, ale dashboard nesmí publikovat dokud není mapování vyřešené.

**Návrh řešení:** Iterace 4 (nebo dřív) — vytvořit `methodology/structural_mapping.md` s explicitním per-pilíř mapováním. Pak přepočítat 2026-Q2.json a všechny historické baselines. Zvážit, jestli mapování validovat backtestingem (aplikovat retroaktivně na 2018–2020 a porovnat s tehdejšími V-Dem skóre).

**Status:** open.

## 2026-04-28 — První živý běh: prompt-tuning issues k opravě

**Kontext:** Iterace 3 spustila pipeline proti 4 RSS feedům (Deník N, iROZHLAS, Aktuálně, Investigace) za týden 2026-W17. Output: 90 článků → 32 pre-filtered (Haiku) → 17 valid events (Sonnet). Skóre kleslo z baseline 70.3 na 69.4. Soubor: `data/events/2026-W17.json`.

**Pozorované problémy s kvalitou výstupu:**

### 1. Halucinované roky v `date` poli
Sonnet u řady událostí vyplnil `date: 2025-04-28` nebo `2025-05-06` místo `2026-XX-XX`, navzdory tomu, že prompt říká "the date the event occurred". Příklady: id 001, 002, 003, 004, 006, 007, 008, 014, 015, 016, 017. Některé events správně mají 2026 (009, 010, 011, 012, 013).

**Dopad:** events s datem 2025 jsou pro one_off už 52 týdnů staré → agedImpact = 0, takže nepřispívají do skóre. Persistent events fungují, ale fragilní.

**Návrh fix:** přidat do user message každého batchu explicitně aktuální datum (`Today: 2026-04-28`). Sonnet se pravděpodobně opírá o training-cutoff datum místo aktuálního kontextu.

### 2. Duplikace stejné události napříč zdroji
Stejná událost reportovaná 2 outlety = 2 záznamy s různými severity/direction. Konkrétní páry v 2026-W17:
- 003 (Deník N) ↔ 017 (Aktuálně.cz) = NCOZ Příbram, severity 3 oba, ale direction se liší (-1 vs +1)
- 013 (iROZHLAS) ↔ 014 (Aktuálně.cz) = Klempíř ČT/ČRo zákon, severity 3 oba
- 004 (Deník N) ↔ 006 (Deník N) = Zůna NATO výrok, severity 2 vs 3, oba na stejný výrok

**Dopad:** double-counting impactu, score zkreslené dolů. Event 003+017 dají dohromady -1.5 + +1.5 = 0 ale měl být jen jeden záznam.

**Návrh fix:** dedupe step po klasifikaci — porovnat headline/date/pillar dvojic přes embedding similarity nebo prostou heuristiku (stejný den + stejný pilíř + Levenshtein < threshold) → sloučit zdroje, ponechat severity z konsensu nebo nejnižší.

### 3. Direction `0` events
Events 009 (Grolich KDU sjezd) a 010 (NATO tribunál) mají `direction: 0` nebo `+1` se severity 1 → score_impact -0.0 nebo +0.2. Pro cíl indexu (sledování institutuionálních posunů) jsou to noise — měly by být filtrovány v pre-filteru jako "background context, not an institutional event".

**Návrh fix:** přitvrdit pre-filter prompt — drop articles describing routine party events (volby vedení), standard diplomatic moves bez controversy, ceremoniální akce.

**Status:** ✅ resolved v iteraci 4 (commit 14d9b1f).

- Issue 1 (halucinované roky): vyřešeno přidáním `Today` + `Reference week` headeru do user message v `extract-events.ts` a předáním `published_at` per článek. Re-run: 14/14 events s datem 2026 (předtím 6/17).
- Issue 2 (duplikace): vyřešeno novým modulem `src/pipeline/dedupe.ts` (Czech-aware Jaccard přes 5-znakové prefixy, conflict detection → `disputed`). Re-run: NCOZ Příbram kauza správně sloučená do jednoho disputed eventu.
- Issue 3 (noise): vyřešeno přitvrzením pre-filter promptu o explicitní drop kategorie (sjezdy, ceremonial, background context). Re-run: 0/14 events s `direction: 0` (předtím 2/17).

## 2026-04-29 — Asymetrie hustoty zdrojů napříč obdobími: skóre není čistá time-series

**Kontext:** Po backfillech historie z roku 2025 (Wayback Machine + curated seed) vznikla timeline 2025-W04 → 2026-W18. Při pohledu na ni je vidět nelineární průběh:

```
2025-W04:  84.8 (events_active=7,   4 zdroje × Wayback)
2025-W18:  83.7 (events_active=44,  4 zdroje × Wayback, vrchol H1 backfillu)
2025-W27:  84.5 (events_active=26,  curated seed — jen 0.6 events/týden)
2025-W51:  84.2 (events_active=27,  curated seed)
2026-W17:  83.0 (events_active=49,  19 zdrojů × live pipeline)
2026-W18:  81.0 (events_active=92,  19 zdrojů × live pipeline)
```

Skore mezi 2025-W18 a 2025-W27 **stoupne** (-0.7 → +0.8), což metodologicky nedává smysl. Stejně tak skok z 2025-W51 (84.2) na 2026-W17 (83.0) o tři body za jeden týden není reálná změna stavu demokracie.

**Problém:** Skóre v daném týdnu = baseline + Σ aged_impact(active events historie). Funkce `score.ts` je deterministická a správná. Křivka je ale formována **hustotou monitorování**, která se mění:

| Období | # zdrojů | Cesta | Events / týden |
|---|---|---|---|
| 2025-W04 → W19 | 4 | Wayback backfill | ~4 |
| 2025-W20 → W51 | 4 (curated seed) | 20 ručně vybraných URL | ~0.6 |
| 2026-W17 → | 19 | Live pipeline | ~50 |

Persistent události se akumulují, ale když přestane proudit data (curated seed pokrývá H2 sporadicky), nové persistent události nepřibývají a one-offy decayují → skóre se odlepí od baseline. Po přechodu na 19zdrojovou pipeline (2026) přibude náhle masivně events → skok dolů.

**Důsledek pro publikaci:** Nelze prezentovat skóre jako srovnatelný indikátor mezi rokem 2025 a 2026. Pohled "ČR v 2025-W51 byla 84.2, v 2026-W17 je 83.0, znamená to zhoršení?" je zavádějící — primární vysvětlení je více zdrojů monitorujících víc událostí, ne reálné zhoršení.

**Návrh řešení (k diskuzi, žádný není triviální):**

1. **Normalizace event impactu podle intenzity zdrojů.** Místo absolutního součtu impactů použít `Σ impact / activeSourceCount × reference_count` (kde `reference_count` = nějaká stabilní hodnota, např. 4 jako "minimální monitoring"). Risk: zatemňuje vztah mezi reálnou událostí a jejím dopadem; kalibrace severity rubric je vázána na absolutní hodnoty.

2. **Backfill historie přes všech 19 zdrojů.** Wayback bohužel většinu moderních zdrojů (Hlídač API, PSP HTML, ÚS RSS, foreign RSS) v 2025 neindexuje. Část by šlo dostat z PSP OpenData hlasovacích dumpů, novinových webarchivů (CzechELib), GRECO/ECHR datasetů. High effort.

3. **Akceptovat asymetrii a explicitně ji komunikovat.** Na dashboardu disclaimer "Pre-2026-W17 data jsou z menšího počtu zdrojů; trendová srovnání mezi obdobími nemusí být plně srovnatelná." Skóre se neupraví. Methodology dokument popisuje limit.

4. **Rolling window severity benchmark.** Místo srovnávat absolutní skóre srovnávat 90-day rolling window proti baseline pro ten samý okno. Sníží efekt sudden expansion zdrojů, ale i sníží signál ze skutečných šoků.

**Status:** open. Doporučení: pro krátkodobou prezentaci (do 2026-Q3) řešení 3 (disclaimer + dokumentace). Pro dlouhodobou srovnatelnost zvážit kombinaci 1 + 2.
