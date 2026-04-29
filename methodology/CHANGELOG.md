# Methodology CHANGELOG

Každá změna metodiky (pilíře, váhy, rubric, mantinely) je zaznamenána zde s datem, autorem a odůvodněním. Změny vyžadují přepočet historické řady, viz [`weights.md`](weights.md), pravidla pro změnu vah.

## v0.2.1 — Quarterly validation framework (2026-04-29, iter 9)

Přidán `methodology/validation_<quarter>.md` — automaticky generovaný report
porovnávající náš index s externími benchmarky (V-Dem, EIU, FH, RSF, TI, WJP).

Klíčové pravidlo srovnání:
- Multi-dimension overall composity (V-Dem LDI, EIU Democracy Index,
  Freedom House FitW) → srovnávají se s naším weighted overall
- Single-dimension indexy (RSF press freedom, TI CPI corruption, WJP rule
  of law) → srovnávají se s konkrétním pilířem (RSF↔media, TI↔corruption,
  WJP↔judicial)

**Threshold pro action:** trvalá divergence > 10 bodů ve 2 po sobě jdoucích
kvartálech vůči referenčnímu indexu (V-Dem nebo EIU) = otevřít issue
`methodology-review` a spustit per-pillar audit mappingu.

První report (2026-Q2) ukazuje žádné překročení prahu:
- V-Dem 81.7 vs naše overall 85.0 → +3.3 (normální)
- EIU 80.8 vs overall 85.0 → +4.2 (normální)
- FH 95 vs overall 85.0 → -10.0 (právě na hraně, FH dlouhodobě
  generózní vůči ČR)
- RSF 84 vs media 92 → +8 (FH D=100 averaging up)
- TI CPI 59 vs corruption 59 → 0 (perfect match — corruption pillar JE TI CPI)
- WJP 74 vs judicial 83.9 → +9.9 (FH F=93.75 averaging up)

Žádná změna pilířů, vah ani rubric.

## v0.2 — Governance model: oversight bez pre-merge gate (2026-04-28)

**Major change.** Princip #6 v CLAUDE.md ("Lidský review je povinný před merge") se ruší a nahrazuje vícevrstvým oversight modelem bez blokace publikace.

Nový model — viz `methodology/governance.md`:
1. Self-audit pass — separátní Sonnet call s `prompts/audit.md`, kritizuje vlastní výstup, může flagovat na `needs_review`
2. Source-count → severity cap — deterministická TS rule: severity ≥ 3 vyžaduje ≥ 2 nezávislé outlety, ≥ 4 vyžaduje ≥ 3
3. Daily reports v `data/reports/YYYY-MM-DD.md` — strukturovaný audit trail
4. Anomaly detection — auto GitHub issue při >5 events/den, severity 5, pillar shift >5b., ≥50 % auditor flagged, single outlet >50 %; **nezablokuje publikaci**
5. Monthly spot-check — auto issue 1. v měsíci s 10 random events k human verifikaci, non-blocking kalibrace
6. Public dispute mechanismus — link „Napadnout klasifikaci" u každé události → GitHub issue template

Důvod změny: pre-merge review jako jediná brzda znamená kvalita = osobní kapacita Jakuba. Více vrstev oversight, žádná blokující, dává robustnější systém — index se publikuje průběžně, kvalitu drží defensive infrastructure.

Implementace: iterace 7 (před zapnutím GH Actions cronu, který je iter 8). Source-count rule je samostatná TS funkce, dá se přidat dříve nezávisle, pokud vyvstane potřeba.

**Žádná změna pillars / weights / severity hodnot.** Anti-bias checklist v CLAUDE.md zůstává obsahově stejný, jen se mění **kdo** ho vykonává (auditor Claude pass + deterministické rules místo Jakuba před merge).



## v0.1.4 — Prompt tuning + dedup infrastructure (2026-04-28, iter 4)

- Přidána infrastruktura pro zachycení duplicitních events napříč zdroji (`src/pipeline/dedupe.ts`). Slučování je deterministické a označí konflikt direction/severity jako `status: disputed`. Není to změna **metodiky**, ale ovlivňuje, jak se events finalizují. Pravidla pro merge:
  - Stejný pillar
  - Date ±3 dny
  - Headline Jaccard ≥ 0.3 nad 5-znakovými prefixy tokenů (Czech inflection-friendly)
- Pre-filter prompt rozšířený o explicitní drop kategorie (routine party events, ceremonial diplomatic acts, background context). Žádná změna pilířů ani vah.
- Classification prompt: explicitní `Today` a `Reference week` jako temporal frame, aby Sonnet nehalucinoval rok.

## v0.1 — Initial methodology draft (2026-04-28)

- Šest pilířů zavedeno: `electoral`, `governance`, `judicial`, `media`, `civil`, `corruption`.
- Váhy stanoveny na 15/20/20/15/15/15. Vyšší váha pro `governance` a `judicial` motivovaná literaturou demokratického backslidingu.
- Rubric závažnosti 1–5 s dopady ±0.2 / ±0.5 / ±1.5 / ±3.0 / ±6.0.
- One-off události stárnou lineárně přes 12 týdnů.
- Persistent události zůstávají do explicitní změny `status: resolved`.

**Status: draft, vyžaduje review před prvním produkčním týdnem.**
