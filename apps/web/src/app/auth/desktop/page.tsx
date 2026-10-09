"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ApplyLogo } from "@/components/brand/ApplyLogo";
import { useLocale } from "@/components/providers/Providers";
import { DESKTOP_AUTH_REDIRECT } from "@/lib/desktop";

/** Supabase PKCE codes are short URL-safe strings; anything else is dropped. */
const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/;

/**
 * Landing page after a desktop sign-in. The desktop app signs in through the
 * system browser; like other desktop apps, we end on a web page with an "Open
 * ApplySpace" button (a click is what lets the browser launch the app) and also
 * try to open it right away. Only the one-time code is forwarded, never a session.
 */
function Bridge() {
  const { t } = useLocale();
  const code = useSearchParams().get("code");
  const link =
    code && CODE_PATTERN.test(code)
      ? `${DESKTOP_AUTH_REDIRECT}?code=${encodeURIComponent(code)}`
      : DESKTOP_AUTH_REDIRECT;

  useEffect(() => {
    window.location.assign(link);
  }, [link]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center text-stone-950">
      <ApplyLogo className="h-7 w-auto" />
      <h1 className="text-2xl font-semibold tracking-tight">{t.auth.desktopReturnTitle}</h1>
      <p className="max-w-sm text-sm text-stone-600">{t.auth.desktopReturnHint}</p>
      <a
        href={link}
        className="inline-flex h-11 items-center rounded-full bg-stone-950 px-6 text-sm font-medium text-white hover:bg-stone-800"
      >
        {t.auth.desktopReturnButton}
      </a>
    </main>
  );
}

export default function DesktopReturnPage() {
  return (
    <Suspense>
      <Bridge />
    </Suspense>
  );
}
