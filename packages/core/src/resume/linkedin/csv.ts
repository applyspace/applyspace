/**
 * Small RFC 4180 CSV reader for the LinkedIn data archive (APP-109): quoted
 * fields, doubled quotes, commas and line breaks inside quotes, BOM, CRLF.
 */

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const endRow = () => {
    row.push(field);
    field = '';
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') endRow();
    else if (c === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else field += c;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

/**
 * Rows as objects keyed by the header. Some LinkedIn files start with a note
 * before the header, so the header is the first row that contains one of
 * `expected` (case-insensitive); without a match the first row is used.
 */
export function csvRecords(input: string, expected: string[]): Record<string, string>[] {
  const rows = parseCsv(input);
  const wanted = expected.map((h) => h.toLowerCase());
  let headerAt = rows.findIndex((r) => r.some((cell) => wanted.includes(cell.trim().toLowerCase())));
  if (headerAt < 0) headerAt = 0;
  const header = (rows[headerAt] ?? []).map((h) => h.trim().toLowerCase());
  return rows.slice(headerAt + 1).map((r) => {
    const record: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h) record[h] = (r[i] ?? '').trim();
    });
    return record;
  });
}
