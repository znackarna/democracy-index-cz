# Methodology CHANGELOG

Každá změna metodiky (pilíře, váhy, rubric, mantinely) je zaznamenána zde s datem, autorem a odůvodněním. Změny vyžadují přepočet historické řady, viz [`weights.md`](weights.md), pravidla pro změnu vah.

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
