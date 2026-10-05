"use client";

import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Soft glow in the brand lilac */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-[40rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgb(226_184_255/0.45),transparent)]"
      />

      <main className="relative flex w-full max-w-md flex-col items-center text-center">
        <ApplyLogo className="mb-10 h-9 w-auto text-foreground" />

        <h1 className="text-4xl font-semibold tracking-[-0.03em]">
          <span className="text-muted-foreground/60">{t.auth.headlineLine1}</span>
          <br />
          <span className="text-foreground">{t.auth.headlineLine2}</span>
        </h1>

        <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground">
          {t.auth.tagline}
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <Button
            onClick={() => handleSignIn("google")}
            disabled={disabled}
            variant="outline"
            className="w-full bg-background text-base font-medium"
            size="lg"
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
            className="w-full text-base font-medium"
            size="lg"
          >
            {pending === "linkedin_oidc" ? (
              <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
            ) : (
              <LinkedInIcon className="size-4 shrink-0" />
            )}
            {t.auth.signInWith}
          </Button>
        </div>

        {failed && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t.auth.signInError}
          </p>
        )}

        <p className="mt-6 w-full max-w-sm text-[11px] leading-[1.7] text-muted-foreground/70">
          {t.auth.legalBefore}{" "}
          <span className="cursor-pointer text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary">
            {t.auth.terms}
          </span>{" "}
          {t.auth.legalAnd}{" "}
          <span className="cursor-pointer text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary">
            {t.auth.privacy}
          </span>
          .
        </p>
      </main>
    </div>
  );
}
