import { defineType, defineField, defineArrayMember } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site',
  type: 'document',
  groups: [
    { name: 'home', title: 'Home & About', default: true },
    { name: 'bts', title: 'Off the record' },
    { name: 'reviews', title: 'Reviews' },
    { name: 'contact', title: 'Contact' },
  ],
  fields: [
    defineField({ name: 'selected', title: 'Selected work', type: 'array', group: 'home', of: [defineArrayMember({ type: 'reference', to: [{ type: 'project' }] })],
      description: 'De projecten in de lijst op de homepage, in deze volgorde. Sleep om te ordenen.', validation: (r) => r.max(8) }),
    defineField({ name: 'aboutImage', title: 'Beeld bij About', type: 'image', group: 'home', options: { hotspot: true } }),
    defineField({ name: 'clients', title: 'Klanten (About)', type: 'array', group: 'home',
      of: [defineArrayMember({ type: 'object', name: 'clientItem', fields: [
        defineField({ name: 'name', title: 'Naam', type: 'string' }),
        defineField({ name: 'project', title: 'Project (optioneel)', type: 'reference', to: [{ type: 'project' }], description: 'Met een project wordt de naam klikbaar.' }),
      ], preview: { select: { title: 'name', subtitle: 'project.title' } } })] }),
    defineField({ name: 'bts', title: 'Polaroids', type: 'array', group: 'bts', validation: (r) => r.max(12),
      of: [defineArrayMember({ type: 'object', name: 'polaroid', fields: [
        defineField({ name: 'image', title: 'Foto', type: 'image', options: { hotspot: true } }),
        defineField({ name: 'caption', title: 'Onderschrift', type: 'string', description: 'Handgeschreven onder de foto, kort.' }),
      ], preview: { select: { title: 'caption', media: 'image' } } })], description: 'Maximaal 12, in volgorde van boven naar beneden.' }),
    defineField({ name: 'reviews', title: 'Reviews op de homepage', type: 'array', group: 'reviews', of: [defineArrayMember({ type: 'reference', to: [{ type: 'review' }] })] }),
    defineField({ name: 'contactVideo', title: 'Video achter Contact', type: 'bunnyVideo', group: 'contact' }),
    defineField({ name: 'email', title: 'E-mail', type: 'string', group: 'contact', initialValue: 'hello@talesofjustin.com' }),
    defineField({ name: 'instagram', title: 'Instagram', type: 'url', group: 'contact' }),
    defineField({ name: 'youtube', title: 'YouTube', type: 'url', group: 'contact' }),
    defineField({ name: 'linkedin', title: 'LinkedIn', type: 'url', group: 'contact' }),
  ],
  preview: { prepare: () => ({ title: 'Site' }) },
});
