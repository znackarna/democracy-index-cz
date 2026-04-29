# Validation report — 2026-Q2

Generated automatically 2026-04-29 by `pipeline:validate`. Per [methodology/governance.md](governance.md) a [CLAUDE.md sekce Validace](../CLAUDE.md).

## Baseline divergence

Náš strukturální baseline (vážený overall) = **85.0**.

Práh pro methodology review: trvalá divergence > **10** bodů ve dvou po sobě jdoucích kvartálech vůči **referenčnímu** indexu (V-Dem nebo EIU). Krátkodobé odchylky tolerujeme — naše skóre váží pilíře jinak než externí indexy a obsahuje týdenní eventovou složku.

| Externí index | Externí (0–100) | Náš srovnávaný cíl | Hodnota | Δ | Nad prahem? |
|---|--:|---|--:|--:|:--:|
| V-Dem (2024) | 81.7 | baseline overall | 85.0 | +3.3 | ✓ |
| EIU (2024) | 80.8 | baseline overall | 85.0 | +4.2 | ✓ |
| FH-FitW (2025) | 95.0 | baseline overall | 85.0 | -10.0 | ✓ |
| RSF (2025) | 84.0 | pillar media | 92.0 | +8.0 | ✓ |
| TI-CPI (2024) | 59.0 | pillar corruption | 59.0 | +0.0 | ✓ |
| WJP (2024) | 74.0 | pillar judicial | 83.9 | +9.9 | ✓ |

Single-dimension indexy (RSF, TI CPI, WJP) se porovnávají s konkrétním pilířem, ne s overall. RSF↔media, TI CPI↔corruption, WJP↔judicial. Multi-dimension (V-Dem LDI, EIU, FH FitW) jsou overall composity → srovnávané s naším weighted overall.

**Závěr:** žádný externí index neukazuje divergenci > 10 b. Baseline je v normální variabilitě.

## Latest snapshot vs baseline

Nejnovější snapshot: **2026-W17** — overall **84.3**.
Posun od baseline: **-0.7 b.** (od 8 aktivních událostí).

| Pilíř | Baseline | Snapshot | Δ |
|---|--:|--:|--:|
| electoral | 91.8 | 91.8 | +0.0 |
| governance | 86.3 | 84.3 | -2.0 |
| judicial | 83.9 | 83.4 | -0.5 |
| media | 92.0 | 91.5 | -0.5 |
| civil | 96.9 | 96.4 | -0.5 |
| corruption | 59.0 | 58.5 | -0.5 |

## Per-pillar diagnostika

Připomínka mapování (z `methodology/structural_mapping.md`):

- **electoral** (15 %) = 91.8
- **governance** (20 %) = 86.3
- **judicial** (20 %) = 83.9
- **media** (15 %) = 92.0
- **civil** (15 %) = 96.9
- **corruption** (15 %) = 59.0

Pokud divergence v sekci 1 překročí práh, prozkoumej, který pilíř k tomu nejvíce přispívá. Časté zdroje šumu:
- `corruption` má jen TI CPI (single-source), takže náš pillar = TI CPI exact value. Jakékoli divergence musí jít odjinud.
- `judicial` používá WJP overall jako proxy (per-factor data nedostupná). Diverze proti WJP samotné = 0.
- FH zahrnuje 4-bodovou škálu pro 7 kategorií, takže drobné rozdíly v FH se zvětší při normalizaci na 0–100.

---

_Tento report se generuje automaticky přes `npm run pipeline:validate -- --quarter=<Q>`. Pro nové kvartály vznikne nový soubor; existující se přepíše po novém běhu (verzování drží git)._