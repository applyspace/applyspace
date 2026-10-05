"use client";

import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { useLocale } from "@/components/providers/Providers";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const TargetIcon = () => (
  <svg className="size-8" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
    <line
      x1="16"
      y1="3"
      x2="16"
      y2="8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="24"
      x2="16"
      y2="29"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="3"
      y1="16"
      x2="8"
      y2="16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="24"
      y1="16"
      x2="29"
      y2="16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" />
  </svg>
);

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-8 text-primary">
          <TargetIcon />
        </div>

        <h1 className="text-4xl font-semibold tracking-[-0.03em]">
          <span className="text-muted-foreground/60">
            {t.auth.headlineLine1}
          </span>
          <br />
          <span className="text-foreground">{t.auth.headlineLine2}</span>
        </h1>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <Button
            onClick={() => handleSignIn("google")}
            disabled={disabled}
            variant="outline"
            className="w-full text-base font-medium"
            size="lg"
          >
            {pending === "google" ? (
              <HugeiconsIcon
                icon={Loading02Icon}
                size={16}
                className="animate-spin"
              />
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
              <HugeiconsIcon
                icon={Loading02Icon}
                size={16}
                className="animate-spin"
              />
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

        <p className="mt-4 w-full max-w-106 text-[11px] leading-[1.7] text-muted-foreground/70">
          By continuing, you acknowledge that you have read, understood, and
          agree to Apply&apos;s{" "}
          <span className="cursor-pointer text-muted-foreground underline underline-offset-2 hover:text-primary transition-colors">
            Terms &amp; Conditions
          </span>{" "}
          and{" "}
          <span className="cursor-pointer text-muted-foreground underline underline-offset-2 hover:text-primary transition-colors">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
