import { defineField, defineType } from 'sanity';

const title = defineField({ name: 'title', type: 'string', validation: (r) => r.required() });
const intro = defineField({ name: 'intro', type: 'text', rows: 2 });
const eyebrow = defineField({ name: 'eyebrow', type: 'string', description: 'Small uppercase line above the title.' });
const anchor = defineField({ name: 'anchor', type: 'string', description: 'Optional #anchor id, kebab-case.' });
const body = defineField({ name: 'body', type: 'text', rows: 4 });
const link = defineField({ name: 'link', type: 'textLink' });
const shot = (name: string, title?: string) => defineField({ name, title, type: 'productShot' });

export const cardsSection = defineType({
  name: 'cardsSection',
  title: 'Cards',
  type: 'object',
  fields: [
    title,
    intro,
    defineField({
      name: 'items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'text', type: 'text', rows: 3 }),
            defineField({ name: 'href', title: 'Link (optional)', type: 'string' }),
            defineField({ name: 'icon', type: 'string', description: 'Icon key: search, board, interview, ...' }),
          ],
          preview: { select: { title: 'title', subtitle: 'text' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Cards' }) },
});

export const stepsSection = defineType({
  name: 'stepsSection',
  title: 'Steps',
  type: 'object',
  fields: [
    eyebrow,
    title,
    intro,
    defineField({
      name: 'items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'text', type: 'text', rows: 3 })],
          preview: { select: { title: 'title', subtitle: 'text' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Steps' }) },
});

export const textSection = defineType({
  name: 'textSection',
  title: 'Text block',
  type: 'object',
  fields: [
    title,
    defineField({ name: 'body', type: 'text', rows: 4 }),
    defineField({ name: 'tone', type: 'string', options: { list: ['plain', 'tinted'] }, initialValue: 'plain' }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Text block' }) },
});

export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ',
  type: 'object',
  description: 'Also published as FAQPage structured data.',
  fields: [
    title,
    defineField({
      name: 'items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [defineField({ name: 'question', type: 'string' }), defineField({ name: 'answer', type: 'text', rows: 3 })],
          preview: { select: { title: 'question' } },
        },
      ],
    }),
    link,
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'FAQ' }) },
});

export const plansSection = defineType({
  name: 'plansSection',
  title: 'Plans',
  type: 'object',
  description: 'Renders the Pricing plan documents.',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    intro,
    defineField({ name: 'variant', type: 'string', options: { list: ['compact', 'full'] }, initialValue: 'full' }),
    defineField({ name: 'note', type: 'string', description: 'Optional small note above the plans.' }),
    defineField({ name: 'footnote', type: 'string', description: 'Compact variant: line under the cards.' }),
  ],
  preview: { prepare: () => ({ title: 'Plans', subtitle: 'Pricing plans' }) },
});

export const featuresSection = defineType({
  name: 'featuresSection',
  title: 'Features by theme',
  type: 'object',
  description: 'Renders every Feature document grouped by theme.',
  fields: [defineField({ name: 'note', type: 'string', hidden: true })],
  preview: { prepare: () => ({ title: 'Features by theme' }) },
});

export const ctaSection = defineType({
  name: 'ctaSection',
  title: 'Call to action band',
  type: 'object',
  fields: [
    title,
    defineField({ name: 'text', type: 'text', rows: 2 }),
    defineField({ name: 'cta', type: 'cta', validation: (r) => r.required() }),
    defineField({ name: 'secondary', title: 'Secondary button', type: 'cta' }),
    shot('shot', 'Faded product crop (optional)'),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Call to action' }) },
});

export const scatterSection = defineType({
  name: 'scatterSection',
  title: 'Scattered tools (problem)',
  type: 'object',
  fields: [
    title,
    body,
    defineField({
      name: 'fragments',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'kind', type: 'string', options: { list: ['tab', 'sheet', 'note', 'email', 'calendar'] } }),
            defineField({ name: 'label', type: 'string' }),
            defineField({ name: 'text', type: 'string' }),
          ],
          preview: { select: { title: 'text', subtitle: 'label' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Scattered tools' }) },
});

export const spotlightSection = defineType({
  name: 'spotlightSection',
  title: 'Product space',
  type: 'object',
  fields: [
    anchor,
    eyebrow,
    title,
    body,
    defineField({ name: 'bullets', type: 'array', of: [{ type: 'string' }], validation: (r) => r.max(4) }),
    link,
    shot('shot', 'Product shot'),
    shot('inset', 'Zoomed inset (optional)'),
    defineField({ name: 'shotSide', type: 'string', options: { list: ['left', 'right'] }, initialValue: 'right' }),
    defineField({
      name: 'boards',
      title: 'Job boards row (optional)',
      type: 'array',
      of: [{ type: 'object', fields: [defineField({ name: 'key', type: 'string', description: 'Logo file public/site/boards/<key>.svg' }), defineField({ name: 'name', type: 'string' })], preview: { select: { title: 'name' } } }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'eyebrow' } },
});

export const viewsSection = defineType({
  name: 'viewsSection',
  title: 'Views (tabs)',
  type: 'object',
  fields: [
    anchor,
    eyebrow,
    title,
    intro,
    defineField({
      name: 'views',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'key', type: 'string' }),
            defineField({ name: 'label', type: 'string' }),
            defineField({ name: 'icon', type: 'string', description: 'Icon key: board, table, timeline, map, ...' }),
            shot('shot'),
          ],
          preview: { select: { title: 'label' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Views (tabs)' }) },
});

export const flowSection = defineType({
  name: 'flowSection',
  title: 'Flow (states in one figure)',
  type: 'object',
  fields: [
    anchor,
    eyebrow,
    title,
    body,
    defineField({ name: 'caption', type: 'string' }),
    defineField({
      name: 'steps',
      type: 'array',
      of: [{ type: 'object', fields: [defineField({ name: 'label', type: 'string' }), shot('shot')], preview: { select: { title: 'label' } } }],
    }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Flow' }) },
});

export const trustSection = defineType({
  name: 'trustSection',
  title: 'Privacy and control',
  type: 'object',
  description: 'Every claim must be true in the product.',
  fields: [
    title,
    intro,
    defineField({
      name: 'items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', type: 'string' }),
            defineField({ name: 'text', type: 'text', rows: 2 }),
            defineField({ name: 'icon', type: 'string', description: 'Icon key: lock, analytics, ai, leave, ...' }),
          ],
          preview: { select: { title: 'title' } },
        },
      ],
    }),
    link,
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Privacy and control' }) },
});

export const factsSection = defineType({
  name: 'factsSection',
  title: 'Product facts',
  type: 'object',
  description: 'Verifiable product facts only: no user counts, quotes or logos.',
  fields: [
    eyebrow,
    title,
    defineField({
      name: 'items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [defineField({ name: 'value', type: 'string' }), defineField({ name: 'label', type: 'string' }), defineField({ name: 'text', type: 'string' })],
          preview: { select: { title: 'value', subtitle: 'label' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Product facts' }) },
});
