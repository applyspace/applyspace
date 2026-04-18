import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ContractsIcon,
  UserFullViewIcon,
  Money01Icon,
  UserMultipleIcon,
  Location06Icon,
  HomeWifiIcon,
  FilterHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { readOffers } from "@/lib/offers";
import { readSettings } from "@/lib/settings";
import { JobTable } from "@/components/jobs/JobTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTRACT_EN: Record<string, string> = {
  CDI: "Permanent",
  CDD: "Fixed-term",
  "Full-Time": "Permanent",
  "Part-Time": "Fixed-term",
  Freelance: "Freelance",
  Internship: "Internship",
  Stage: "Internship",
  Alternance: "Apprenticeship",
  Bénévolat: "Volunteering",
  Benevolat: "Volunteering",
};

const LEVEL_EN: Record<string, string> = {
  Débutant: "Junior",
  Confirmé: "Confirmed",
  Sénior: "Senior",
  Junior: "Junior",
  Confirmed: "Confirmed",
  Senior: "Senior",
  Lead: "Lead",
  Manager: "Manager",
  Founding: "Founding",
};

const REMOTE_EN: Record<string, string> = {
  Télétravail: "Remote",
  Teletravail: "Remote",
  Hybride: "Hybrid",
  Présentiel: "On-site",
  Presentiel: "On-site",
  Remote: "Remote",
  Hybrid: "Hybrid",
  "On-site": "On-site",
  "On-Site": "On-site",
};

function toEn(map: Record<string, string>) {
  return (raw: string) => map[raw] ?? raw;
}

/** Merge selected size ranges into a single "> min" label. */
function mergeCompanySizes(sizes: string[]): string | null {
  if (!sizes.length) return null;
  let min = Infinity;
  for (const s of sizes) {
    const lower = s.startsWith(">")
      ? parseInt(s.slice(1))
      : parseInt(s.split("-")[0]);
    min = Math.min(min, isNaN(lower) ? 0 : lower);
  }
  return min === 0 ? "< 15" : `> ${min}`;
}

export default async function OffersPage() {
  const [offers, settings] = await Promise.all([readOffers(), readSettings()]);

  const salaryLabel = (() => {
    const { salaryMin, salaryMax } = settings;
    if (salaryMin === null && salaryMax === null) return null;
    const min = salaryMin ?? 0;
    if (!salaryMax || salaryMax >= 120) return `${min}k+`;
    return `${min}k – ${salaryMax}k`;
  })();

  const contracts = [...new Set(settings.contractTypes.map(toEn(CONTRACT_EN)))];
  const levels = [...new Set(settings.experienceLevels.map(toEn(LEVEL_EN)))];
  const remotePref = [
    ...new Set(settings.remotePreference.map(toEn(REMOTE_EN))),
  ];
  const sizeLabel = mergeCompanySizes(settings.companySizes);

  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10">
        {/* Layer 1 — blur fading out toward the bottom via mask */}
        <div
          className="pointer-events-none absolute inset-0 backdrop-blur-lg"
          style={{
            maskImage:
              "linear-gradient(to bottom, black 48%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 48%, transparent 100%)",
          }}
        />
        {/* Layer 2 — solid bg fading to transparent */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--background) 48%, transparent 100%)",
          }}
        />

        {/* Content */}
        <div className="relative px-20 py-12">
          <div className="flex items-start justify-between gap-8">
            <div className="flex flex-col gap-2">
              {/* Title + count */}
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {settings.searchTitles.join(", ") || "Offers"}
                </h1>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {offers.length}
                </span>
              </div>

              {/* Row 1: contracts · experience · salary */}
              {(contracts.length > 0 || levels.length > 0 || salaryLabel) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {contracts.length > 0 && (
                    <CriteriaRow
                      icon={ContractsIcon}
                      label={contracts.join(", ")}
                    />
                  )}
                  {levels.length > 0 && (
                    <CriteriaRow
                      icon={UserFullViewIcon}
                      label={levels.join(", ")}
                    />
                  )}
                  {salaryLabel && (
                    <CriteriaRow icon={Money01Icon} label={salaryLabel} />
                  )}
                </div>
              )}

              {/* Row 2: company size · location · remote */}
              {(sizeLabel ||
                settings.searchLocation ||
                remotePref.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {sizeLabel && (
                    <CriteriaRow icon={UserMultipleIcon} label={sizeLabel} />
                  )}
                  {settings.searchLocation && (
                    <CriteriaRow
                      icon={Location06Icon}
                      label={settings.searchLocation}
                    />
                  )}
                  {remotePref.length > 0 && (
                    <CriteriaRow
                      icon={HomeWifiIcon}
                      label={remotePref.join(", ")}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Edit button */}
            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-0.5 shrink-0 gap-1.5 text-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={FilterHorizontalIcon} size={14} />
              Edit criteria
            </Link>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="px-12 pb-16">
        <JobTable offers={offers} />
      </div>
    </div>
  );
}

function CriteriaRow({
  icon,
  label,
}: {
  icon: typeof ContractsIcon;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <HugeiconsIcon icon={icon} size={14} className="shrink-0" />
      {label}
    </span>
  );
}
