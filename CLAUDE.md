# CLAUDE.md — Index demokracie ČR

> Tento soubor je trvalý kontext pro Claude Code. Čti ho na začátku každé session.
> Aktualizuje se ručně commitem, nikdy ne automaticky agentem.

## Aktuální stav (2026-04-29)

| Iterace | Status | Co je v ní |
|---|---|---|
| 1 | ✅ done | Repo foundation, JSON schémata + Zod typy, `score.ts` čistá deterministická funkce s 100% coverage, methodology v0.1 (pillars, severity_rubric, weights). |
| 2 | ✅ done | Pipeline core: `claude.ts` SDK wrapper s prompt cachingem, `feeds.ts` rss-parser, `fetch-sources.ts`, `pre-filter.ts` (Haiku 4.5), `extract-events.ts` (Sonnet 4.6), `validate.ts` (AJV). Plné prompty. 56 testů. |
| 3 | ✅ done | `run-weekly.ts` orchestrátor + CLI (`npm run pipeline:weekly`), placeholder strukturální baseline pro 2026-Q2, první živý běh proti 4 RSS feedům: 90 článků → 28 pre-filtered → 14 events. |
| 4 | ✅ done | Prompt fixes (datumy, noise filtering) + `dedupe.ts` modul (Czech-aware Jaccard, conflict detection → `disputed`). Re-run prokázal vyřešení tří issues. |
| 5 | ✅ done | Real strukturální baseline z V-Dem 2024 / EIU 2024 / FH 2025 / RSF 2025 / TI CPI 2024 / WJP 2024 + dokumentované per-pillar mapping v `methodology/structural_mapping.md`. |
| 6 | ✅ done | Next.js 15 + Tailwind dashboard, static export do `out/`, Vercel ready. EventCard má funkční dispute link s URL-prefilled GitHub issue templatem. |
| 7 | ✅ done | Self-audit infrastruktura: `cap-severity.ts` (deterministic source-count rule), `audit.ts` (Sonnet 4.6 s odděleným promptem), `detect-anomalies.ts` (5 triggerů), `report.ts` (data/reports/YYYY-MM-DD.md). 26 nových testů. |
| 8 | ✅ done | GitHub Actions: `weekly-pipeline.yml` (Po 06:00 UTC, auto-commit + open anomaly issues), `recompute-scores.yml` (po edit events nebo baseline), `monthly-spotcheck.yml` (1. v měsíci, deterministic seed), `dispute-handler.yml` (auto-triage), `ci.yml` (typecheck/lint/test/build na PR). |
| 9 | ✅ done | Quarterly validation framework: `validate-external.ts` + `methodology/validation_2026-Q2.md`. Single-dim indexy (RSF↔media, TI↔corruption, WJP↔judicial) se srovnávají s konkrétním pilířem; multi-dim (V-Dem/EIU/FH) s overall. Threshold > 10 b. trvalé divergence ve 2 kvartálech = methodology review trigger. |
| 10 | ✅ done | Source expanze: ÚS RSS adapter (objevený nedokumentovaný feed), `psp.ts` HTML scraper pro přehled schůzí PSP, Hlídač iter 2 (smlouvy s anomáliemi pro AGROFERT/MAFRA, dotace pro watchlist). 8 CZ médií + ÚS + PSP + 3 Hlídač surfaces + 5 zahraničních = **19 aktivních zdrojů** v live pipeline. |
| 11 | ✅ done | `claude.ts` refactor na `messages.parse()` + `jsonSchemaOutputFormat()` se 1-retry policy. Dřívější fragile `JSON.parse(text)` selhával na malformed Sonnet output (workflow run 25104314676). SDK helper přes `transformJSONSchema()` přidává `additionalProperties: false` → Sonnet output je výrazně robustnější. |
| 12 | ✅ done | Backfill 2025: Wayback Machine fetcher pro archivované RSS snapshoty + curated seed pro nedostupné týdny. **2025 H1+H2 backfilled** (denik-n, irozhlas, hn, aktualne) — 195 events napříč 35 týdnů, timeline 50 snapshotů 2025-W01 → 2026-W18 s gradual decline 84.9 → 77.4. Per-source + per-week try/catch resilience. |
| 13 | ✅ done | Web UX vylepšení: PillarDetail komponenta (per-pilíř karty), IndexComparison (srovnání s externími indexy), ScoreSummary s WoW deltou, InfoBox callouts, Vercel Analytics, /metodika/zdroje/ stránka s auto-renderovanou tabulkou z config/sources.yaml. |
| 14 | ✅ done | Czech URLs: `/metodika/`, `/udalosti/`, slugy bez diakritiky (`pilire`, `zavaznost`, `vahy`, `model-dohledu`, `strukturalni-mapovani`, `zdroje`, `zmeny`, `otevrene-otazky`, `validace-2026-q2`). Filesystem `methodology/*.md` a `data/events/*.json` zůstávají (source-of-truth, ne URL). |
| 15 | ✅ done | `/udalosti/` filtrace + paginace (15/stránka): chips pro pilíř + závažnost (multi-toggle), dropdown pro rok. Klientský `EventsList.tsx`, in-memory filtrace. |
| 16 | ✅ done | Daily classify + weekly aggregate split: `run-daily.ts` + `aggregate-weekly.ts`, cron `0 6 * * *`. Řeší ztráty ~30-60 % obsahu kvůli rychlé RSS retenci (iROZHLAS ~1 den). URL-dedupe gate před pre-filterem drží náklad v $13-17/měsíc. 10 nových testů. |
| 17 | ✅ done | Veřejné mínění (read-only, NE input do skóre): CVVM time series 2023-2026 (11 datapointů × 8 institucí, hand-curated z tiskových zpráv), STEM + Median jako topical findings cards. Nová sekce na homepage + `/metodika/verejne-mineni/` dokument vysvětlující, proč read-only (causality direction, feedback loops, double-count s V-Dem/EIU). Eurobarometer defer (jejich web JS-rendered, manual ingest workflow zdokumentován). |
| 18+ | ▶ next | Plný backtesting 2018–2020 (vyžaduje historický archiv + ~$80 LLM nákladů), prompt tuning na základě dispute logu, řešení source-intensity asymmetry mezi obdobími (viz `methodology/issues.md`), případně doplnění chybějících 2025 týdnů z dalších archivů (W08, W15, W30, W36, W39-40, W44-45, W52), Eurobarometer manual ingest po publikaci dalšího Standard EB. |

