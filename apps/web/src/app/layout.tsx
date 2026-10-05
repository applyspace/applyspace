import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Providers } from '@/components/providers/Providers';
import { getCurrentUser } from '@/lib/auth';
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

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
    <html lang={initialLocale} className={cn("font-sans", inter.variable)}>
      <body className="antialiased">
        <Providers user={user} initialLocale={initialLocale}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
