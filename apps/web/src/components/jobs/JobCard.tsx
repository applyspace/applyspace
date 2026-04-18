"use client";

import { Check } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Money01Icon,
  Building06Icon,
  HomeWifiIcon,
  Globe02Icon,
  Location06Icon,
  ContractsIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { LevelIndicator } from "@/components/jobs/LevelIndicator";
import { cn, parseWorkMode, parseLocation } from "@/lib/utils";
import { SECTORS, SECTOR_MAP } from "@/lib/sectors";
import { formatSalaryLabel } from "@/lib/utils";
import type { OfferWithRelations } from "@/types/offers";
import type { JobStatus } from "@/components/jobs/JobTable";

interface JobCardProps {
  offer: OfferWithRelations;
  status: JobStatus;
  onSelect: (offer: OfferWithRelations) => void;
  onDecline: (id: string) => void;
  onApply: (id: string) => void;
}

/* ── Work mode ──────────────────────────────────────────────────────────── */
type WorkMode = "onsite" | "hybrid" | "remote";

const WORK_MODE_CONFIG: Record<
  WorkMode,
  { icon: typeof Building06Icon; label: string; className: string }
> = {
  onsite: {
    icon: Building06Icon,
    label: "On-Site",
    className: "text-blue-400",
  },
  hybrid: { icon: HomeWifiIcon, label: "Hybrid", className: "text-purple-400" },
  remote: { icon: Globe02Icon, label: "Remote", className: "text-emerald-400" },
};

const FAKE_WORK_MODES: WorkMode[][] = [
  ["onsite"],
  ["hybrid"],
  ["remote"],
  ["onsite", "hybrid"],
  ["hybrid", "remote"],
  ["onsite"],
  ["hybrid"],
  ["remote"],
  ["onsite", "hybrid"],
];

/* ── Sectors ────────────────────────────────────────────────────────────── */
const SECTOR_OPTIONS = SECTORS.map((s) => s.key);

/* ── Experience levels ──────────────────────────────────────────────────── */
const LEVEL_OPTIONS = [
  "Junior",
  "Confirmed",
  "Senior",
  "Lead",
  "Manager",
  "Founding",
] as const;
type LevelName = (typeof LEVEL_OPTIONS)[number];

/* ── Fake data ──────────────────────────────────────────────────────────── */
const FAKE_SIZES = ["2–10", "11–50", "51–200", "201–500", "500–1k", "1k+"];
const FAKE_SALARIES: (string | null)[] = [
  null,
  null,
  "35–45K",
  "40–55K",
  "45–60K",
  "55–75K",
  "70–90K",
  "80–100K+",
];
const FAKE_CONTRACTS = [
  "Permanent",
  "Permanent",
  "Permanent",
  "Fixed-term",
  "Freelance",
  "Internship",
];
const FAKE_DATES = [
  "Today",
  "Yesterday",
  "2d ago",
  "3d ago",
  "5d ago",
  "1w ago",
  "2w ago",
];

