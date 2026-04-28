# Governance model — oversight bez pre-merge gate

> **Status: v0.2 design (2026-04-28).** Implementace je iterace 7. Tento dokument je závazný spec pro tu iteraci.

## Filosofie

Týdenní pipeline **se commituje automaticky**. Není mandatory pre-merge lidský review.

Důvod: pre-merge review jako jediná kvalitní brzda znamená, že kvalita indexu je úzce vázaná na osobní kapacitu a konzistenci jednoho člověka. Pokud Jakub má napilno týden, buď index nevyjde, nebo vyjde rychle a špatně. Druhý problém: pre-merge review člověk často degraduje na rubber-stamp — vidí 14 events, většina vypadá rozumně, schválí. Skutečné chyby (subtilní bias, nepřesná severity) v tomto módu uniknou.

Místo toho: **více vrstev oversight, žádná blokující.** Index se publikuje, kvalitu drží:

1. **Self-audit** — separátní LLM pass s odděleným promptem, který kritizuje vlastní výstup
2. **Deterministické rule-based gates** — source-count → severity cap, dedupe konflikty → `disputed`
3. **Daily reports** — strukturovaný audit trail, který reviewer může prolézt asynchronně
4. **Anomaly detection** — automatické issue při výjimečných týdnech, ne blokující
5. **Monthly spot-check** — náhodný vzorek k ručnímu ověření, kalibrace
6. **Public dispute mechanism** — kdokoli může napadnout konkrétní klasifikaci

Žádná z těchto vrstev sama nestačí. Dohromady drží kvalitu.

## Vrstva 1 — Self-audit pass

**Implementace:** `src/pipeline/audit.ts`, `prompts/audit.md`. Spouští se po klasifikaci a dedupe, před zápisem do `data/events/`.

**Vstup:** vygenerované events + metadata o běhu (počet pre-filtered, distribuce pillars/severity/direction).

**Auditor prompt** (samostatný od `prompts/classification.md`, sdílí pillars+rubric kontext):
- Není seznámen s tím, kdo klasifikoval — pouze vidí výstup
- Projde anti-bias checklist per event
- Hledá konkrétně:
  - Severity nepřiměřená rationale (3 s rationale typu "verbální výrok bez dopadu")
  - Direction sporný (např. enforcement → -1 místo +1)
  - Pillar špatně přiřazený podle pillars.md kritérií
  - Citáty > 15 slov
  - Rationale bez explicitního odkazu na rubric
  - Asymetrie napříč politickým spektrem (events o straně X mají soustavně horší severity než srovnatelné o straně Y)

**Output auditoru:** strukturovaný JSON se per-event verdict (`pass | flag | downgrade`) + agregátní hodnocení distribuce.

**Akce:**
- `pass` → events zůstává jak je
- `flag` → status zůstává `active`, ale do rationale se připojí auditor poznámka; zaloguje se do reportu
- `downgrade` → status se přepíše na `needs_review`, severity se neměn

**Auditor NEPŘEPISUJE klasifikaci** — pouze flagne. Změna severity/direction vyžaduje commit. Toto je důležité: auditor je second opinion, ne diktatura.

**Náklad:** ~$0.20 per týdenní běh (Sonnet, 1 call s cached methodology context, vstup ~5K tokens, output ~3K).

## Vrstva 2 — Deterministická rule-based gates

Tyto pravidla vynucuje kód v `src/pipeline/`, ne LLM. Jsou deterministické a auditovatelné.

### Source-count → severity cap

Per CLAUDE.md princip 4: **vícezdrojová doložitelnost = nutná podmínka pro vyšší severity.**

| Severity | Minimální počet nezávislých zdrojů |
|---|---|
| 1, 2 | 1 |
| 3 | 2 |
| 4, 5 | 3 |

"Nezávislé zdroje" = různé `outlet`. Dvě URL z `denikn.cz` se počítají jako 1 zdroj.

