import { DonateButtons } from '../components/DonateButtons';
import { PageContainer } from '../components/PageContainer';
import { isAnyLinkConfigured, readDonationsConfig } from '../lib/donations';
import { getMessages, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
}

export async function SupportView({ locale }: Props) {
  const t = getMessages(locale);
  const config = await readDonationsConfig();
  const ready = isAnyLinkConfigured(config);

  // Cost ID → translated label.
  const costLabel: Record<string, string> = {
    api: t.costs.api.label,
    hosting: t.costs.hosting.label,
    domain: t.costs.domain.label,
  };

  const rate = config.costs.display_rate_czk_per_eur;
  const formatCzk = (czk: number) =>
    czk === 0
      ? t.costs.free.label
      : `${czk.toLocaleString(locale === 'cs' ? 'cs-CZ' : 'en-GB')} Kč`;
  const formatEur = (czk: number) => {
    if (czk === 0) return null;
    const eur = Math.round(czk / rate);
    return `≈ ${eur} €`;
  };
  const totalAnnualCzk = config.total_monthly_czk * 12;

  return (
    <PageContainer>
    <div className="space-y-10">
      <section>
        <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">07 — {t.support.pageTitle}</div>
        <h1 className="mt-2 mb-3 text-3xl font-medium tracking-tight md:text-4xl">
          {t.support.pageTitle}
        </h1>
        <p className="max-w-3xl text-[15px] text-black/65">{t.support.pageIntro}</p>
        <p className="mt-3 max-w-3xl text-xs text-black/55">{t.support.legalDisclaimer}</p>
      </section>

      {ready ? (
        <section>
          <DonateButtons
            links={config.links}
            labels={{
              currencyHeading: t.support.currencyHeading,
              currencyCzk: t.support.currencyCzk,
              currencyEur: t.support.currencyEur,
              modeHeading: t.support.modeHeading,
              modeOneTime: t.support.modeOneTime,
              modeRecurring: t.support.modeRecurring,
              customAmount: t.support.customAmount,
              customAmountAria: t.support.customAmountAria,
              monthlyBadge: t.support.monthlyBadge,
              proceedAria: t.support.proceedAria,
              paymentMethods: t.support.paymentMethods,
            }}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <h2 className="mb-2 text-base font-semibold">{t.support.notReadyTitle}</h2>
          <p>{t.support.notReadyBody}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">
          {t.support.transparencyHeading}
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-slate-600">{t.support.transparencyIntro}</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium" scope="col">
                  &nbsp;
                </th>
                <th className="px-4 py-2 text-right font-medium" scope="col">
                  CZK
                </th>
                <th className="px-4 py-2 text-right font-medium" scope="col">
                  EUR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.costs.monthly.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-700">{costLabel[item.id] ?? item.id}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {formatCzk(item.czk)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {formatEur(item.czk) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <th
                  scope="row"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
                >
                  {t.support.transparencyTotalLabel}
                </th>
                <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-slate-900">
                  {formatCzk(config.total_monthly_czk)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {formatEur(config.total_monthly_czk) ?? '—'}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <th
                  scope="row"
                  className="px-4 pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
                >
                  {t.support.transparencyAnnualLabel}
                </th>
                <td className="px-4 pb-3 text-right text-sm font-medium tabular-nums text-slate-700">
                  {formatCzk(totalAnnualCzk)}
                </td>
                <td className="px-4 pb-3 text-right text-sm tabular-nums text-slate-500">
                  {formatEur(totalAnnualCzk) ?? '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-xs text-black/55">{t.support.transparencyFooter}</p>
      </section>
    </div>
    </PageContainer>
  );
}
