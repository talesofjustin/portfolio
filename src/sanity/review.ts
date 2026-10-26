import { defineType, defineField } from 'sanity';
import { ProjectStillPicker } from './ProjectStillPicker';

// Reviews are copied word for word from Google or Trustpilot, with a link to the original.
export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  fields: [
    defineField({ name: 'text', title: 'Tekst (letterlijk)', type: 'text', rows: 6, validation: (r) => r.required() }),
    defineField({ name: 'name', title: 'Naam', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'company', title: 'Bedrijf', type: 'string' }),
    defineField({ name: 'project', title: 'Project', type: 'reference', to: [{ type: 'project' }],
      description: 'Het project waar deze review over gaat. De review verschijnt dan ook als quote op die projectpagina.' }),
    defineField({ name: 'source', title: 'Bron', type: 'string', options: { list: ['Google', 'Trustpilot', 'LinkedIn', 'Email'], layout: 'radio', direction: 'horizontal' } }),
    defineField({ name: 'url', title: 'Link naar het origineel', type: 'url' }),
    defineField({ name: 'note', title: 'Toevoeging', type: 'string', description: 'Bijv. "translated from Dutch".' }),
    defineField({ name: 'image', title: 'Achtergrondbeeld', type: 'image', options: { hotspot: true }, components: { input: ProjectStillPicker } }),
  ],
  preview: { select: { title: 'name', subtitle: 'company', media: 'image' } },
});
