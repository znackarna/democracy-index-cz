import { getMessages, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
}

/**
 * Inverse-color manifest section per redesign-v2: full-width black bg,
 * white text, 12-col grid, large quote in a light weight.
 *
 * Editorial NOTE for morning review: the body copy mentions a team of
 * "dva politologové, tři analytici a redakce dvou nezávislých titulů"
 * which is the design draft's editorial fiction. The current project is
 * solo-run by Jakub. Flagged in MORNING-CHECKLIST.md.
 */
export function Manifest({ locale }: Props) {
  const t = getMessages(locale);
  const M = t.manifest;
  return (
    <section className="border-b border-black bg-black text-white">
      <div className="mx-auto max-w-editorial px-6 py-20 md:px-10">
        <div className="flex flex-col gap-8 md:grid md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
              {M.eyebrow}
            </div>
            <div className="mt-4 max-w-[28ch] font-mono text-[12px] leading-relaxed text-white/55">
              {M.kicker}
            </div>
          </div>
          <div className="md:col-span-9">
            <p
              className="max-w-[34ch] text-[28px] font-light leading-[1.15] tracking-tight md:text-[40px]"
              style={{ textWrap: 'balance' }}
            >
              {M.quote}
            </p>
            <div className="mt-10 max-w-[60ch] text-[15px] leading-relaxed text-white/75">
              {M.body}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
