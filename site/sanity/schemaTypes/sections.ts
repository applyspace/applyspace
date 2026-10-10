import { defineField, defineType } from 'sanity';

const title = defineField({ name: 'title', type: 'string', validation: (r) => r.required() });
const intro = defineField({ name: 'intro', type: 'text', rows: 2 });

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
  fields: [title, defineField({ name: 'text', type: 'text', rows: 2 }), defineField({ name: 'cta', type: 'cta', validation: (r) => r.required() })],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title, subtitle: 'Call to action' }) },
});
