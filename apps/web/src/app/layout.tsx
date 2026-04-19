import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Providers } from '@/components/providers/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

// Force dynamic rendering for the whole tree — this Electron app has zero
// static content: every page reads from the local SQLite DB or the NextAuth
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
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased">
        <Providers session={session}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
