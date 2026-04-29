import type { Metadata } from 'next';
import './globals.css';
import { Header } from './components/Header';

export const metadata: Metadata = {
  title: 'Index demokracie ČR',
  description:
    'Týdenní index stavu demokracie v České republice. Strukturální baseline z V-Dem / EIU / FH / RSF / TI / WJP plus týdenní indikátor událostí.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>
            Auditovatelný open-source projekt.{' '}
            <a
              href="https://github.com/znackarna/personal-democracy"
              className="underline hover:text-slate-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              Repo na GitHubu
            </a>
            . Klasifikuje Claude Sonnet 4.6, skóre počítá deterministická TS funkce.
            Detail metodologie na{' '}
            <a href="/methodology/" className="underline hover:text-slate-900">
              /methodology/
            </a>
            .
          </p>
        </footer>
      </body>
    </html>
  );
}
