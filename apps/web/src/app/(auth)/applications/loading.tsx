export default function ApplicationsLoading() {
  return (
    <div className="flex h-full flex-col gap-5 px-4 py-6 sm:px-8 md:px-12 md:py-10" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 w-full max-w-xl animate-pulse rounded-full bg-muted" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, col) => (
          <div key={col} className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl bg-muted/50 p-2">
            <div className="h-6 w-32 animate-pulse rounded-lg bg-muted" />
            {Array.from({ length: 3 - (col % 2) }, (_, row) => (
              <div key={row} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
