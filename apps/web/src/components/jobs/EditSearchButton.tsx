'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, FilterHorizontalIcon } from '@hugeicons/core-free-icons';
import { TabSearchCriteria } from '@/components/settings/TabSearchCriteria';
import type { AppSettings } from '@/lib/settings';

/**
 * "Edit search" button for a search profile page: opens the search criteria
 * form in a dialog. The form saves through `/api/settings`, which writes to the
 * primary search of the default profile.
 */
export function EditSearchButton({ settings }: { settings: AppSettings }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Pick up saved criteria in the page header once the dialog closes.
        if (!next) router.refresh();
      }}
    >
      <Dialog.Trigger className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50">
        <HugeiconsIcon icon={FilterHorizontalIcon} size={14} />
        Edit search
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-white text-stone-950 shadow-[0_4px_24px_rgba(0,0,0,0.06)] outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-8 py-5">
            <div>
              <Dialog.Title className="text-base font-semibold">Edit search</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-stone-600">
                The criteria Apply uses to find offers for this search.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <TabSearchCriteria settings={settings} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
