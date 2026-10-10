import { InflateLimitError, inflate, latin1 } from './inflate';

/**
 * Dependency-free PDF text extraction, good enough for resumes (text PDFs
 * from Word, Google Docs, LibreOffice, Chrome, LaTeX, LinkedIn "Save to PDF").
 *
 * What it does: parses the objects (including compressed object streams),
 * follows the page tree, reads each page's content stream and its fonts
 * (ToUnicode CMaps, glyph widths), then rebuilds reading order from text
 * positions, with a column split for two-column layouts.
 *
 * What it does not do: OCR (scanned PDFs are reported as such), encrypted
 * files, LZW streams, Form XObjects, vertical writing. A pure-JS
 * library such as pdf.js can replace it later behind the same signature.
 */

export type PdfFailure = 'encrypted' | 'scanned' | 'empty' | 'unreadable' | 'corrupt' | 'too-large';

export type PdfResult =
  | { ok: true; text: string; pages: number; truncated: boolean }
  | { ok: false; reason: PdfFailure };

const MAX_PAGES = 15;
const MAX_STREAM_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_INFLATED = 60 * 1024 * 1024;

interface PdfObject {
  dict: string;
  raw?: Uint8Array;
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** a × b in PDF row-vector convention (apply a, then b). */
function mul(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

// --- object model -----------------------------------------------------------

function balanced(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length - 1; i++) {
    if (text[i] === '<' && text[i + 1] === '<') {
      depth++;
      i++;
    } else if (text[i] === '>' && text[i + 1] === '>') {
      depth--;
      i++;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return text.slice(from);
}

function directLength(dict: string): number | null {
  const m = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
  return m ? Number(m[1]) : null;
}

function parseObjects(s: string, bytes: Uint8Array): Map<number, PdfObject> {
  const objects = new Map<number, PdfObject>();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const num = Number(m[1]);
    const start = re.lastIndex;
    const streamIdx = s.indexOf('stream', start);
    const endIdx = s.indexOf('endobj', start);
    if (streamIdx !== -1 && (endIdx === -1 || streamIdx < endIdx)) {
      const dict = s.slice(start, streamIdx);
      let dataStart = streamIdx + 6;
      if (s[dataStart] === '\r') dataStart++;
      if (s[dataStart] === '\n') dataStart++;
      const length = directLength(dict);
      let dataEnd: number;
      if (length !== null && /^\s*endstream/.test(s.slice(dataStart + length, dataStart + length + 12))) {
        dataEnd = dataStart + length;
      } else {
        const e = s.indexOf('endstream', dataStart);
        dataEnd = e === -1 ? Math.min(s.length, dataStart + (length ?? 0)) : e;
        // The end-of-line before `endstream` is not part of the data (trailing bytes break inflate).
        if (e !== -1 && s[dataEnd - 1] === '\n') dataEnd--;
        if (e !== -1 && s[dataEnd - 1] === '\r') dataEnd--;
      }
      objects.set(num, { dict, raw: bytes.subarray(dataStart, dataEnd) });
      re.lastIndex = Math.max(dataEnd, start);
    } else {
      objects.set(num, { dict: s.slice(start, endIdx === -1 ? s.length : endIdx) });
      if (endIdx !== -1) re.lastIndex = endIdx;
    }
  }
  return objects;
}

class Budget {
  inflated = 0;
}

function ascii85(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  const group: number[] = [];
  const flush = (count: number) => {
    let value = 0;
    for (let i = 0; i < 5; i++) value = value * 85 + (group[i] ?? 84);
    for (let i = 0; i < count - 1; i++) out.push((value >>> (24 - 8 * i)) & 255);
    group.length = 0;
  };
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === 0x7e) break; // "~>" end marker
    if (c <= 32) continue;
    if (c === 0x7a && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    group.push(c - 33);
    if (group.length === 5) flush(5);
  }
  if (group.length > 1) flush(group.length);
  return Uint8Array.from(out);
}

function asciiHex(data: Uint8Array): Uint8Array {
  const hex = latin1(data).replace(/>[\s\S]*$/, '').replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2).padEnd(2, '0'), 16);
  return out;
}