Detail aktivních úkolů a technického dluhu v [`methodology/issues.md`](methodology/issues.md).

## Cíl projektu

Týdenní automatizované sledování stavu demokracie v České republice. **Cílem není nahradit** zavedené indexy (EIU, V-Dem, Freedom House), ale **doplnit je o rychlejší detekci směru pohybu** mezi jejich ročními aktualizacemi.

Veřejný výstup: statický web na Vercelu s časovou řadou skóre, breakdown po pilířích a auditovatelný seznam událostí s odkazy na zdroje.

## Architektura

**Hybrid GitHub Actions + Vercel:**

- **Pipeline** (fetch, klasifikace, výpočet skóre) běží jako týdenní GitHub Actions workflow. Commituje výsledky jako PR do repa.
- **Dashboard** je Next.js App Router s `output: 'export'`, deployovaný na Vercel. Auto-redeploy při merge do `main`.
- **Source of truth** je Git repo — všechna data, prompty, kód a rozhodnutí jsou versioned. Žádná externí DB.

Důvod hybridu: pipeline má dlouhé doby běhu, mnoho externích volání a musí commitnout do Gitu kvůli auditovatelnosti; Vercel Cron na to není správný nástroj. GitHub Actions má 6h limit, je zdarma a Git-native. Vercel dělá výhradně to, v čem je nejlepší — hostování statického frontendu.

## Metodologie — dvouvrstvý model

### A) Strukturální skóre (0–100) — pomalá vrstva
- Vychází z ročních dat zavedených indexů (V-Dem, EIU, FH, RSF, TI, WJP).
- Aktualizuje se **kvartálně**, když vyjdou nové reporty.
- Reprezentuje „základní stav" demokratických institucí.
- Snapshoty v `data/structural/YYYY-Qx.json`.

### B) Týdenní indikátor událostí — rychlá vrstva
- Co se za uplynulý týden stalo, jak to posunuje skóre.
- Každá událost má bodovou úpravu podle rubric (viz níže).
- Události typu `one_off` **stárnou lineárně přes 12 týdnů** (úprava klesá o 1/12 týdně).
- Události typu `persistent` zůstávají, dokud je ruční commit neuzavře jako `resolved`.
- Týdenní soubory v `data/events/YYYY-Wxx.json`.

