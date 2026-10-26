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
  ],
  preview: {
    select: { id: 'videoId' },
    prepare: ({ id }) => ({ title: id ? `Video ${id.slice(0, 8)}…` : 'Geen video', subtitle: 'Bunny Stream' }),
  },
});
