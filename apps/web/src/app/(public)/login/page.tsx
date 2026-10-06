"use client";

import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
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

// Outline color (brand lilac), text color (brand dark) and the soft shadow shared by buttons.
const CONTROL =
  "h-9 w-full rounded-lg border border-[#E2B8FF] bg-white text-sm font-medium text-[#1F0D2C] shadow-[0_1px_2px_rgba(31,13,44,0.06),0_4px_8px_-4px_rgba(31,13,44,0.08)] hover:bg-[#F6EAFF]";

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
    <div className="grid min-h-screen bg-white text-[#1F0D2C] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col">
        <header className="px-6 pt-6 sm:px-9">
          <ApplyLogo className="h-6 w-auto text-[#1F0D2C]" />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center">
          <h1
            className="font-[family-name:var(--font-display)] text-[3rem] font-semibold leading-[1.02] tracking-[-0.04em]"
            style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 64' }}
          >
            {t.auth.headlineLine1}
            <br />
            {t.auth.headlineLine2}
          </h1>

          <p className="mt-4 text-sm lg:whitespace-nowrap">{t.auth.tagline}</p>

          <div className="mt-8 flex w-full max-w-[21rem] flex-col gap-2.5 rounded-3xl border border-[#E2B8FF] bg-white p-4 shadow-[0_4px_24px_rgba(31,13,44,0.06)]">
            <Button
              onClick={() => handleSignIn("google")}
              disabled={disabled}
              variant="outline"
              className={CONTROL}
            >
              {pending === "google" ? (
                <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
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
                <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
              ) : (
                <LinkedInIcon className="size-4 shrink-0" />
              )}
              {t.auth.signInWith}
            </Button>

            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="h-px flex-1 bg-[#E2B8FF]/60" />
              {t.auth.or}
              <span className="h-px flex-1 bg-[#E2B8FF]/60" />
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
                className="h-9 w-full rounded-lg border border-[#E2B8FF] bg-white px-3 text-sm outline-none transition-shadow placeholder:text-[#1F0D2C]/45 focus:ring-3 focus:ring-[#E2B8FF]/60"
              />
              <Button
                type="submit"
                className="h-9 w-full rounded-lg bg-[#1F0D2C] text-sm font-medium text-white hover:bg-[#1F0D2C]/85"
              >
                {t.auth.continueWithEmail}
              </Button>
              {emailNotice && (
                <p role="status" className="text-xs">
                  {t.auth.emailSoon}
                </p>
              )}
            </form>

            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {t.auth.signInError}
              </p>
            )}

            <p className="px-1 text-[11px] leading-snug text-[#1F0D2C]/70">
              {t.auth.legalBefore}{" "}
              <span className="cursor-pointer underline underline-offset-2 transition-colors hover:text-[#1F0D2C]">
                {t.auth.privacy}
              </span>
              .
            </p>
          </div>

          {/* Placeholder: desktop download is designed but not wired yet */}
          <button
            type="button"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-[#E2B8FF] bg-white px-3.5 text-sm font-medium shadow-[0_1px_2px_rgba(31,13,44,0.06),0_4px_8px_-4px_rgba(31,13,44,0.08)] transition-colors hover:bg-[#F6EAFF]"
          >
            <AppleIcon className="size-5" />
            {t.auth.downloadDesktop}
          </button>
        </main>
      </div>

      {/* App preview: a small window on a list of offers, cropped on the right */}
      <aside aria-hidden className="hidden items-center justify-center pr-12 lg:flex">
        <div className="relative h-[min(41rem,80vh)] w-full max-w-[33rem] overflow-hidden rounded-2xl bg-[#F6EAFF] shadow-[0_4px_24px_rgba(31,13,44,0.08)]">
          <div className="absolute left-6 top-6">
            <OffersPreview />
          </div>
        </div>
      </aside>
    </div>
  );
}