**Finální zveřejněné skóre = strukturální baseline + součet aktuálně živých eventových úprav, vážené po pilířích.**

## Klíčové principy (nepřekročitelné)

1. **Deterministická aritmetika.** Claude kategorizuje události, ale **NEPOČÍTÁ skóre**. Veškerá matematika je v `src/pipeline/score.ts` a má unit testy.
2. **Pevné rubrics.** Váhy pilířů a kritéria závažnosti jsou zafixované. Změny pouze přes Git commit s odůvodněním v `methodology/CHANGELOG.md`.
3. **Transparentnost.** Kód, data, prompty a všechna rozhodnutí jsou veřejné.
4. **Auditovatelnost.** Každá úprava skóre má JSON záznam s odkazy na ≥ 2 nezávislé zdroje (≥ 3 pro severity ≥ 4) — viz `methodology/governance.md`.
5. **Anti-bias.** Vědomě hledat i události, které skóre **zvyšují**. Aplikovat rubric stejně přísně bez ohledu na to, kdo je u moci. Anti-bias se hlídá **automatickým self-audit Claude callem** s odděleným promptem od klasifikátoru.
6. **Oversight model, ne pre-merge gate.** Týdenní pipeline se commituje automaticky. Kvalitu drží: (a) self-audit pass, (b) daily report s detailním zdůvodněním, (c) anomaly detection (auto-issue při >5 events/den nebo severity 5), (d) měsíční spot-check (10 náhodných events k ručnímu ověření), (e) veřejný dispute mechanismus. Detail: `methodology/governance.md`.

## Pilíře a váhy

| Kód | Pilíř | Váha |
|---|---|---|
| `electoral` | Volební proces a pluralismus | 15 % |
| `governance` | Fungování vlády a parlamentu | 20 % |
| `judicial` | Soudní nezávislost a právní stát | 20 % |
| `media` | Mediální svoboda | 15 % |
| `civil` | Občanské svobody | 15 % |
| `corruption` | Korupce a transparentnost | 15 % |

Detailní vymezení každého pilíře v `methodology/pillars.md`. Zdůvodnění vah v `methodology/weights.md`.

## Rubric závažnosti událostí

| Závažnost | Popis | Bodová úprava subskóre pilíře |
|---|---|---|
| 1 | Zanedbatelný incident, výroky bez institucionálního dopadu | ±0.2 |
| 2 | Drobný jednorázový incident s lokálním dopadem | ±0.5 |
| 3 | Významný incident, široký dopad nebo precedent | ±1.5 |
| 4 | Závažné porušení normy nebo procesu | ±3.0 |
| 5 | Strukturální posun, ústavní krize, systémová změna | ±6.0 |

Příklady a kalibrační pravidla v `methodology/severity_rubric.md`.

## Zdroje dat

### Strukturální (kvartální)
V-Dem · EIU Democracy Index · Freedom House (FitW, NiT) · RSF Press Freedom Index · Transparency International CPI · World Justice Project Rule of Law Index · EK Rule of Law Report (CZ kapitola) · Bertelsmann BTI

### Týdenní (event monitoring) — 19 aktivních zdrojů
- **Česká média (8 RSS):** Deník N, iROZHLAS, ČT24, HN, Aktuálně.cz, Investigace.cz, A2larm, Seznam Zprávy
- **Otevřená data (3 implementované adaptery):**
  - Hlídač státu — sponzoring (`src/lib/hlidac.ts`, fan-out přes 9 hlavních CZ stran, threshold 100k Kč)
  - Hlídač státu — smlouvy s anomáliemi (`fetchWatchlistSmlouvyAsArticles`, watchlist AGROFERT + MAFRA)
  - Hlídač státu — dotace pro watchlist (`fetchWatchlistDotaceAsArticles`)
  - PSP HTML scraper (`src/lib/psp.ts`) — přehled schůzí + status „Přerušeno"
  - ÚS RSS feed (nedokumentovaný `https://www.usoud.cz/rss`, 30 položek, fresh)
- **Watchdog (1 RSS):** Transparency International ČR
- **Mezinárodní (5 RSS):** POLITICO Europe, BBC News Europe, Euronews, Visegrad Insight, Brno Daily
- **Nezapojené placeholdery:** Senát, Nejvyšší soud, Nejvyšší správní soud, Rekonstrukce státu, Frank Bold, GRECO, Venice Commission, EC Rule of Law, ECHR (Iuridicum Remedium dropped 2026-04-29 kvůli HTTP 500).

