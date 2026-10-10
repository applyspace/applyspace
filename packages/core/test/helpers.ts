import { deflateRawSync, deflateSync } from 'node:zlib';

/**
 * Builders for tiny synthetic PDF and DOCX files used by the extraction
 * tests. Content is made up; no real personal data lives in the repository.
 */

export interface PdfLine {
  x: number;
  y: number;
  text: string;
  size?: number;
}

export interface PdfOptions {
  /** `simple`: Helvetica with WinAnsi bytes. `type0`: Identity-H with a ToUnicode CMap (subset fonts). */
  font?: 'simple' | 'type0';
  /** Put page, font and catalog dictionaries in a compressed object stream. */
  objectStream?: boolean;
  /** Flate-compress the content stream (default true). */
  compress?: boolean;
  /** Indirect /Length, like LibreOffice writes. */
  indirectLength?: boolean;
  /** Add an image XObject and no text. */
  imageOnly?: boolean;
  encrypted?: boolean;
}

const hex4 = (n: number) => n.toString(16).padStart(4, '0');

const WIN_ANSI: Record<string, number> = { '–': 0x96, '—': 0x97, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '€': 0x80 };

function escapeLiteral(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = WIN_ANSI[ch] ?? ch.charCodeAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') out += `\\${ch}`;
    else if (code > 126) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += ch;
  }
  return out;
}

export function buildPdf(pages: PdfLine[][], options: PdfOptions = {}): Uint8Array {
  const font = options.font ?? 'simple';
  const compress = options.compress ?? true;
  const chars = new Map<string, number>();
  const code = (ch: string) => {
    if (!chars.has(ch)) chars.set(ch, chars.size + 1);
    return chars.get(ch)!;
  };

  const contents = pages.map((lines) => {
    if (options.imageOnly) return 'q 500 0 0 700 50 50 cm /Im1 Do Q';
    let c = 'BT\n';
    for (const l of lines) {
      c += `/F1 ${l.size ?? 11} Tf 1 0 0 1 ${l.x} ${l.y} Tm `;
      if (font === 'simple') c += `(${escapeLiteral(l.text)}) Tj\n`;
      else c += `<${[...l.text].map((ch) => hex4(code(ch))).join('')}> Tj\n`;
    }
    return `${c}ET`;
  });

  const cmap =
    '/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
    `${chars.size} beginbfchar\n${[...chars].map(([ch, n]) => `<${hex4(n)}> <${hex4(ch.charCodeAt(0))}>`).join('\n')}\nendbfchar\nendcmap end end`;

  // Object numbers: 1 catalog, 2 pages, 3 font, 4 descendant (type0), 5 cmap, 6 image, then pages and contents.
  const objects = new Map<number, { dict: string; stream?: Uint8Array | string }>();
  const pageNums = pages.map((_, i) => 10 + i * 2);
  objects.set(1, { dict: '<< /Type /Catalog /Pages 2 0 R >>' });
  objects.set(2, { dict: `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>` });
  if (font === 'simple') {
    objects.set(3, { dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' });
  } else {
    objects.set(3, { dict: '<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Test /Encoding /Identity-H /DescendantFonts [4 0 R] /ToUnicode 5 0 R >>' });
    objects.set(4, { dict: '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ABCDEF+Test /DW 560 >>' });
    objects.set(5, { dict: '<< >>', stream: cmap });
  }
  if (options.imageOnly) objects.set(6, { dict: '<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 >>', stream: new Uint8Array([255]) });
  pages.forEach((_, i) => {
    const resources = `<< /Font << /F1 3 0 R >>${options.imageOnly ? ' /XObject << /Im1 6 0 R >>' : ''} >>`;
    objects.set(pageNums[i], {
      dict: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${pageNums[i] + 1} 0 R >>`,
    });
    objects.set(pageNums[i] + 1, { dict: '<< >>', stream: contents[i] });
  });

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? Uint8Array.from(data, (c) => c.charCodeAt(0) & 255) : data;
    parts.push(bytes);
    length += bytes.length;
  };
  void enc;
  push('%PDF-1.7\n');

  const streamObject = (num: number, dict: string, data: Uint8Array | string, flate: boolean) => {
    let body = typeof data === 'string' ? Uint8Array.from(data, (c) => c.charCodeAt(0) & 255) : data;
    let d = dict;
    if (flate) {
      body = deflateSync(body);
      d = d.replace('<<', '<< /Filter /FlateDecode');
    }
    if (options.indirectLength) {
      d = d.replace('<<', '<< /Length 99 0 R');
      push(`${num} 0 obj\n${d}\nstream\n`);
      push(body);
      push('\nendstream\nendobj\n');
      push(`99 0 obj\n${body.length}\nendobj\n`);
    } else {
      d = d.replace('<<', `<< /Length ${body.length}`);
      push(`${num} 0 obj\n${d}\nstream\n`);
      push(body);
      push('\nendstream\nendobj\n');
    }
  };

  const inStream = new Set<number>();
  if (options.objectStream) {
    for (const [num, o] of objects) if (!o.stream && num !== 99) inStream.add(num);
    let header = '';
    let body = '';
    for (const num of inStream) {
      header += `${num} ${body.length} `;
      body += `${objects.get(num)!.dict}\n`;
    }
    streamObject(90, `<< /Type /ObjStm /N ${inStream.size} /First ${header.length} >>`, header + body, true);
  }
  for (const [num, o] of objects) {
    if (inStream.has(num)) continue;
    if (o.stream !== undefined) streamObject(num, o.dict, o.stream, compress && num !== 6);
    else push(`${num} 0 obj\n${o.dict}\nendobj\n`);
  }
  push(`trailer\n<< /Root 1 0 R${options.encrypted ? ' /Encrypt 7 0 R' : ''} >>\n%%EOF\n`);

  const out = new Uint8Array(length);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** A minimal .docx: one stored zip entry holding `word/document.xml`. */
export function buildDocx(paragraphs: string[], options: { deflate?: boolean; rows?: string[][]; entryName?: string } = {}): Uint8Array {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body =
    paragraphs.map((p) => `<w:p><w:r><w:t>${esc(p)}</w:t></w:r></w:p>`).join('') +
    (options.rows
      ? `<w:tbl>${options.rows
          .map((r) => `<w:tr>${r.map((c) => `<w:tc><w:p><w:r><w:t>${esc(c)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`)
          .join('')}</w:tbl>`
      : '');
  const xml = new TextEncoder().encode(`<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${body}</w:body></w:document>`);
  const name = new TextEncoder().encode(options.entryName ?? 'word/document.xml');
  const data = options.deflate === false ? xml : deflateRawSync(xml);
  const method = options.deflate === false ? 0 : 8;

  const local = new Uint8Array(30 + name.length + data.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, method, true);
  lv.setUint32(18, data.length, true);
  lv.setUint32(22, xml.length, true);
  lv.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(data, 30 + name.length);

  const central = new Uint8Array(46 + name.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, method, true);
  cv.setUint32(20, data.length, true);
  cv.setUint32(24, xml.length, true);
  cv.setUint16(28, name.length, true);
  cv.setUint32(42, 0, true);
  central.set(name, 46);

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);

  const out = new Uint8Array(local.length + central.length + end.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(end, local.length + central.length);
  return out;
}
