/**
 * Deterministic ids and dates for the demo dataset. No randomness, no clock:
 * the same inputs always give the same output, so the seed can be re-run
 * (and the generated SQL diffed) safely.
 */

/** cyrb128: a small, well distributed 128-bit string hash. */
function hash128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

const hex8 = (n: number) => n.toString(16).padStart(8, '0');

/**
 * A stable, well formed (version 4 shaped) uuid for a table row. The key is
 * unique per row inside its kind, e.g. `demoUuid('offer', 'north-3')`. It does
 * not depend on the demo user, so ids are identical in every environment.
 */
export function demoUuid(kind: string, key: string): string {
  const [a, b, c, d] = hash128(`applyspace-demo:${kind}:${key}`);
  const h = hex8(a) + hex8(b) + hex8(c) + hex8(d);
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` check, plus the day must exist (no 2026-02-31). */
export function parseAnchor(anchor: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
  if (!match) throw new Error(`Invalid anchor "${anchor}": expected YYYY-MM-DD`);
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(ms).toISOString().slice(0, 10) !== anchor) throw new Error(`Invalid anchor date "${anchor}"`);
  return ms;
}

/** Date helpers relative to an anchor day (UTC). Positive = in the past, negative = in the future. */
export function makeClock(anchor: string) {
  const base = parseAnchor(anchor);
  return {
    /** ISO timestamp `daysAgo` days before the anchor, at the given UTC time. */
    at(daysAgo: number, hour = 9, minute = 0): string {
      return new Date(base - daysAgo * DAY_MS + (hour * 60 + minute) * 60_000).toISOString();
    },
    /** `YYYY-MM-DD` date `daysAgo` days before the anchor. */
    day(daysAgo: number): string {
      return new Date(base - daysAgo * DAY_MS).toISOString().slice(0, 10);
    },
    /** `YYYY-MM-01` date `monthsAgo` months before the anchor month. */
    month(monthsAgo: number): string {
      const d = new Date(base);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 1)).toISOString().slice(0, 10);
    },
  };
}
export type DemoClock = ReturnType<typeof makeClock>;