Plný seznam s URL, typem a `notes` v [`config/sources.yaml`](config/sources.yaml). Lidsky čitelný přehled na webu na [`/metodika/zdroje/`](src/app/metodika/[slug]/page.tsx) (auto-renderovaná tabulka z yamlu při buildu).

## Struktura repozitáře

```
democracy-index-cz/
├── CLAUDE.md                      # tento soubor
├── README.md                      # veřejný popis
├── package.json                   # @anthropic-ai/sdk 0.91+, @vercel/analytics, next 15
├── tsconfig.json
├── next.config.mjs                # output: 'export'
├── vercel.json                    # framework: nextjs (žádné cron jobs)
│
├── methodology/                   # source-of-truth dokumenty (NE URL, ty jsou /metodika/)
│   ├── pillars.md                 # vymezení pilířů
│   ├── severity_rubric.md         # rubric s příklady
│   ├── weights.md                 # zdůvodnění vah
│   ├── governance.md              # 6-vrstvý oversight model
│   ├── structural_mapping.md      # mapování V-Dem/EIU/FH/RSF/TI/WJP → pilíře
│   ├── sources.md                 # popis kategorií zdrojů + auto-render tabulky
│   ├── issues.md                  # otevřené metodologické otázky (data-intensity asymmetry)
│   ├── CHANGELOG.md               # log změn metodiky
│   └── validation_2026-Q2.md      # kvartální validační report
│
├── config/
│   └── sources.yaml               # 28 zdrojů (19 aktivních + 9 placeholderů)
│
├── data/                          # source of truth
│   ├── structural/                # YYYY-Qx.json
│   ├── events/                    # YYYY-Wxx.json (50 týdnů 2025-W01 → 2026-W18)
│   ├── scores/timeline.json       # historie skóre (50 snapshotů)
│   ├── reports/                   # YYYY-MM-DD.md daily reports
│   ├── seeds/                     # curated seed JSONs pro backfill mode
│   ├── index_comparisons/         # YYYY-Qx.json srovnání s externími indexy
│   └── public_opinion/            # CVVM trust + topical findings (read-only)
│
├── schemas/
│   ├── event.schema.json
│   └── score.schema.json
│
├── prompts/
│   ├── event_extraction.md        # Haiku pre-filter
│   ├── classification.md          # Sonnet klasifikace (Output language: Czech)
│   └── audit.md                   # oddělený auditor pass (anti-bias)
│
├── src/
│   ├── pipeline/                  # běží v GitHub Actions
│   │   ├── fetch-sources.ts       # RSS/API/HTML agregace per source-id dispatch
│   │   ├── pre-filter.ts          # Claude Haiku 4.5 — relevance gate
│   │   ├── extract-events.ts      # Claude Sonnet 4.6 — klasifikace
│   │   ├── audit.ts               # Sonnet self-audit (oddělený prompt)
│   │   ├── cap-severity.ts        # deterministic source-count → severity cap
│   │   ├── dedupe.ts              # Czech-aware Jaccard, conflict → disputed
│   │   ├── detect-anomalies.ts    # 5 triggerů, per-source threshold scaling
│   │   ├── report.ts              # daily MD report generator
│   │   ├── score.ts               # ČISTĚ DETERMINISTICKÝ — počítá skóre
│   │   ├── recompute-scores.ts    # přepočet timeline napříč všemi events
│   │   ├── monthly-spotcheck.ts   # 1. v měsíci, deterministic seed
│   │   ├── validate-external.ts   # quarterly index comparison
│   │   ├── validate.ts            # AJV schema validace
│   │   ├── backfill.ts            # seed/Wayback historický backfill
│   │   ├── wayback-fetcher.ts     # CDX API klient pro archivované RSS
│   │   └── run-weekly.ts          # orchestrátor + CLI
│   ├── lib/
│   │   ├── claude.ts              # SDK wrapper, messages.parse + retry
│   │   ├── feeds.ts               # rss-parser wrapper
│   │   ├── hlidac.ts              # Hlídač státu API klient (3 surfaces)
│   │   ├── psp.ts                 # PSP HTML scraper (přehled schůzí)
│   │   └── types.ts               # Zod schemas + TS typy
│   └── app/                       # Next.js App Router (dashboard)
│       ├── layout.tsx             # + <Analytics /> z @vercel/analytics
│       ├── page.tsx               # hlavní dashboard
│       ├── udalosti/page.tsx      # /udalosti/ — server, deleguje na <EventsList>
│       ├── metodika/
│       │   ├── page.tsx           # /metodika/ — TOC
│       │   └── [slug]/page.tsx    # /metodika/{pilire,zavaznost,...}
│       ├── lib/
│       │   ├── data.ts            # readAllEvents, readLatest, readTimeline, readIndexComparisons
│       │   └── markdown.ts        # MD → HTML build-time, METHODOLOGY_DOCS registry, SOURCES_TABLE marker
│       └── components/
│           ├── Header.tsx         # nav: Přehled / Události / Metodika
│           ├── ScoreSummary.tsx   # hlavní číslo + WoW delta
│           ├── ScoreTimeline.tsx  # Recharts line chart
│           ├── PillarBreakdown.tsx # 6 sloupců + černé tečky baseline
│           ├── PillarDetail.tsx   # per-pilíř karty s příklady
│           ├── IndexComparison.tsx # tabulka vs. V-Dem/EIU/FH/RSF/TI/WJP
│           ├── EventCard.tsx      # + dispute link
│           ├── EventsList.tsx     # client filter+pagination (15/strana)
│           ├── PublicOpinion.tsx  # CVVM time series + topical findings cards
│           └── InfoBox.tsx        # collapsible <details> callout
│
├── tests/                         # vitest, 146+ testů
│   ├── score.test.ts              # 100 % coverage
│   ├── claude.test.ts             # SDK wrapper + retry policy
│   ├── psp.test.ts                # PSP scraper (date parsing, table)
│   ├── hlidac.test.ts             # Hlídač client + 3 surfaces
│   ├── backfill.test.ts           # seed mode (Wayback je integration, off)
│   ├── wayback-fetcher.test.ts    # CDX query + snapshot picker
│   ├── recompute-scores.test.ts
│   └── ... (další per-modul)
│
├── tmp/                           # ad-hoc probe scripty (gitignored kromě .gitkeep)
│
├── .github/
│   ├── workflows/
│   │   ├── weekly-pipeline.yml     # cron Po 06:00 UTC, auto-commit + anomaly issues
│   │   ├── recompute-scores.yml    # po edit events nebo baseline
│   │   ├── monthly-spotcheck.yml   # 1. v měsíci, deterministic seed
│   │   ├── dispute-handler.yml     # auto-triage disputes
│   │   └── ci.yml                  # typecheck/lint/test/build na PR
│   └── ISSUE_TEMPLATE/
│       └── dispute.md              # public dispute mechanismus
│
└── public/                        # statická aktiva pro Next.js
```

