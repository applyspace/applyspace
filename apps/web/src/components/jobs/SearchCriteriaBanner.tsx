import { HugeiconsIcon } from '@hugeicons/react';
import { Target02Icon, Location06Icon, Money01Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AppSettings } from '@/lib/settings';

interface SearchCriteriaBannerProps {
  settings: AppSettings;
}

export function SearchCriteriaBanner({ settings }: SearchCriteriaBannerProps) {
  const hasRoles    = settings.searchTitles.length > 0;
  const hasLocation = !!settings.searchLocation;

  if (!hasRoles && !hasLocation) return null;

  const hasSalary = settings.salaryMin !== null || settings.salaryMax !== null;
  const salaryLabel = (() => {
    if (!hasSalary) return null;
    const min = settings.salaryMin ?? 0;
    const max = settings.salaryMax;
    if (!max || max >= 120) return `${min}k+`;
    return `${min}k – ${max}k`;
  })();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      {/* Roles */}
      {hasRoles && (
        <div className="flex items-center gap-2.5">
          <HugeiconsIcon icon={Target02Icon} size={16} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap gap-1.5">
            {settings.searchTitles.map((title) => (
              <Badge key={title}>{title}</Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {/* Location */}
        {hasLocation && (
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Location06Icon} size={14} className="shrink-0" />
            {settings.searchLocation}
          </span>
        )}

        {/* Contracts */}
        {settings.contractTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {settings.contractTypes.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
          </div>
        )}

        {/* Work modes */}
        {settings.remotePreference.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {settings.remotePreference.map((r) => (
              <Badge key={r} variant="outline">{r}</Badge>
            ))}
          </div>
        )}

        {/* Salary */}
        {salaryLabel && (
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Money01Icon} size={14} className="shrink-0" />
            {salaryLabel}
          </span>
        )}
      </div>
    </div>
  );
}
