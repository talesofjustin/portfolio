import { defineType, defineField } from 'sanity';

// A video on Bunny Stream: upload the master in Bunny, paste its Video ID here.
export const bunnyVideo = defineType({
  name: 'bunnyVideo',
  title: 'Video (Bunny)',
  type: 'object',
  fields: [
    defineField({
      name: 'videoId',
      title: 'Bunny Video ID',
      type: 'string',
      description: 'Upload de masterfile in Bunny Stream en plak hier de Video ID (bijv. 3f9c1a2e-…).',
      validation: (r) => r.regex(/^[0-9a-f-]{36}$/i, { name: 'Bunny Video ID' }).warning(),
    }),
    defineField({
      name: 'portraitId',
      title: '9:16-versie (optioneel)',
      type: 'string',
      description: 'Video ID van de staande versie. Telefoons en staande tablets krijgen die; "Play the film" blijft altijd de liggende.',
      validation: (r) => r.regex(/^[0-9a-f-]{36}$/i, { name: 'Bunny Video ID' }).warning(),
    }),
    defineField({
      name: 'focus',
      title: 'Focus links–rechts (%)',
      type: 'number',
      description: 'Zonder 9:16-versie wordt de liggende video op een staand scherm bijgesneden. 0 = linkerkant, 50 = midden, 100 = rechterkant.',
      validation: (r) => r.min(0).max(100),
    }),
  ],
  preview: {
    select: { id: 'videoId' },
    prepare: ({ id }) => ({ title: id ? `Video ${id.slice(0, 8)}…` : 'Geen video', subtitle: 'Bunny Stream' }),
  },
});
