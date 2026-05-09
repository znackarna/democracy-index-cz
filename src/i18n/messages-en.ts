/**
 * English message catalog. Mirrors the structure of messages-cs.ts.
 *
 * Tone: civilian and direct, similar to Politico Europe or The Guardian —
 * not the formal register of academic indices like V-Dem or Freedom House.
 *
 * Project name in English: "Czech Democracy Index".
 */

import type { Messages } from './index';

export const messagesEn: Messages = {
  meta: {
    siteTitle: 'Czech Democracy Index',
    siteDescription:
      'A weekly index of the state of democracy in the Czech Republic. Structural baseline from V-Dem / EIU / FH / RSF / TI / WJP plus a weekly indicator built from concrete events.',
    tagline: 'Updated weekly · auditable · open source',
    repoUrl: 'https://github.com/znackarna/democracy-index-cz',
  },

  nav: {
    overview: 'Home',
    pillars: 'Pillars',
    events: 'Events',
    comparison: 'Comparison',
    methodology: 'Methodology',
    support: 'Support',
    languageSwitchAria: 'Switch language',
    weekLabelTemplate: '{year} · week {week}',
    openMenuAria: 'Open menu',
    closeMenuAria: 'Close menu',
  },

  footer: {
    brandName: 'Czech Democracy Index',
    brandTagline: 'An independent project. Open data, open methodology.',
    copyright:
      '© {year} Czech Democracy Index · operated by Značkárna s.r.o. · ID 22119988',
    license: 'CC BY 4.0 · no tracking cookies',

    columns: {
      project: {
        heading: 'Project',
        about: 'About',
        team: 'Team',
        funding: 'Funding',
      },
      data: {
        heading: 'Data',
        downloads: 'CSV / JSON',
        api: 'API',
        history: 'Change log',
      },
      board: {
        heading: 'Advisory board',
        members: 'Members',
        review: 'Peer review',
        publicNotes: 'Public comments',
      },
      contact: {
        heading: 'Contact',
        email: 'redakce@indexdemokracie.cz',
        forJournalists: 'For journalists',
        securityTip: 'Security tip',
      },
    },

    leadIn: 'An auditable open-source project.',
    repoLink: 'Repo on GitHub',
    afterRepo: 'Classification by Claude Sonnet 4.6, scoring by a deterministic TS function.',
    methodologyLeadIn: 'Methodology details at',
    supportLeadIn: 'Running costs covered by',
    supportLink: 'supporters',
    supportTail: '.',
  },

  pillars: {
    electoral: { short: 'Elections', full: 'Electoral process and pluralism' },
    governance: { short: 'Governance', full: 'Functioning of government and parliament' },
    judicial: { short: 'Judiciary', full: 'Judicial independence and rule of law' },
    media: { short: 'Media', full: 'Media freedom' },
    civil: { short: 'Civil rights', full: 'Civil liberties' },
    corruption: { short: 'Corruption', full: 'Corruption and transparency' },
  },

  severity: {
    label: 'severity',
    weightLabel: 'Weight',
    items: {
      1: 'negligible incident, statements with no institutional impact (±0.2 pt to the pillar).',
      2: 'minor one-off incident with local impact (±0.5 pt).',
      3: 'significant incident, broad impact or precedent (±1.5 pt).',
      4: 'serious breach of a norm or process (±3.0 pt).',
      5: 'structural shift, constitutional crisis, systemic change (±6.0 pt).',
    },
  },

  status: {
    active: 'active',
    resolved: 'resolved',
    disputed: 'coverage dispute',
    needs_review: 'needs review',
  },

  direction: {
    up: '↑ strengthens',
    down: '↓ weakens',
    flat: '→ neutral',
  },

  duration: {
    persistent: 'persistent',
  },

  hero: {
    valueOfTheWeek: 'This week’s value',
    headline: 'Czech Democracy Index',
    lede:
      'Holding for now, but slipping. The biggest drag is the loss of control over {pillar1} — and the old, unresolved {pillar2} that politics can’t bring itself to answer.',
    primaryCta: 'What happened this week',
    secondaryCta: 'How we measure',
    numberCaption: '{baselineDelta} Over the past week {weekDelta}.',
    baselineDeltaDown: '{value} points below the structural baseline.',
    baselineDeltaUp: '{value} points above the structural baseline.',
    baselineDeltaFlat: 'In line with the structural baseline.',
    weekDeltaDown: 'down {value} points',
    weekDeltaUp: 'up {value} points',
    weekDeltaFlat: 'unchanged',
    statusBadgeLabel: 'Still a democracy. Slipping.',
    sparklineEyebrowLeft: 'Last 52 weeks',
    sparklineEyebrowRight: '2025–2026',
    sparklineBaselineLabel: 'BASELINE {value}',
    sparklineCaption:
      'Lowest point in the past year was late January; highest was last April. A muted but unambiguous decline.',
    sparklineFootnote:
      'Six pillars, 26 indicators, weekly updates. All sources on the {methodologyLink}.',
    sparklineMethodologyLink: 'methodology page',
  },

  home: {
    title: 'State of democracy in the Czech Republic',
    introBeforeModel:
      'A weekly composite index from 0 to 100. Structural baseline from V-Dem 2024, EIU 2024, Freedom House 2025, RSF 2025, TI CPI 2024 and WJP 2024, plus weekly adjustments based on specific events. Classification by',
    introAfterModel: ', scoring by a deterministic TS function with unit tests.',

    scoreInfoTitle: 'How the 0–100 score is built',
    scoreInfoP1: {
      baselineBold: 'The structural baseline',
      afterQuarter: ' is derived from annual external indices and refreshed quarterly. ',
      weeklyBold: 'Weekly events',
      afterWeekly: ' add or subtract points according to a ',
      rubricLink: 'fixed severity rubric',
      tail: '; one-off events decay linearly over 12 weeks, persistent ones stay until explicitly closed.',
    },
    scoreInfoP2: {
      overallBold: 'The overall score',
      tail:
        ' is a weighted average of 6 pillars (elections 15% · governance 20% · judiciary 20% · media 15% · civil rights 15% · corruption 15%). The arithmetic is a deterministic TypeScript function with unit tests — no LLM computes the score, only categorises events.',
    },

    timelineHeading: 'Score over time',
    timelineFirstSnapshot: 'First snapshot — history starts from week',
    timelineComparabilityWarn: 'Note on comparability:',
    timelineComparability:
      'pre-2026-W17 data was sourced from a smaller pool (4 Czech outlets via the Wayback Machine vs. 19 sources in the current pipeline). Trend comparisons across periods may therefore not be fully comparable — more sources catch more events, which can look like a decline without an actual change in state. Detail in',
    timelineComparabilityLink: 'methodology / open issues',

    pillarBreakdownHeading: 'Score by pillar',
    pillarBreakdownNotePre: 'Bars = current week. Black dots = structural baseline (',
    pillarBreakdownNotePost: '). The difference shows how this quarter’s events have moved the pillar.',

    pillarDetailHeading: 'Pillar detail',
    pillarDetailIntro:
      'What each pillar measures, what subcomponents it contains, and what happens to it when events move it. The percentage tag is the pillar’s weight in the overall score.',

    pillarReadingTitle: 'How to read pillar scores',
    pillarReadingP1: {
      pre: 'The ',
      bold1: '0–100',
      mid:
        ' scale is mathematical, not normative — higher means fewer institutional problems in that week. External indices (V-Dem, EIU, FH) currently place Czechia in the upper third of mature democracies, so a typical baseline range for the country is ',
      bold2: 'roughly 60–95',
      tail: '.',
    },
    pillarReadingP2: {
      pre: 'A specific event typically moves a pillar by ',
      bold: '0.2–6 points',
      tail:
        ' (depending on severity); a persistent event stays in the pillar until a reviewer closes it as resolved. One-off events decay linearly over 12 weeks.',
    },
    pillarReadingP3: {
      bold1: 'Corruption',
      mid1:
        ' sits systematically lower than the other pillars — reflecting a real discrepancy in Czechia (strong formal institutions but persistent perceived corruption per TI CPI). ',
      bold2: 'Governance',
      mid2: ' and ',
      bold3: 'Judiciary',
      tail:
        ' carry a higher weight (20% vs 15%), because the literature on backsliding identifies these areas as the most common channels of erosion.',
    },

    noSnapshot: 'No snapshot yet. The first pipeline run will create one for the current week.',

    comparisonHeading: 'Comparison with external indices',
    comparisonInfoTitle: 'Why our index shows a different number than V-Dem or EIU',
    comparisonInfoP1: {
      pre: 'External indices measure different things with different methodologies. Our index ',
      bold: 're-weights',
      tail:
        ' them across 6 pillars specific to the Czech context, so small differences (±5 pts) are normal variation. This isn’t a "truth" correction — it’s a different composite view.',
    },
    comparisonInfoP2: {
      bold1: 'Single-dimension',
      mid1:
        ' indices (RSF press freedom, TI CPI, WJP rule of law) compare against a specific pillar in the table above (not the overall score), because they measure only one dimension. ',
      bold2: 'Multi-dimension',
      tail: ' indices (V-Dem, EIU, FH) are overall composites → they compare to our overall score.',
    },
    comparisonInfoP3: {
      bold: 'A persistent divergence > 10 pts across two quarters',
      tail: ' = signal to open a methodology review issue. No threshold currently exceeded.',
    },

    recentEventsHeading: 'Most recent events',
    recentEventsAll: 'All events →',
    eventsInfoTitle: 'How events are produced and how I oversee them',
    eventsInfoLead: {
      bold: 'Monday at 06:00 UTC',
      tail: ' the GitHub Actions cron pipeline runs for the past week:',
    },
    eventsInfoSteps: {
      collection: { bold: 'Collection', tail: ' — RSS feeds from the main Czech newsrooms.' },
      preFilter: {
        bold: 'Pre-filter',
        tail: ' (Claude Haiku 4.5) — drastically narrows down to articles relevant to the 6 pillars.',
      },
      classify: {
        bold: 'Classification',
        mid: ' (Claude Sonnet 4.6) — assigns pillar, severity 1–5, and direction ±1, per the ',
        link: 'rubric',
        tail: '.',
      },
      dedupe: {
        bold: 'Dedupe',
        midA: ' — merges the same event reported by multiple outlets; on a severity/direction conflict the status becomes ',
        code: 'disputed',
        tail: '.',
      },
      cap: {
        bold: 'Source-count cap',
        tail: ' — severity ≥ 3 requires ≥ 2 outlets, ≥ 4 requires ≥ 3. Otherwise it is deterministically downgraded.',
      },
      audit: {
        bold: 'Self-audit',
        midA: ' — a separate Sonnet pass critiques its own output (anti-bias, severity↔rationale match). It can flag or downgrade an event to ',
        code: 'needs_review',
        tail: '.',
      },
      anomaly: {
        bold: 'Anomaly detection',
        midA: ' — if the week shows suspicious patterns (> 5 events, severity 5, single outlet > 50%, ...), it auto-opens a GitHub issue. ',
        bold2: 'The index publishes normally',
        tail: ' — the issue is an oversight ping, not a blocker.',
      },
    },
    eventsInfoFooter: {
      pre: 'Each event has a ',
      em: 'Dispute classification',
      tail: ' button — disputes go in as GitHub issues and are handled manually.',
    },
    noEvents: 'No events yet.',

    publicOpinionHeading: 'Public opinion',
    publicOpinionIntro: {
      pre: 'Supplementary context to the institutional index. ',
      bold: 'These values do not feed into the score',
      mid:
        ' — they’re here so you can compare how public mood reacts to the democratic agenda vs. where the actual institutional shifts are. Detail in the ',
      link: 'methodology',
      tail: '.',
    },
  },

  scoreSummary: {
    weekLabel: 'Week',
    vsLastWeek: 'vs. last week',
    vsBaseline: 'vs. baseline',
    weightedIndexNote:
      'Weighted index 0–100. Baseline {baseline} ({quarter}) {delta} from {count} active events.',
  },

  eventLog: {
    eyebrow: '03 — Events',
    title: 'What moved the index recently.',
    intro:
      'Each event is manually placed in a pillar and scored from −6 to +6 points. The full changelog is {repoLink}.',
    introRepoLink: 'on GitHub',
    weekChipPrefix: 'Week',
    archiveChip: 'Archive',
    summaryTemplate: 'Σ WEEK {sum} · {count} events · {sources} sources',
    fullArchiveLink: 'Full archive →',
    impactLabels: {
      severe: 'severe',
      positive: 'positive',
      minor: 'minor',
      neutral: 'neutral',
    },
    emptyWeek: 'No classified events this week.',
  },

  events: {
    pageTitle: 'All events',
    pageIntro:
      'An auditable list of every classified event. Each one has source links and a "Dispute classification" button — disputes are handled as GitHub issues. Filter by pillar, severity or year.',
    severityInfoTitle: 'What severity 1–5 means',
    directionExplain: {
      bold: 'Direction',
      tail:
        ' ±1: whether an event strengthens (+) or weakens (−) democratic institutions. An anti-corruption raid by NCOZ has direction +1, even though it involves suspected corruption — institutions are enforcing the law.',
    },
    statusExplain: {
      bold: 'Status',
      colon: ': ',
      activeCode: 'active',
      activeNote: ' (counted in the score), ',
      persistentCode: 'persistent',
      persistentNote: ' (a persistent layer until a reviewer closes it as ',
      resolvedCode: 'resolved',
      midClose: '), ',
      disputedCode: 'disputed',
      disputedNote: ' (coverage conflict across sources), ',
      needsReviewCode: 'needs_review',
      needsReviewNote: ' (auditor flagged it or the classifier wasn’t confident).',
    },
    countTotal: 'total',
    countWeeks: 'weeks',
    filterPillar: 'Pillar',
    filterSeverity: 'Severity',
    filterYear: 'Year',
    filterAllYears: 'All years',
    filterClear: 'Clear filters',
    countSummaryTotal: 'events total',
    countSummaryFiltered: 'after filtering',
    countSummaryOf: 'of',
    pageLabel: 'Page',
    pageOf: 'of',
    weekHeading: 'Week',
    emptyFiltered: 'No events match the filters. Try loosening the criteria.',
    emptyAll: 'No events yet.',
    paginationPrev: '← Previous',
    paginationNext: 'Next →',
  },

  eventCard: {
    severityLabel: 'severity',
    persistent: 'persistent',
    impactPrefix: 'impact',
    impactSuffix: 'pts',
    rationaleSummary: 'Classification rationale',
    disputeButton: 'Dispute classification',
    enFallbackBadgeTitle: 'This event is not yet translated to English.',
  },

  comparison: {
    pageTitle: 'Country comparison',
    pageIntro: {
      pre: 'How Czechia stacks up against ',
      mid: ' other countries (V4 + Germany, Austria, USA, UK) across ',
      midSecond: ' international democracy and rule-of-law indices. An external benchmark — ',
      bold: 'this does not feed into our weekly index',
      tail: '; it’s here only for context.',
    },

    legendInfoTitle: 'What you see here and what you don’t',
    legendP1: {
      bold: 'The heatmap matrix',
      tail:
        ' below shows all indices normalised to a 0–100 scale so they can be compared (EIU 0–10 and V-Dem 0–1 use different units). Cell colour reflects the normalised score — green ≥80, yellow 50–79, orange/red below that. Raw values (in the original scale) are in the tooltip on hover.',
    },
    legendP2: {
      bold: 'Bar charts',
      tail:
        ' beneath the table show each index separately on its native scale, keeping the original numbers readable. EIU also has 5 sub-pillars (electoral process, functioning of government, political participation, political culture, civil liberties) — these often reveal what specifically moved the overall score.',
    },
    legendP3: {
      bold1: '{n} countries',
      mid:
        ' are highlighted in colour: CZ (blue) and SK (cyan) as primary context for the Czech reader. The rest are grey. ',
      bold2: 'Small gaps',
      tail:
        ' between neighbouring countries (1–3 pts) typically lie within each index’s measurement noise — meaningful interpretation rests on trajectory over time, not on a specific year’s ranking.',
    },

    matrixHeading: 'Overview — all indices, all countries',
    matrixCountryColumn: 'Country',
    matrixNoData: '—',
    matrixNote:
      'Scale: green ≥80 (free / fully democratic), light green 70–79, yellow 60–69, orange 50–59, red below. Values keep the index’s original scale (EIU 0–10, V-Dem and WJP 0–1, others 0–100); cell colour comes from normalisation. For each index’s methodology, click its abbreviation in the column header.',

    detailHeading: 'Detail per index',
    detailIntro:
      'Every index on its native scale. EIU breaks down into 5 sub-pillars, FH into PR + CL. Countries sorted by score descending (CZ and SK highlighted in colour).',

    methodologyHeading: 'Methodology and sources',
    methodologyP1: {
      pre: 'Full description of country selection, indices, publication years and the manual update process in the ',
      link: 'country comparison methodology',
      mid: '. For mapping external indices onto our weekly CZ index see ',
      link2: 'Structural mapping',
      tail: '.',
    },

    noData: 'Cross-country data not available.',

    sourceLink: 'Source →',
    multiDimension: 'Multi-dimension composite',
    singleDimension: 'Single-dimension',
    scaleLabel: 'scale 0–',
    subPillarsHeading: 'Sub-pillars',
    scoreTooltip: 'score',
  },

  publicOpinionSection: {
    eyebrow: '05 — Public opinion',
    title: 'How the public sees it.',
    intro:
      'Supplementary context to the institutional index. {bold} — they’re here to compare public mood against where the actual institutional shifts are. Detail in the {link}.',
    introBold: 'These values do not feed into the score',
    introLink: 'methodology',
  },

  manifest: {
    eyebrow: '06 — Manifesto',
    kicker: 'Democracy is not a binary state. It’s a continuum measured daily.',
    quote:
      'We measure so that we talk about the data first — and only then about a "crisis" or "calm".',
    body:
      'We’re not politicians. The project is two political scientists, three analysts and the editorial teams of two independent titles. Data, weights and commentary are public. If you find a mistake, write to us — we fix it within a week and mark it as a correction.',
  },

  benchmarks: {
    eyebrow: '04 — Benchmarks',
    title: 'What external indices say about Czechia.',
    intro:
      'Annual assessments by the most-cited international institutions. Our index is in public cross-calibration with them.',
    headers: {
      index: 'Index',
      value: 'Value',
      delta: 'Δ y/y',
      rank: 'Rank',
      classification: 'Classification',
    },
    classifications: {
      'V-Dem': 'Liberal democracy',
      EIU: 'Full democracy',
      'FH-FitW': 'Free',
      RSF: 'Good situation',
      'TI-CPI': 'Moderately corrupt',
      WJP: 'Mature rule of law',
    },
  },

  comparisonTable: {
    headerIndex: 'Index',
    headerExternal: 'External',
    headerCompare: 'Compared with',
    headerOurs: 'Ours',
    headerDelta: 'Δ',
    headerStatusAria: 'Status',
    pillarPrefix: 'pillar',
    overallLabel: 'overall',
    overThresholdTitle: 'Above the 10-pt threshold — check persistence next quarter',
    inThresholdTitle: 'Within normal variation',
    intro: {
      pre: 'Our index ',
      bold: 'does not replace',
      tail:
        ' the established annual democracy indices — it complements them with faster detection of movement between updates. The table shows where our structural baseline ({quarter}) lies relative to each one’s most recent value.',
    },
    footer: {
      pre:
        'Single-dimension indices (RSF press freedom, TI CPI corruption, WJP rule of law) compare against a specific pillar; multi-dimension (V-Dem, EIU, FH) against the overall. Threshold ⚠️ = persistent divergence > 10 pts across 2 consecutive quarters triggers a methodology review. Detail in the ',
      link: 'validation report',
      tail: '.',
    },
  },

  methodologyIndex: {
    title: 'Methodology',
    intro: {
      pre:
        'A full description of how the index is built — from the structural baseline through weekly event classification to the oversight model that holds quality without mandatory pre-merge review. Every document is live, versioned in Git, and changeable only through commits with reasoning recorded in the ',
      link: 'CHANGELOG',
      tail: '.',
    },
    primaryDocsHeading: 'Main documents',
    auditTrailHeading: 'Audit trail',
    validationHeading: 'Quarterly validation reports',
    validationIntro:
      'Auto-generated comparison of our index with external benchmarks (V-Dem, EIU, FH, RSF, TI CPI, WJP). A persistent divergence > 10 pts across two quarters triggers a methodology review.',
    readMore: 'Read →',
    validationLinkPrefix: 'validation_',
  },

  methodologyDocs: {
    pillars: {
      title: 'The six pillars',
      description:
        'What each of the 6 pillars (elections, governance, judiciary, media, civil rights, corruption) measures, how it maps onto sources, and what doesn’t belong in it.',
    },
    severity: {
      title: 'Severity rubric',
      description:
        'Five-point severity scale 1–5 for events, with concrete Czech examples, escalation/de-escalation rules, and "needs_review" criteria.',
    },
    weights: {
      title: 'Pillar weights',
      description:
        'Reasoning for the current 15/20/20/15/15/15 weights, discussion of alternatives, and rules for changing weights in the future.',
    },
    governance: {
      title: 'Oversight model',
      description:
        'Six layers of oversight (self-audit, source-count cap, daily reports, anomaly detection, monthly spot-check, public dispute) instead of mandatory pre-merge review.',
    },
    structuralMapping: {
      title: 'Structural mapping',
      description:
        'How exactly the structural baseline is computed for each pillar from V-Dem 2024 / EIU 2024 / FH 2025 / RSF / TI / WJP.',
    },
    sources: {
      title: 'Data sources',
      description:
        'Where the index pulls from — 8 Czech newsrooms, open data from parliament and the courts, watchdog organisations, international news. Live table generated from config/sources.yaml.',
    },
    publicOpinion: {
      title: 'Public opinion',
      description:
        'Supplementary read-only context from polls (CVVM, STEM, Median). Doesn’t feed into the score — why not, how to use it, what we plan to add. Sources and their profile.',
    },
    crossCountry: {
      title: 'Country comparison',
      description:
        'How the 8 countries (V4 + DE/AT + USA/UK) and 6 indices were chosen, why CZ + SK are highlighted, and which publication years are used. A read-only external benchmark — does not feed into our index.',
    },
    changelog: {
      title: 'Changelog',
      description:
        'Version history of the methodology. Every change to pillars, weights, the rubric, or the governance model is recorded here.',
    },
    openIssues: {
      title: 'Open questions',
      description:
        'Known open questions and limitations of the current methodology, awaiting resolution in future iterations.',
    },
  },

  methodologyDocPage: {
    backToIndex: '← Methodology',
    translationPendingTitle: 'Translation pending',
    translationPendingBody:
      'This document is not yet available in English. The original Czech version is shown below.',
  },

  pillarDetail: {
    weightLabel: 'Weight',
    weightTitle: 'Pillar’s weight in the overall score',
    vsBaseline: 'vs baseline',
    subcomponentsSummary: 'What the pillar contains',
    lowersHeading: 'What lowers the score',
    raisesHeading: 'What raises the score',
    fullDescriptionLink: 'Full pillar description in the methodology →',
  },

  publicOpinion: {
    sourceLink: 'Source →',
    methodologyChangeLabel: 'Methodology change',
    methodologyChangeNotePrefix: 'Methodology change',
    topicalHeading: 'Recent findings from other surveys',
    topicalReportLink: 'Full report →',
  },

  scoreTimeline: {
    empty: 'No score history yet. The first snapshot is created after the first pipeline run.',
    tooltipLabel: 'Score',
  },

  pillarBreakdown: {
    tooltipCurrent: 'Current',
  },

  pillarsTable: {
    eyebrow: '02 — Pillars',
    title: 'Six axes by which we weigh democracy.',
    headers: {
      number: '#',
      pillar: 'Pillar',
      score: 'Score',
      deltaWeek: 'Δ WEEK',
      deltaBaseline: 'Δ BASE',
      weight: 'Weight',
      trend: '52-w trend',
      signal: 'Main signal',
    },
    riskZoneTag: 'risk zone',
    detailLink: 'Detail →',
    noEvent: 'No movement this week',
    footnote:
      '⚠ Pillars below 70 points are flagged as a heightened-risk zone. The trend shows the past 52 weeks against the pillar’s own baseline, not against the overall composite.',
  },

  infoBox: {
    expand: 'expand',
    collapse: 'collapse',
    readMoreDefault: 'Full description in the methodology →',
  },

  support: {
    pageTitle: 'Support the project',
    pageIntro:
      'The Czech Democracy Index is a non-profit open-source effort — running costs (LLM API, domain) and time are covered by the operator. Your support lets us expand sources, improve the methodology, and keep the project independent of advertising and political-actor sponsorship.',
    legalDisclaimer:
      'Please note: because the project is run by a company (not a registered non-profit), this payment is not a tax-deductible donation under Czech tax law — for the donor it is a regular payment. Stripe will email you a transaction receipt; a full VAT-grade invoice is available on request.',

    currencyHeading: 'Currency',
    currencyCzk: 'Czech crown (CZK)',
    currencyEur: 'Euro (EUR)',
    modeHeading: 'Frequency',
    modeOneTime: 'One-time',
    modeRecurring: 'Monthly',
    customAmount: 'Custom amount',
    customAmountAria: 'Choose a custom amount',
    monthlyBadge: '/month',

    proceedAria: 'Continue to secure payment via Stripe',

    paymentMethods:
      'Payment via Stripe — card, Apple Pay, Google Pay. Stripe is a PCI DSS Level 1 certified provider; card details never reach our servers.',

    transparencyHeading: 'Where the money goes',
    transparencyIntro: 'Current monthly running costs (approximate, normalised to CZK):',
    transparencyTotalLabel: 'Monthly total',
    transparencyAnnualLabel: 'Annual total',
    transparencyFooter:
      'Accounting is run within the operator’s company; support covers the direct costs above plus ~20 hours per month of human work on methodology, oversight and infrastructure. An annual audit is published in January as an addendum to the methodology.',

    notReadyTitle: 'Payments are not live yet',
    notReadyBody:
      'Payment links are still being configured on the Stripe side. If you’d like to support the project right now, please email the address listed on the project’s GitHub profile.',
  },

  thanks: {
    pageTitle: 'Thank you!',
    pageBody:
      'Your support is registered and feeds directly into how fast we can expand sources and improve the methodology. Stripe will email you a payment confirmation; if you need a full VAT-grade invoice, reply to that email with the request.',
    recurringNote:
      'For recurring support: you can manage payments (pause, cancel, change amount) at any time via the "Manage subscription" link in each Stripe confirmation email.',
    backHome: 'Back to the homepage',
  },

  costs: {
    api: { label: 'Anthropic API (Haiku pre-filter + Sonnet classification + audit)' },
    hosting: { label: 'Vercel hosting' },
    domain: { label: '.cz domain' },
    monthly: { label: 'monthly' },
    annual: { label: 'annually' },
    free: { label: 'free' },
  },

  dispute: {
    title: 'Dispute: {id} — {headline}',
    section1: '## Current classification',
    eventIdLabel: '**Event ID:**',
    pillarLabel: '**Pillar:**',
    severityLabel: '**Severity:**',
    severityNull: 'null (needs_review)',
    directionLabel: '**Direction:**',
    statusLabel: '**Status:**',
    dateLabel: '**Event date:**',
    section2: '## Why the classification is wrong',
    section2Body:
      '_Describe what is inaccurate in the current classification. A specific reference to the methodology rubric helps._',
    section3: '## Suggested correction (optional)',
    section3Body: '_Pillar / severity / direction you would use instead._',
    sourcesLeadIn: 'Source link(s):',
  },
};
