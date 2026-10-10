import { utf8 } from './inflate';
import { listZipEntries, readZipEntry } from './zip';

/** Refuse to inflate more than this (zip bombs). */
const MAX_XML_BYTES = 20 * 1024 * 1024;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Flattens WordprocessingML to lines: paragraphs, line breaks, tabs, table cells. */
export function wordXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:(br|cr)\b[^>]*\/>/g, '\n')
    // Table cells of one row are tab separated; the row ends the line.
    .replace(/<\/w:p>(?=\s*<\/w:tc>\s*<w:tc[\s>])/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITIES[name])
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Body text of a .docx, or null when the archive has no readable `word/document.xml`. */
export async function extractDocxText(file: Uint8Array): Promise<string | null> {
  const entries = listZipEntries(file);
  const body = entries?.find((e) => e.name === 'word/document.xml');
  if (!body) return null;
  const xml = await readZipEntry(file, body, MAX_XML_BYTES);
  return xml ? wordXmlToText(utf8(xml)) || null : null;
}
