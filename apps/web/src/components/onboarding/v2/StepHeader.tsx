/** Centered step title (Fraunces) and one-line subtitle, with a generous gap between them. */
export function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mx-auto mb-12 max-w-2xl text-center">
      <h1
        className="font-[family-name:var(--font-display)] text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.03em]"
        style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 64' }}
      >
        {title}
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">{subtitle}</p>
    </header>
  );
}
