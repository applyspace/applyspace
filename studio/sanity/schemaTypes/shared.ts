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
    defineField({ name: 'kind', type: 'string', options: { list: [{ title: 'Internal page', value: 'internal' }, { title: 'Opens the app', value: 'app' }] }, initialValue: 'internal' }),
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