**Akce při porušení:** severity se automaticky downgradeuje na nejvyšší podporovanou úroveň. V `rationale` se připojí poznámka `[severity capped from N to M due to source-count rule]`. Score impact se přepočítá.

**Implementace:** `src/pipeline/cap-severity.ts`, volá se po dedupe a před score computation. Test coverage 100 %.

**Důsledek:** prudké jednorázové zprávy (severity 5) **musí mít 3+ outlety**. Pokud jedna kauza visí 24 hodin jen na Deníku N, automaticky cap na severity 3 (max pro single + dual outlet pokrytí).

### Dedupe → disputed

Už implementováno v iteraci 4 (`src/pipeline/dedupe.ts`). Pokud dva outlety popisují stejnou událost s rozdílným direction nebo severity, sloučí se do jednoho eventu se `status: disputed`. Disputed events se zobrazí na webu, ale s vizuální značkou „spor v pokrytí".

## Vrstva 3 — Daily reports

**Implementace:** `src/pipeline/report.ts`. Píše se do `data/reports/YYYY-MM-DD.md` při každém běhu pipeline.

**Format:**

```markdown
# Daily report — YYYY-MM-DD (week YYYY-Wxx)

## Source coverage
- Deník N: 40 articles fetched
- iROZHLAS: 20 articles
- ...
Total: N articles

## Pre-filter
- Kept: M (kept rate %)
- Dropped: N - M
- Drop reasons: { "sport": 12, "opinion": 5, ... }

## Classification
- Events: K (severity distribution: 1/2/3/4/5 = a/b/c/d/e)
- Pillars: { "judicial": 4, "governance": 3, ... }
- Direction: { "+1": x, "0": y, "-1": z }
- Auto-downgraded by source-count rule: P
- Disputed (dedupe conflict): Q

## Self-audit
- Pass: A
- Flagged: B (list IDs + auditor note)
- Downgraded to needs_review: C (list IDs + reason)
- Aggregate anti-bias check: { pass | flagged with explanation }

## Score change
- Before: 70.3
- After: 68.4
- Per-pillar deltas: ...

## Anomalies
- (None) | Auto-issue opened: #N (link)

## Per-event detail
For each event, structured: id, headline, pillar, severity, direction, rationale (with explicit rubric anchor), sources, audit verdict.
```

Reports jsou commitované do gitu. Slouží jako dlouhodobý audit trail, který reviewer může prolistovat měsíčně/kvartálně, ne každý týden.

## Vrstva 4 — Anomaly detection (auto GitHub issue)

**Implementace:** `src/pipeline/detect-anomalies.ts`, volá GitHub Issues API.

**Triggery (kterýkoli z nich):**
1. Týden má > 5 events (typicky 3–5 → anything > 5 zaslouží pozornost)
2. Jakýkoli event má severity 5
3. Pillar score se posune o > 5 bodů od minulého týdne (před aplikací nových events)
4. Self-audit flagne ≥ 50 % events (znamená systematic problem)
5. Jeden outlet je zdrojem > 50 % events (porušení source diversity)

**Akce:** otevře se GitHub issue s labelem `anomaly` a textem:

```
## Anomaly detected — week YYYY-Wxx

Trigger: <which one(s) above>

Brief stats: <relevant numbers>

Daily report: data/reports/YYYY-MM-DD.md
Events file: data/events/YYYY-Wxx.json

Please verify the classification. **The index has been published normally** — this issue is an oversight ping, not a blocker.

If you find an error, edit data/events/YYYY-Wxx.json directly and commit; recompute-scores workflow will update the timeline.
```

**Důležité:** issue NEZASTAVUJE pipeline. Index se commituje a publikuje. Issue je informační kanál pro Jakuba.

## Vrstva 5 — Monthly spot-check

**Implementace:** GitHub Actions workflow `monthly-spotcheck.yml`, trigger `cron: '0 8 1 * *'` (1. v měsíci 08:00 UTC).

**Akce:** projde všechny events z minulého měsíce, vybere 10 náhodných (deterministicky, seed = month string), otevře GitHub issue:

