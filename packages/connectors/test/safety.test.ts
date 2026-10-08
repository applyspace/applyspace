import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/**
 * Hard rule: the probe and connectors must never read cookies, storage state or session files.
 * This test fails if such an API shows up in the source (comments excluded).
 */
describe('credential safety', () => {
  const FORBIDDEN = [/\.cookies\s*\(/, /storageState/, /addCookies/, /document\.cookie/, /localStorage/, /sessionStorage/, /\.allHeaders\s*\(/, /\.headersArray\s*\(/, /set-cookie/i, /li_at/];

  it('does not use any cookie or storage API', () => {
    for (const file of files(src)) {
      const code = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
      for (const re of FORBIDDEN) expect(code, `${file} matches ${re}`).not.toMatch(re);
    }
  });

  it('only reads the content-type header of responses', () => {
    const driver = readFileSync(join(src, 'probe', 'playwright-driver.ts'), 'utf8');
    expect(driver).toContain("headerValue('content-type')");
    expect(driver).not.toMatch(/\.headers\s*\(/);
  });

  it('does not stage a headless-stealth setup', () => {
    const driver = readFileSync(join(src, 'probe', 'playwright-driver.ts'), 'utf8');
    expect(driver).not.toMatch(/stealth|webdriver|--disable-blink-features/i);
  });
});
