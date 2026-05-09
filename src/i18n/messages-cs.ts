/**
 * Czech message catalog. Organized by feature area, not by component, so the
 * same strings can be reused across pages without duplication.
 *
 * For paragraphs containing inline `<strong>` or links, the message tree
 * uses small sub-objects with `pre`, `bold`, `link`, `post` keys so the
 * component can wrap each segment in the right element. This keeps the
 * translation contract explicit (translator sees what is bold) without
 * resorting to dangerouslySetInnerHTML or full ICU markup.
 */

import type { Pillar, Severity } from '@/lib/types';

export const messagesCs = {
  meta: {
    siteTitle: 'Index demokracie ČR',
    siteDescription:
      'Týdenní index stavu demokracie v České republice. Strukturální baseline z V-Dem / EIU / FH / RSF / TI / WJP plus týdenní indikátor událostí.',
    tagline: 'Týdně aktualizovaný · auditovatelný · open source',
    repoUrl: 'https://github.com/znackarna/democracy-index-cz',
  },

  nav: {
    overview: 'Domů',
    pillars: 'Pilíře',
    events: 'Události',
    comparison: 'Srovnání',
    methodology: 'Metodika',
    support: 'Podpořit',
    languageSwitchAria: 'Přepnout jazyk',
    /** Used inside formatWeekLabel(): "2026 · týden 19". Legacy short
     *  form, kept for back-compat — production uses `formatUpdateLabel`
     *  for the real-update date string. */
    weekLabelTemplate: '{year} · týden {week}',
    /** Mobile hamburger toggle aria labels. */
    openMenuAria: 'Otevřít menu',
    closeMenuAria: 'Zavřít menu',
  },

  footer: {
    /** Header column over the brand block. */
    brandName: 'Index české demokracie',
    brandTagline: 'Nezávislý projekt. Otevřená data, otevřená metodika.',
    /** Bottom row, copyright + license. {year} placeholder substituted at build. */
    copyright: '© {year} Index demokracie ČR',
    license: 'CC BY 4.0 · bez sledovacích cookies',

    /** Three columns of footer links. Aspirational destinations (Tým,
     *  Financování besides /podpora/, Vědecká rada members, …) were
     *  removed once it became clear they wouldn't ship; only links that
     *  resolve to a working page are listed. */
    columns: {
      project: {
        heading: 'Projekt',
        funding: 'Financování',
      },
      data: {
        heading: 'Data',
        downloads: 'CSV / JSON',
        history: 'Historie změn',
      },
      contact: {
        heading: 'Kontakt',
        email: 'redakce@indexdemokracie.cz',
        publicNotes: 'Veřejné připomínky',
      },
    },

    /** Legacy keys retained because /podpora/ + /metodika/ link copy still
     *  uses them inline elsewhere. Will be retired once redesign cleanup
     *  pass removes the old footer paragraph entirely. */
    leadIn: 'Auditovatelný open-source projekt.',
    repoLink: 'Repo na GitHubu',
    afterRepo: 'Klasifikuje Claude Sonnet 4.6, skóre počítá deterministická TS funkce.',
    methodologyLeadIn: 'Detail metodologie na',
    supportLeadIn: 'Provoz hradí',
    supportLink: 'podporovatelé',
    supportTail: '.',
  },

  pillars: {
    electoral: { short: 'Volby', full: 'Volební proces a pluralismus' },
    governance: { short: 'Vládnutí', full: 'Fungování vlády a parlamentu' },
    judicial: { short: 'Justice', full: 'Soudní nezávislost a právní stát' },
    media: { short: 'Média', full: 'Mediální svoboda' },
    civil: { short: 'Svobody', full: 'Občanské svobody' },
    corruption: { short: 'Korupce', full: 'Korupce a transparentnost' },
  } satisfies Record<Pillar, { short: string; full: string }>,

  severity: {
    label: 'závažnost',
    weightLabel: 'Váha',
    items: {
      1: 'zanedbatelný incident, výroky bez institucionálního dopadu (±0.2 b. do pilíře).',
      2: 'drobný jednorázový incident s lokálním dopadem (±0.5 b.).',
      3: 'významný incident, široký dopad nebo precedent (±1.5 b.).',
      4: 'závažné porušení normy nebo procesu (±3.0 b.).',
      5: 'strukturální posun, ústavní krize, systémová změna (±6.0 b.).',
    } satisfies Record<Severity, string>,
  },

  status: {
    active: 'aktivní',
    resolved: 'vyřešeno',
    disputed: 'spor v pokrytí',
    needs_review: 'k revizi',
  },

  direction: {
    up: '↑ posiluje',
    down: '↓ oslabuje',
    flat: '→ neutrální',
  },

  duration: {
    persistent: 'trvalá',
  },

  hero: {
    /** Section number above the date eyebrow, mirrors the rest of the
     *  page's editorial numbering (02 — Pilíře, 03 — Události, …). */
    eyebrow: '01 — Index',
    /** "Hodnota tento týden" — uppercase eyebrow above the big number. */
    valueOfTheWeek: 'Hodnota tento týden',
    /** Headline with blue period. The period dot is rendered separately. */
    headline: 'Index české demokracie',
    /** Lede paragraph rendered above buttons. Uses {pillar1} and {pillar2}
     *  placeholders that the component resolves to the lowest two pillars
     *  (with anchor links). */
    lede:
      'Letos drží, ale slábne. Nejvíc ji táhne dolů to, jak se ztrácí kontrola nad {pillar1} — a staré nedořešené {pillar2}, na které politika neumí najít odpověď.',
    primaryCta: 'Co se stalo tento týden',
    secondaryCta: 'Jak měříme',
    /** Number caption: "{deltaBaseline} bodu vs. lednu loňska. Za poslední
     *  týden {deltaWeek}." Filled in by the component. */
    /** Number caption: "{baselineDelta}. Za poslední týden {weekDelta}.". */
    numberCaption: '{baselineDelta} Za poslední týden {weekDelta}.',
    baselineDeltaDown: 'O {value} bodu níž než výchozí hodnota.',
    baselineDeltaUp: 'O {value} bodu výš než výchozí hodnota.',
    baselineDeltaFlat: 'Na úrovni výchozí hodnoty.',
    weekDeltaDown: 'klesla o {value} bodu',
    weekDeltaUp: 'stoupla o {value} bodu',
    weekDeltaFlat: 'beze změny',
    statusBadgeLabel: 'Stále demokracie. Slábnoucí.',
    sparklineEyebrowLeft: 'Posledních 52 týdnů',
    sparklineEyebrowRight: '2025–2026',
    sparklineBaselineLabel: 'VÝCHOZÍ {value}',
    sparklineCaption:
      'Nejnižší za poslední rok je z konce ledna; nejvýš byla v dubnu loňska. Tlumený, ale jednoznačný sestup.',
    sparklineFootnote:
      'Šest pilířů, 26 ukazatelů, týdenní aktualizace. Všechny zdroje na {methodologyLink}.',
    sparklineMethodologyLink: 'jiném místě',
  },

  home: {
    title: 'Stav demokracie ČR',
    introBeforeModel:
      'Týdně aktualizovaný kompozitní index 0–100. Strukturální baseline z V-Dem 2024, EIU 2024, Freedom House 2025, RSF 2025, TI CPI 2024 a WJP 2024 plus týdenní úpravy podle konkrétních událostí. Klasifikuje',
    introAfterModel: ', skóre počítá deterministická TS funkce s unit testy.',

    scoreInfoTitle: 'Jak vzniká skóre 0–100',
    scoreInfoP1: {
      baselineBold: 'Strukturální baseline',
      afterQuarter: ' vychází z ročních externích indexů a aktualizuje se kvartálně. ',
      weeklyBold: 'Týdenní eventy',
      afterWeekly: ' přičítají/odečítají body podle ',
      rubricLink: 'pevné rubric závažnosti',
      tail: '; jednorázové události stárnou lineárně přes 12 týdnů, persistentní zůstávají až do explicitního uzavření.',
    },
    scoreInfoP2: {
      overallBold: 'Overall',
      tail:
        ' je vážený průměr 6 pilířů (volby 15 % · vládnutí 20 % · justice 20 % · média 15 % · svobody 15 % · korupce 15 %). Aritmetika je deterministická TypeScript funkce s unit testy — žádný LLM nepočítá skóre, jen kategorizuje události.',
    },

    timelineHeading: 'Vývoj skóre',
    timelineFirstSnapshot: 'První snapshot — historie se buduje od týdne',
    timelineComparabilityWarn: 'Pozor na srovnatelnost:',
    timelineComparability:
      'pre-2026-W17 data pochází z menšího počtu zdrojů (4 česká média přes Wayback Machine vs. 19 zdrojů v aktuální pipeline). Trendová srovnání mezi obdobími proto nemusí být plně srovnatelná — víc zdrojů zachytí víc událostí, což může vypadat jako zhoršení i bez reálné změny stavu. Detail v',
    timelineComparabilityLink: 'metodika/otevřené otázky',

    pillarBreakdownHeading: 'Skóre po pilířích',
    pillarBreakdownNotePre: 'Sloupce = aktuální týden. Černé tečky = strukturální baseline (',
    pillarBreakdownNotePost: '). Diference ukazuje, jak události tohoto kvartálu posunuly pilíř.',

    pillarDetailHeading: 'Detail po pilířích',
    pillarDetailIntro:
      'Co každý pilíř konkrétně měří, jaké subkomponenty obsahuje a co se v něm stane, když ho události posunou. Procentuální štítek je váha pilíře v celkovém skóre.',

    pillarReadingTitle: 'Jak číst pilířové skóre',
    pillarReadingP1: {
      pre: 'Stupnice ',
      bold1: '0–100',
      mid: ' je matematická, ne normativní — vyšší znamená méně institucionálních problémů v daném týdnu. Externí indexy (V-Dem, EIU, FH) řadí ČR aktuálně do horní třetiny vyspělých demokracií, takže typický rozsah pro ČR baseline je ',
      bold2: 'cca 60–95',
      tail: '.',
    },
    pillarReadingP2: {
      pre: 'Konkrétní událost typicky posune pilíř o ',
      bold: '0.2–6 bodů',
      tail:
        ' (podle severity), persistentní událost zůstává v pilíři dokud reviewer nezavře jako resolved. Jednorázové události stárnou lineárně přes 12 týdnů.',
    },
    pillarReadingP3: {
      bold1: 'Korupce',
      mid1:
        ' stojí systematicky níž než ostatní pilíře — reflektuje reálnou diskrepanci v ČR (silné formální instituce, ale dlouhodobě vnímaná korupce per TI CPI). ',
      bold2: 'Vládnutí',
      mid2: ' a ',
      bold3: 'Justice',
      tail:
        ' mají vyšší váhu (20 % vs 15 %), protože literatura backslidingu identifikuje právě tyto oblasti jako nejčastější kanály eroze.',
    },

    noSnapshot: 'Zatím žádný snapshot. První běh pipeline vytvoří snapshot pro aktuální týden.',

    comparisonHeading: 'Srovnání s externími indexy',
    comparisonInfoTitle: 'Proč náš index ukazuje jiné číslo než V-Dem nebo EIU',
    comparisonInfoP1: {
      pre: 'Externí indexy měří různé věci různými metodikami. Náš index si je ',
      bold: 'znovu váží',
      tail:
        ' přes 6 pilířů specifických pro ČR kontext, takže drobné rozdíly (±5 b.) jsou normální variabilita. Nejde o korekci „pravdy" — jde o jiný kompozitní pohled.',
    },
    comparisonInfoP2: {
      bold1: 'Single-dimension',
      mid1:
        ' indexy (RSF press freedom, TI CPI, WJP rule of law) se v tabulce výše porovnávají s konkrétním pilířem (ne s overall), protože měří jen jednu dimenzi. ',
      bold2: 'Multi-dimension',
      tail: ' indexy (V-Dem, EIU, FH) jsou overall composity → srovnávají se s naším celkem.',
    },
    comparisonInfoP3: {
      bold: 'Práh trvalé divergence > 10 b. ve dvou kvartálech',
      tail: ' = signál otevřít issue na methodology review. Aktuálně žádný práh nepřekročen.',
    },

    recentEventsHeading: 'Nejnovější události',
    recentEventsAll: 'Všechny události →',
    eventsInfoTitle: 'Jak události vznikají a jak je oversightuju',
    eventsInfoLead: {
      bold: 'Pondělí 06:00 UTC',
      tail: ' spustí GitHub Actions cron pipeline pro uplynulý týden:',
    },
    eventsInfoSteps: {
      collection: { bold: 'Sběr', tail: ' — RSS feedy hlavních českých redakčních médií.' },
      preFilter: {
        bold: 'Pre-filter',
        tail: ' (Claude Haiku 4.5) — drasticky zúží na zprávy relevantní pro 6 pilířů.',
      },
      classify: {
        bold: 'Klasifikace',
        mid: ' (Claude Sonnet 4.6) — přiřadí pillar, severity 1–5, direction ±1, podle ',
        link: 'rubric',
        tail: '.',
      },
      dedupe: {
        bold: 'Dedupe',
        midA: ' — sloučí stejnou událost reportovanou více outlety; při rozporu severity/direction → status ',
        code: 'disputed',
        tail: '.',
      },
      cap: {
        bold: 'Source-count cap',
        tail: ' — severity ≥ 3 vyžaduje ≥ 2 outlety, ≥ 4 vyžaduje ≥ 3. Jinak deterministicky downgrade.',
      },
      audit: {
        bold: 'Self-audit',
        midA: ' — separátní Sonnet pass kritizuje vlastní výstup (anti-bias, severity↔rationale match). Může event flagnout/downgradeovat na ',
        code: 'needs_review',
        tail: '.',
      },
      anomaly: {
        bold: 'Anomaly detection',
        midA: ' — pokud týden vykazuje podezřelé znaky (> 5 events, severity 5, single outlet > 50 %, ...), auto-otevře GitHub issue. ',
        bold2: 'Index se publikuje normálně',
        tail: ' — issue je oversight ping, ne blocker.',
      },
    },
    eventsInfoFooter: {
      pre: 'Každá událost má tlačítko ',
      em: 'Napadnout klasifikaci',
      tail: ' — disputes jdou jako GitHub issues a řeší se ručně.',
    },
    noEvents: 'Zatím žádné události.',

    publicOpinionHeading: 'Veřejné mínění',
    publicOpinionIntro: {
      pre: 'Doplňkový kontext k institucionálnímu indexu. ',
      bold: 'Tyto hodnoty nevstupují do skóre',
      mid:
        ' — slouží k porovnání, jak na demokratickou agendu reaguje veřejná nálada vs. kde jsou skutečné institucionální posuny. Detail v ',
      link: 'metodice',
      tail: '.',
    },
  },

  scoreSummary: {
    weekLabel: 'Týden',
    vsLastWeek: 'vs. minulý týden',
    vsBaseline: 'vs. baseline',
    weightedIndexNote:
      'Vážený index 0–100. Baseline {baseline} ({quarter}) {delta} z {count} aktivních událostí.',
  },

  eventLog: {
    eyebrow: '03 — Události',
    title: 'Co index naposled pohnulo.',
    intro:
      'Každá událost je ručně zařazena do pilíře a oceněna dopadem od −6 do +6 bodů. Plný changelog je {repoLink}.',
    introRepoLink: 'na GitHubu',
    weekChipPrefix: 'Týden',
    archiveChip: 'Archiv',
    summaryTemplate: 'Σ TÝDEN {sum} · {count} událostí · {sources} zdrojů',
    fullArchiveLink: 'Plný archiv →',
    impactLabels: {
      severe: 'vážný',
      positive: 'pozitivní',
      minor: 'menší',
      neutral: 'neutrální',
    },
    emptyWeek: 'Tento týden žádné klasifikované události.',
  },

  events: {
    pageTitle: 'Všechny události',
    pageIntro:
      'Auditovatelný seznam všech klasifikovaných událostí. Každá má odkaz na zdroje a tlačítko „Napadnout klasifikaci" — disputy se řeší jako GitHub issues. Filtruj podle pilíře, závažnosti nebo roku.',
    severityInfoTitle: 'Co znamená severity 1–5',
    directionExplain: {
      bold: 'Direction',
      tail: ' ±1: zda událost demokratické instituce posiluje (+) nebo oslabuje (−). Anti-corruption raid od NCOZ má direction +1, i když se podezírá z korupce — institucemi se vymáhá právo.',
    },
    statusExplain: {
      bold: 'Status',
      colon: ': ',
      activeCode: 'active',
      activeNote: ' (započítává se), ',
      persistentCode: 'persistent',
      persistentNote: ' (trvalá vrstva, dokud reviewer neuzavře jako ',
      resolvedCode: 'resolved',
      midClose: '), ',
      disputedCode: 'disputed',
      disputedNote: ' (rozpor v pokrytí napříč zdroji), ',
      needsReviewCode: 'needs_review',
      needsReviewNote: ' (auditor flagnul nebo klasifikátor nebyl jistý).',
    },
    countTotal: 'celkem',
    countWeeks: 'týdnů',
    filterPillar: 'Pilíř',
    filterSeverity: 'Závažnost',
    filterYear: 'Rok',
    filterAllYears: 'Všechny roky',
    filterClear: 'Vyčistit filtry',
    countSummaryTotal: 'událostí celkem',
    countSummaryFiltered: 'po filtraci',
    countSummaryOf: 'z',
    pageLabel: 'Strana',
    pageOf: 'z',
    weekHeading: 'Týden',
    emptyFiltered: 'Filtrům neodpovídá žádná událost. Zkus uvolnit kritéria.',
    emptyAll: 'Zatím žádné události.',
    paginationPrev: '← Předchozí',
    paginationNext: 'Další →',
  },

  eventCard: {
    severityLabel: 'závažnost',
    persistent: 'trvalá',
    impactPrefix: 'dopad',
    impactSuffix: 'b.',
    rationaleSummary: 'Odůvodnění klasifikace',
    disputeButton: 'Napadnout klasifikaci',
    enFallbackBadgeTitle: 'Tato událost zatím není přeložena do angličtiny.',
  },

  comparison: {
    pageTitle: 'Srovnání zemí',
    pageIntro: {
      pre: 'Jak si Česko stojí ve srovnání s ',
      mid: ' dalšími zeměmi (V4 + Německo, Rakousko, USA, UK) napříč ',
      midSecond: ' mezinárodními indexy demokracie a právního státu. Externí benchmark — ',
      bold: 'nevstupuje do našeho týdenního indexu',
      tail: ', slouží jen pro kontextové srovnání.',
    },

    legendInfoTitle: 'Co tady vidíš a co tady nevidíš',
    legendP1: {
      bold: 'Heatmap matice',
      tail:
        ' dole zobrazuje všechny indexy normalizované do stupnice 0–100, aby se daly porovnat (EIU 0–10 a V-Dem 0–1 jsou jinak v jiných jednotkách). Barva buňky odpovídá normalizovanému skóre — zelená ≥80, žlutá 50–79, oranžová/červená pod tím. Raw hodnoty (originální stupnice) jsou v tooltipu po najetí.',
    },
    legendP2: {
      bold: 'Bar charty',
      tail:
        ' pod tabulkou ukazují každý index zvlášť na své nativní stupnici, aby zůstaly čitelné originální hodnoty. EIU má navíc 5 subpilířů (volební proces, fungování vlády, politická participace, politická kultura, občanské svobody) — ty často odhalí, co konkrétně overall skóre posunulo.',
    },
    legendP3: {
      bold1: '{n} země',
      mid:
        ' jsou barevně highlightnuté: ČR (modře) a SK (tyrkysově) jako primární kontext pro českého čtenáře. Ostatní jsou šedé. ',
      bold2: 'Drobné rozdíly',
      tail:
        ' mezi sousedními zeměmi (1–3 b.) typicky leží uvnitř měřicí chyby každého indexu — reálná interpretace stojí na trajektorii v čase, ne na konkrétním pořadí v daném roce.',
    },

    matrixHeading: 'Přehled — všechny indexy, všechny země',
    matrixCountryColumn: 'Země',
    matrixNoData: '—',
    matrixNote:
      'Stupnice: zelená ≥80 (volný / plně demokratický), světle zelená 70–79, žlutá 60–69, oranžová 50–59, červená pod tím. Hodnoty zachovávají originální stupnici indexu (EIU 0–10, V-Dem a WJP 0–1, ostatní 0–100); barva buňky podle normalizace. Pro detail metodiky každého indexu klikni na zkratku v záhlaví sloupce.',

    detailHeading: 'Detail po jednotlivých indexech',
    detailIntro:
      'Každý index s nativní stupnicí. EIU má rozpad na 5 subpilířů, FH na PR + CL. Země seřazené sestupně podle skóre (CZ a SK barevně highlightnuté).',

    methodologyHeading: 'Metodika a zdroje',
    methodologyP1: {
      pre: 'Plný popis výběru zemí, indexů, ročníků publikace a procesu manuálního updatu v ',
      link: 'metodice srovnání zemí',
      mid: '. Pro mapping externích indexů na náš weekly CZ index viz ',
      link2: 'Strukturální mapování',
      tail: '.',
    },

    noData: 'Cross-country data nejsou k dispozici.',

    sourceLink: 'Zdroj →',
    multiDimension: 'Multi-dimension composite',
    singleDimension: 'Single-dimension',
    scaleLabel: 'stupnice 0–',
    subPillarsHeading: 'Subpilíře',
    scoreTooltip: 'skóre',
  },

  publicOpinionSection: {
    eyebrow: '05 — Veřejné mínění',
    title: 'Jak to lidé vidí.',
    intro:
      'Doplňkový kontext k institucionálnímu indexu. {bold} — slouží k porovnání nálady veřejnosti s tím, kde jsou skutečné institucionální posuny. Detail v {link}.',
    introBold: 'Tyto hodnoty nevstupují do skóre',
    introLink: 'metodice',
  },

  manifest: {
    eyebrow: '06 — Manifest',
    /** Mono kicker on the left column. */
    kicker: 'Demokracie není binární stav. Je to kontinuum, které se měří denně.',
    /** Big quote on the right. */
    quote:
      'Měříme proto, aby se nejdřív mluvilo o datech — a až potom o „krizi", nebo „klidu".',
    /** Warm paragraph below the quote. NOTE: design's draft mentions a
     *  team of "dva politologové, tři analytici a redakce dvou nezávislých
     *  titulů" which doesn't yet match the project's actual setup — flagged
     *  in MORNING-CHECKLIST for editorial review. */
    body:
      'Sami politici nejsme. Tvoří nás dva politologové, tři analytici a redakce dvou nezávislých titulů. Data, váhy a komentáře jsou veřejné. Když najdete chybu, napište — nejpozději do týdne ji opravujeme a označíme jako opravu.',
  },

  benchmarks: {
    eyebrow: '04 — Srovnání',
    title: 'Co o ČR říkají externí indexy.',
    intro:
      'Roční hodnocení nejcitovanějších mezinárodních pracovišť. Náš index je s nimi ve veřejné křížové kalibraci.',
    headers: {
      index: 'Index',
      value: 'Hodnota',
      delta: 'Δ rok—rok',
      rank: 'Pozice',
      classification: 'Klasifikace',
    },
    classifications: {
      'V-Dem': 'Liberální demokracie',
      EIU: 'Plnohodnotná demokracie',
      'FH-FitW': 'Free',
      RSF: 'Dobrá situace',
      'TI-CPI': 'Středně korumpovaná',
      WJP: 'Vyspělý právní stát',
    },
  },

  comparisonTable: {
    headerIndex: 'Index',
    headerExternal: 'Externí',
    headerCompare: 'Srovnáváme s',
    headerOurs: 'Naše',
    headerDelta: 'Δ',
    headerStatusAria: 'Status',
    pillarPrefix: 'pilíř',
    overallLabel: 'celkové',
    overThresholdTitle: 'Nad prahem 10 b. — kontrolovat trvalost ve 2. kvartálu',
    inThresholdTitle: 'V normální variabilitě',
    intro: {
      pre: 'Náš index ',
      bold: 'nenahrazuje',
      tail:
        ' zavedené roční indexy demokracie — doplňuje je o rychlejší detekci pohybu mezi jejich aktualizacemi. Tabulka ukazuje, jak náš strukturální baseline ({quarter}) leží vůči nejnovějším hodnotám každého z nich.',
    },
    footer: {
      pre:
        'Single-dimension indexy (RSF press freedom, TI CPI corruption, WJP rule of law) se srovnávají s konkrétním pilířem; multi-dimension (V-Dem, EIU, FH) s celkovým overall. Práh ⚠️ = trvalá divergence > 10 b. ve 2 po sobě jdoucích kvartálech triggeruje methodology review. Detail v ',
      link: 'validation report',
      tail: '.',
    },
  },

  methodologyIndex: {
    title: 'Metodika',
    intro: {
      pre:
        'Plný popis toho, jak index vznikne — od strukturálního baseline přes klasifikaci týdenních událostí až k oversight modelu, který drží kvalitu bez mandatory pre-merge review. Každý dokument je živý, verzovaný v Gitu a měnitelný jen přes commit s odůvodněním v ',
      link: 'CHANGELOGu',
      tail: '.',
    },
    primaryDocsHeading: 'Hlavní dokumenty',
    auditTrailHeading: 'Audit trail',
    validationHeading: 'Kvartální validační reporty',
    validationIntro:
      'Automaticky generované srovnání našeho indexu s externími benchmarky (V-Dem, EIU, FH, RSF, TI CPI, WJP). Práh trvalé divergence > 10 b. ve dvou kvartálech triggeruje methodology review.',
    readMore: 'Číst →',
    validationLinkPrefix: 'validace_',
  },

  methodologyDocs: {
    pillars: {
      title: 'Šest pilířů',
      description:
        'Co každý ze 6 pilířů (volby, vládnutí, justice, média, svobody, korupce) měří, jak se mapuje na zdroje a co do něj nepatří.',
    },
    severity: {
      title: 'Rubric závažnosti',
      description:
        'Pětistupňová škála závažnosti událostí 1–5 s konkrétními ČR příklady, pravidly eskalace/de-eskalace a kritérii „needs_review".',
    },
    weights: {
      title: 'Váhy pilířů',
      description:
        'Zdůvodnění aktuálních vah 15/20/20/15/15/15, diskuze alternativ a pravidla pro budoucí změny vah.',
    },
    governance: {
      title: 'Model dohledu',
      description:
        'Šest vrstev oversight (self-audit, source-count cap, daily reports, anomaly detection, monthly spot-check, public dispute) místo mandatory pre-merge review.',
    },
    structuralMapping: {
      title: 'Strukturální mapování',
      description:
        'Jak konkrétně se z V-Dem 2024 / EIU 2024 / FH 2025 / RSF / TI / WJP počítá strukturální baseline pro každý pilíř.',
    },
    sources: {
      title: 'Zdroje dat',
      description:
        'Odkud index čerpá — 8 českých redakčních médií, otevřená data PSP a soudů, watchdog organizace, mezinárodní zpravodajství. Aktuální tabulka generovaná z config/sources.yaml.',
    },
    publicOpinion: {
      title: 'Veřejné mínění',
      description:
        'Doplňkový read-only kontext z průzkumů (CVVM, STEM, Median). Nevstupuje do skóre — proč ne, jak ho užívat, co plánujeme přidat. Zdroje a jejich profil.',
    },
    crossCountry: {
      title: 'Srovnání zemí',
      description:
        'Jak je vybráno 8 zemí (V4 + DE/AT + USA/UK), jakých 6 indexů, proč CZ + SK highlight a jaké ročníky publikace. Read-only externí benchmark, nevstupuje do našeho indexu.',
    },
    changelog: {
      title: 'Changelog',
      description:
        'Historie verzí metodiky. Každá změna pilířů, vah, rubric nebo governance modelu je zaznamenaná zde.',
    },
    openIssues: {
      title: 'Otevřené otázky',
      description:
        'Známé otevřené otázky a omezení současné metodiky, které čekají na řešení v dalších iteracích.',
    },
  },

  methodologyDocPage: {
    backToIndex: '← Metodika',
    translationPendingTitle: 'Překlad čeká',
    translationPendingBody:
      'Tento dokument zatím není dostupný v angličtině. Níže je zobrazena původní česká verze.',
  },

  pillarDetail: {
    weightLabel: 'Váha',
    weightTitle: 'Váha pilíře v celkovém skóre',
    vsBaseline: 'vs baseline',
    subcomponentsSummary: 'Co konkrétně pilíř obsahuje',
    lowersHeading: 'Co skóre snižuje',
    raisesHeading: 'Co skóre zvyšuje',
    fullDescriptionLink: 'Plný popis pilíře v metodice →',
  },

  publicOpinion: {
    sourceLink: 'Zdroj →',
    methodologyChangeLabel: 'Změna metodiky',
    methodologyChangeNotePrefix: 'Změna metodiky',
    topicalHeading: 'Aktuální nálezy z dalších šetření',
    topicalReportLink: 'Celý report →',
  },

  scoreTimeline: {
    empty: 'Zatím žádná historie skóre. První snapshot vznikne po prvním proběhu pipeline.',
    tooltipLabel: 'Skóre',
  },

  pillarBreakdown: {
    tooltipCurrent: 'Aktuálně',
  },

  pillarsTable: {
    eyebrow: '02 — Pilíře',
    title: 'Pilíře, kterými index počítáme.',
    headers: {
      number: '#',
      pillar: 'Pilíř',
      score: 'Skóre',
      deltaWeek: 'Δ TÝDEN',
      deltaBaseline: 'Δ VÝCH.',
      weight: 'Váha',
      trend: 'Trend 52 t.',
      signal: 'Hlavní signál',
    },
    riskZoneTag: 'pásmo rizika',
    detailLink: 'Detail →',
    noEvent: 'Bez pohybu tento týden',
    footnote:
      '⚠ Pilíře pod 70 bodů jsou označeny jako pásmo zvýšeného rizika. Trend ukazuje pohyb 52 týdnů proti vlastní výchozí hodnotě pilíře, ne proti kompozitnímu indexu.',
  },

  infoBox: {
    expand: 'rozbalit',
    collapse: 'sbalit',
    readMoreDefault: 'Plný popis v metodice →',
  },

  support: {
    pageTitle: 'Podpořte projekt',
    pageIntro:
      'Index demokracie ČR je nezisková open-source věc — provoz platí čas a běžné náklady (LLM API, doména). Vaše podpora nám umožňuje rozšiřovat zdroje, vylepšovat metodiku a držet projekt nezávislý na reklamě a sponzoringu konkrétních politických aktérů.',
    legalDisclaimer:
      'Pozor: vzhledem k tomu, že projekt provozuje firma (ne registrovaná NNO), tato platba není daňově odečitatelným darem ve smyslu § 15 odst. 1 zákona o daních z příjmů — ze strany dárce jde o běžnou platbu. Stripe vám pošle potvrzení transakce, plnohodnotná faktura na vyžádání.',

    currencyHeading: 'Měna',
    currencyCzk: 'Česká koruna (CZK)',
    currencyEur: 'Euro (EUR)',
    modeHeading: 'Frekvence',
    modeOneTime: 'Jednorázově',
    modeRecurring: 'Měsíčně',
    customAmount: 'Jiná částka',
    customAmountAria: 'Zvolit jinou částku',
    monthlyBadge: '/měsíc',

    proceedAria: 'Pokračovat na zabezpečenou platbu přes Stripe',

    paymentMethods:
      'Platba přes Stripe — karta, Apple Pay, Google Pay. Stripe je certifikovaný PCI DSS Level 1 provider; nikdy se na náš server nedostanou údaje o kartě.',

    transparencyHeading: 'Kam peníze jdou',
    transparencyIntro: 'Aktuální měsíční náklady projektu (orientačně, převedeno do CZK):',
    transparencyTotalLabel: 'Měsíční celkem',
    transparencyAnnualLabel: 'Roční celkem',
    transparencyFooter:
      'Účetnictví běží v rámci firmy provozovatele; podpora pokrývá výše uvedené přímé náklady plus ~20 hodin měsíčně lidské práce na metodologii, oversight a infrastrukturu. Roční audit se zveřejňuje v lednu jako příloha k metodice.',

    notReadyTitle: 'Platby ještě nejsou aktivní',
    notReadyBody:
      'Platební odkazy se právě konfigurují na straně Stripe. Pokud chcete podpořit teď, napište prosím na e-mail uvedený na GitHub profilu projektu.',
  },

  thanks: {
    pageTitle: 'Děkujeme!',
    pageBody:
      'Vaše podpora je zaregistrovaná a okamžitě se promítne do toho, jak rychle můžeme rozšiřovat zdroje a vylepšovat metodiku. Stripe vám pošle e-mail s potvrzením platby; pokud potřebujete plnohodnotnou fakturu, odpovězte na ten e-mail s žádostí.',
    recurringNote:
      'U pravidelné podpory: kdykoli můžete platby spravovat (pozastavit, zrušit, upravit částku) přes link „Manage subscription" v každém potvrzovacím e-mailu od Stripe.',
    backHome: 'Pokračovat na hlavní stránku',
  },

  costs: {
    api: { label: 'Anthropic API (Haiku pre-filter + Sonnet klasifikace + audit)' },
    hosting: { label: 'Vercel hosting' },
    domain: { label: 'Doména .cz' },
    monthly: { label: 'měsíčně' },
    annual: { label: 'ročně' },
    free: { label: 'zdarma' },
  },

  dispute: {
    title: 'Dispute: {id} — {headline}',
    section1: '## Aktuální klasifikace',
    eventIdLabel: '**Event ID:**',
    pillarLabel: '**Pillar:**',
    severityLabel: '**Severity:**',
    severityNull: 'null (needs_review)',
    directionLabel: '**Direction:**',
    statusLabel: '**Status:**',
    dateLabel: '**Datum události:**',
    section2: '## Proč je klasifikace špatně',
    section2Body:
      '_Popiš, co je v aktuální klasifikaci nepřesné. Konkrétní odkaz na bod methodology rubric pomáhá._',
    section3: '## Navrhovaná oprava (volitelné)',
    section3Body: '_Pillar / severity / direction, které bys místo toho použil(a)._',
    sourcesLeadIn: 'Odkaz na zdroj(e):',
  },
};
