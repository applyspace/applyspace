import { defineArrayMember, defineField, defineType } from 'sanity';
import { languageField, seoFields, seoGroups } from './shared';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    languageField,
    defineField({ name: 'siteName', type: 'string', initialValue: 'applyspace', validation: (r) => r.required() }),
    defineField({ name: 'tagline', type: 'string', initialValue: 'Find the right offers, track your applications and prepare your interviews.' }),
    defineField({ name: 'description', title: 'Default description', type: 'text', rows: 3 }),
    defineField({ name: 'nav', title: 'Header navigation', type: 'array', of: [{ type: 'navLink' }] }),
    defineField({ name: 'footerNav', title: 'Footer navigation', type: 'array', of: [{ type: 'navLink' }] }),
    defineField({ name: 'social', title: 'Social profiles', type: 'array', of: [{ type: 'object', name: 'socialLink', fields: [defineField({ name: 'label', type: 'string' }), defineField({ name: 'url', type: 'url' })] }] }),
    defineField({ name: 'contactEmail', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  groups: seoGroups,
  fields: [
    languageField,
    defineField({ name: 'slug', type: 'string', options: { list: ['home', 'product', 'pricing', 'resources'] }, validation: (r) => r.required() }),
    defineField({ name: 'heading', title: 'H1', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'eyebrow', type: 'string', description: 'Small line above the H1 (homepage).' }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
    defineField({ name: 'ctas', title: 'Hero buttons', type: 'array', of: [{ type: 'cta' }], validation: (r) => r.max(2) }),
    defineField({ name: 'note', title: 'Hero microcopy', type: 'string', description: 'Small line under the hero buttons.' }),
    defineField({ name: 'heroShot', title: 'Hero product shot', type: 'productShot' }),
    defineField({
      name: 'sections',
      type: 'array',
      of: [
        'cardsSection', 'stepsSection', 'textSection', 'faqSection', 'plansSection', 'featuresSection', 'ctaSection',
        'scatterSection', 'spotlightSection', 'viewsSection', 'flowSection', 'trustSection', 'factsSection',
      ].map((type) => defineArrayMember({ type })),
    }),
    ...seoFields,
  ],
  preview: { select: { title: 'heading', subtitle: 'slug' } },
});

export const feature = defineType({
  name: 'feature',
  title: 'Feature',
  type: 'document',
  fields: [
    languageField,
    defineField({ name: 'anchor', title: 'Anchor id', type: 'string', description: 'Used in the URL: /product#<anchor>. Lowercase, dashes. Do not change once published.', validation: (r) => r.required().regex(/^[a-z0-9-]+$/) }),
    defineField({ name: 'theme', type: 'string', options: { list: ['start', 'find', 'track', 'prepare', 'profile', 'control'] }, validation: (r) => r.required() }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'summary', type: 'text', rows: 3, validation: (r) => r.required() }),
    defineField({ name: 'bullets', type: 'array', of: [{ type: 'string' }], validation: (r) => r.max(4) }),
    defineField({ name: 'icon', type: 'string' }),
    defineField({ name: 'plan', title: 'Lowest plan', type: 'string', options: { list: ['free', 'plus', 'max'] }, initialValue: 'free' }),
    defineField({ name: 'screenshot', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'screenshotAlt', title: 'Screenshot alt text', type: 'string', description: 'Describe what the screenshot shows.', validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'theme' } },
});

export const pricingPlan = defineType({
  name: 'pricingPlan',
  title: 'Pricing plan',
  type: 'document',
  fields: [
    languageField,
    defineField({ name: 'planKey', type: 'string', options: { list: ['free', 'plus', 'max'] }, validation: (r) => r.required() }),
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'tagline', type: 'string' }),
    defineField({ name: 'priceMonthly', title: 'Monthly price (EUR)', type: 'number', validation: (r) => r.min(0) }),
    defineField({ name: 'priceVisible', title: 'Show the price', type: 'boolean', initialValue: true }),
    defineField({ name: 'applicationsCap', type: 'number', description: 'Leave empty for unlimited. Must match the database cap (Free 15, Plus 99).' }),
    defineField({ name: 'searchProfilesCap', type: 'number', description: 'Leave empty for unlimited.' }),
    defineField({ name: 'interviewTemplatesCap', type: 'number', description: 'Leave empty for unlimited.' }),
    defineField({ name: 'intro', type: 'string', description: 'E.g. "Everything in Free, plus…"' }),
    defineField({ name: 'features', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'ctaLabel', type: 'string', initialValue: 'Start for free' }),
    defineField({ name: 'order', type: 'number' }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'planKey' } },
});

export const resource = defineType({
  name: 'resource',
  title: 'Resource (article)',
  type: 'document',
  groups: seoGroups,
  fields: [
    languageField,
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title', maxLength: 80 }, validation: (r) => r.required() }),
    defineField({ name: 'excerpt', type: 'text', rows: 3, description: 'Shown in lists and as the default meta description.', validation: (r) => r.required().max(200) }),
    defineField({ name: 'category', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'author', type: 'string', initialValue: 'The applyspace team' }),
    defineField({ name: 'publishedAt', type: 'date', validation: (r) => r.required() }),
    defineField({ name: 'updatedAt', type: 'date' }),
    defineField({ name: 'cover', type: 'image', options: { hotspot: true }, fields: [defineField({ name: 'alt', type: 'string', description: 'Required when a cover is set.', validation: (r) => r.custom((alt, ctx) => ((ctx.parent as { asset?: unknown } | undefined)?.asset && !alt ? 'Alt text is required' : true)) })] }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Paragraph', value: 'normal' }, { title: 'H2', value: 'h2' }, { title: 'H3', value: 'h3' }, { title: 'Quote', value: 'blockquote' }],
          lists: [{ title: 'Bullet', value: 'bullet' }, { title: 'Numbered', value: 'number' }],
        }),
        defineArrayMember({ type: 'image', fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })] }),
      ],
    }),
    ...seoFields,
  ],
  orderings: [{ title: 'Newest first', name: 'publishedDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
  preview: { select: { title: 'title', subtitle: 'category', media: 'cover' } },
});
