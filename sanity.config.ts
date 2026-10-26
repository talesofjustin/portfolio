import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity';

export default defineConfig({
  name: 'talesofjustin',
  title: 'Tales of Justin',
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'missing',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list().title('Content').items([
          S.listItem().title('Site').id('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
          S.divider(),
          S.documentTypeListItem('project').title('Projecten'),
          S.documentTypeListItem('review').title('Reviews'),
        ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    // the site document is a single one, not a list
    templates: (t) => t.filter(({ schemaType }) => schemaType !== 'siteSettings'),
  },
  document: {
    actions: (prev, ctx) => (ctx.schemaType === 'siteSettings' ? prev.filter(({ action }) => !['unpublish', 'delete', 'duplicate'].includes(action!)) : prev),
  },
});