## Pipeline workflow (varianta B z 2026-04-29 — daily classify, weekly aggregate)

GitHub Actions workflow `weekly-pipeline.yml` (filename zachován kvůli historii runů, name attribute = `pipeline`). Trigger: cron `0 6 * * *` (každý den 06:00 UTC). Důvod denní cadence: rychle se točící RSS feedy (iROZHLAS retence ~1 den, HN ~3 dny) — týdenní cron při této retenci ztrácel ~30-60 % týdenního obsahu. Detail: [`methodology/issues.md`](methodology/issues.md) → záznam o source-intensity asymmetry (paralelní problém).

### Daily fáze (každý den, vč. pondělí)

`src/pipeline/run-daily.ts`:

1. **Sběr** — `fetch-sources.ts` stáhne všech 19 aktivních zdrojů.
2. **URL-dedupe** — načte všechny URL z events souborů z posledních 4 týdnů (= horní hranice typické RSS retence) a dropne articles, jejichž URL už byly klasifikovány. Typicky drop ~80 % fetchnutých articles. **Klíčová cost optimization**, jediný důvod, proč daily NENÍ 7× dražší než weekly.
3. **Pre-filter** — Haiku 4.5 jen na nové články.
4. **Group by week of `published_at`** — drives správný file routing pro late-arriving articles (např. nedělní článek viděný v pondělním fetchu jde do W17, ne W18).
5. **Per-week classify** — Sonnet 4.6 s `--start-seq` continuing existing NNN. Cap severity. Cross-day dedupe vůči existujícím events (sloučení do `status: disputed` při konfliktu).
6. **Write/merge** — append do `data/events/<week>.json`.

Daily NEPOČÍTÁ skóre, NEPÍŠE report ani NEDETEKUJE anomálie.

