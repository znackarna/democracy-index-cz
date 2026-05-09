# Morning checklist — redesign-v2

> Ahoj. Tento dokument shrnuje, co jsem v noci udělal v branch `redesign-v2`,
> co je potřeba ručně zkontrolovat, a co jsem **nepushnul do produkce** —
> aby ses na to mohl podívat na preview a teprve pak rozhodnout o merge.

## Druhý přírůstek (po feedbacku z mobilu)

Reagováno na 5 bodů:

- **Hero eyebrow** používá teď `formatUpdateLabel(computed_at, week)` —
  stejný string jako header/footer. Žádný synthetický Pondělí-z-týdne.
- **Mobilní horizontal scroll** — primárně způsobený `text-[clamp(7rem,
  16vw,12rem)]` na hero čísle (na úzkém viewportu se 4-znakové "76.1"
  nevlezlo). Snížil jsem mobile clamp na `5rem,18vw,12rem`. H1 šel
  z 40px na 32px na mobile. Body má nově `overflow-x: clip` jako
  pojistka. BenchmarksTable index column zmenšen na 13px na mobile.
- **EventLog na home** zobrazuje opět **top 5 nejnovějších events
  napříč všemi týdny** (nikoli jen current-week filter). Title změněn
  z "Co tento týden index pohnulo" na "Co index naposled pohnulo" /
  "What moved the index recently" pro přesnost. Plný archiv s týdenními
  filtry je dál na `/udalosti/`.
- **Public Opinion sekce vrácená** na home — nová `PublicOpinionSection`
  komponenta, restyle s editoriálním eyebrow `05 — Veřejné mínění` /
  `05 — Public opinion`, zachovává původní CVVM time series + topical
  findings cards. Zobrazí se jen když existují data (server-side check).
- **Hero sparkline interaktivní** — nový `HeroSparkline` client comp,
  na hover/tap ukáže vertikální čáru + bod + tooltip s týdnem a skóre.
  Pillar row sparkliny zůstávají statické (jsou moc malé na užitečnou
  interakci).

Pořadí sekcí na home: 01 Hero · 02 Pilíře · 03 Události · 04 Srovnání ·
05 Veřejné mínění · 06 Manifest · footer.

## Přírůstek po prvním pohledu (mobile + datum)

Reagoval jsem na noc v 23:5x na zpětnou vazbu o mobilu a datu:

- **Mobilní hamburger menu** — brand "Index demokracie ČR" vlevo,
  toggle vpravo. Po tapnutí dropdown s navigací (Domů, Pilíře, Události,
  Srovnání, Metodika, Podpořit) + locale switch + update label dole.
  Zavírá se na ESC, kliknutí mimo, výběr odkazu, změnu trasy. Body scroll
  lock když otevřené.
- **"Přehled" → "Domů"** (CS) / **"Overview" → "Home"** (EN). Globálně,
  desktop i mobil.
- **"Podpořit" / "Support"** přidaný do mobile menu (na desktopu už byl).
- **Real datum poslední aktualizace** v hlavičce i patičce — používá
  `snapshot.computed_at` (skutečný timestamp pipeline runu) místo
  Pondělí-z-ISO-týdne. Formát: "Pondělí · 4. května 2026 · Týden 18"
  v obou místech (header pravá strana + footer brand block).

## TL;DR

