import { type Event, type Pillar } from '@/lib/types';

interface Props {
  event: Event;
  /** Repo URL used to build the dispute issue link. */
  repoUrl?: string;
}

const PILLAR_LABEL: Record<Pillar, string> = {
  electoral: 'Volby',
  governance: 'Vládnutí',
  judicial: 'Justice',
  media: 'Média',
  civil: 'Svobody',
  corruption: 'Korupce',
};

const PILLAR_COLOR: Record<Pillar, string> = {
  electoral: 'bg-pillar-electoral',
  governance: 'bg-pillar-governance',
  judicial: 'bg-pillar-judicial',
  media: 'bg-pillar-media',
  civil: 'bg-pillar-civil',
  corruption: 'bg-pillar-corruption',
};

const SEVERITY_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-severity-1 text-slate-800',
  2: 'bg-severity-2 text-white',
  3: 'bg-severity-3 text-white',
  4: 'bg-severity-4 text-white',
  5: 'bg-severity-5 text-white',
};

const STATUS_LABEL: Record<Event['status'], string> = {
  active: 'aktivní',
  resolved: 'vyřešeno',
  disputed: 'spor v pokrytí',
  needs_review: 'k revizi',
};

const STATUS_STYLE: Record<Event['status'], string> = {
  active: 'border-slate-300 bg-slate-100 text-slate-700',
  resolved: 'border-slate-300 bg-slate-50 text-slate-500',
  disputed: 'border-amber-400 bg-amber-50 text-amber-800',
  needs_review: 'border-amber-400 bg-amber-50 text-amber-800',
};

export function EventCard({ event, repoUrl = 'https://github.com/znackarna/personal-democracy' }: Props) {
  const direction =
    event.direction === 1 ? '↑ posiluje' : event.direction === -1 ? '↓ oslabuje' : '→ neutrální';
  const directionColor =
    event.direction === 1 ? 'text-score-good' : event.direction === -1 ? 'text-score-bad' : 'text-slate-500';

  const disputeUrl = buildDisputeUrl(event, repoUrl);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white ${PILLAR_COLOR[event.pillar]}`}
        >
          {PILLAR_LABEL[event.pillar]}
        </span>
        {event.severity !== null && (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[event.severity]}`}
          >
            závažnost {event.severity}
          </span>
        )}
        <span className={`text-xs font-medium ${directionColor}`}>{direction}</span>
        {event.status !== 'active' && (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[event.status]}`}
          >
            {STATUS_LABEL[event.status]}
          </span>
        )}
        {event.duration === 'persistent' && (
          <span className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
            trvalá
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-slate-400">{event.id}</span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-900">{event.headline}</h3>
      <div className="mt-1 text-xs text-slate-500">
        {event.date}
        {event.score_impact !== 0 && (
          <span className="ml-2 font-mono">
            dopad {event.score_impact > 0 ? '+' : ''}
            {event.score_impact.toFixed(1)} b.
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-700">{event.summary}</p>

      <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-900">
          Odůvodnění klasifikace
        </summary>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed">
          {event.rationale}
        </p>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex flex-wrap gap-2">
          {event.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 hover:bg-slate-100"
              title={s.title}
            >
              {s.outlet} ↗
            </a>
          ))}
        </div>
        <a
          href={disputeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-slate-500 underline hover:text-slate-900"
        >
          Napadnout klasifikaci
        </a>
      </div>
    </article>
  );
}

function buildDisputeUrl(event: Event, repoUrl: string): string {
  const title = `Dispute: ${event.id} — ${event.headline.slice(0, 80)}`;
  const body = [
    `## Aktuální klasifikace`,
    ``,
    `- **Event ID:** \`${event.id}\``,
    `- **Pillar:** ${event.pillar}`,
    `- **Severity:** ${event.severity ?? 'null (needs_review)'}`,
    `- **Direction:** ${event.direction}`,
    `- **Status:** ${event.status}`,
    `- **Datum události:** ${event.date}`,
    ``,
    `## Proč je klasifikace špatně`,
    ``,
    `_Popiš, co je v aktuální klasifikaci nepřesné. Konkrétní odkaz na bod methodology rubric pomáhá._`,
    ``,
    `## Navrhovaná oprava (volitelné)`,
    ``,
    `_Pillar / severity / direction, které bys místo toho použil(a)._`,
    ``,
    `---`,
    `Odkaz na zdroj(e): ${event.sources.map((s) => s.url).join(', ')}`,
  ].join('\n');
  const params = new URLSearchParams({
    title,
    body,
    labels: 'dispute',
  });
  return `${repoUrl}/issues/new?${params.toString()}`;
}