### Weekly aggregate fáze (jen pondělí)

`src/pipeline/aggregate-weekly.ts`, target = uplynulý kompletní ISO týden (`last monday`):

7. **Self-audit** — Sonnet pass s `prompts/audit.md` projde anti-bias checklist nad accumulated events za uplynulý týden. Auditor může event downgradeovat na `needs_review`, nepřepisuje klasifikaci.
8. **Score snapshot** — `score.ts` přečte baseline + všechny events files (current + history), aplikuje aging, vypočte vážený průměr, append do `data/scores/timeline.json` (replace any existing entry pro tento týden).
9. **Detect anomalies** — 5 triggerů s per-source threshold scaling.
10. **Daily report** — `data/reports/YYYY-MM-DD.md` se snapshot + per-event detail.
11. **Auto-commit + open anomaly issues** — `data: aggregate YYYY-Wxx [skip ci]` (nebo `daily YYYY-Wxx + aggregate YYYY-W(xx-1)` v pondělí).

### CLI

```bash
# Denně:
npm run pipeline:daily -- --week=2026-W18 [--sources=...]

# Pondělí (po daily):
npm run pipeline:aggregate -- --week=2026-W17 --baseline=2026-Q2 [--skip-audit] [--active-source-count=19]
```

`run-weekly.ts` zůstává pro emergency / manual full-pipeline runs (fetch + classify + aggregate v jednom shotu), ale cron ho už nepoužívá.

**Měsíční oversight (1. v měsíci):** automaticky otevřený issue s 10 náhodnými events z minulého měsíce a otázkou „Souhlasíš s klasifikací?". Non-blocking, kalibrace.

**Veřejný dispute mechanismus:** každá událost na webu má link „Napadnout klasifikaci" → GitHub issue s pre-filled template (event ID, current severity, „proč není správná"). Issues se procházejí ručně.

Detailní governance model: [`methodology/governance.md`](methodology/governance.md).

## JSON schémata

### Event
```json
{
  "id": "2026-W17-001",
  "date": "2026-04-22",
  "headline": "string",
  "summary": "1–3 věty, vlastní parafráze, žádný citát 15+ slov",
  "pillar": "judicial",
  "severity": 3,
  "direction": -1,
  "duration": "one_off",
  "sources": [
    {"title": "string", "url": "string", "outlet": "string", "fetched_at": "ISO8601"}
  ],
  "score_impact": -1.5,
  "rationale": "Proč právě tato závažnost a pilíř, odkaz na příslušné kritérium rubric.",
  "reviewer": "manual|auto",
  "status": "active|resolved|disputed",
  "created_at": "ISO8601",
  "expires_at": "ISO8601 (jen pro one_off)"
}
```

### Score snapshot
```json
{
  "week": "2026-W17",
  "computed_at": "ISO8601",
  "overall_score": 76.4,
  "pillars": {
    "electoral": 82.0, "governance": 71.5, "judicial": 78.0,
    "media": 74.5, "civil": 79.0, "corruption": 72.5
  },
  "active_events_count": 14,
  "structural_baseline": "2026-Q2"
}
```

## Mantinely pro Claude

**Claude DĚLÁ:**
- Identifikuje a parafrázuje události z poskytnutého feedu
- Klasifikuje podle pevného rubric
- Navrhuje závažnost s explicitním odůvodněním odkazujícím na rubric
- Hlásí problémy s metodikou do `methodology/issues.md` (nikdy je nemění sám)

**Claude NEDĚLÁ:**
- Nepočítá finální skóre — to dělá výhradně `score.ts`
- Neupravuje váhy, pilíře ani rubric
- Necituje doslova (parafráze, max 1 citát < 15 slov na zdroj)
- Nepřidává události bez ověřitelného URL zdroje
- Nehodnotí podle „atmosféry" — pouze podle konkrétních ověřitelných faktů
- Nezaujímá pozice politických aktérů — popisuje **institucionální dopad**, ne morální hodnocení

**Když si není jistý:**
- `severity: null, status: "needs_review"` + komentář pro reviewera
- Lepší falešně neutrální než falešný poplach

## Anti-bias checklist (běží automaticky v audit pass — viz `methodology/governance.md`)

Tento checklist projíždí **oddělený Sonnet call** s `prompts/audit.md` proti vygenerovaným events. Auditor nepřepisuje klasifikaci, ale může event downgradeovat na `needs_review` při nálezu a výsledek zapíše do daily reportu.