async function decodeStream(obj: PdfObject, budget: Budget): Promise<Uint8Array | null> {
  if (!obj.raw) return null;
  const filter = /\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(obj.dict)?.[1] ?? '';
  const names = filter.match(/\/\w+/g) ?? [];
  let data = obj.raw;
  try {
    for (const name of names) {
      if (name === '/ASCII85Decode' || name === '/A85') data = ascii85(data);
      else if (name === '/ASCIIHexDecode' || name === '/AHx') data = asciiHex(data);
      else if (name === '/FlateDecode' || name === '/Fl') {
        data = await inflate(data, 'deflate', MAX_STREAM_BYTES);
        budget.inflated += data.byteLength;
        if (budget.inflated > MAX_TOTAL_INFLATED) throw new InflateLimitError('too much data');
        const predictor = Number(/\/Predictor\s+(\d+)/.exec(obj.dict)?.[1] ?? 1);
        if (predictor >= 10) data = pngPredictor(data, obj.dict);
      } else return null; // LZW, DCT, CCITT...: not text.
    }
    return data;
  } catch (error) {
    if (error instanceof InflateLimitError) throw error;
    return null;
  }
}

function pngPredictor(data: Uint8Array, dict: string): Uint8Array {
  const columns = Number(/\/Columns\s+(\d+)/.exec(dict)?.[1] ?? 1);
  const colors = Number(/\/Colors\s+(\d+)/.exec(dict)?.[1] ?? 1);
  const bpc = Number(/\/BitsPerComponent\s+(\d+)/.exec(dict)?.[1] ?? 8);
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const rowLength = Math.ceil((columns * colors * bpc) / 8);
  const rows = Math.floor(data.length / (rowLength + 1));
  const out = new Uint8Array(rows * rowLength);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLength + 1)];
    for (let i = 0; i < rowLength; i++) {
      const x = data[r * (rowLength + 1) + 1 + i];
      const left = i >= bpp ? out[r * rowLength + i - bpp] : 0;
      const up = r > 0 ? out[(r - 1) * rowLength + i] : 0;
      const upLeft = r > 0 && i >= bpp ? out[(r - 1) * rowLength + i - bpp] : 0;
      let v = x;
      if (type === 1) v = x + left;
      else if (type === 2) v = x + up;
      else if (type === 3) v = x + ((left + up) >> 1);
      else if (type === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v = x + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      }
      out[r * rowLength + i] = v & 255;
    }
  }
  return out;
}

/** Adds the objects stored inside object streams (PDF 1.5+). */
async function expandObjectStreams(objects: Map<number, PdfObject>, budget: Budget): Promise<void> {
  for (const [, obj] of [...objects]) {
    if (!obj.raw || !/\/Type\s*\/ObjStm/.test(obj.dict)) continue;
    const data = await decodeStream(obj, budget);
    if (!data) continue;
    const n = Number(/\/N\s+(\d+)/.exec(obj.dict)?.[1] ?? 0);
    const first = Number(/\/First\s+(\d+)/.exec(obj.dict)?.[1] ?? 0);
    const text = latin1(data);
    const header = text.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const num = header[i * 2];
      const offset = header[i * 2 + 1];
      if (!Number.isFinite(num) || !Number.isFinite(offset)) continue;
      const end = i + 1 < n ? header[(i + 1) * 2 + 1] : text.length - first;
      if (!objects.has(num)) objects.set(num, { dict: text.slice(first + offset, first + end) });
    }
  }
}

function refs(text: string): number[] {
  return [...text.matchAll(/(\d+)\s+\d+\s+R\b/g)].map((m) => Number(m[1]));
}

/** Value of `/Key` when it is a dictionary (inline or by reference), as text. */
function dictValue(text: string, key: string, objects: Map<number, PdfObject>): string | null {
  const m = new RegExp(`\\/${key}(?![A-Za-z0-9])\\s*`).exec(text);
  if (!m) return null;
  const at = m.index + m[0].length;
  if (text.startsWith('<<', at)) return balanced(text, at);
  const ref = /^(\d+)\s+\d+\s+R\b/.exec(text.slice(at, at + 24));
  return ref ? (objects.get(Number(ref[1]))?.dict ?? null) : null;
}