const AVATAR_SEEDS = [
  "Felix",
  "Mia",
  "Leo",
  "Sara",
  "Max",
  "Nina",
  "Tom",
  "Zoe",
  "Kim",
  "Alex",
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function pick<T>(arr: readonly T[], seed: string, offset = 0): T {
  let hash = offset;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return arr[Math.abs(hash) % arr.length];
}
function pickInt(max: number, seed: string, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return Math.abs(hash) % (max + 1);
}

/* ── Contract translations ──────────────────────────────────────────────── */
const CONTRACT_EN: Record<string, string> = {
  CDI: "Permanent",
  CDD: "Fixed-term",
  "Full-Time": "Permanent",
  "Part-Time": "Fixed-term",
  Freelance: "Freelance",
  Internship: "Internship",
  Stage: "Internship",
  Alternance: "Apprenticeship",
  Apprentissage: "Apprenticeship",
  Bénévolat: "Volunteering",
  Benevolat: "Volunteering",
};
function toEnContract(raw: string) {
  return CONTRACT_EN[raw] ?? raw;
}

/* ── Contract icon color ────────────────────────────────────────────────── */
const CONTRACT_COLOR: Record<string, string> = {
  Permanent: "text-blue-400",
  "Fixed-term": "text-sky-400",
  Freelance: "text-violet-400",
  Internship: "text-amber-400",
  Apprenticeship: "text-orange-400",
  Volunteering: "text-green-400",
};

/* ── Component ──────────────────────────────────────────────────────────── */
export function JobCard({ offer, status, onSelect }: JobCardProps) {
  const companyName = offer.company.name;
  // Prefer the offer's declared remoteMode; fall back to parsing the location.
  const realMode: WorkMode | null =
    (offer.remoteMode as WorkMode | null) ?? parseWorkMode(offer.location);
  const cleanLocation = parseLocation(offer.location);
  const initials = companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const level = pick(LEVEL_OPTIONS, offer.id, 0) as LevelName;
  const sectorKey = pick(SECTOR_OPTIONS, offer.id, 1);
  const sector = SECTOR_MAP.get(sectorKey)!;
  const teamSize = pick(FAKE_SIZES, offer.id, 2);

  const realSalary = formatSalaryLabel(
    offer.salaryMinEur,
    offer.salaryMaxEur,
    offer.salaryRaw,
  );
  const fakeSalary = realSalary ?? pick(FAKE_SALARIES, offer.id, 4);

  const contract = toEnContract(
    offer.contract ?? pick(FAKE_CONTRACTS, offer.id, 5),
  );
  const postedAt = offer.postedAt ?? pick(FAKE_DATES, offer.id, 6);
  const connCount = pickInt(2, offer.id, 7);
  const workModes: WorkMode[] = realMode
    ? [realMode]
    : pick(FAKE_WORK_MODES, offer.id, 9);

  const avatarUrls = Array.from({ length: connCount }, (_, i) => {
    const seed = pick(AVATAR_SEEDS, offer.id, 8 + i);
    return `https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  });

  const isApplied = status === "applied";
  const contractColor = CONTRACT_COLOR[contract] ?? "text-zinc-400";
  const primaryMode = workModes[0];
  const modeConfig = WORK_MODE_CONFIG[primaryMode];

  const descSnippet = (() => {
    if (!offer.description) return null;
    return offer.description
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(
        /^(à propos de l[''\u2019]offre d[''\u2019]emploi|about the job|job description|description du poste)[:\s]*/i,
        "",
      )
      .trim();
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(offer)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(offer)}
      className={cn(
        "flex cursor-pointer gap-6 rounded-2xl border border-border/50 bg-card px-7 py-6",
        "transition-colors hover:border-border hover:bg-zinc-50/40",
        isApplied && "border-l-[3px] border-l-emerald-400",
      )}
    >
      {/* ── Logo ───────────────────────────────────────────────── */}
      <div className="mt-0.5 flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-zinc-100 text-base font-bold text-zinc-600">
        {initials}
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-3">
        <div className="mt-1 flex shrink-0 flex-col gap-1">
          {/* Row 1: Company name + date + applied indicator */}
          <div className="flex items-center gap-1.5">
            <span className="text-m font-semibold leading-tight text-foreground">
              {companyName}
            </span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              {postedAt}
              {isApplied && (
                <span className="ml-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check className="size-3.5" /> Applied
                </span>
              )}
            </span>
          </div>

          {/* Row 2: Description — single line truncated */}
          {descSnippet && (
            <p className="max-w-120 truncate text-sm leading-relaxed text-muted-foreground">
              {descSnippet}
            </p>
          )}
        </div>

        {/* Row 3: Sector + team size + location + connection avatars */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sector badge */}
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 rounded-lg px-1.5 py-0 text-[11px] font-medium",
              sector.colors,
            )}
          >
            <HugeiconsIcon icon={sector.icon} size={10} className="shrink-0" />
            {sector.label}
          </Badge>

          {/* Team size */}
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <HugeiconsIcon
              icon={UserMultipleIcon}
              size={14}
              className="shrink-0 text-zinc-400"
            />
            {teamSize}
          </span>

          {/* Connection avatars */}
          {connCount > 0 && (
            <div className="flex -space-x-2">
              {avatarUrls.map((url, i) => (
                <div
                  key={i}
                  className="size-5 overflow-hidden rounded-full border-2 border-white bg-zinc-100 ring-1 ring-border/30"
                >
                  <Image
                    src={url}
                    alt="connection"
                    width={20}
                    height={20}
                    className="size-full object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}

          {/* Location */}
          {cleanLocation && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <HugeiconsIcon
                icon={Location06Icon}
                size={14}
                className="shrink-0 text-zinc-400"
              />
              {cleanLocation}
            </span>
          )}
        </div>
      </div>

      {/* ── Stat tiles ─────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-between">
        {/* Contract */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <HugeiconsIcon
            icon={ContractsIcon}
            size={24}
            className={contractColor}
          />
          <span className="text-xs font-medium text-foreground">
            {contract}
          </span>
        </div>

        {/* Level */}
        <LevelIndicator level={level} className="flex-1" />

        {/* Salary */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <HugeiconsIcon
            icon={Money01Icon}
            size={24}
            className={fakeSalary ? "text-emerald-400" : "text-zinc-200"}
          />
          <span
            className={cn(
              "text-xs font-medium",
              fakeSalary ? "text-foreground" : "text-zinc-300",
            )}
          >
            {fakeSalary ?? "—"}
          </span>
        </div>

        {/* Work mode */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <HugeiconsIcon
            icon={modeConfig.icon}
            size={24}
            className={modeConfig.className}
          />
          <span className="text-xs font-medium text-foreground">
            {modeConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}