1. Je v seznamu alespoň jedna událost s `direction: +1`? Pokud ne, je to opravdu realita uplynulého týdne, nebo selektivní pozornost?
2. Jsou zdroje rozmanité? (Žádné jedno médium > 50 % event sourců.)
3. Aplikoval bych stejné kritérium na opačnou politickou stranu? Toto se kontroluje per event, ne jen agregátně.
4. Je každá událost se `severity ≥ 3` doložená alespoň 2 nezávislými zdroji? `severity ≥ 4` musí mít ≥ 3. Tuto podmínku vynucuje **deterministická TS funkce** po klasifikaci, ne audit — porušení = automatický downgrade severity.
5. Mám pro každou událost konkrétní odkaz na bod rubric, ne jen obecné odůvodnění?

## Validace (kvartálně)

- Spočítej korelaci vlastního indexu s EIU / V-Dem / FH za poslední rok.
- Pokud trvalá divergence > 10 bodů: prošetři, zveřejni `methodology/validation_YYYY-Qx.md`.
- Backtesting: aplikuj aktuální metodiku na minulé období (např. 2018–2020) a porovnej, zda dává smysluplné výsledky.

## Tech stack

- **Runtime:** Node.js 20+, TypeScript (strict mode)
- **Pipeline:** `@anthropic-ai/sdk`, `rss-parser`, `js-yaml`, `ajv`, `zod` (runtime types)
- **Frontend:** Next.js 15+ (App Router, `output: 'export'` pro statické sestavení), React, Tailwind CSS, Recharts
- **Testing:** `vitest` (pipeline + score function), `@testing-library/react` (komponenty)
- **Linting:** `eslint`, `prettier`
- **CI/CD:** GitHub Actions pro pipeline, Vercel pro deploy
- **Storage:** plain JSON v Git repu (žádná DB)

### Proč TypeScript strict
JSON schémata mají odpovídající Zod typy v `src/lib/types.ts`. Pipeline by měla parsovat všechna externí data přes Zod schemas — chyba ve struktuře feed dat se musí projevit hned, ne tiše.

### Proč Next.js static export
Dashboard nepotřebuje SSR. Build čte `data/scores/timeline.json` a `data/events/*.json`, vše se předrenderuje. Vercel pak hostí jen static files. Žádné runtime náklady, žádné cold starty, žádné runtime API klíče.

## Časté příkazy

```bash
# Setup
npm install --legacy-peer-deps  # vitest 2.1 vs vite 5 peer dep conflict
cp .env.example .env  # a doplnit ANTHROPIC_API_KEY (+ volitelně HLIDAC_API_KEY)

# Lint, typecheck, testy
npm run typecheck
npm run lint
npm test
npm run test:coverage  # pro kontrolu, že score.ts má 100 %

# Next.js dev server
npm run dev
npm run build  # static export do out/

# Daily pipeline (fetch + classify + URL-dedupe + merge do current week file).
# Toto je to, co cron spouští každý den. Nepočítá score, nepíše report.
npm run pipeline:daily -- --week=2026-W18 [--sources=...]

# Weekly aggregate (audit + score + anomaly + report). Cron volá v pondělí
# pro uplynulý kompletní týden (= last monday do včera neděle).
npm run pipeline:aggregate -- --week=2026-W17 --baseline=2026-Q2

# Full one-shot pipeline (fetch + classify + audit + score + report v jednom).
# Pro emergency / manual use mimo cron.
npm run pipeline:weekly -- --week=2026-W17 --baseline=2026-Q2

# Pipeline bez LLM (plumbing test, žádné Claude volání).
npm run pipeline:weekly -- --week=2026-W17 --baseline=2026-Q2 --skip-llm
npm run pipeline:daily   -- --week=2026-W18 --skip-llm

# Backfill historie z curated seedu (JSON s {date, url, headline, outlet})
npm run pipeline:backfill -- --seed=data/seeds/2025-curated.json --baseline=2026-Q2 --skip-audit

# Backfill z Wayback Machine archivovaných RSS snapshotů (per-source +
# per-week try/catch — výpadek jednoho zdroje/týdne neshodí celý běh)
npm run pipeline:backfill -- --wayback --from=2025-01-01 --to=2025-05-11 \
  --sources=denik-n,irozhlas,hn,aktualne --baseline=2026-Q2 --skip-audit

# Recompute scores přes všechny existující events files (po edit baseline / events)
npm run pipeline:recompute -- --baseline=2026-Q2

# Validation report
npm run pipeline:validate -- --quarter=2026-Q2
```

