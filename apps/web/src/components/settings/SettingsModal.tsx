'use client';

import { Fragment } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Briefcase01Icon,
  Cancel01Icon,
  CreditCardIcon,
  Files01Icon,
  Plug01Icon,
  SecurityLockIcon,
  Settings01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { DocumentsPanel } from '@/components/profile/DocumentsPanel';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { useSettingsModal } from '@/components/settings/SettingsModalProvider';
import type { SettingsSection } from '@/lib/settingsSections';
import {
  AccountSection,
  BillingSection,
  ConnectorsSection,
  GeneralSection,
  PrivacySection,
} from '@/components/settings/SettingsSections';
import { cn } from '@/lib/utils';

interface SectionMeta {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Settings01Icon;
}

/** Sections in display order; a divider separates each group. */
const SECTION_GROUPS: SectionMeta[][] = [
  [
    {
      id: 'general',
      label: 'General',
      description: 'Language and appearance.',
      icon: Settings01Icon,
    },
    {
      id: 'account',
      label: 'Account',
      description: 'Your name, email and how you sign in.',
      icon: UserCircleIcon,
    },
    {
      id: 'privacy',
      label: 'Privacy',
      description: 'How Apply handles your data.',
      icon: SecurityLockIcon,
    },
    {
      id: 'billing',
      label: 'Billing',
      description: 'Your plan and what it includes.',
      icon: CreditCardIcon,
    },
  ],
  [
    {
      id: 'profile',
      label: 'Profile',
      description: 'Your experience, education and skills, used to match you with offers.',
      icon: Briefcase01Icon,
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Your CV and the fit messages that set your tone of voice.',
      icon: Files01Icon,
    },
  ],
  [
    {
      id: 'connectors',
      label: 'Connectors',
      description: 'Connect the job boards Apply searches for you.',
      icon: Plug01Icon,
    },
  ],
];

const SECTIONS = SECTION_GROUPS.flat();

interface SettingsModalProps {
  firstName: string;
  lastName: string;
  statuses: Record<string, boolean>;
}

export function SettingsModal({ firstName, lastName, statuses }: SettingsModalProps) {
  const { section, openSettings, closeSettings } = useSettingsModal();
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  return (
    <Dialog.Root
      open={section !== null}
      onOpenChange={(open) => {
        if (!open) closeSettings();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex h-[min(42rem,calc(100dvh-2rem))] w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-white text-stone-950 shadow-[0_4px_24px_rgba(0,0,0,0.06)] outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 md:flex-row">
          {/* Section nav */}
          <nav
            aria-label="Settings sections"
            className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-stone-200 bg-stone-50 p-3 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
          >
            <Dialog.Title className="hidden px-2.5 pb-3 pt-1.5 text-sm font-semibold md:block">
              Settings
            </Dialog.Title>
            {SECTION_GROUPS.map((group, i) => (
              <Fragment key={group[0].id}>
                {i > 0 && (
                  <div
                    role="separator"
                    className="mx-1 w-px shrink-0 bg-stone-200 md:mx-2.5 md:my-2 md:h-px md:w-auto"
                  />
                )}
                {group.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-current={s.id === active.id ? 'page' : undefined}
                    onClick={() => openSettings(s.id)}
                    className={cn(
                      'flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors',
                      s.id === active.id
                        ? 'bg-stone-200/70 font-medium text-stone-950'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950',
                    )}
                  >
                    <HugeiconsIcon icon={s.icon} size={16} className="shrink-0" />
                    {s.label}
                  </button>
                ))}
              </Fragment>
            ))}
          </nav>

          {/* Content pane */}
          <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-10">
            <Dialog.Close
              aria-label="Close settings"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </Dialog.Close>

            <header className="mb-8 pr-10">
              <h2
                className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em]"
                style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 64' }}
              >
                {active.label}
              </h2>
              <Dialog.Description className="mt-2 text-sm text-stone-600">
                {active.description}
              </Dialog.Description>
            </header>

            {active.id === 'general' && <GeneralSection />}
            {active.id === 'account' && (
              <AccountSection firstName={firstName} lastName={lastName} />
            )}
            {active.id === 'privacy' && <PrivacySection />}
            {active.id === 'billing' && <BillingSection />}
            {active.id === 'profile' && <ProfileEditor />}
            {active.id === 'documents' && <DocumentsPanel />}
            {active.id === 'connectors' && <ConnectorsSection statuses={statuses} />}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
