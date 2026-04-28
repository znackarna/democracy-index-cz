'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type ScoreSnapshot, type StructuralBaseline, PILLARS } from '@/lib/types';

interface Props {
  snapshot: ScoreSnapshot;
  baseline: StructuralBaseline;
}

const PILLAR_LABEL: Record<(typeof PILLARS)[number], string> = {
  electoral: 'Volby',
  governance: 'Vládnutí',
  judicial: 'Justice',
  media: 'Média',
  civil: 'Svobody',
  corruption: 'Korupce',
};

const PILLAR_COLOR: Record<(typeof PILLARS)[number], string> = {
  electoral: '#2563eb',
  governance: '#7c3aed',
  judicial: '#0891b2',
  media: '#ea580c',
  civil: '#16a34a',
  corruption: '#dc2626',
};

export function PillarBreakdown({ snapshot, baseline }: Props) {
  const data = PILLARS.map((p) => ({
    pillar: PILLAR_LABEL[p],
    pillarKey: p,
    current: snapshot.pillars[p],
    baseline: baseline.pillars[p],
    delta: snapshot.pillars[p] - baseline.pillars[p],
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="pillar" stroke="#64748b" fontSize={12} />
          <YAxis
            domain={[0, 100]}
            stroke="#64748b"
            fontSize={12}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              fontSize: '12px',
            }}
            formatter={(value: number, _name, item) => {
              if (_name === 'current') {
                const baselineValue = (item.payload as { baseline: number }).baseline;
                const delta = value - baselineValue;
                const sign = delta >= 0 ? '+' : '';
                return [
                  `${value.toFixed(1)} (${sign}${delta.toFixed(1)} vs baseline ${baselineValue.toFixed(1)})`,
                  'Aktuálně',
                ];
              }
              return [value.toFixed(1), _name];
            }}
          />
          <Bar dataKey="current" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.pillarKey} fill={PILLAR_COLOR[d.pillarKey]} />
            ))}
          </Bar>
          {/* Baseline markers — small dots to show "where we started this quarter" */}
          {data.map((d) => (
            <ReferenceDot
              key={`baseline-${d.pillarKey}`}
              x={d.pillar}
              y={d.baseline}
              r={4}
              fill="#0f172a"
              stroke="white"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
