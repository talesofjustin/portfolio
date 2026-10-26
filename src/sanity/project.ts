import { defineType, defineField, defineArrayMember } from 'sanity';

const img = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'image', options: { hotspot: true }, description });

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    { name: 'basis', title: 'Basis', default: true },
    { name: 'media', title: 'Beeld & video' },
    { name: 'story', title: 'Verhaal' },
    { name: 'extra', title: 'Credits & modules' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Titel', type: 'string', group: 'basis', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'URL', type: 'slug', group: 'basis', options: { source: 'title' }, validation: (r) => r.required(), description: 'Wordt talesofjustin.com/work/…' }),
    defineField({ name: 'client', title: 'Klant', type: 'string', group: 'basis', description: 'Bij eigen werk: "Personal film".' }),
    defineField({ name: 'date', title: 'Datum', type: 'date', group: 'basis', description: 'Bepaalt de volgorde in het archief (nieuwste eerst).' }),
    defineField({ name: 'mediaType', title: 'Soort', type: 'string', group: 'basis', initialValue: 'film',
      options: { list: [{ title: 'Film', value: 'film' }, { title: 'Foto', value: 'photo' }, { title: 'Film & foto', value: 'both' }], layout: 'radio', direction: 'horizontal' } }),
    defineField({ name: 'work', title: 'Opdracht of eigen werk', type: 'string', group: 'basis', initialValue: 'Commercial',
      options: { list: [{ title: 'Opdracht', value: 'Commercial' }, { title: 'Eigen werk', value: 'Personal' }], layout: 'radio', direction: 'horizontal' } }),
    defineField({ name: 'kind', title: 'Categorie', type: 'string', group: 'basis',
      options: { list: ['Music video', 'Brand & social', 'Travel', 'Event', 'Corporate'] } }),
    defineField({ name: 'type', title: 'Type (label)', type: 'string', group: 'basis', description: 'Bijv. "Brand film", "Photography", "Social content".' }),
    defineField({ name: 'role', title: 'Mijn rol', type: 'string', group: 'basis', description: 'Bijv. "Direction, camera & edit". Wordt ook "What I did".' }),
    defineField({ name: 'place', title: 'Locatie', type: 'string', group: 'basis' }),
    defineField({ name: 'lede', title: 'Eén zin: wat is het, voor wie', type: 'string', group: 'basis', description: 'Bijv. "A brand film for Roots Grow North."' }),
    defineField({ name: 'desc', title: 'Korte toevoeging onder de titel', type: 'string', group: 'basis', description: 'Bijv. "Back to basics, six days without signal."' }),

    defineField({ name: 'film', title: 'De film', type: 'bunnyVideo', group: 'media', description: 'De hoofdfilm. Speelt bovenaan en achter "Play the film".' }),
    defineField({ name: 'landingClips', title: 'Loops voor de homepage', type: 'array', group: 'media', of: [defineArrayMember({ type: 'bunnyVideo' })],
      description: 'Korte stille loops die op de homepage spelen als dit project in Selected work staat.' }),
    defineField({ name: 'deliverables', title: 'Deliverables', type: 'array', group: 'media',
      description: 'Extra versies naast de film: cut-downs, reels, een tweede take.',
      of: [defineArrayMember({ type: 'object', name: 'deliverable', fields: [
        defineField({ name: 'label', title: 'Naam', type: 'string', description: 'Bijv. "Cut-down 01", "Reel 9:16".' }),
        defineField({ name: 'video', title: 'Video', type: 'bunnyVideo' }),
      ], preview: { select: { title: 'label' } } })] }),
    defineField({ name: 'aboutClips', title: 'Clips voor About', type: 'array', group: 'media', of: [defineArrayMember({ type: 'bunnyVideo' })],
      description: 'Spelen in het rasterbeeld als iemand bij About op deze klant klikt.' }),
    img('heroImage', 'Hoofdbeeld', 'Voor fotoprojecten (of als poster als er geen film is).'),
    defineField({ name: 'stills', title: 'Stills', type: 'array', group: 'media', of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      options: { layout: 'grid' }, description: 'Sleep de originele bestanden hierin, geen exports nodig. De eerste is ook de thumbnail in het archief.' }),
    defineField({ name: 'btsImages', title: 'Behind the scenes', type: 'array', group: 'media', of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      options: { layout: 'grid' }, description: 'De sleepbare strook op de projectpagina. Leeg = geen BTS-strook op deze pagina.' }),

    defineField({ name: 'brief', title: 'The ask', type: 'text', rows: 3, group: 'story' }),
    defineField({ name: 'brief2', title: 'The ask (tweede alinea)', type: 'text', rows: 3, group: 'story' }),
    { ...img('askImage', 'Beeld bij The ask'), group: 'story' },
    defineField({ name: 'approachLead', title: 'Approach: de kern', type: 'text', rows: 2, group: 'story' }),
    defineField({ name: 'approachText', title: 'Approach: alinea\'s', type: 'array', group: 'story', of: [defineArrayMember({ type: 'text', rows: 3 })] }),
    { ...img('approachImage', 'Beeld bij Approach'), group: 'story' },
    defineField({ name: 'how', title: 'How it happened', type: 'array', group: 'story',
      of: [defineArrayMember({ type: 'object', name: 'howItem', fields: [
        defineField({ name: 'title', title: 'Kop', type: 'string', description: 'Bijv. "Location", "Gear choices".' }),
        defineField({ name: 'text', title: 'Tekst', type: 'text', rows: 3 }),
        defineField({ name: 'image', title: 'Beeld', type: 'image', options: { hotspot: true } }),
        defineField({ name: 'video', title: 'Of een clip', type: 'bunnyVideo' }),
      ], preview: { select: { title: 'title', media: 'image' } } })] }),
    defineField({ name: 'quote', title: 'Quote', type: 'reference', to: [{ type: 'review' }], group: 'story',
      description: 'Leeg = automatisch een review van deze klant, als die er is.' }),

    defineField({ name: 'credits', title: 'Credits', type: 'array', group: 'extra',
      of: [defineArrayMember({ type: 'object', name: 'credit', fields: [
        defineField({ name: 'role', title: 'Rol', type: 'string' }),
        defineField({ name: 'name', title: 'Naam', type: 'string' }),
      ], preview: { select: { title: 'role', subtitle: 'name' } } })] }),
    defineField({ name: 'hide', title: 'Onderdelen verbergen', type: 'object', group: 'extra', options: { columns: 2 },
      fields: ['deliverables', 'stills', 'bts', 'quote', 'credits'].map((k) =>
        defineField({ name: k, title: { deliverables: 'Deliverables', stills: 'Stills', bts: 'Behind the scenes', quote: 'Quote', credits: 'Credits' }[k], type: 'boolean', initialValue: false })) }),
  ],
  orderings: [{ title: 'Nieuwste eerst', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', subtitle: 'client', media: 'stills.0', hero: 'heroImage' },
    prepare: ({ title, subtitle, media, hero }) => ({ title, subtitle, media: media || hero }),
  },
});
