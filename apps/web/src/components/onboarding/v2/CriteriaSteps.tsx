'use client';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChoiceCard, FieldLabel, TagSearch, toggle } from '@/components/onboarding/v2/fields';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';

export const CONTRACTS = ['Permanent', 'Fixed-term', 'Freelance', 'Internship', 'Apprenticeship', 'Volunteer'];
const CURRENCIES = ['EUR', 'USD', 'GBP'];
const SIZES = ['1-10', '11-50', '51-200', '201-1,000', '1,000+'];
const LANGUAGES = ['English', 'French', 'German', 'Spanish', 'Italian', 'Portuguese'];
const SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Legaltech', 'E-commerce', 'Education', 'Mobile apps', 'AI', 'Cybersecurity', 'Climate'];

/** Contract types (multi-select) and a minimum yearly salary with its currency. */
export function ContractStep({
  contracts,
  onContracts,
  salary,
  onSalary,
  currency,
  onCurrency,
}: {
  contracts: string[];
  onContracts: (next: string[]) => void;
  salary: string;
  onSalary: (next: string) => void;
  currency: string;
  onCurrency: (next: string) => void;
}) {
  return (
    <>
      <StepHeader title="What kind of contract do you want?" subtitle="Pick the contract types you accept and your minimum yearly salary." />
      <div className="mx-auto max-w-2xl">
        <FieldLabel>Contract types</FieldLabel>
        <div className="flex flex-wrap gap-4">
          {CONTRACTS.map((c) => (
            <ChoiceCard key={c} selected={contracts.includes(c)} onClick={() => onContracts(toggle(contracts, c))}>
              {c}
            </ChoiceCard>
          ))}
        </div>
        <div className="mt-10">
          <FieldLabel>Minimum yearly salary (optional)</FieldLabel>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={salary}
              onChange={(e) => onSalary(e.target.value)}
              placeholder="40,000"
              aria-label="Minimum yearly salary"
              className="h-12 w-48 rounded-full px-5 text-base md:text-base"
            />
            <Tabs value={currency} onValueChange={onCurrency}>
              <TabsList>
                {CURRENCIES.map((c) => (
                  <TabsTrigger key={c} value={c}>
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}

/** Company size, languages and sectors. Empty means no filter. */
export function CompanyStep({
  sizes,
  onSizes,
  languages,
  onLanguages,
  sectors,
  onSectors,
}: {
  sizes: string[];
  onSizes: (next: string[]) => void;
  languages: string[];
  onLanguages: (next: string[]) => void;
  sectors: string[];
  onSectors: (next: string[]) => void;
}) {
  return (
    <>
      <StepHeader title="What kind of company suits you?" subtitle="Leave anything empty to keep every option open." />
      <div className="mx-auto max-w-2xl">
        <FieldLabel>Company size (people)</FieldLabel>
        <div className="flex flex-wrap gap-4">
          {SIZES.map((s) => (
            <ChoiceCard key={s} selected={sizes.includes(s)} onClick={() => onSizes(toggle(sizes, s))}>
              {s}
            </ChoiceCard>
          ))}
        </div>
        <div className="mt-8">
          <FieldLabel>Offer languages</FieldLabel>
          <div className="flex flex-wrap gap-4">
            {LANGUAGES.map((l) => (
              <ChoiceCard key={l} selected={languages.includes(l)} onClick={() => onLanguages(toggle(languages, l))}>
                {l}
              </ChoiceCard>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <FieldLabel>Sectors</FieldLabel>
          <TagSearch placeholder="Search a sector" suggestions={SECTORS} values={sectors} onChange={onSectors} wide />
        </div>
      </div>
    </>
  );
}
