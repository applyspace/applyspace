'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare01Icon, ArrowRight01Icon, Building06Icon, ShuffleIcon, Wifi01Icon, Location06Icon, Money01Icon } from '@hugeicons/core-free-icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buttonVariants } from '@/components/ui/button';
import { cn, parseWorkMode, parseLocation } from '@/lib/utils';
import type { Job } from '@/types/jobs';

interface JobDetailProps {
  job: Job | null;
  onClose: () => void;
  onApply: (id: string) => void;
}

const WORK_MODE_CONFIG = {
  hybrid:  { icon: ShuffleIcon,    label: 'Hybrid',   cls: 'text-slate-500'  },
  onsite:  { icon: Building06Icon, label: 'On-Site',  cls: 'text-zinc-500'   },
  remote:  { icon: Wifi01Icon,     label: 'Remote',   cls: 'text-sky-500'    },
} as const;

export function JobDetail({ job, onClose, onApply }: JobDetailProps) {
  const workMode = job ? parseWorkMode(job.location) : null;
  const cleanLocation = job ? parseLocation(job.location) : '';
  const initials = job
    ? job.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '';

  return (
    <Sheet open={job !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" showCloseButton className="flex flex-col p-0 sm:max-w-lg">
        {job && (
          <>
            <SheetHeader className="flex flex-row items-start gap-3 border-b px-6 py-5">
              <Avatar size="lg" className="mt-0.5 shrink-0">
                <AvatarFallback className="bg-zinc-100 text-zinc-600 text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pr-8">
                <SheetTitle className="text-base font-semibold leading-snug">
                  {job.title}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-sm font-medium text-muted-foreground">
                  {job.company}
                </SheetDescription>
              </div>
            </SheetHeader>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 px-6 py-4">
              {job.contract && (
                <Badge variant="outline" className="rounded-full text-xs">
                  {job.contract}
                </Badge>
              )}
              {workMode && (() => {
                const { icon, label, cls } = WORK_MODE_CONFIG[workMode];
                return (
                  <span className={cn('flex items-center gap-1 text-xs font-medium', cls)}>
                    <HugeiconsIcon icon={icon} size={14} />
                    {label}
                  </span>
                );
              })()}
              {cleanLocation && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <HugeiconsIcon icon={Location06Icon} size={14} />
                  {cleanLocation}
                </span>
              )}
              {job.salary && (
                <Badge className="rounded-full border border-green-200 bg-green-50 text-xs text-green-700">
                  <HugeiconsIcon icon={Money01Icon} size={12} />
                  {job.salary}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Description */}
            <ScrollArea className="flex-1 px-6">
              <p className="py-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {job.description || 'Aucune description disponible.'}
              </p>
            </ScrollArea>

            <Separator />

            <SheetFooter className="flex gap-2 px-6 py-4">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 gap-2')}
              >
                View offer
                <HugeiconsIcon icon={LinkSquare01Icon} size={14} />
              </a>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onApply(job.id)}
                className={cn(buttonVariants({ variant: 'default' }), 'flex-1 gap-2')}
              >
                Apply
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </a>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
