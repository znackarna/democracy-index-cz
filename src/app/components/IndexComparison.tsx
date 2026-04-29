import { type IndexComparison } from '@/lib/external-comparison';

interface Props {
  comparisons: readonly IndexComparison[];
  baselineQuarter: string;
}

const PILLAR_LABEL: Record<string, string> = {
  electoral: 'Volby',
  governance: 'Vládnutí',
  judicial: 'Justice',
  media: 'Média',
  civil: 'Svobody',
  corruption: 'Korupce',
};

const INDEX_DESCRIPTION: Record<string, string> = {
  'V-DEM': 'Liberal Democracy Index — V-Dem Institute (Gothenburg)',
  EIU: 'Democracy Index — Economist Intelligence Unit',
  'FH-FITW': 'Freedom in the World — Freedom House',
  FH: 'Freedom in the World — Freedom House',
  RSF: 'Press Freedom Index — Reporters Without Borders',
  'TI-CPI': 'Corruption Perceptions Index — Transparency International',
  TI: 'Corruption Perceptions Index — Transparency International',
  WJP: 'Rule of Law Index — World Justice Project',
};

export function IndexComparisonTable({ comparisons, baselineQuarter }: Props) {
  if (comparisons.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600">
        Náš index <strong>nenahrazuje</strong> zavedené roční indexy demokracie — doplňuje je o
        rychlejší detekci pohybu mezi jejich aktualizacemi. Tabulka ukazuje, jak náš strukturální
        baseline ({baselineQuarter}) leží vůči nejnovějším hodnotám každého z nich.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4 font-medium">Index</th>
              <th className="py-2 pr-4 text-right font-medium">Externí</th>
              <th className="py-2 pr-4 font-medium">Srovnáváme s</th>
              <th className="py-2 pr-4 text-right font-medium">Naše</th>
              <th className="py-2 pr-4 text-right font-medium">Δ</th>
              <th className="py-2 pr-4 font-medium" aria-label="Status" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparisons.map((c) => {
              const description = INDEX_DESCRIPTION[c.index.toUpperCase()] ?? '';
              const sign = c.delta >= 0 ? '+' : '';
              const deltaColor = c.exceedsThreshold
                ? 'text-score-bad'
                : Math.abs(c.delta) < 5
                  ? 'text-slate-500'
                  : 'text-score-warn';
              const targetLabel =
                c.pillar !== null
                  ? `pilíř ${PILLAR_LABEL[c.pillar] ?? c.pillar}`
                  : 'celkové';
              return (
                <tr key={c.index + c.year} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {c.index}
                      </a>{' '}
                      <span className="text-xs text-slate-500">{c.year}</span>
                    </div>
                    {description && <div className="text-xs text-slate-500">{description}</div>}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-900">
                    {c.externalNormalized.toFixed(1)}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{targetLabel}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-900">
                    {c.comparisonTarget.toFixed(1)}
                  </td>
                  <td className={`py-3 pr-4 text-right font-medium tabular-nums ${deltaColor}`}>
                    {sign}
                    {c.delta.toFixed(1)}
                  </td>
                  <td className="py-3 pr-4 text-center">
                    {c.exceedsThreshold ? (
                      <span title="Nad prahem 10 b. — kontrolovat trvalost ve 2. kvartálu">⚠️</span>
                    ) : (
                      <span title="V normální variabilitě" className="text-score-good">
                        ✓
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Single-dimension indexy (RSF press freedom, TI CPI corruption, WJP rule of law) se
        srovnávají s konkrétním pilířem; multi-dimension (V-Dem, EIU, FH) s celkovým overall.
        Práh ⚠️ = trvalá divergence &gt; 10 b. ve 2 po sobě jdoucích kvartálech triggeruje
        methodology review. Detail v{' '}
        <a
          href={`https://github.com/znackarna/personal-democracy/blob/main/methodology/validation_${baselineQuarter}.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900"
        >
          validation report
        </a>
        .
      </p>
    </div>
  );
}
