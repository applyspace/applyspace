'use client';

import { Button } from '@/components/ui/button';
import { useHubT } from '@/lib/applicationsI18n';

export default function ApplicationsError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useHubT();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted-foreground">{t.loadError}</p>
      <Button variant="outline" onClick={reset}>
        {t.retry}
      </Button>
    </div>
  );
}
