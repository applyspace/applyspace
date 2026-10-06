'use client';

import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, File01Icon, Linkedin01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type Source = 'cv' | 'linkedin';

const COPY: Record<Source, { title: string; hint: string }> = {
  cv: { title: 'Upload your CV', hint: 'PDF or DOCX, up to 3 MB' },
  linkedin: { title: 'Upload your LinkedIn PDF', hint: 'PDF, up to 3 MB' },
};

/**
 * Onboarding import step: a CV / LinkedIn switch above a Luma upload card.
 * The LinkedIn export tip is rendered below the card so nothing above it moves.
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
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
        <TabsList>
          <TabsTrigger value="cv">
            <HugeiconsIcon icon={File01Icon} strokeWidth={1.8} />
            CV
          </TabsTrigger>
          <TabsTrigger value="linkedin">
            <HugeiconsIcon icon={Linkedin01Icon} strokeWidth={1.8} />
            LinkedIn profile
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>File upload</CardTitle>
          <CardDescription>Drag and drop or browse</CardDescription>
        </CardHeader>
        <CardContent>
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
              'flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border px-6 py-10 text-center transition-colors',
              dragging && 'border-foreground bg-muted',
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
              <HugeiconsIcon icon={CloudUploadIcon} size={22} strokeWidth={1.8} />
            </span>
            <div className="space-y-1">
              <p className="text-base font-medium">{file ? file.name : copy.title}</p>
              <p className="text-sm text-muted-foreground">{file ? 'Ready to import' : copy.hint}</p>
            </div>
            <input
              ref={input}
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <Button size="lg" onClick={() => input.current?.click()}>
              {file ? 'Choose another file' : 'Browse files'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {source === 'linkedin' && (
        <div className="w-full rounded-3xl bg-muted px-5 py-4 text-sm text-foreground">
          <p className="font-medium">Export your LinkedIn profile in 3 steps</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Open your profile on LinkedIn.</li>
            <li>Choose More, then Save to PDF.</li>
            <li>Upload the PDF in the card above.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
