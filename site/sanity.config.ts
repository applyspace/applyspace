import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';

/**
 * Sanity Studio config. Run with `pnpm studio` (needs NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET).
 * The studio is a separate app from the website: it is not part of the Next.js bundle.
 */
export default defineConfig({
  name: 'applyspace',
  title: 'applyspace website',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'missing-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Website')
          .items([
            S.listItem().title('Site settings').child(S.documentList().title('Site settings').filter('_type == "siteSettings"')),
            S.documentTypeListItem('page').title('Pages'),
            S.documentTypeListItem('feature').title('Features'),
            S.documentTypeListItem('pricingPlan').title('Pricing plans'),
            S.documentTypeListItem('resource').title('Resources'),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
