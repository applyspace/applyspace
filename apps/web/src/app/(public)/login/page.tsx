"use client";

import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { LoaderIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import posthog from "posthog-js";
import { OffersPreview } from "@/components/auth/OffersPreview";
import { ApplyLogo } from "@/components/brand/ApplyLogo";
import { Button } from "@/components/ui/button";
import { AppleIcon } from "@/components/icons/AppleIcon";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { useLocale } from "@/components/providers/Providers";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Provider = "google" | "linkedin_oidc";

// Stone outline and stone text for the sign-in buttons.
const CONTROL =
  "h-11 w-full rounded-full border border-stone-200 bg-white text-sm font-medium text-stone-950 hover:bg-stone-50";

export default function LoginPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<Provider | null>(null);
  const [email, setEmail] = useState("");
  const [emailNotice, setEmailNotice] = useState(false);
  const [failed, setFailed] = useState(searchParams.get("error") !== null);

  async function handleSignIn(provider: Provider) {
    setPending(provider);
    setFailed(false);
    posthog.capture('sign_in_started', { provider });
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is redirected to the provider.
    if (error) {
      setFailed(true);
      setPending(null);
    }
  }

  const disabled = pending !== null || !isSupabaseConfigured;

  return (
    <div className="grid min-h-screen bg-white text-stone-950 lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[34rem] lg:mr-8">
          <ApplyLogo className="mb-12 h-7 w-auto text-stone-950" />

          <h1
            className="font-[family-name:var(--font-display)] text-[3rem] font-semibold leading-[1.02] tracking-[-0.04em]"
            style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 64' }}
          >
            {t.auth.headlineLine1}
            <br />
            {t.auth.headlineLine2}
          </h1>

          <p className="mt-4 text-sm text-stone-700 xl:whitespace-nowrap">{t.auth.tagline}</p>

          <div className="mt-8 flex w-full max-w-[22rem] flex-col gap-2.5 rounded-3xl border border-stone-200 bg-white p-4">
            <Button
              onClick={() => handleSignIn("google")}
              disabled={disabled}
              variant="outline"
              className={CONTROL}
            >
              {pending === "google" ? (
                <HugeiconsIcon icon={LoaderIcon} size={16} className="animate-spin" />
              ) : (
                <GoogleIcon className="size-4 shrink-0" />
              )}
              {t.auth.signInWithGoogle}
            </Button>

            <Button
              onClick={() => handleSignIn("linkedin_oidc")}
              disabled={disabled}
              variant="outline"
              className={CONTROL}
            >
              {pending === "linkedin_oidc" ? (
                <HugeiconsIcon icon={LoaderIcon} size={16} className="animate-spin" />
              ) : (
                <LinkedInIcon className="size-4 shrink-0 text-[#0A66C2]" />
              )}
              {t.auth.signInWith}
            </Button>

            <div className="flex items-center gap-3 text-[11px] font-medium text-stone-500">
              <span className="h-px flex-1 bg-stone-200" />
              {t.auth.or}
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            {/* Placeholder: email sign-in is designed but not wired yet */}
            <form
              className="flex flex-col gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                setEmailNotice(true);
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                autoComplete="email"
                className="h-11 w-full rounded-full border border-stone-200 bg-white px-4 text-sm outline-none transition-shadow placeholder:text-stone-400 focus:border-stone-400 focus:ring-3 focus:ring-stone-200"
              />
              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-stone-950 text-sm font-medium text-white hover:bg-stone-800"
              >
                {t.auth.continueWithEmail}
              </Button>
              {emailNotice && (
                <p role="status" className="text-xs text-stone-600">
                  {t.auth.emailSoon}
                </p>
              )}
            </form>

            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {t.auth.signInError}
              </p>
            )}

            <p className="px-1 text-center text-[11px] leading-snug text-stone-500">
              {t.auth.legalBefore}{" "}
              <span className="cursor-pointer underline underline-offset-2 transition-colors hover:text-stone-950">
                {t.auth.privacy}
              </span>
              .
            </p>
          </div>

          {/* Placeholder: desktop download is designed but not wired yet */}
          <div className="mt-5 flex w-full max-w-[22rem] justify-center">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium transition-colors hover:bg-stone-50"
            >
              <AppleIcon className="size-5" />
              {t.auth.downloadDesktop}
            </button>
          </div>
        </div>
      </main>

      {/* App preview: a small window on a list of offers, cropped on the right and bottom */}
      <aside aria-hidden className="hidden items-center justify-start pl-0 pr-12 lg:flex">
        <div className="relative h-[min(41rem,80vh)] w-full max-w-[46rem] overflow-hidden rounded-[2rem] bg-stone-100">
          <div className="absolute left-14 top-16">
            <OffersPreview />
          </div>
        </div>
      </aside>
    </div>
  );
}
