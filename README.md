# Index demokracie ČR

Týdně aktualizovaný index stavu demokracie v České republice. Cílem **není** nahradit zavedené roční indexy (V-Dem, EIU, Freedom House), ale **doplnit je o rychlejší detekci směru pohybu** mezi jejich aktualizacemi.

> **Stav: živý, iterace 17 dokončená.** Pipeline běží denně (06:00 UTC) přes GitHub Actions, dashboard je nasazený na Vercelu, timeline pokrývá 50 týdnů 2025-W01 → 2026-W18 (backfill přes Wayback Machine + curated seedy). Detail metodiky a architektury je v [CLAUDE.md](CLAUDE.md).

## Jak to funguje

1. **Strukturální skóre 0–100** vychází z ročních dat zavedených indexů (V-Dem, EIU, FH, RSF, TI CPI, WJP) a aktualizuje se kvartálně. Je to "základní stav" demokratických institucí.
2. **Týdenní indikátor událostí** přičítá/odečítá body za konkrétní události uplynulého týdne podle [pevné rubriky závažnosti](methodology/severity_rubric.md). Jednorázové události stárnou lineárně přes 12 týdnů.
3. **Finální skóre** = strukturální baseline + součet aktivních eventových úprav, vážené přes [šest pilířů](methodology/pillars.md).

Veškerá aritmetika je deterministická a má unit testy ([`src/pipeline/score.ts`](src/pipeline/score.ts), [`tests/score.test.ts`](tests/score.test.ts) — 100 % coverage). LLM se používá pouze pro klasifikaci událostí, **nikdy** pro výpočet skóre.

## Klíčové principy

- **Auditovatelnost:** každá úprava má JSON záznam s odkazy na ≥ 2 nezávislé zdroje (≥ 3 pro `severity ≥ 4`), enforced deterministickým `cap-severity.ts`.
- **Anti-bias:** rubric se aplikuje stejně bez ohledu na to, kdo je u moci. Aktivně se hledají i události, které skóre **zvyšují**. Anti-bias hlídá automatický **self-audit Claude pass** s odděleným promptem.
- **Oversight model, ne pre-merge gate:** denní pipeline auto-commituje. Kvalitu drží self-audit, daily reports, anomaly detection (auto GitHub issue), měsíční spot-check a veřejný dispute mechanismus. Detail: [`methodology/governance.md`](methodology/governance.md).
- **Source of truth je Git repo:** žádná externí DB, všechna data, kód, prompty a rozhodnutí jsou veřejná.

## Struktura repa

| Cesta | Obsah |
|---|---|
| `methodology/` | Definice pilířů, rubric závažnosti, váhy, governance, structural mapping, validation reports, otevřené issues |
| `schemas/` | JSON schémata pro events, score snapshoty, structural baseline |
| `src/lib/` | `types.ts` (Zod), `claude.ts` (SDK wrapper), `feeds.ts`, `hlidac.ts`, `psp.ts` |
| `src/pipeline/` | `score.ts`, `run-daily.ts`, `aggregate-weekly.ts`, `run-weekly.ts`, `audit.ts`, `cap-severity.ts`, `dedupe.ts`, `detect-anomalies.ts`, `report.ts`, `backfill.ts`, `wayback-fetcher.ts`, … |
| `src/app/` | Next.js 15 App Router (`/`, `/udalosti/`, `/srovnani/`, `/metodika/[slug]/`) |
| `tests/` | 146+ vitest testů, 100 % coverage pro `score.ts` |
| `config/sources.yaml` | 28 zdrojů (19 aktivních + 9 placeholderů); auto-renderovaná tabulka na [/metodika/zdroje/](https://democracy-index-cz.vercel.app/metodika/zdroje/) |
| `data/structural/` | Quarterly baseline (`2026-Q3.json` aktivní) |
| `data/events/` | Týdenní soubory s klasifikovanými events (50 týdnů 2025-W01 → 2026-W18) |
| `data/scores/timeline.json` | Historie skóre (50 snapshotů) |
| `data/cross_country/` | 8 zemí × 6 mezinárodních indexů pro `/srovnani/` |
| `data/public_opinion/` | CVVM time series + topical findings (read-only, NE input do skóre) |
| `data/reports/` | `YYYY-MM-DD.md` daily reports |
| `prompts/` | `event_extraction.md` (Haiku), `classification.md` (Sonnet), `audit.md` (oddělený auditor) |
| `.github/workflows/` | `weekly-pipeline.yml` (cron), `recompute-scores.yml`, `monthly-spotcheck.yml`, `dispute-handler.yml`, `ci.yml` |
| `CLAUDE.md` | Trvalý kontext pro Claude Code, plný projektový spec + status iterací |

## Lokální běh

```bash
npm install --legacy-peer-deps  # vitest 2.1 vs vite 5 peer dep conflict
cp .env.example .env  # a doplnit ANTHROPIC_API_KEY z console.anthropic.com
                      # (volitelně HLIDAC_API_KEY pro Hlídač státu adapter)

# Lint, typecheck, testy
npm run typecheck
npm run lint
npm test
npm run test:coverage  # ověř 100 % na score.ts

# Dev server (dashboard)
npm run dev            # → http://localhost:3000
npm run build          # static export do out/

# Daily pipeline (fetch + classify + URL-dedupe + merge do current week file).
# Toto je to, co cron spouští každý den. Nepočítá score, nepíše report.
npm run pipeline:daily -- --week=2026-W18

# Weekly aggregate (audit + score + anomaly + report). Cron volá v pondělí
# pro uplynulý kompletní týden.
npm run pipeline:aggregate -- --week=2026-W17 --baseline=2026-Q3

# Full one-shot pipeline (fetch + classify + audit + score + report v jednom).
# Pro emergency / manual use mimo cron.
npm run pipeline:weekly -- --week=2026-W17 --baseline=2026-Q3

# Pipeline bez LLM (plumbing test, žádné Claude volání).
npm run pipeline:weekly -- --week=2026-W17 --baseline=2026-Q3 --skip-llm
```

Výstup živého běhu se zapisuje do [`data/events/{week}.json`](data/events/) a [`data/scores/timeline.json`](data/scores/timeline.json). Eventy mají `reviewer: "auto"` a procházejí auditem před commitem.

## Roadmap

- ✅ **Iterace 1–5:** Foundation, `score.ts`, pipeline core, real strukturální baseline.
- ✅ **Iterace 6–8:** Next.js dashboard, self-audit infrastruktura, GitHub Actions workflows.
- ✅ **Iterace 9:** Quarterly validation framework (`validate-external.ts` + `validation_2026-Q2.md`).
- ✅ **Iterace 10:** Source expanze (ÚS RSS, PSP scraper, Hlídač iter 2) → 19 aktivních zdrojů.
- ✅ **Iterace 11:** `claude.ts` refactor na `messages.parse()` + JSON Schema output format.
- ✅ **Iterace 12:** Backfill 2025 přes Wayback Machine — 195 events, 50-snapshot timeline.
- ✅ **Iterace 13–15:** Web UX (PillarDetail, IndexComparison, ScoreSummary, Vercel Analytics), Czech URLs, filtrace + paginace na `/udalosti/`.
- ✅ **Iterace 16:** Daily classify + weekly aggregate split (řeší ztráty kvůli RSS retenci).
- ✅ **Iterace 17:** Veřejné mínění (CVVM read-only) + cross-country srovnání 8 zemí × 6 indexů.
- ▶ **Iterace 18+:** Plný backtesting 2018–2020, prompt tuning z dispute logu, source-intensity asymmetry mezi obdobími.

## Licence

TBD.
