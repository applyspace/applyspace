'use client';

import { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon,
  File01Icon,
  InformationCircleIcon,
  Loading02Icon,
  Message01Icon,
  SquareLock01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import {
  loadDocuments,
  makeDocumentPrimary,
  registerDocument,
  removeDocument,
  saveFitMessage,
} from '@/app/onboarding/actions';
import { useAuth } from '@/components/providers/Providers';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {
  CV_MAX_BYTES,
  CV_MIME_TYPES,
  DOCUMENTS_BUCKET,
  type DocumentEntry,
  type DocumentsData,
} from '@/types/candidate-profile';
import {
  IconButton,
  Notice,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  TEXTAREA_CLASS,
} from './fields';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

function cvMimeType(file: File): string | null {
  const name = file.name.toLowerCase();
  if (file.type === CV_MIME_TYPES.pdf || name.endsWith('.pdf')) return CV_MIME_TYPES.pdf;
  if (file.type === CV_MIME_TYPES.docx || name.endsWith('.docx')) return CV_MIME_TYPES.docx;
  return null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The user's documents: CVs (PDF or DOCX, kept in the private `documents`
 * Storage bucket) with a primary one, and "fit messages", pasted samples of
 * the user's own writing kept for tone of voice.
 *
 * The browser uploads the file straight to Storage (Row Level Security limits
 * it to the user's own folder), then a server action records it. Signed out,
 * or before the documents table exists, it shows a message instead.
 */
export function DocumentsPanel({ showFitMessages = true }: { showFitMessages?: boolean }) {
  const { user } = useAuth();
  const [data, setData] = useState<DocumentsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadDocuments()
      .then((loaded) => !cancelled && setData(loaded))
      .catch(() => !cancelled && setData({ status: 'unavailable' }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-stone-500">
        <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
        Loading your documents
      </div>
    );
  }
  if (data.status === 'signed-out' || !user || !isSupabaseConfigured) {
    return (
      <Notice icon={SquareLock01Icon} title="Sign in to add documents">
        Your CV and sample messages are stored privately in your Apply account. This preview is
        read-only.
      </Notice>
    );
  }
  if (data.status === 'unavailable') {
    return (
      <Notice icon={InformationCircleIcon} title="Documents are not available yet">
        We are still setting this up. Nothing is lost: come back a little later.
      </Notice>
    );
  }

  const documents = data.documents;
  const cvs = documents.filter((d) => d.kind === 'cv');
  const fitMessages = documents.filter((d) => d.kind === 'fit_message');
  const setDocuments = (next: (current: DocumentEntry[]) => DocumentEntry[]) =>
    setData({ status: 'ready', documents: next(documents) });

  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File, userId: string) {
    const mimeType = cvMimeType(file);
    if (!mimeType) return setError('Upload a PDF or a Word (.docx) file.');
    if (file.size > CV_MAX_BYTES) return setError('The file must be 10 MB or smaller.');

    return act(async () => {
      const extension = mimeType === CV_MIME_TYPES.pdf ? 'pdf' : 'docx';
      // Stored under the user's folder with an opaque name; the real name is kept in the table.
      const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const storage = createClient().storage.from(DOCUMENTS_BUCKET);
      const uploaded = await storage.upload(storagePath, file, { contentType: mimeType });
      if (uploaded.error) {
        setError('The upload did not go through. Documents may not be available yet.');
        return;
      }
      const result = await registerDocument({
        kind: 'cv',
        name: file.name,
        storagePath,
        mimeType,
        sizeBytes: file.size,
      });
      if (!result.ok) {
        // Do not leave a file nobody can see in the list.
        await storage.remove([storagePath]);
        setError(result.message);
        return;
      }
      setDocuments((current) => [result.data, ...current]);
      posthog.capture('cv_uploaded', {
        file_format: mimeType === CV_MIME_TYPES.pdf ? 'pdf' : 'docx',
        size_bucket: file.size < 1024 * 1024 ? 'under_1mb' : '1mb_to_10mb',
      });
    });
  }

  const remove = (id: string) =>
    act(async () => {
      const result = await removeDocument(id);
      if (!result.ok) return setError(result.message);
      // Deleting the primary promotes another document: reload to show it.
      const reloaded = await loadDocuments();
      if (reloaded.status === 'ready') setData(reloaded);
      else setDocuments((current) => current.filter((d) => d.id !== id));
    });

  const makePrimary = (target: DocumentEntry) =>
    act(async () => {
      const result = await makeDocumentPrimary(target.id);
      if (!result.ok) return setError(result.message);
      setDocuments((current) =>
        current.map((d) => (d.kind === target.kind ? { ...d, isPrimary: d.id === target.id } : d)),
      );
      posthog.capture('primary_cv_selected');
    });

  const addFitMessage = () =>
    act(async () => {
      const result = await saveFitMessage({ text: draft });
      if (!result.ok) return setError(result.message);
      setDocuments((current) => [result.data, ...current]);
      setDraft('');
      posthog.capture('fit_message_saved');
    });

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-[-0.01em] text-stone-950">CV</h3>
            <p className="mt-0.5 text-sm text-stone-600">PDF or Word (.docx), up to 10 MB.</p>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            tabIndex={-1}
            aria-label="Upload a CV"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file, user.id);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className={SECONDARY_BUTTON_CLASS}
          >
            <HugeiconsIcon
              icon={busy ? Loading02Icon : Upload01Icon}
              size={16}
              className={busy ? 'animate-spin' : undefined}
            />
            Upload a CV
          </button>
        </div>

        {cvs.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-stone-500">
            <HugeiconsIcon icon={File01Icon} size={18} className="shrink-0 text-stone-400" />
            No CV yet. Upload the one you send most often.
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {cvs.map((cv) => (
              <li key={cv.id} className="flex items-center gap-3 px-4 py-3">
                <HugeiconsIcon icon={File01Icon} size={18} className="shrink-0 text-stone-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-950">{cv.name}</p>
                  <p className="text-xs text-stone-500">
                    {[formatSize(cv.sizeBytes), `Added ${formatDate(cv.createdAt)}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {cv.isPrimary ? (
                  <span className="inline-flex h-7 items-center rounded-full bg-stone-100 px-2.5 text-xs font-medium text-stone-700">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => makePrimary(cv)}
                    className="inline-flex h-7 items-center rounded-full border border-stone-200 px-2.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                  >
                    Make primary
                  </button>
                )}
                <IconButton
                  icon={Delete02Icon}
                  label={`Delete ${cv.name}`}
                  onClick={() => remove(cv.id)}
                  disabled={busy}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {showFitMessages && (
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-[-0.01em] text-stone-950">Fit messages</h3>
            <p className="mt-0.5 text-sm text-stone-600">
              Paste messages you have written to recruiters or hiring managers. Apply will use them
              later to learn your tone of voice.
            </p>
          </div>
          <form
            className="flex flex-col items-start gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void addFitMessage();
            }}
          >
            <textarea
              aria-label="Sample message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Hello, I came across your Product Designer opening and..."
              className={`${TEXTAREA_CLASS} min-h-32`}
            />
            <button type="submit" disabled={busy || !draft.trim()} className={PRIMARY_BUTTON_CLASS}>
              Save message
            </button>
          </form>
          {fitMessages.length > 0 && (
            <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {fitMessages.map((message) => (
                <li key={message.id} className="flex items-start gap-3 px-4 py-3">
                  <HugeiconsIcon icon={Message01Icon} size={18} className="mt-0.5 shrink-0 text-stone-400" />
                  <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line text-sm text-stone-700">
                    {message.extractedText}
                  </p>
                  <IconButton
                    icon={Delete02Icon}
                    label="Delete this message"
                    onClick={() => remove(message.id)}
                    disabled={busy}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
