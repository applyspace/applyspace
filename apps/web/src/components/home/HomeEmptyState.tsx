import Link from 'next/link';

export function HomeEmptyState() {
  return (
    <section className="rounded-2xl bg-stone-100 p-5">
      <h2 className="text-sm font-medium text-stone-950">Nothing tracked yet</h2>
      <p className="mt-1 max-w-[34rem] text-sm text-stone-700">
        Start by describing the job you are looking for, or log an application you have already
        sent. Your numbers will appear here.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/offers"
          className="inline-flex h-9 items-center rounded-lg bg-stone-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
        >
          Create a search profile
        </Link>
        <Link
          href="/applications"
          className="inline-flex h-9 items-center rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50"
        >
          Track an application
        </Link>
      </div>
    </section>
  );
}
