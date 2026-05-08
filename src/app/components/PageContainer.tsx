/**
 * Editorial container used by all non-home views (events archive,
 * methodology, comparison, support, thanks).
 *
 * The home page does not use this — its sections each set their own
 * full-width container so the masthead-bordered look works.
 */
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-editorial px-6 py-14 md:px-10">
      {children}
    </div>
  );
}
