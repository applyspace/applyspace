"use client";

import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { OffersPreview } from "@/components/auth/OffersPreview";
import { ApplyLogo } from "@/components/brand/ApplyLogo";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { useLocale } from "@/components/providers/Providers";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Provider = "google" | "linkedin_oidc";

export default function LoginPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<Provider | null>(null);
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
    <div className="grid min-h-screen bg-[#FBF8FD] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:p-3">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <ApplyLogo className="mb-12 h-7 w-auto text-foreground" />

          <h1 className="font-serif text-[2.6rem] leading-[1.1] tracking-[-0.02em]">
            <span className="text-foreground/45">{t.auth.headlineLine1}</span>
            <br />
            <span className="text-foreground">{t.auth.headlineLine2}</span>
          </h1>

          <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
            {t.auth.tagline}
          </p>

          <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-[#E9DDF5] bg-white p-5 shadow-[0_8px_30px_-12px_rgba(107,63,160,0.2)]">
            <Button
              onClick={() => handleSignIn("google")}
              disabled={disabled}
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-[10px] border-[#E2D4F0] bg-white text-base font-medium hover:bg-[#F7EFFD]"
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
              size="lg"
              className="h-12 w-full rounded-[10px] border-[#E2D4F0] bg-white text-base font-medium hover:bg-[#F7EFFD]"
            >
              {pending === "linkedin_oidc" ? (
                <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
              ) : (
                <LinkedInIcon className="size-4 shrink-0" />
              )}
              {t.auth.signInWith}
            </Button>

            {failed && (
              <p role="alert" className="text-sm text-destructive">
                {t.auth.signInError}
              </p>
            )}
          </div>

          <p className="mt-6 text-xs leading-[1.7] text-muted-foreground/80">
            {t.auth.legalBefore}{" "}
            <span className="cursor-pointer underline underline-offset-2 transition-colors hover:text-foreground">
              {t.auth.terms}
            </span>{" "}
            {t.auth.legalAnd}{" "}
            <span className="cursor-pointer underline underline-offset-2 transition-colors hover:text-foreground">
              {t.auth.privacy}
            </span>
            .
          </p>
        </div>
      </main>

      {/* App preview: a list of offers, cropped by the panel */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden rounded-[28px] bg-gradient-to-br from-[#E2B8FF] via-[#D9A8FF] to-[#B98CFF] lg:block"
      >
        <div className="absolute left-20 top-24">
          <OffersPreview />
        </div>
      </aside>
    </div>
  );
}
