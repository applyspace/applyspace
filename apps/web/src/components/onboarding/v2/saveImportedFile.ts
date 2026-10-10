import { registerDocument } from '@/app/(app)/onboarding/actions';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { CV_MAX_BYTES, CV_MIME_TYPES, DOCUMENTS_BUCKET } from '@apply/core/candidate-profile';

export type ImportedFileResult =
  | { ok: true; documentId: string }
  | { ok: false; reason: 'unsupported' | 'too-large' | 'signed-out' | 'upload' | 'register' };

/** PDF or Word (.docx), by MIME type or extension. Anything else is not stored. */
export function importedFileMimeType(file: File): string | null {
  const name = file.name.toLowerCase();
  if (file.type === CV_MIME_TYPES.pdf || name.endsWith('.pdf')) return CV_MIME_TYPES.pdf;
  if (file.type === CV_MIME_TYPES.docx || name.endsWith('.docx')) return CV_MIME_TYPES.docx;
  return null;
}

/**
 * Attaches the resume picked in the import step to the signed-in account: the
 * browser uploads it to the user's folder in Storage, then the server records it
 * as a CV (same path as the Documents panel). A failure never blocks onboarding.
 */
export async function saveImportedFile(file: File): Promise<ImportedFileResult> {
  const mimeType = importedFileMimeType(file);
  if (!mimeType) return { ok: false, reason: 'unsupported' };
  if (file.size > CV_MAX_BYTES) return { ok: false, reason: 'too-large' };
  if (!isSupabaseConfigured) return { ok: false, reason: 'signed-out' };

  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, reason: 'signed-out' };

  const extension = mimeType === CV_MIME_TYPES.pdf ? 'pdf' : 'docx';
  const storagePath = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
  const storage = supabase.storage.from(DOCUMENTS_BUCKET);
  const uploaded = await storage.upload(storagePath, file, { contentType: mimeType });
  if (uploaded.error) return { ok: false, reason: 'upload' };

  const result = await registerDocument({ kind: 'cv', name: file.name, storagePath, mimeType, sizeBytes: file.size });
  if (!result.ok) {
    await storage.remove([storagePath]);
    return { ok: false, reason: 'register' };
  }
  return { ok: true, documentId: result.data.id };
}
