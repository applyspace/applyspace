'use client';

import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BulbIcon, CloudUploadIcon, File01Icon } from '@hugeicons/core-free-icons';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SEGMENT_GROUP, SEGMENT_ITEM } from '@/components/onboarding/v2/fields';
import { cn } from '@/lib/utils';

type Source = 'cv' | 'linkedin';

const COPY: Record<Source, { title: string; hint: string }> = {
  cv: { title: 'Upload your resume', hint: 'PDF or DOCX, up to 3 MB' },
  linkedin: { title: 'Upload your LinkedIn PDF', hint: 'PDF, up to 3 MB' },
};

/**
 * Onboarding import step: a Resume / LinkedIn Profile switch above a dashed upload zone.
 * The LinkedIn export tip is rendered below the zone so nothing above it moves.
 */
export function ImportDropzone({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const [source, setSource] = useState<Source>('cv');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const copy = COPY[source];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      <ToggleGroup spacing={1} className={SEGMENT_GROUP} value={[source]} onValueChange={(v) => v[0] && setSource(v[0] as Source)} aria-label="Import source">
        <ToggleGroupItem value="cv" className={cn(SEGMENT_ITEM, 'h-12 gap-2.5 px-6 text-base')}>
          <HugeiconsIcon icon={File01Icon} size={20} strokeWidth={1.8} />
          Resume
        </ToggleGroupItem>
        <ToggleGroupItem value="linkedin" className={cn(SEGMENT_ITEM, 'h-12 gap-2.5 px-6 text-base')}>
          <LinkedInIcon className="size-5 text-[#0A66C2]" />
          LinkedIn Profile
        </ToggleGroupItem>
      </ToggleGroup>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files[0] ?? null);
        }}
        className={cn(
          'flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card px-6 py-8 text-center transition-colors',
          dragging && 'border-foreground bg-muted',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-foreground">
          <HugeiconsIcon icon={CloudUploadIcon} size={24} strokeWidth={1.8} />
        </span>
        <div className="space-y-1">
          <p className="text-base font-medium">{file ? file.name : copy.title}</p>
          <p className="text-sm text-muted-foreground">{file ? 'Ready to import' : copy.hint}</p>
        </div>
        <input ref={input} type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <Button size="lg" onClick={() => input.current?.click()}>
          {file ? 'Choose another file' : 'Browse files'}
        </Button>
      </div>

      {source === 'linkedin' && (
        <div className="flex w-full items-start gap-3 rounded-3xl bg-blue-50 px-5 py-3 text-sm text-blue-900">
          <HugeiconsIcon icon={BulbIcon} size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="font-medium">Export your LinkedIn profile as a PDF</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-blue-800">
              <li>
                Go to{' '}
                <a href="https://www.linkedin.com/in/me/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-900 underline underline-offset-2">
                  your profile on LinkedIn
                </a>
                .
              </li>
              <li>Click More (or Resources) under your name, then Save to PDF.</li>
              <li>Drop the downloaded PDF in the box above.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