// --- fonts ------------------------------------------------------------------

interface FontInfo {
  bytes: 1 | 2;
  map: Map<number, string> | null;
  width(code: number): number;
}

function hexToString(hex: string): string {
  let out = '';
  for (let i = 0; i + 3 < hex.length + 1 && i < hex.length; i += 4) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 4).padEnd(4, '0'), 16));
  }
  return out;
}

function parseToUnicode(text: string): { map: Map<number, string>; bytes: 1 | 2 } {
  const map = new Map<number, string>();
  const space = /begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(text);
  const bytes: 1 | 2 = space && space[1].length <= 2 ? 1 : 2;
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      map.set(parseInt(m[1], 16), hexToString(m[2]));
    }
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1], 16);
      const hi = Math.min(parseInt(m[2], 16), lo + 0xffff);
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9a-fA-F]*)>/g)];
        for (let c = lo; c <= hi && c - lo < items.length; c++) map.set(c, hexToString(items[c - lo][1]));
      } else {
        const dst = m[3].slice(1, -1);
        const base = dst.length >= 4 ? parseInt(dst.slice(-4), 16) : parseInt(dst || '0', 16);
        const prefix = hexToString(dst.slice(0, -4));
        for (let c = lo; c <= hi; c++) map.set(c, prefix + String.fromCharCode(base + (c - lo)));
      }
    }
  }
  return { map, bytes };
}

function numberList(text: string): number[] {
  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

async function loadFont(
  num: number,
  objects: Map<number, PdfObject>,
  budget: Budget,
  cache: Map<number, FontInfo>,
): Promise<FontInfo> {
  const cached = cache.get(num);
  if (cached) return cached;
  const dict = objects.get(num)?.dict ?? '';
  const composite = /\/Subtype\s*\/Type0/.test(dict);
  let map: Map<number, string> | null = null;
  let bytes: 1 | 2 = composite ? 2 : 1;
  const toUnicode = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(dict)?.[1];
  if (toUnicode) {
    const obj = objects.get(Number(toUnicode));
    const data = obj ? await decodeStream(obj, budget) : null;
    if (data) {
      const parsed = parseToUnicode(latin1(data));
      if (parsed.map.size > 0) {
        map = parsed.map;
        if (composite) bytes = parsed.bytes;
      }
    }
  }

  let width: (code: number) => number = () => 500;
  if (composite) {
    const descendant = /\/DescendantFonts\s*(?:\[\s*)?(\d+)\s+\d+\s+R/.exec(dict)?.[1];
    const dd = descendant ? (objects.get(Number(descendant))?.dict ?? '') : (/\/DescendantFonts\s*\[\s*(<<[\s\S]*>>)\s*\]/.exec(dict)?.[1] ?? '');
    const dw = Number(/\/DW\s+(\d+(?:\.\d+)?)/.exec(dd)?.[1] ?? 1000);
    const wMap = new Map<number, number>();
    let wText = '';
    const wm = /\/W\s*(\[|\d+\s+\d+\s+R)/.exec(dd);
    if (wm) {
      if (wm[1] === '[') {
        const start = dd.indexOf('[', wm.index);
        let depth = 0;
        let end = start;
        for (; end < dd.length; end++) {
          if (dd[end] === '[') depth++;
          else if (dd[end] === ']' && --depth === 0) break;
        }
        wText = dd.slice(start + 1, end);
      } else {
        wText = objects.get(Number(wm[1].split(/\s+/)[0]))?.dict ?? '';
        wText = wText.replace(/^[\s\S]*?\[/, '').replace(/\][\s\S]*$/, '');
      }
      const re = /(\d+)\s*\[([^\]]*)\]|(\d+)\s+(\d+)\s+(-?\d+(?:\.\d+)?)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(wText))) {
        if (m[2] !== undefined) {
          numberList(m[2]).forEach((w, i) => wMap.set(Number(m![1]) + i, w));
        } else {
          const lo = Number(m[3]);
          const hi = Math.min(Number(m[4]), lo + 0xffff);
          for (let c = lo; c <= hi; c++) wMap.set(c, Number(m[5]));
        }
      }
    }
    width = (code) => wMap.get(code) ?? dw;
  } else {
    const first = Number(/\/FirstChar\s+(\d+)/.exec(dict)?.[1] ?? 0);
    let list = /\/Widths\s*\[([^\]]*)\]/.exec(dict)?.[1];
    if (list === undefined) {
      const ref = /\/Widths\s+(\d+)\s+\d+\s+R/.exec(dict)?.[1];
      const body = ref ? objects.get(Number(ref))?.dict : undefined;
      list = body ? (/\[([^\]]*)\]/.exec(body)?.[1] ?? '') : '';
    }
    const widths = numberList(list);
    if (widths.length > 0) width = (code) => widths[code - first] ?? 500;
  }

  const font: FontInfo = { bytes, map, width };
  cache.set(num, font);
  return font;
}

