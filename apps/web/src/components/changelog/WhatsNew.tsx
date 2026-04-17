'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, Wrench01Icon, ChartIncreaseIcon } from '@hugeicons/core-free-icons';
import { CHANGELOG, CURRENT_VERSION } from '@/lib/changelog';
import type { ItemType } from '@/lib/changelog';
import { useLocale } from '@/components/providers/Providers';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const TYPE_ICON: Record<ItemType, typeof SparklesIcon> = {
  new: SparklesIcon,
  fix: Wrench01Icon,
  improvement: ChartIncreaseIcon,
};

const TYPE_CLS: Record<ItemType, string> = {
  new: 'text-primary bg-primary/10',
  fix: 'text-orange-600 bg-orange-50',
  improvement: 'text-green-600 bg-green-50',
};

interface WhatsNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsNew({ open, onOpenChange }: WhatsNewProps) {
  const { t } = useLocale();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-96 flex-col p-0">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>{t.changelog.title}</SheetTitle>
          <SheetDescription>{t.changelog.subtitle}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {CHANGELOG.map((version, i) => (
            <div key={version.version} className={i > 0 ? 'mt-8' : ''}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  v{version.version}
                </span>
                {version.version === CURRENT_VERSION && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                    Latest
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{version.date}</span>
              </div>

              <ul className="space-y-2">
                {version.items.map((item, j) => {
                  const Icon = TYPE_ICON[item.type];
                  return (
                    <li key={j} className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md p-1 ${TYPE_CLS[item.type]}`}>
                        <HugeiconsIcon icon={Icon} size={12} />
                      </span>
                      <span className="text-sm text-muted-foreground">{item.text}</span>
                    </li>
                  );
                })}
              </ul>

              {i < CHANGELOG.length - 1 && <div className="mt-6 border-t border-border" />}
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">Apply v{CURRENT_VERSION}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
