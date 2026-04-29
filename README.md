# Index demokracie ČR

Týdně aktualizovaný index stavu demokracie v České republice. Cílem **není** nahradit zavedené roční indexy (V-Dem, EIU, Freedom House), ale **doplnit je o rychlejší detekci směru pohybu** mezi jejich aktualizacemi.

> **Stav: WIP, iterace 4 dokončená.** Pipeline funguje end-to-end (fetch → pre-filter → klasifikace → dedupe → skóre). Strukturální baseline je zatím **placeholder** (real V-Dem/EIU mapování je iter 5). Veřejný dashboard zatím neexistuje (iter 6). Detail metodiky a architektury je v [CLAUDE.md](CLAUDE.md).

## Jak to funguje

1. **Strukturální skóre 0–100** vychází z ročních dat zavedených indexů a aktualizuje se kvartálně. Je to "základní stav" demokratických institucí.
2. **Týdenní indikátor událostí** přičítá/odečítá body za konkrétní události uplynulého týdne podle [pevné rubriky závažnosti](methodology/severity_rubric.md). Jednorázové události stárnou lineárně přes 12 týdnů.
3. **Finální skóre** = strukturální baseline + součet aktivních eventových úprav, vážené přes [šest pilířů](methodology/pillars.md).

Veškerá aritmetika je deterministická a má unit testy ([`src/pipeline/score.ts`](src/pipeline/score.ts), [`tests/score.test.ts`](tests/score.test.ts)). LLM se používá pouze pro klasifikaci událostí, **nikdy** pro výpočet skóre.

## Klíčové principy

- **Auditovatelnost:** každá úprava má JSON záznam s odkazy na ≥ 2 nezávislé zdroje (≥ 3 pro `severity ≥ 4`).
- **Anti-bias:** rubric se aplikuje stejně bez ohledu na to, kdo je u moci. Aktivně se hledají i události, které skóre **zvyšují**. Anti-bias hlídá automatický **self-audit Claude pass** s odděleným promptem.
- **Oversight model, ne pre-merge gate:** týdenní pipeline auto-commituje. Kvalitu drží self-audit, daily reports, anomaly detection (auto GitHub issue), měsíční spot-check a veřejný dispute mechanismus. Detail: [`methodology/governance.md`](methodology/governance.md).
- **Source of truth je Git repo:** žádná externí DB, všechna data, kód, prompty a rozhodnutí jsou veřejná.

## Struktura repa

| Cesta | Obsah |
|---|---|
| `methodology/` | Definice pilířů, rubric závažnosti, váhy, changelog, otevřené issues |
| `schemas/` | JSON schémata pro events, score snapshoty, structural baseline |
| `src/lib/types.ts` | Zod schémata (single source of truth pro TS typy) |
| `src/lib/claude.ts` | Anthropic SDK wrapper s prompt cachingem |
| `src/lib/feeds.ts` | RSS parser wrapper, dedupe podle URL |
| `src/pipeline/score.ts` | Čistá deterministická skórovací funkce |
| `src/pipeline/fetch-sources.ts` | Sběr zpráv ze zdrojů v `config/sources.yaml` |
| `src/pipeline/pre-filter.ts` | Haiku 4.5 relevance gate |
| `src/pipeline/extract-events.ts` | Sonnet 4.6 klasifikace s methodology kontextem |
| `src/pipeline/dedupe.ts` | Slučování duplicitních events napříč zdroji |
| `src/pipeline/validate.ts` | AJV validace JSON schémat |
| `src/pipeline/run-weekly.ts` | Orchestrátor + CLI |
| `tests/` | 67 vitest testů, 100% coverage pro `score.ts` |
| `config/sources.yaml` | Seznam RSS feedů + API/HTML adapterů (lidsky čitelný přehled na [/methodology/sources/](https://democracy-index-cz.vercel.app/methodology/sources/)) |
| `data/structural/` | Quarterly baseline (`2026-Q2.json` zatím placeholder) |
| `data/events/` | Týdenní soubory s klasifikovanými events (`2026-W17.json` první živý běh) |
| `data/scores/` | `timeline.json` historie skóre |
| `prompts/` | Plné prompty pro Haiku pre-filter a Sonnet klasifikaci |
| `CLAUDE.md` | Trvalý kontext pro Claude Code, plný projektový spec + status iterací |

## Lokální běh

```bash
npm install
cp .env.example .env  # a doplnit ANTHROPIC_API_KEY z console.anthropic.com

# Lint, typecheck, testy
npm run typecheck
npm run lint
npm test

# Dry-run pipeline (bez LLM, jen fetch + skóre)
npm run pipeline:weekly -- --week=2026-W17 --baseline=2026-Q2 --skip-llm

# Plný týdenní běh (Haiku + Sonnet, ~$0.50)
npm run pipeline:weekly -- --week=2026-W17 --baseline=2026-Q2 \
  --sources=denik-n,irozhlas,aktualne,investigace-cz
```

Výstup živého běhu se zapisuje do [`data/events/{week}.json`](data/events/) a [`data/scores/timeline.json`](data/scores/timeline.json). Eventy mají `reviewer: "auto"` a vyžadují lidský review před commitem do produkce.

## Příklad výstupu (2026-W17, iterace 4)

```
fetched:        90 articles
pre-filtered:   28 kept
classified:     14 valid events
overall score:  68.4 (z baseline 70.3)
per-pillar:
  electoral   78
  governance  57
  judicial    72.7
  media       66.5
  civil       80.2
  corruption  58.5
```

Score je smysluplný relativně k baseline, ale **publikovat ho zatím nelze** — baseline je placeholder, real mapping z V-Dem/EIU je iter 5.

## Roadmap

- ✅ **Iterace 1:** Foundation + `score.ts` + methodology drafty.
- ✅ **Iterace 2:** Pipeline core (fetch, pre-filter, extract, validate) + prompty.
- ✅ **Iterace 3:** Orchestrátor `run-weekly.ts` + první živý běh.
- ✅ **Iterace 4:** Prompt tuning + dedupe modul, vyřešené issues z prvního běhu.
- ✅ **Iterace 5:** Real strukturální baseline z V-Dem / EIU / FH / RSF / TI / WJP.
- ✅ **Iterace 6:** Next.js + Tailwind dashboard, Vercel-ready static export.
- ✅ **Iterace 7:** Self-audit (cap-severity, auditor pass, anomaly detection, daily reports).
- ✅ **Iterace 8:** GitHub Actions (`weekly-pipeline` Po 06:00 UTC, `recompute-scores`, `monthly-spotcheck`, `dispute-handler`, `ci`).
- ▶ **Iterace 9+ (current):** Backtesting na 2018–2020, kvartální validace proti V-Dem/EIU, prompt tuning z dispute logu.

## Licence

TBD.
