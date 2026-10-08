import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Fraunces, Geist } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Providers } from '@/components/providers/Providers';
import { getCurrentUser } from '@/lib/auth';
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
// Display serif for headlines (sign-in landing). Variable axes give the soft, chunky cut.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['SOFT', 'WONK', 'opsz'] });

// Force dynamic rendering for the whole tree — this Electron app has zero
// static content: every page reads from the local SQLite DB or the Supabase
// session at request time. Static pre-render would fire up workers that each
// load the server bundle + better-sqlite3 native binary, OOM-ing the build.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Apply',
  description: 'Your personal job research dashboard',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // First visit: follow the browser language (Apply is built for French job seekers).
  const preferred = (await headers()).get('accept-language')?.split(',')[0] ?? '';
  const initialLocale = /^fr/i.test(preferred) ? 'fr' : 'en';

  return (
    <html lang={initialLocale} className={cn("font-sans", geist.variable, fraunces.variable)}>
      <body className="antialiased tracking-[-0.011em]">
        <Providers user={user} initialLocale={initialLocale}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
