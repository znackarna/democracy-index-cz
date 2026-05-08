/**
 * Editorial sparkline. Pure server component (deterministic SVG, no JS),
 * matching the redesign's hero + per-pillar visualisation.
 *
 * Two render modes:
 *   - Hero (large): area fill underneath, dashed baseline + label, end dot.
 *     Used at 320×90 in the hero, blue.
 *   - Row (small): line + end dot, no area, optional centerline. Used at
 *     160×36 per pillar in the PillarsTable.
 *
 * The path math is identical to the prototype's `path()` function in
 * tmp/index.html so visual results match the design 1:1.
 */

interface BaseProps {
  values: readonly number[];
  width: number;
  height: number;
  color: string;
  /** Inset for the line so it doesn't touch the edges. */
  pad?: number;
  className?: string;
}

interface SparklineProps extends BaseProps {
  /** If set, draw a horizontal dashed reference line at this value (in the
   *  same units as `values`). Used by hero to show the structural baseline. */
  baseline?: number;
  baselineLabel?: string;
  /** Fill the area under the line at low opacity. */
  area?: boolean;
  /** Draw a small filled circle at the last data point. */
  endDot?: boolean;
  endDotRadius?: number;
  /** Draw a faint dashed centerline (used in pillar rows). */
  centerline?: boolean;
}

export function Sparkline({
  values,
  width,
  height,
  color,
  pad = 4,
  baseline,
  baselineLabel,
  area = false,
  endDot = true,
  endDotRadius = 2.5,
  centerline = false,
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        preserveAspectRatio="none"
        aria-hidden="true"
      />
    );
  }

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
  const last = points[points.length - 1];

  // Dashed baseline reference line. Y is computed from the same span so
  // values like "78.4" line up against the actual data — readers can see
  // exactly how far the current week deviates from the structural baseline.
  let baselineY: number | null = null;
  if (typeof baseline === 'number') {
    baselineY = pad + (1 - (baseline - min) / span) * innerH;
    // Clamp to viewBox so a baseline outside the data range still renders.
    if (baselineY < 0) baselineY = 0;
    if (baselineY > height) baselineY = height;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {centerline && (
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(0,0,0,0.1)"
          strokeDasharray="2 3"
        />
      )}
      {baselineY !== null && (
        <>
          <line
            x1={0}
            y1={baselineY}
            x2={width}
            y2={baselineY}
            stroke={color}
            strokeOpacity={0.45}
            strokeDasharray="2 3"
          />
          {baselineLabel && (
            <text
              x={2}
              y={Math.max(baselineY - 4, 8)}
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
      {area && <path d={areaPath} fill={color} fillOpacity={0.08} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.4} />
      {endDot && last && (
        <circle cx={last.x} cy={last.y} r={endDotRadius} fill={color} />
      )}
    </svg>
  );
}
