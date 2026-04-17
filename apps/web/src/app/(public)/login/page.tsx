"use client";

import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { useLocale } from "@/components/providers/Providers";

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

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);

  function handleSignIn() {
    setLoading(true);
    router.push("/");
  }

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

        <Button
          onClick={handleSignIn}
          disabled={loading}
          className="mt-10 w-full max-w-sm text-base font-medium"
          size="lg"
        >
          {loading ? (
            <HugeiconsIcon
              icon={Loading02Icon}
              size={16}
              className="animate-spin"
            />
          ) : (
            <LinkedInIcon className="size-4 shrink-0" />
          )}
          {loading ? t.profile.syncing : t.auth.signInWith}
        </Button>

        <p className="mt-4 w-full max-w-106 text-[11px] leading-[1.7] text-muted-foreground/70">
          By clicking &ldquo;Continue with LinkedIn&rdquo;, you acknowledge that
          you have read, understood, and agree to Apply&apos;s{" "}
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
