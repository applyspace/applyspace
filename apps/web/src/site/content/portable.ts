import type { PortableTextBlock } from '@portabletext/react';

/** Tiny builders for Portable Text, used by the local fallback articles. */
let n = 0;
const key = () => `k${++n}`;

const span = (text: string) => ({ _type: 'span', _key: key(), text, marks: [] as string[] });

export const p = (text: string): PortableTextBlock => ({ _type: 'block', _key: key(), style: 'normal', markDefs: [], children: [span(text)] });
export const h2 = (text: string): PortableTextBlock => ({ _type: 'block', _key: key(), style: 'h2', markDefs: [], children: [span(text)] });
export const h3 = (text: string): PortableTextBlock => ({ _type: 'block', _key: key(), style: 'h3', markDefs: [], children: [span(text)] });
export const ul = (items: string[]): PortableTextBlock[] =>
  items.map((t) => ({ _type: 'block', _key: key(), style: 'normal', listItem: 'bullet', level: 1, markDefs: [], children: [span(t)] }));
export const ol = (items: string[]): PortableTextBlock[] =>
  items.map((t) => ({ _type: 'block', _key: key(), style: 'normal', listItem: 'number', level: 1, markDefs: [], children: [span(t)] }));