CLI flags pro `pipeline:weekly`:
- `--week=YYYY-Wxx` (povinné) — týden, který se zpracovává; používá se pro ID events i jako referenční rámec pro klasifikaci
- `--baseline=YYYY-Qx` (povinné) — quarter strukturálního baseline (`data/structural/{quarter}.json`)
- `--sources=id1,id2,...` (volitelné) — filtr ID zdrojů z `config/sources.yaml`; default = všechny RSS
- `--skip-llm` (volitelné) — vynechá pre-filter a klasifikaci, pouze fetch + score plumbing

## GitHub Actions workflows

### `.github/workflows/weekly-pipeline.yml`
- Trigger: `cron: '0 6 * * 1'` + `workflow_dispatch` (pro manuální spuštění)
- Secrets: `ANTHROPIC_API_KEY` (povinné), `HLIDAC_API_KEY` (volitelné — fail-soft warning)
- Permissions: `contents: write`, `issues: write`
- Default sources: 19 aktivních (8 CZ media + ÚS + PSP + 5 zahraničních + 3 Hlídač)
- Outputs: auto-commit do `main` (`data: weekly pipeline YYYY-Wxx [skip ci]`) + auto-otevřené anomaly issues přes `gh issue create` s pre-filled bodem
- Time limit: 30 minut (default), v praxi 8-12 minut

### `.github/workflows/recompute-scores.yml`
- Trigger: push do `main` na cestě `data/events/**` nebo `data/structural/**`
- Spustí `npm run pipeline:recompute -- --baseline=2026-Q2`
- Commitne aktualizovaný `data/scores/timeline.json` zpět (s `[skip ci]` v message)

### `.github/workflows/monthly-spotcheck.yml`
- Trigger: cron 1. v měsíci, `workflow_dispatch`
- Vybere 10 deterministicky seeded events z minulého měsíce
- Otevře GitHub issue s otázkou „Souhlasíš s klasifikací?" (non-blocking, kalibrace)

### `.github/workflows/dispute-handler.yml`
- Trigger: nový GitHub issue s `dispute` labelem
- Auto-triage: extrahuje event ID z těla, ověří jeho existenci, doplní context

### `.github/workflows/ci.yml`
- Trigger: PR + push do `main`
- Spustí: typecheck, lint, vitest, `next build`
- Blocking — `main` chráněný, PR potřebuje green checks

## Vercel konfigurace

- **Framework preset:** Next.js (auto-detect, `vercel.json` má jen `framework: nextjs`)
- **Build command:** `npm run build`
- **Output directory:** `out` (kvůli static export)
- **Install command:** `npm install --legacy-peer-deps`
- **Environment variables:** žádné runtime (static), build-only pokud potřeba
- **Cron jobs:** **NEPOUŽÍVAT.** Pipeline běží na GitHub Actions, ne na Vercelu.
- **Production branch:** `main`
- **Preview deployments:** zapnuté pro všechny PR
- **Analytics:** zapnuté přes `@vercel/analytics` v `src/app/layout.tsx` (`<Analytics />` před `</body>`)

## Initial setup — historie

Iterace 1–15 hotové k 2026-04-29. Detail v tabulce na začátku souboru. Pro každou iteraci je v Gitu commit s explicitním rozsahem; `git log --oneline` ukáže chronologický průběh.

## Co Claude Code typicky řeší v této code base

- Implementace nových source adapterů v `src/pipeline/fetch-sources.ts`
- Vylepšování promptů pro extrakci/klasifikaci (s respektem k rubric)
- Refactor `score.ts` při zachování test coverage
- Generování dashboard komponent v `src/app/`
- Psaní validačních skriptů, Zod schémat a unit testů
- Drobné úpravy `methodology/` na základě issue diskuze (vždy s commit message vysvětlujícím dopad)

## Co Claude Code NEŘEŠÍ sám bez explicitní instrukce

- Změny vah pilířů
- Změny bodových hodnot v rubric
- Mazání nebo přepisování již commitnutých events (jen status změny přes nový commit)
- Cokoli, co by retroaktivně měnilo historické skóre
- Přesun pipeline z GitHub Actions na Vercel runtime (architektonické rozhodnutí)
