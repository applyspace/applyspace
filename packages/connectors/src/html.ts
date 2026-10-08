import * as cheerio from 'cheerio';
import { cleanText } from './normalize.js';

export type Doc = cheerio.CheerioAPI;

export function load(html: string): Doc {
  return cheerio.load(html);
}

const BLOCK_TAGS = 'p,div,li,br,h1,h2,h3,h4,h5,h6,tr,ul,ol,section';

/** Converts an HTML fragment to readable plain text with line breaks. */
export function htmlToText(html: unknown): string | null {
  if (typeof html !== 'string' || !html.trim()) return null;
  const $ = cheerio.load(`<div id="__root">${html}</div>`);
  const root = $('#__root');
  root.find('script,style').remove();
  root.find('br').replaceWith('\n');
  root.find(BLOCK_TAGS).each((_, el) => {
    $(el).append('\n');
  });
  const text = root
    .text()
    .replace(/\xa0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

export function text(el: ReturnType<Doc>): string | null {
  return cleanText(el.first().text());
}

/** Resolves a possibly relative URL and drops the fragment. Returns null for junk. */
export function absoluteUrl(href: unknown, base: string): string | null {
  if (typeof href !== 'string' || !href.trim()) return null;
  try {
    const u = new URL(href.trim(), base);
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}