// --- content streams ----------------------------------------------------------

type Token =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'str'; v: string }
  | { t: 'arr'; v: Token[] }
  | { t: 'op'; v: string };

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  const stack: Token[][] = [out];
  let i = 0;
  const push = (t: Token) => stack[stack.length - 1].push(t);
  while (i < s.length) {
    const c = s[i];
    if (c === '%') {
      while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++;
    } else if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0') {
      i++;
    } else if (c === '(') {
      let depth = 1;
      let str = '';
      i++;
      while (i < s.length && depth > 0) {
        const ch = s[i];
        if (ch === '\\') {
          const n = s[i + 1];
          i += 2;
          if (n === 'n') str += '\n';
          else if (n === 'r') str += '\r';
          else if (n === 't') str += '\t';
          else if (n === 'b') str += '\b';
          else if (n === 'f') str += '\f';
          else if (n >= '0' && n <= '7') {
            let oct = n;
            while (oct.length < 3 && s[i] >= '0' && s[i] <= '7') oct += s[i++];
            str += String.fromCharCode(parseInt(oct, 8) & 255);
          } else if (n === '\r') {
            if (s[i] === '\n') i++;
          } else if (n !== '\n') str += n ?? '';
        } else {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          if (depth > 0) str += ch;
          i++;
        }
      }
      push({ t: 'str', v: str });
    } else if (c === '<' && s[i + 1] === '<') {
      // Inline dictionary (marked content properties): skip it whole.
      i = i + balanced(s, i).length;
    } else if (c === '<') {
      const end = s.indexOf('>', i);
      const hex = s.slice(i + 1, end === -1 ? s.length : end).replace(/\s+/g, '');
      let str = '';
      for (let k = 0; k < hex.length; k += 2) str += String.fromCharCode(parseInt(hex.slice(k, k + 2).padEnd(2, '0'), 16));
      push({ t: 'str', v: str });
      i = end === -1 ? s.length : end + 1;
    } else if (c === '[') {
      const arr: Token = { t: 'arr', v: [] };
      push(arr);
      stack.push(arr.v);
      i++;
    } else if (c === ']') {
      if (stack.length > 1) stack.pop();
      i++;
    } else if (c === '/') {
      let j = i + 1;
      while (j < s.length && !/[\s/<>[\]()%]/.test(s[j])) j++;
      push({ t: 'name', v: s.slice(i + 1, j) });
      i = j;
    } else if (c === '>' || c === ')' || c === '{' || c === '}') {
      i++;
    } else {
      let j = i;
      while (j < s.length && !/[\s/<>[\]()%]/.test(s[j])) j++;
      if (j === i) {
        i++;
        continue;
      }
      const word = s.slice(i, j);
      i = j;
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) push({ t: 'num', v: Number(word) });
      else if (word === 'BI') {
        // Inline image: skip to its EI.
        const m = /[\s]EI(?=[\s]|$)/.exec(s.slice(i));
        i = m ? i + m.index + m[0].length : s.length;
      } else push({ t: 'op', v: word });
    }
  }
  return out;
}