- **Branch:** [`redesign-v2`](https://github.com/znackarna/democracy-index-cz/tree/redesign-v2) (3 commity nad `main`)
- **Preview URL:** https://democracy-index-2w6hkh3vh-znackarna.vercel.app
  - **Pozor:** preview je chráněný Vercel Deployment Protection (401 pro
    veřejnost). Otevři ho v prohlížeči, kde jsi přihlášený do Vercelu jako
    `jsme-8640`. Případně Vercel → Project → Settings → Deployment
    Protection vypni „Vercel Authentication" pro preview.
- **Produkce nedotčená:** `indexdemokracie.cz` stále běží předchozí verze
  (commit `6f0daae` — Stripe donate). Nic se nedeployovalo do main.

## Co bylo implementováno

Celý design z `tmp/index.html` + `tmp/README.md` na homepage:

| Sekce | Status | Poznámka |
|---|---|---|
| Masthead 56 px (nav + týden vpravo) | ✅ | `Header.tsx` — client comp s `usePathname()` pro locale switch |
| Hero (eyebrow + H1 + číslo + sparkline) | ✅ | `Hero.tsx` — používá živá data z `data/scores/timeline.json` + baseline |
| Pilíře tabulka s sparkliny | ✅ | `PillarsTable.tsx` — nahrazuje recharts BarChart + PillarDetail karty |
| Události log | ✅ | `EventLog.tsx` — události aktuálního týdne (`2026-W19`) |
| Externí benchmarks | ✅ | `BenchmarksTable.tsx` — V-Dem / EIU / FH / RSF / TI / WJP |
| Manifest (černý) | ✅ | `Manifest.tsx` |
| Footer (4 sloupce) | ✅ | `Footer.tsx` |

Ostatní stránky (`/udalosti/`, `/srovnani/`, `/metodika/`, `/podpora/`,
`/dekuji/`, `/en/*`) dostaly **lehký restyle** — wrapper `PageContainer`
v editoriální šířce 1440 px, hairline borders místo `rounded-2xl
shadow-sm`, paleta ink/paper/accent místo slate. Funkčnost beze změny.

Fonts: **Geist + Geist Mono** přes `geist` npm package (next/font compat,
selfhosted). `font-feature-settings: ss01, cv11`.

## ⚠️ Co manuálně zkontroluj

### 1. Tento checklist hlavně

V preview prohlédni hlavní stránku (CS i EN) a podívej se:

- [ ] Hero: skóre a sparkline odpovídají realitě? (Aktuální `2026-W19`,
      overall ~76, baseline ~85.) Číslo je integer + tečka v modré.
- [ ] Lede odstavec: které dva pilíře jsou v textu? Komponenta vybírá
      **dva nejnižší pilíře** a vykreslí je jako linky (`#pilire-…`).
      Aktuálně to bude pravděpodobně **korupce + vládnutí**. Zkontroluj,
      že texty „korupce" a „vládnutí" v lede dávají gramaticky smysl
      v současné věty. (CZ skloňování — momentálně je to "ztrácí
      kontrolu nad **vládnutím**" / "staré nedořešené **korupce**" — což
      česky neladí. Možná chceš editovat lede template v
      `messages-cs.ts → hero.lede` aby fungoval pro libovolnou kombinaci
      pilířů. Aktuální verze drží design copy víc než přesnou gramatiku.)
- [ ] Pilíře tabulka: 6 řádků, sparkliny mají barvu pilíře, „pásmo
      rizika" tag se zobrazuje pro skóre < 70 (typicky **Korupce**).
- [ ] „Hlavní signál" cell: zobrazuje top-impact event v daném pilíři
      za poslední ~80 events. Mohl bys chtít ručně ověřit, že to dává
      smysl pro každý pilíř.
- [ ] Události log: zobrazují se eventy z týdne `2026-W19`? (Pokud
      tento týden žádné, ukazuje se „Tento týden žádné klasifikované
      události." — pak to fix-ne, jen to nevypadá pěkně.)
- [ ] Benchmarks: tabulka má 6 řádků, hodnoty jsou current (ne
      placeholder). Pozice + delta jsou ve **statickém poli** v
      `BenchmarksTable.tsx` — `STATIC_RANK` + `STATIC_TEN_YEAR_DELTA`
      ručně psané. Ověř, jestli odpovídají poslední verzi indexů.
- [ ] Footer: aspirační linky (Tým, Financování, Vědecká rada → Členové,
      Recenzní řízení, atd.) jsou zšedlé jako plain text — protože
      cílové stránky neexistují. Pokud chceš, abych je úplně skryl,
      řekni a smažu je z `messages-{cs,en}.ts → footer.columns`.
- [ ] Přepínač CS/EN v headeru funguje na všech stránkách.
- [ ] **Mobile**: hamburger menu otevírá/zavírá, brand vlevo viditelný,
      Domů jako první položka tučně, všech 6 navlinků + locale switch
      pod nimi. ESC + kliknutí mimo zavře.
- [ ] **Header pravá strana**: dlouhý label "Pondělí · X. května 2026 ·
      Týden NN" (skutečné datum z `computed_at`, ne Monday-of-week).
- [ ] **Footer**: identický update label v brand bloku.
- [ ] **Hero eyebrow**: identický string ("Pondělí · X. května 2026 ·
      Týden NN") jako header + footer.
- [ ] **Sparkline interakce**: hover myší na desktopu, tap na telefonu
      — ukáže vertikální čáru, větší bod a tooltip s týdnem + hodnotou
      v daném týdnu.
- [ ] **Mobile bez horizontálního scrollu** — testuj na úzkém viewportu
      (Chrome DevTools 360px width).
- [ ] **Veřejné mínění sekce** mezi Srovnání a Manifestem — CVVM time
      series chart + případně topical findings cards.

### 2. Ediční rozhodnutí (potřebuju tvůj vstup)

Tyto věci jsem vyřešil **podle design copy**, ne reality projektu —
budou znít divně, dokud nerozhodneš:

- **Manifest text** mluví o „dvou politolozích, třech analyticích a
  redakci dvou nezávislých titulů". To zatím **neodpovídá realitě**
  (projekt vede Jakub sám). Edituj v
  `src/i18n/messages-cs.ts → manifest.body` (a `messages-en.ts`) na
  realistickou verzi, nebo nech jako budoucí cíl.
- **Manifest kicker** "Demokracie není binární stav. Je to kontinuum,
  které se měří denně." — tohle copy z designu je dobré, asi nech.
- **Manifest quote** "Měříme proto, aby se nejdřív mluvilo o datech —
  a až potom o „krizi", nebo „klidu"." — taky asi nech.
- **Footer brand**: copyright zmiňuje „Sdružení pro otevřené měření
  demokracie, z.s. · IČO 22119988". Změnil jsem na „Index demokracie
  ČR · provozuje Značkárna s.r.o. · IČO 22119988" v
  `messages-cs.ts → footer.copyright`. Ověř IČO a textaci.
- **Footer kontakt e-mail** — design měl `redakce@idem.cz`. Změnil
  jsem na `redakce@indexdemokracie.cz` v `footer.columns.contact.email`.
  Ověř, jestli tahle adresa má MX záznam — jinak buď jiná adresa, nebo
  smaž a nahraď GitHub issue linkem.
- **Hero status badge** "Stále demokracie. Slábnoucí." — design copy.
  Statické. Možná bys chtěl, aby se měnilo dynamicky podle skóre
  (např. „Stále demokracie. Stabilní." pro skóre nad výchozím; „Stále
  demokracie. Posiluje." pokud roste). Aktuálně to je jediná
  konstanta. Pokud chceš dynamiku, řekni a předělám.

### 3. Vizuální detaily, které možná vyladíš

- Hero číslo "76.1" — desetinná tečka (`.1`) je v modré akcent. Tady
  je trochu odpor proti CZ konvenci (česky se používá čárka). Číslo
  jsem nechal s desetinnou tečkou jako v designu, ale text okolo
  (delta caption) lokalizuju s čárkou. Pokud chceš všude čárku, řekni.
- Sparkline baseline label "VÝCHOZÍ 85.0" se vykresluje uvnitř SVG
  — pokud ti to bude vyčnívat, změň font-size nebo opacity v
  `Sparkline.tsx`.
- Mobil — některé sekce (Hero, Pilíře tabulka) jsou navržené pro
  desktop. Na mobilu fungují, ale layout je „stacknutý". Pokud chceš
  detailnější mobilní polish, řekni a iterace 19 to doladí.
- Header nav na mobilu — některé linky se na úzkých displejích
  schovávají (pillar/events/comparison/support `hidden md:inline`).
  Doplnit hamburger menu? Aktuálně tam nic mobil-specifického není.

### 4. Co JSEM ZACHOVAL z původního obsahu

- **Všech 11 metodologických MD dokumentů** (CZ + EN, plus 2026-Q2
  validation report) — beze změny, jen restyle prose stylů.
- **Stripe donate vrstva** — `/podpora/`, `/dekuji/`, `/en/support/`,
  `/en/thanks/` všechno funkční, payment links živé.
- **`/srovnani/` cross-country tabulka** + bar charty — zachované,
  jen restyle wrapperů (drop slate, hairline borders).
- **`/udalosti/` plný archiv** s filtry + pagination — zachovaný.
- **Pipeline + cron + GitHub Actions** — beze změny. Žádný impact na
  daily/weekly running.

### 5. Co JSEM ODSTRANIL z home

- **Public opinion sekce** (CVVM time series + STEM/Median cards).
  Zatím **nikde jinde se nezobrazuje**. Pokud chceš, abych ji vrátil
  na `/srovnani/` jako další sekci, je to ~10 řádků v `ComparisonView`.
  Nebo udělat samostatnou stránku `/duvera/` (CS) + `/en/trust/`.
- **Score timeline graf** (recharts line chart). Nahrazený sparklinem
  v hero. Pokud chceš detailní timeline někde zpřístupnit, mohli
  bychom udělat samostatný drilldown.
- **PillarBreakdown** (recharts bar chart) + **PillarDetailGrid** karty.
  Obojí nahrazeno editoriální tabulkou. Drilldown na pilíř je
  zatím link do `/metodika/pilire/#anchor` — což je dobrý fallback,
  ale pokud chceš samostatnou stránku per pilíř (s grafy + souvisejícími
  events), je to iter 19+.

### 6. Co JE V REPU, ale dropnul bych při cleanup iteraci

- `src/app/components/PillarBreakdown.tsx` — recharts bar chart, už ho
  home nepoužívá. Lze smazat (nebo nechat pro future detail page).
- `src/app/components/ScoreTimeline.tsx` — dtto.
- `src/app/components/PillarDetail.tsx` — karty per pilíř, home
  nepoužívá. Lze smazat.
- `src/app/components/IndexComparisonTable.tsx` — používá staré
  message keys (`comparisonTable.intro.pre`, `comparisonTable.footer.pre`).
  Po cleanup smazat — `BenchmarksTable.tsx` ho nahrazuje.

Žádný z nich nebráním buildu, jen jsou mrtvý kód.

## Jak deployovat redesign do produkce

Až budeš spokojený s preview:

```bash
# Z redesign-v2 branche:
git checkout main
git merge redesign-v2 --ff-only  # nebo přes GitHub PR (Vercel udělá auto-promote)
git push origin main
```

Vercel auto-deployne z `main` na produkci `indexdemokracie.cz` během
~1 minuty.

Alternativa přes PR (víc auditovatelná):

```bash
gh pr create --base main --head redesign-v2 \
  --title "Redesign-v2: editorial home + monochrome system" \
  --body "Implements tmp/index.html design. See MORNING-CHECKLIST.md."
```

Pak ručně merge přes GitHub UI.

## Verifikace v noci

- ✅ `npx tsc --noEmit` — clean
- ✅ `npm test` — 156/156 testů
- ✅ `npm run build` — 37 statických stránek
- ✅ `vercel inspect` — preview Ready

## Architektonické rozhodnutí, která jsem udělal sám

1. **Branch, ne hot push do main.** Auto mode autorizuje autonomní
   práci, ale produkce vyžaduje explicit confirm. Preview deploy je
   bezpečnější.
2. **Single page = home.** Design říká, že web je v této iteraci
   single-page. Drželi jsme všechny ostatní stránky funkční (events
   archive, methodology, comparison, support) — drilldown z hero do
   subpage je editoriální chování, ne UI bug.
3. **Public opinion mimo home.** Spec ji nezmiňuje. Pokud bys ji
   chtěl integrovat někde jinde, řekni — neudělal jsem to autonomně,
   protože to je editoriální rozhodnutí.
4. **Hero lede picks lowest-2 pillars dynamically.** Design má statický
   text „kontrola nad vládou … kauzy". Přepsal jsem na dynamický
   výběr z dat — když korupce a vládnutí budou nejhorší pilíře,
   ukáže to, jinak ukáže jiné. Trade-off: gramatika může vypadat divně
   pro některé kombinace. Můžeš se vrátit ke statice.
5. **Geist přes `geist` npm package**, ne `next/font/google` Geist.
   Next.js 15.1.4 v `node_modules/next/font/google/index.js` Geist
   neexportuje, takže oficiální Vercel `geist` package je správná
   cesta.

## Final notes

- Žádné secrets ani API keys jsem nikam nepushnul.
- Stripe payment links v `config/donations.yaml` jsou stále stejné jako
  na produkci — preview deploy bude redirectovat na produkci-pojetích
  thanks pages, ale to nevadí (jen smoke test bez reálné platby).
- Pokud hodíš redesign-v2 zpět (`git push origin :redesign-v2`),
  Vercel preview se po pár dnech sám smaže.

Pohoda. Mrkni se ráno na preview, řekni co změnit, případně merguj.

— claude
