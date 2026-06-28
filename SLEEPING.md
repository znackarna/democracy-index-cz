# 💤 Projekt v hibernaci

> Tento repozitář byl uveden do režimu **hard pause** dne **2026-06-28**.
>
> Žádné CI/CD neběží, žádné API klíče nejsou aktivní, doména a Vercel
> projekt byly zrušeny. Toto README je jediný oficiální zdroj toho, co
> přesně bylo deaktivováno a jak projekt znovu nahodit.

## Co bylo zachováno (kompletní záloha)

✅ **Veškerý kód** — všech 19 source adapterů, pipeline, Next.js frontend,
   metodologie, prompty, testy. Vše v této git historii navždy.
✅ **Veškerá data** — 65 týdenních souborů událostí (`data/events/`),
   63 score snapshotů (`data/scores/timeline.json`), 9 reportů
   (`data/reports/`), 8 zemí cross-country, public opinion CVVM/STEM.
✅ **Git history** — každý daily pipeline run je samostatný commit
   s `[skip ci]`. Auditovatelnost nedotčená.
✅ **Tag `v1.0-sleep`** ukazuje na poslední aktivní stav před uspáním.

## Poslední aktivní stav (před hibernací)

| | |
|---|---|
| Poslední pipeline run | **2026-06-22** (týden 25) |
| Poslední score snapshot | **2026-W25 — overall 53.2** |
| Aktivních events v okamžiku spánku | 641 |
| Pokrytá časová řada | 2025-W01 → 2026-W25 (63 týdnů) |
| Strukturální baseline | 2026-Q3 |
| Poslední commit před uspáním | `fc6cd6f data: daily 2026-W26 [skip ci]` |

## Co bylo deaktivováno

| Vrstva | Status | Detail |
|---|---|---|
| **GitHub Actions cron (denní pipeline)** | ⛔ vypnutý | `schedule` zakomentovaný v [`.github/workflows/weekly-pipeline.yml`](.github/workflows/weekly-pipeline.yml). `workflow_dispatch` zachován pro manuální wake-up. |
| **GitHub Actions cron (monthly spotcheck)** | ⛔ vypnutý | Stejný princip, `schedule` zakomentovaný v [`.github/workflows/monthly-spotcheck.yml`](.github/workflows/monthly-spotcheck.yml). |
| **GitHub Secrets (ANTHROPIC_API_KEY, HLIDAC_API_KEY)** | ⛔ smazané | I kdyby cron náhodou běžel, nemá s čím autentizovat. |
| **Anthropic API klíč** | ⛔ revoked | Zneplatněný v console.anthropic.com. Žádné riziko zneužití unesené v gitu. |
| **Hlídač státu API klíč** | ⛔ revoked | Stejně tak. |
| **Stripe Payment Links** | ⛔ deaktivované | Všech 10 linků (CZK + EUR × jednorázové + měsíční) deaktivováno v Stripe Dashboardu, aby žádný dárce nedokončil platbu na nefunkční web. |
| **Vercel projekt** | ⛔ smazaný | `democracy-index-cz` odebraný. Doména `indexdemokracie.cz` rozvázaná. |
| **GitHub repo** | 🔒 archived | Repo `znackarna/democracy-index-cz` je read-only. Žádné pushe, žádné Actions runy, žádné nové issues/PRs. |

## Co bylo zachováno **aktivní**

- ✅ **Git repo** — read-only veřejné, viditelné, klonovatelné, historie intaktní
- ✅ **GitHub Issues** — zůstávají archivované jako čtecí audit trail (dispute mechanismus, anomaly reports)
- ✅ **`workflow_dispatch`** — manuální spuštění workflows je možné po odarchivování (viz wake-up postup níže)

## Jak projekt probudit

### Měkký restart (jen ručně spustit pipeline pro jeden týden)

1. Odarchivovat repo: GitHub → Settings → "Unarchive this repository"
2. Vytvořit nové secrets: GitHub → Settings → Secrets → Actions:
   - `ANTHROPIC_API_KEY` (z [console.anthropic.com](https://console.anthropic.com))
   - `HLIDAC_API_KEY` (z [hlidacstatu.cz/api](https://hlidacstatu.cz/api))
3. GitHub → Actions → "pipeline" → Run workflow (vybrat větev `main`, mode `daily`)

### Plný restart (obnovit autonomní provoz)

1-2 jako výše plus:

3. Odkomentovat `schedule:` v:
   - [`.github/workflows/weekly-pipeline.yml`](.github/workflows/weekly-pipeline.yml) (řádek ~13)
   - [`.github/workflows/monthly-spotcheck.yml`](.github/workflows/monthly-spotcheck.yml) (řádek ~7)
4. Commit + push do main → cron se sám rozjede další den 06:13 UTC.

### Obnovit veřejný web

5. `vercel link` ve workspace projektu → vybrat nebo vytvořit projekt `democracy-index-cz`
6. `vercel --prod` deploy
7. V Vercelu Settings → Domains → přidat `indexdemokracie.cz` (předpokladu že doména je pořád zaregistrovaná)
8. (Volitelně) Stripe Dashboard → Payment Links → reaktivovat 10 linků s success URLs `https://indexdemokracie.cz/dekuji/` a `/en/thanks/`

## Pozor na

- **Datová ztráta od 2026-06-23 do okamžiku znovuprobuzení.** RSS retence je 1–7 dní, takže events z mezičasu už nezachytíš. Existují řešení (Wayback Machine backfill, viz [`methodology/issues.md`](methodology/issues.md)), ale jsou high-effort.
- **EIU / V-Dem / FH / RSF / TI / WJP** dál vydávají roční update — strukturální baseline (`data/structural/`) bude po probuzení zastaralý. Než pustíš pipeline, refresh baseline (manuální edit JSON souboru, viz `methodology/structural_mapping.md`).
- **Anthropic API** — staré modely (Sonnet 4.6, Haiku 4.5) mohou být do té doby retired. Pipeline má v `src/lib/claude.ts` model konstanty — zaktualizovat.
- **Stripe Payment Links** po reaktivaci dostanou nové URLs. Aktualizovat v [`config/donations.yaml`](config/donations.yaml).

## Pro auditory + výzkumníky

Repo zůstává **veřejně dostupné**:
- https://github.com/znackarna/democracy-index-cz
- Klonování: `git clone https://github.com/znackarna/democracy-index-cz.git`
- Tag posledního aktivního stavu: `git checkout v1.0-sleep`

Metodologie je v [`methodology/`](methodology/) (10 dokumentů česky + plný EN překlad). Plný popis projektu v [`CLAUDE.md`](CLAUDE.md).

Kontakt: [`redakce@indexdemokracie.cz`](mailto:redakce@indexdemokracie.cz) (e-mail box může být po uspání postupně utlumený, ale GitHub issues v archivu zůstávají).
