import { defineField, defineType } from 'sanity';

/** Language is a plain hidden field for now (only `en`); French documents will set it to `fr`. */
export const languageField = defineField({
  name: 'language',
  title: 'Language',
  type: 'string',
  options: { list: [{ title: 'English', value: 'en' }] },
  initialValue: 'en',
  validation: (rule) => rule.required(),
});

export const seoFields = [
  defineField({ name: 'seoTitle', title: 'SEO title', type: 'string', group: 'seo', description: 'Up to 60 characters. The site name is appended automatically.', validation: (r) => r.max(70).warning('Keep titles under 60 characters.') }),
  defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 3, group: 'seo', description: '120 to 155 characters.', validation: (r) => r.max(170).warning('Keep descriptions under 155 characters.') }),
  defineField({ name: 'ogImage', title: 'Social share image', type: 'image', group: 'seo', description: '1200 x 630. If empty, a card with the page title is generated.' }),
  defineField({ name: 'noindex', title: 'Hide from search engines', type: 'boolean', group: 'seo', initialValue: false }),
];

export const seoGroups = [{ name: 'seo', title: 'SEO' }];

export const cta = defineType({
  name: 'cta',
  title: 'Call to action',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'href', title: 'Path', type: 'string', description: 'Internal path (/pricing) or app path (/login).', validation: (r) => r.required() }),
    defineField({ name: 'kind', type: 'string', options: { list: [{ title: 'Internal page', value: 'internal' }, { title: 'Opens the app', value: 'app' }, { title: 'Desktop download', value: 'download' }] }, initialValue: 'internal' }),
  ],
});

export const navLink = defineType({
  name: 'navLink',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'href', title: 'Path', type: 'string', validation: (r) => r.required() }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});

const RATIOS = ['16/10', '4/3', '4/5', '3/2', '1/1'];

/**
 * A product visual slot. The image is a file in the repo (`apps/web/public/site/shots/<name>.avif`, see
 * docs/website-shots.md), not an upload: the site shows a placeholder until the file exists.
 */
export const productShot = defineType({
  name: 'productShot',
  title: 'Product shot',
  type: 'object',
  fields: [
    defineField({ name: 'name', title: 'Slot name', type: 'string', description: 'kebab-case file name without extension, e.g. a1-board.', validation: (r) => r.required().regex(/^[a-z0-9][a-z0-9-]*$/) }),
    defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'ratio', type: 'string', options: { list: RATIOS }, initialValue: '16/10' }),
    defineField({ name: 'caption', type: 'string', description: 'Shown as "Fig. N - caption". Leave empty for no caption.' }),
    defineField({ name: 'mobileName', title: 'Mobile slot name', type: 'string', description: 'Optional separate crop for phones.' }),
    defineField({ name: 'mobileRatio', type: 'string', options: { list: RATIOS }, initialValue: '4/5' }),
  ],
  preview: { select: { title: 'name', subtitle: 'caption' } },
});

export const textLink = defineType({
  name: 'textLink',
  title: 'Text link',
  type: 'object',
  fields: [defineField({ name: 'label', type: 'string' }), defineField({ name: 'href', title: 'Path', type: 'string' })],
});
