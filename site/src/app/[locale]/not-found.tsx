import Link from 'next/link';
import { buttonStyles } from '@/components/ui/buttonStyles';
import { ui } from '@/content/ui';

export const metadata = { title: 'Page not found', robots: { index: false, follow: false } };

export default function NotFound() {
  const t = ui.en;
  return (
    <section className="mx-auto max-w-xl px-4 py-32 text-center">
      <h1 className="font-display text-4xl text-stone-950">{t.notFoundTitle}</h1>
      <p className="mt-4 text-stone-600">{t.notFoundText}</p>
      <Link href="/" className={buttonStyles('primary', 'lg', 'mt-8')}>{t.backHome}</Link>
    </section>
  );
}
