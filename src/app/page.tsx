import Link from 'next/link';
import { ScoreSummary } from './components/ScoreSummary';
import { ScoreTimeline } from './components/ScoreTimeline';
import { PillarBreakdown } from './components/PillarBreakdown';
import { PillarDetailGrid } from './components/PillarDetail';
import { IndexComparisonTable } from './components/IndexComparison';
import { EventCard } from './components/EventCard';
import { InfoBox } from './components/InfoBox';
import {
  readAllEvents,
  readIndexComparisons,
  readLatest,
  readTimeline,
} from './lib/data';

export default async function HomePage() {
  const [{ snapshot, baseline }, timeline, allEvents, comparisons] = await Promise.all([
    readLatest(),
    readTimeline(),
    readAllEvents(),
    readIndexComparisons(),
  ]);

  const recentEvents = allEvents.slice(0, 5);

  // Předchozí snapshot pro week-over-week deltu — předposlední v timeline,
  // pokud je. Když je timeline ≤ 1 záznam, ScoreSummary fallbackuje na delta
  // od baseline.
  const prevSnapshot = timeline.length >= 2 ? timeline[timeline.length - 2] : undefined;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
          Stav demokracie ČR
        </h1>
        <p className="max-w-3xl text-slate-600">
          Týdně aktualizovaný kompozitní index 0–100. Strukturální baseline z V-Dem 2024,
          EIU 2024, Freedom House 2025, RSF 2025, TI CPI 2024 a WJP 2024 plus týdenní
          úpravy podle konkrétních událostí. Klasifikuje{' '}
          <span className="font-mono text-sm">claude-sonnet-4-6</span>, skóre počítá
          deterministická TS funkce s unit testy.
        </p>
      </section>

      {snapshot && baseline ? (
        <>
          <ScoreSummary snapshot={snapshot} baseline={baseline} prevSnapshot={prevSnapshot} />

          <InfoBox title="Jak vzniká skóre 0–100" readMore={{ slug: 'weights' }}>
            <p>
              <strong>Strukturální baseline</strong> ({baseline.quarter}) vychází z ročních
              externích indexů a aktualizuje se kvartálně. <strong>Týdenní eventy</strong>{' '}
              přičítají/odečítají body podle{' '}
              <Link href="/methodology/severity/" className="underline hover:text-slate-900">
                pevné rubric závažnosti
              </Link>
              ; jednorázové události stárnou lineárně přes 12 týdnů, persistentní zůstávají
              až do explicitního uzavření.
            </p>
            <p>
              <strong>Overall</strong> je vážený průměr 6 pilířů (volby 15 % · vládnutí 20 %
              · justice 20 % · média 15 % · svobody 15 % · korupce 15 %). Aritmetika je
              deterministická TypeScript funkce s unit testy — žádný LLM nepočítá skóre,
              jen kategorizuje události.
            </p>
          </InfoBox>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Vývoj skóre</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ScoreTimeline snapshots={timeline} />
              {timeline.length === 1 && (
                <p className="mt-2 text-xs text-slate-500">
                  První snapshot — historie se buduje od týdne {timeline[0]?.week}.
                </p>
              )}
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <strong className="font-semibold text-slate-700">Pozor na srovnatelnost:</strong>{' '}
                pre-2026-W17 data pochází z menšího počtu zdrojů (4 česká média přes Wayback
                Machine vs. 19 zdrojů v aktuální pipeline). Trendová srovnání mezi obdobími
                proto nemusí být plně srovnatelná — víc zdrojů zachytí víc událostí, což může
                vypadat jako zhoršení i bez reálné změny stavu. Detail v{' '}
                <Link
                  href="/methodology/issues/"
                  className="underline hover:text-slate-700"
                >
                  methodology/issues
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Skóre po pilířích</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <PillarBreakdown snapshot={snapshot} baseline={baseline} />
              <p className="mt-2 text-xs text-slate-500">
                Sloupce = aktuální týden. Černé tečky = strukturální baseline (
                {baseline.quarter}). Diference ukazuje, jak události tohoto kvartálu
                posunuly pilíř.
              </p>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Detail po pilířích</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Co každý pilíř konkrétně měří, jaké subkomponenty obsahuje a co se v něm
                stane, když ho události posunou. Procentuální štítek je váha pilíře v
                celkovém skóre.
              </p>
            </div>
            <PillarDetailGrid snapshot={snapshot} baseline={baseline} />
            <div className="mt-3">
              <InfoBox title="Jak číst pilířové skóre">
                <p>
                  Stupnice <strong>0–100</strong> je matematická, ne normativní — vyšší
                  znamená méně institucionálních problémů v daném týdnu. Externí indexy
                  (V-Dem, EIU, FH) řadí ČR aktuálně do horní třetiny vyspělých demokracií,
                  takže typický rozsah pro ČR baseline je <strong>cca 60–95</strong>.
                </p>
                <p>
                  Konkrétní událost typicky posune pilíř o <strong>0.2–6 bodů</strong>{' '}
                  (podle severity), persistentní událost zůstává v pilíři dokud reviewer
                  nezavře jako resolved. Jednorázové události stárnou lineárně přes 12 týdnů.
                </p>
                <p>
                  <strong>Korupce</strong> stojí systematicky níž než ostatní pilíře — reflektuje
                  reálnou diskrepanci v ČR (silné formální instituce, ale dlouhodobě vnímaná
                  korupce per TI CPI).{' '}
                  <strong>Vládnutí</strong> a <strong>Justice</strong> mají vyšší váhu (20 %
                  vs 15 %), protože literatura backslidingu identifikuje právě tyto oblasti
                  jako nejčastější kanály eroze.
                </p>
              </InfoBox>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <p>Zatím žádný snapshot. První běh pipeline vytvoří snapshot pro aktuální týden.</p>
        </section>
      )}

      {comparisons.baselineQuarter && comparisons.comparisons.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Srovnání s externími indexy</h2>
          <IndexComparisonTable
            comparisons={comparisons.comparisons}
            baselineQuarter={comparisons.baselineQuarter}
          />
          <div className="mt-3">
            <InfoBox
              title="Proč náš index ukazuje jiné číslo než V-Dem nebo EIU"
              readMore={{ slug: 'structural-mapping' }}
            >
              <p>
                Externí indexy měří různé věci různými metodikami. Náš index si je{' '}
                <strong>znovu váží</strong> přes 6 pilířů specifických pro ČR kontext, takže
                drobné rozdíly (±5 b.) jsou normální variabilita. Nejde o korekci „pravdy"
                — jde o jiný kompozitní pohled.
              </p>
              <p>
                <strong>Single-dimension</strong> indexy (RSF press freedom, TI CPI, WJP rule
                of law) se v tabulce výše porovnávají s konkrétním pilířem (ne s overall),
                protože měří jen jednu dimenzi. <strong>Multi-dimension</strong> indexy
                (V-Dem, EIU, FH) jsou overall composity → srovnávají se s naším celkem.
              </p>
              <p>
                <strong>Práh trvalé divergence &gt; 10 b. ve dvou kvartálech</strong> = signál
                otevřít issue na methodology review. Aktuálně žádný práh nepřekročen.
              </p>
            </InfoBox>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Nejnovější události</h2>
          <Link href="/events/" className="text-sm text-slate-600 underline hover:text-slate-900">
            Všechny události →
          </Link>
        </div>
        <InfoBox title="Jak události vznikají a jak je oversightuju" readMore={{ slug: 'governance' }}>
          <p>
            <strong>Pondělí 06:00 UTC</strong> spustí GitHub Actions cron pipeline pro
            uplynulý týden:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <strong>Sběr</strong> — RSS feedy hlavních českých redakčních médií.
            </li>
            <li>
              <strong>Pre-filter</strong> (Claude Haiku 4.5) — drasticky zúží na zprávy
              relevantní pro 6 pilířů.
            </li>
            <li>
              <strong>Klasifikace</strong> (Claude Sonnet 4.6) — přiřadí pillar, severity
              1–5, direction ±1, podle{' '}
              <Link href="/methodology/severity/" className="underline hover:text-slate-900">
                rubric
              </Link>
              .
            </li>
            <li>
              <strong>Dedupe</strong> — sloučí stejnou událost reportovanou více outlety;
              při rozporu severity/direction → status <code>disputed</code>.
            </li>
            <li>
              <strong>Source-count cap</strong> — severity ≥ 3 vyžaduje ≥ 2 outlety,
              ≥ 4 vyžaduje ≥ 3. Jinak deterministicky downgrade.
            </li>
            <li>
              <strong>Self-audit</strong> — separátní Sonnet pass kritizuje vlastní výstup
              (anti-bias, severity↔rationale match). Může event flagnout/downgradeovat na{' '}
              <code>needs_review</code>.
            </li>
            <li>
              <strong>Anomaly detection</strong> — pokud týden vykazuje podezřelé znaky
              (&gt; 5 events, severity 5, single outlet &gt; 50 %, ...), auto-otevře GitHub
              issue. <strong>Index se publikuje normálně</strong> — issue je oversight ping,
              ne blocker.
            </li>
          </ol>
          <p>
            Každá událost má tlačítko{' '}
            <em>Napadnout klasifikaci</em> — disputes jdou jako GitHub issues a řeší se
            ručně.
          </p>
        </InfoBox>
        {recentEvents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Zatím žádné události.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {recentEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
