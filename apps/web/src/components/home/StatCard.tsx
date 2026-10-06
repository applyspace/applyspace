import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { HomeCard, HomeCardLabel } from './HomeCard';

export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: IconSvgElement;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <HomeCard>
      <HomeCardLabel icon={<HugeiconsIcon icon={icon} size={16} />}>{label}</HomeCardLabel>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-stone-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </HomeCard>
  );
}
