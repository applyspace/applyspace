import { extractDocxText } from './docx';
import { extractPdfText } from './pdf';

/**
 * Resume file to clean text (APP-107). Works on bytes only, so the same code
 * runs on the server (documents downloaded from Storage) and in the browser.
 * The file type comes from the content, not from the name.
 */

export const EXTRACT_MAX_BYTES = 10 * 1024 * 1024;

export type ExtractFailure =
  /** Password protected PDF. */
  | 'encrypted'
  /** Image-only PDF: needs OCR, not supported yet. */
  | 'scanned'
  /** No text at all. */
  | 'empty'
  /** Text present but not decodable (custom font encodings). */
  | 'unreadable'
  | 'corrupt'
  | 'too-large'
  /** Legacy .doc, images, anything that is not a PDF or a .docx. */
  | 'unsupported-format';

export type ExtractResult =
  | { ok: true; format: 'pdf' | 'docx'; text: string; pages?: number; truncated: boolean }
  | { ok: false; reason: ExtractFailure };

const MAX_TEXT_CHARS = 100_000;

export async function extractResumeText(file: Uint8Array): Promise<ExtractResult> {
  if (file.length > EXTRACT_MAX_BYTES) return { ok: false, reason: 'too-large' };
  const head = String.fromCharCode(...file.subarray(0, 8));

  if (head.startsWith('%PDF-') || new TextDecoder('latin1').decode(file.subarray(0, 1024)).includes('%PDF-')) {
    const pdf = await extractPdfText(file);
    if (!pdf.ok) return pdf;
    return { ok: true, format: 'pdf', text: pdf.text.slice(0, MAX_TEXT_CHARS), pages: pdf.pages, truncated: pdf.truncated };
  }
  if (head.startsWith('PK\u0003\u0004')) {
    const text = await extractDocxText(file);
    if (!text) return { ok: false, reason: 'unsupported-format' };
    return { ok: true, format: 'docx', text: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS };
  }
  // Legacy Word (.doc, OLE2) and everything else.
  return { ok: false, reason: 'unsupported-format' };
}

export { extractDocxText } from './docx';
export { extractPdfText } from './pdf';
export { listZipEntries, readZipEntry } from './zip';
export type { ZipEntryInfo } from './zip';
