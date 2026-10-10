import { inflate } from './inflate';

/**
 * Minimal zip reader for the files a resume import needs (a .docx, a LinkedIn
 * data archive): reads the central directory, then inflates only the requested
 * entries. No zip64, no encryption (returns null for such archives).
 */

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

export interface ZipEntryInfo {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localOffset: number;
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** The entries of a zip archive, or null when it is not a readable zip. */
export function listZipEntries(zip: Uint8Array): ZipEntryInfo[] | null {
  const v = view(zip);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = v.getUint16(eocd + 10, true);
  let offset = v.getUint32(eocd + 16, true);
  const entries: ZipEntryInfo[] = [];
  for (let n = 0; n < count; n++) {
    if (offset + 46 > zip.length || v.getUint32(offset, true) !== CENTRAL) return null;
    const flags = v.getUint16(offset + 8, true);
    const nameLength = v.getUint16(offset + 28, true);
    const extraLength = v.getUint16(offset + 30, true);
    const commentLength = v.getUint16(offset + 32, true);
    if (flags & 1) return null; // encrypted
    entries.push({
      name: new TextDecoder().decode(zip.subarray(offset + 46, offset + 46 + nameLength)),
      method: v.getUint16(offset + 10, true),
      compressedSize: v.getUint32(offset + 20, true),
      size: v.getUint32(offset + 24, true),
      localOffset: v.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Content of one entry, or null when it is missing, too large or unreadable. */
export async function readZipEntry(
  zip: Uint8Array,
  entry: ZipEntryInfo,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const v = view(zip);
  const at = entry.localOffset;
  if (at + 30 > zip.length || v.getUint32(at, true) !== LOCAL) return null;
  const start = at + 30 + v.getUint16(at + 26, true) + v.getUint16(at + 28, true);
  const data = zip.subarray(start, start + entry.compressedSize);
  try {
    if (entry.method === 0) return data.byteLength <= maxBytes ? data : null;
    if (entry.method === 8) return await inflate(data, 'deflate-raw', maxBytes);
  } catch {
    // Corrupt or too large.
  }
  return null;
}
