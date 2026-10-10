/**
 * Inflate with the web-standard DecompressionStream (browsers, Node 18+, edge):
 * no Node API, no dependency. The output size is capped (zip bombs).
 */

export class InflateLimitError extends Error {}

export async function inflate(
  data: Uint8Array,
  format: 'deflate' | 'deflate-raw',
  maxBytes: number,
): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream(format));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new InflateLimitError('inflated data too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export function latin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return out;
}

export function utf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}
