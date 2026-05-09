'use client';

import { useMemo, useRef, useState } from 'react';
import { parseIsoWeek } from '@/i18n/dates';
import type { Locale } from '@/i18n';

interface Props {
  /** Oldest-first weekly score values (typically ~52). */
  values: readonly number[];
  /** Same length as `values`; each entry is the ISO week label e.g.
   *  "2026-W04". Used in the tooltip. */
  weeks: readonly string[];
  width: number;
  height: number;
  pad?: number;
  color: string;
  baseline?: number;
  baselineLabel?: string;
  /** Tooltip prefix word: "Týden" / "Week". */
  weekWord: string;
  locale: Locale;
  className?: string;
}

/**
 * Interactive hero sparkline. Identical visual to the static `Sparkline`
 * (line, area fill, dashed baseline + label, end dot) plus a hover/tap
 * affordance: vertical guideline + dot at the nearest data point and a
 * floating tooltip showing the ISO week and the score.
 *
 * Implementation notes:
 *   - SVG path math is computed once via useMemo, so re-renders during
 *     hover only update the cursor + tooltip position, not the curve.
 *   - Mouse + touch are normalised to a single pointermove handler.
 *   - The tooltip lives inside the same wrapping <div> so it can use
 *     absolute positioning relative to the chart.
 *   - viewBox is preserved so the sparkline scales fluidly on resize;
 *     the cursor mapping uses the bounding rect to get the actual pixel
 *     width on screen.
 */
export function HeroSparkline({
  values,
  weeks,
  width,
  height,
  pad = 6,
  color,
  baseline,
  baselineLabel,
  weekWord,
  locale,
  className,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const innerH = height - pad * 2;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * width;
      const y = pad + (1 - (v - min) / span) * innerH;
      return { x, y };
    });
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${width} ${height - pad / 2} L 0 ${height - pad / 2} Z`;
    let baselineY: number | null = null;
    if (typeof baseline === 'number') {
      baselineY = pad + (1 - (baseline - min) / span) * innerH;
      if (baselineY < 0) baselineY = 0;
      if (baselineY > height) baselineY = height;
    }
    return { points, linePath, areaPath, baselineY, min, max };
  }, [values, width, height, pad, baseline]);

  if (!layout) {
    return <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden />;
  }

  const lastIdx = layout.points.length - 1;
  const cursorIdx = activeIdx ?? lastIdx;
  const cursor = layout.points[cursorIdx];
  const cursorValue = values[cursorIdx];
  const cursorWeek = weeks[cursorIdx];

  const handlePointer = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const idx = Math.min(values.length - 1, Math.max(0, Math.round(ratio * (values.length - 1))));
    setActiveIdx(idx);
  };

  // Tooltip horizontal placement as a percentage of width — matches how
  // the SVG scales fluidly with viewBox + preserveAspectRatio=none.
  const tipLeftPct = cursor ? (cursor.x / width) * 100 : 0;
  const tipFlip = tipLeftPct > 70; // flip to the left of the cursor near the right edge

  // Format value using the locale's decimal separator.
  const decimalSep = locale === 'cs' ? ',' : '.';
  const valueStr =
    cursorValue !== undefined ? cursorValue.toFixed(1).replace('.', decimalSep) : '';
  const weekParsed = cursorWeek ? parseIsoWeek(cursorWeek) : null;
  const weekStr = weekParsed ? `${weekWord} ${weekParsed.week} · ${weekParsed.year}` : '';

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className={`${className ?? ''} cursor-crosshair touch-none`}
        preserveAspectRatio="none"
        onMouseMove={(e) => handlePointer(e.clientX)}
        onMouseLeave={() => setActiveIdx(null)}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') handlePointer(e.clientX);
        }}
        aria-hidden="true"
      >
        {layout.baselineY !== null && (
          <>
            <line
              x1={0}
              y1={layout.baselineY}
              x2={width}
              y2={layout.baselineY}
              stroke={color}
              strokeOpacity={0.45}
              strokeDasharray="2 3"
            />
            {baselineLabel && (
              <text
                x={2}
                y={Math.max(layout.baselineY - 4, 8)}
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                fontSize={8}
                fill={color}
                fillOpacity={0.7}
              >
                {baselineLabel}
              </text>
            )}
          </>
        )}
        <path d={layout.areaPath} fill={color} fillOpacity={0.08} />
        <path d={layout.linePath} fill="none" stroke={color} strokeWidth={1.4} />
        {/* End dot — always visible. */}
        {layout.points[lastIdx] && (
          <circle cx={layout.points[lastIdx]!.x} cy={layout.points[lastIdx]!.y} r={3} fill={color} />
        )}
        {/* Active cursor — vertical guideline + bigger dot. */}
        {activeIdx !== null && cursor && (
          <>
            <line
              x1={cursor.x}
              y1={0}
              x2={cursor.x}
              y2={height}
              stroke={color}
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <circle
              cx={cursor.x}
              cy={cursor.y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={1.4}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {activeIdx !== null && cursor && (
        <div
          className="pointer-events-none absolute -top-12 z-10"
          style={{
            left: `${tipLeftPct}%`,
            transform: tipFlip ? 'translateX(-100%)' : 'translateX(-0%)',
          }}
        >
          <div className="border border-black bg-paper px-2 py-1 font-mono text-[10px] leading-tight text-black num">
            <div>{weekStr}</div>
            <div className="font-medium" style={{ color }}>
              {valueStr}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