interface Chunk {
  x: number;
  y: number;
  endX: number;
  size: number;
  text: string;
}

interface PageFonts {
  [name: string]: number;
}

interface Interpreted {
  chunks: Chunk[];
  chars: number;
  unmapped: number;
}

async function interpret(
  content: string,
  fontRefs: PageFonts,
  load: (num: number) => Promise<FontInfo>,
): Promise<Interpreted> {
  const tokens = tokenize(content);
  const chunks: Chunk[] = [];
  let chars = 0;
  let unmapped = 0;

  let ctm: Matrix = IDENTITY;
  const ctmStack: Matrix[] = [];
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let font: FontInfo | null = null;
  let fontSize = 1;
  let leading = 0;
  let charSpace = 0;
  let wordSpace = 0;
  let hScale = 1;
  let last: Chunk | null = null;

  const move = (tx: number, ty: number) => {
    tlm = mul([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };

  const show = (str: string) => {
    if (!font) return;
    const f = font;
    let text = '';
    let advance = 0;
    for (let k = 0; k < str.length; k += f.bytes) {
      const code = f.bytes === 2 ? (str.charCodeAt(k) << 8) | (str.charCodeAt(k + 1) || 0) : str.charCodeAt(k);
      let ch: string;
      if (f.map) {
        const mapped = f.map.get(code);
        if (mapped === undefined) {
          unmapped++;
          ch = f.bytes === 1 && code >= 32 && code < 127 ? String.fromCharCode(code) : '';
        } else ch = mapped;
      } else if (f.bytes === 2) {
        unmapped++;
        ch = '';
      } else {
        ch = code >= 0x80 && code <= 0x9f ? (WIN_ANSI_HIGH[code] ?? '') : code < 32 ? '' : String.fromCharCode(code);
      }
      chars++;
      text += ch;
      advance += (f.width(code) / 1000) * fontSize + charSpace + (code === 32 && f.bytes === 1 ? wordSpace : 0);
    }
    const m = mul(tm, ctm);
    const size = Math.abs(fontSize) * Math.hypot(m[2], m[3]) || Math.abs(fontSize);
    const x = m[4];
    const y = m[5];
    const dxDev = advance * hScale * Math.hypot(m[0], m[1]) * (m[0] < 0 ? -1 : 1);
    if (text.trim() || text.includes(' ')) {
      const sameLine = last && Math.abs(y - last.y) <= 0.3 * Math.max(size, last.size);
      const gap = last ? x - last.endX : 0;
      if (last && sameLine && gap > -0.3 * size && gap < 1.2 * size) {
        last.text += (gap > 0.15 * size && !last.text.endsWith(' ') && !text.startsWith(' ') ? ' ' : '') + text;
        last.endX = x + dxDev;
      } else {
        last = { x, y, endX: x + dxDev, size, text };
        chunks.push(last);
      }
    }
    tm = mul([1, 0, 0, 1, advance * hScale, 0], tm);
  };

  let stack: Token[] = [];
  const num = (t: Token | undefined) => (t && t.t === 'num' ? t.v : 0);
  for (const tok of tokens) {
    if (tok.t !== 'op') {
      stack.push(tok);
      continue;
    }
    const a = stack;
    stack = [];
    switch (tok.v) {
      case 'q':
        ctmStack.push(ctm);
        break;
      case 'Q':
        ctm = ctmStack.pop() ?? ctm;
        break;
      case 'cm':
        if (a.length >= 6) ctm = mul(a.slice(-6).map(num) as Matrix, ctm);
        break;
      case 'BT':
        tm = tlm = IDENTITY;
        last = null;
        break;
      case 'Tf': {
        const name = a.find((t) => t.t === 'name');
        const ref = name && name.t === 'name' ? fontRefs[name.v] : undefined;
        font = ref !== undefined ? await load(ref) : null;
        fontSize = num(a[a.length - 1]) || 1;
        break;
      }
      case 'Td':
        move(num(a[0]), num(a[1]));
        break;
      case 'TD':
        leading = -num(a[1]);
        move(num(a[0]), num(a[1]));
        break;
      case 'Tm':
        if (a.length >= 6) {
          tm = tlm = a.slice(-6).map(num) as Matrix;
        }
        break;
      case 'T*':
        move(0, -leading);
        break;
      case 'TL':
        leading = num(a[0]);
        break;
      case 'Tc':
        charSpace = num(a[0]);
        break;
      case 'Tw':
        wordSpace = num(a[0]);
        break;
      case 'Tz':
        hScale = (num(a[0]) || 100) / 100;
        break;
      case 'Tj': {
        const s = a[a.length - 1];
        if (s && s.t === 'str') show(s.v);
        break;
      }
      case "'": {
        move(0, -leading);
        const s = a[a.length - 1];
        if (s && s.t === 'str') show(s.v);
        break;
      }
      case '"': {
        wordSpace = num(a[0]);
        charSpace = num(a[1]);
        move(0, -leading);
        const s = a[a.length - 1];
        if (s && s.t === 'str') show(s.v);
        break;
      }
      case 'TJ': {
        const arr = a[a.length - 1];
        if (arr && arr.t === 'arr') {
          for (const item of arr.v) {
            if (item.t === 'str') show(item.v);
            else if (item.t === 'num') tm = mul([1, 0, 0, 1, (-item.v / 1000) * fontSize * hScale, 0], tm);
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return { chunks, chars, unmapped };
}

// --- reading order -----------------------------------------------------------

function joinLine(chunks: Chunk[]): string {
  const sorted = [...chunks].sort((p, q) => p.x - q.x);
  let out = '';
  let prev: Chunk | null = null;
  for (const c of sorted) {
    if (prev) {
      const gap = c.x - prev.endX;
      out += gap > 4 * c.size ? '\t' : out.endsWith(' ') || c.text.startsWith(' ') ? '' : ' ';
    }
    out += c.text;
    prev = c;
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

function toLines(chunks: Chunk[]): string[] {
  const sorted = [...chunks].sort((p, q) => q.y - p.y || p.x - q.x);
  const lines: { y: number; size: number; items: Chunk[] }[] = [];
  for (const c of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(c.y - line.y) <= 0.4 * Math.min(c.size, line.size)) line.items.push(c);
    else lines.push({ y: c.y, size: c.size, items: [c] });
  }
  const out: string[] = [];
  let prev: { y: number; size: number } | null = null;
  for (const line of lines) {
    const text = joinLine(line.items);
    if (!text) continue;
    if (prev && prev.y - line.y > 1.9 * Math.max(prev.size, line.size)) out.push('');
    out.push(text);
    prev = line;
  }
  return out;
}

/** Page text in reading order; a clear vertical gutter splits two columns. */
export function pageText(chunks: Chunk[]): string {
  if (chunks.length === 0) return '';
  const min = Math.min(...chunks.map((c) => c.x));
  const max = Math.max(...chunks.map((c) => c.endX));
  const width = max - min;
  if (chunks.length >= 8 && width > 0) {
    const delta = 0.015 * width;
    let best: { g: number; crossing: number } | null = null;
    for (let g = min + 0.2 * width; g <= min + 0.8 * width; g += 0.005 * width) {
      const crossing = chunks.filter((c) => c.x < g - delta && c.endX > g + delta).length;
      if (!best || crossing < best.crossing) best = { g, crossing };
    }
    if (best && best.crossing <= 0.1 * chunks.length) {
      const g = best.g;
      const spanning = chunks.filter((c) => c.x < g - delta && c.endX > g + delta);
      const rest = chunks.filter((c) => !spanning.includes(c));
      const left = rest.filter((c) => (c.x + c.endX) / 2 < g);
      const right = rest.filter((c) => (c.x + c.endX) / 2 >= g);
      if (left.length >= 0.2 * chunks.length && right.length >= 0.2 * chunks.length) {
        const top = Math.max(...rest.map((c) => c.y));
        const head = spanning.filter((c) => c.y > top);
        const foot = spanning.filter((c) => c.y <= top);
        return [head, left, right, foot]
          .map((group) => toLines(group).join('\n'))
          .filter(Boolean)
          .join('\n\n');
      }
    }
  }
  return toLines(chunks).join('\n');
}

// --- entry point --------------------------------------------------------------

function cleanText(text: string): string {
  return text
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[  ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfText(file: Uint8Array): Promise<PdfResult> {
  if (file.length > 10 * 1024 * 1024) return { ok: false, reason: 'too-large' };
  const s = latin1(file);
  if (!s.startsWith('%PDF-') && !s.slice(0, 1024).includes('%PDF-')) return { ok: false, reason: 'corrupt' };
  if (/\/Encrypt\s+(\d+\s+\d+\s+R|<<)/.test(s)) return { ok: false, reason: 'encrypted' };

  const budget = new Budget();
  try {
    const objects = parseObjects(s, file);
    if (objects.size === 0) return { ok: false, reason: 'corrupt' };
    await expandObjectStreams(objects, budget);

    // Page order: follow the page tree from the catalog; fall back to object order.
    const isPage = (d: string) => /\/Type\s*\/Page(?![A-Za-z])/.test(d);
    const roots = [...s.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)];
    const catalog = roots.length ? objects.get(Number(roots[roots.length - 1][1])) : undefined;
    const pageNums: number[] = [];
    const visit = (num: number, depth: number) => {
      const obj = objects.get(num);
      if (!obj || depth > 20 || pageNums.length >= 500) return;
      if (isPage(obj.dict)) pageNums.push(num);
      else {
        const kids = /\/Kids\s*\[([^\]]*)\]/.exec(obj.dict)?.[1];
        if (kids) for (const kid of refs(kids)) visit(kid, depth + 1);
      }
    };
    const pagesRoot = catalog && /\/Pages\s+(\d+)\s+\d+\s+R/.exec(catalog.dict)?.[1];
    if (pagesRoot) visit(Number(pagesRoot), 0);
    if (pageNums.length === 0) {
      for (const [num, obj] of objects) if (isPage(obj.dict)) pageNums.push(num);
      pageNums.sort((a, b) => a - b);
    }
    if (pageNums.length === 0) return { ok: false, reason: 'corrupt' };

    const fontCache = new Map<number, FontInfo>();
    const texts: string[] = [];
    let chars = 0;
    let unmapped = 0;
    const used = pageNums.slice(0, MAX_PAGES);
    for (const pageNum of used) {
      const page = objects.get(pageNum)!;
      // Resources can be inherited from the page tree.
      let resources: string | null = null;
      let node: PdfObject | undefined = page;
      for (let depth = 0; node && depth < 10 && !resources; depth++) {
        resources = dictValue(node.dict, 'Resources', objects);
        const parent: string | undefined = /\/Parent\s+(\d+)\s+\d+\s+R/.exec(node.dict)?.[1];
        node = parent ? objects.get(Number(parent)) : undefined;
      }
      const fontRefs: PageFonts = {};
      const fonts = resources ? dictValue(resources, 'Font', objects) : null;
      if (fonts) for (const m of fonts.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) fontRefs[m[1]] = Number(m[2]);

      const contentsAt = /\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/.exec(page.dict)?.[1] ?? '';
      let content = '';
      for (const num of refs(contentsAt)) {
        const obj = objects.get(num);
        const data = obj ? await decodeStream(obj, budget) : null;
        if (data) content += latin1(data) + '\n';
      }
      const result = await interpret(content, fontRefs, (num) => loadFont(num, objects, budget, fontCache));
      chars += result.chars;
      unmapped += result.unmapped;
      const text = pageText(result.chunks);
      if (text) texts.push(text);
    }

    const text = cleanText(texts.join('\n\n'));
    if (chars > 20 && unmapped / chars > 0.4) return { ok: false, reason: 'unreadable' };
    if (text.replace(/\s/g, '').length < 40) {
      return { ok: false, reason: /\/Subtype\s*\/Image/.test(s) ? 'scanned' : 'empty' };
    }
    return { ok: true, text, pages: pageNums.length, truncated: pageNums.length > MAX_PAGES };
  } catch (error) {
    return { ok: false, reason: error instanceof InflateLimitError ? 'too-large' : 'corrupt' };
  }
}