```
## Monthly spot-check — YYYY-MM

10 random events from last month for human verification:

1. **2026-W17-003** | corruption, severity 3, direction +1 | NCOZ ...
   - Sources: Deník N, Aktuálně.cz
   - Rationale: ...
   - [ ] I agree with classification
   - [ ] Disagree (specify below)

2. ...
```

Reviewer projde issue, zaškrtne checkboxy, případně okomentuje. Disagreements se používají jako **kalibrace** — nejsou retroaktivní úprava events (events stárnou v 12 týdnech tak jako tak), ale signal pro budoucí prompt tuning.

**Non-blocking, ne změna stávajících dat.**

## Vrstva 6 — Public dispute mechanism

**Implementace v iteraci 6 (dashboard):** každá karta events na webu má tlačítko „Napadnout klasifikaci".

**Cíl:** GitHub issue template `dispute.md` s pre-filled:
```
Title: Dispute: <event-id> — <headline>

## Current classification
- Pillar: <pillar>
- Severity: <severity>
- Direction: <direction>
- Rationale: <rationale snippet>
- Sources: <list>

## Why this classification is incorrect
<volný text reportéra>

## Proposed alternative
<volitelné>
```

**Workflow `dispute-handler.yml`:** auto-label nový issue s `dispute`, přidá komentář s linkem na methodology dokumenty pro kontext, přiřadí Jakubovi.

Disputes jdou ručně. Pokud se opakuje stejný typ disputu (např. „severity moc nízká pro X kauzy"), je to signal pro úpravu rubric / promptu, ne pro retroaktivní úpravu konkrétního event.

## Failure mode analýza

**Co když self-audit má systematickou slepou skvrnu (např. taky pro-vládní bias)?**

Mitigace: monthly spot-check + public dispute jsou nezávislé od LLM. Kvartální validace proti EIU/V-Dem (CLAUDE.md sekce „Validace") detekuje systematic divergenci.

**Co když anomaly detection moc šumí (každý týden issue, blbě se to ignoruje)?**

Mitigace: thresholds budeme po prvních 3 měsících kalibrovat. Trigger #1 (>5 events) může být kalibrován na medián + 2σ z prvních týdnů, ne fixní 5.

**Co když GitHub Actions selže a pipeline neběží 2 týdny v řadě?**

Mitigace: jednoduchý další workflow `health-check.yml`, který běží denně a pingne issue, pokud poslední úspěšný run pipeline byl > 8 dnů zpátky.

**Co když Jakub bude týdny offline?**

To je v pořádku. Index se aktualizuje sám. Reports a issues počkají. Veřejnost dostává průběžně data.

**Co když chyba v rubric/promptu vede k systematicky špatným events celé týdny?**

Mitigace: kvartální validace (korelace s EIU/V-Dem) detekuje. Backtesting (iter 9+) to prošetří historicky. Public dispute mechanismus zachytí konkrétní příklady.

## Otevřené otázky

1. **Threshold pro source-count rule.** Současný návrh 1/2/3 pro severity 1-2/3/4-5. Alternativa: 1/2/2 (mírnější). Diskuze: kvalitní investigativní zpráva může být jen v Deníku N nebo Investigace.cz — dual-source rule by ji penalizovala. Kompromis: pro kvalifikované české investigativní outlety (Deník N, Investigace.cz, Reportéři ČT, A2larm) přidat výjimku, kdy single-source může mít max severity 3.

2. **Monthly spot-check velikost vzorku.** 10 events z měsíce ~50–100 events = 10–20% sampling. Statisticky tenké. Možná lepší 20 events nebo stratified by pillar.

3. **Auditor — stejný model jako klasifikátor?** Aktuální plán: oba Sonnet 4.6. Alternativa: auditor = Opus 4.6/4.7 (dražší, ale silnější kritika). Rozhodnutí čeká na první test pass.

Všechny otázky se dořeší v iteraci 7 při implementaci.
