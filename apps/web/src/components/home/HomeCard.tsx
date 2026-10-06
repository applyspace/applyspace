import { cn } from '@/lib/utils';

/** The shared card surface of the Home page: white, stone outline, light shadow. */
export function HomeCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Small icon + label line that titles a card. */
export function HomeCardLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
      {icon}
      <h2>{children}</h2>
    </div>
  );
}
