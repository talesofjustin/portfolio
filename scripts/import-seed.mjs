// One-off: moves the prototype content (src/data/seed.json + public/m) into Sanity and Bunny Stream,
// so the CMS starts filled in and every project can be edited from there.
//
//   SANITY_PROJECT_ID=… SANITY_DATASET=production SANITY_WRITE_TOKEN=… \
//   BUNNY_LIBRARY_ID=… BUNNY_API_KEY=… node scripts/import-seed.mjs
//
// Safe to run again: documents get fixed ids and are replaced; uploads are cached in scripts/.import-cache.json.
import { createClient } from '@sanity/client';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seed.json'), 'utf8'));
const M = path.join(root, 'public/m');
const cacheFile = path.join(root, 'scripts/.import-cache.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const save = () => fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));

const { SANITY_PROJECT_ID, SANITY_DATASET = 'production', SANITY_WRITE_TOKEN, BUNNY_LIBRARY_ID, BUNNY_API_KEY } = process.env;
if (!SANITY_PROJECT_ID || !SANITY_WRITE_TOKEN || !BUNNY_LIBRARY_ID || !BUNNY_API_KEY) {
  console.error('Missing env: SANITY_PROJECT_ID, SANITY_WRITE_TOKEN, BUNNY_LIBRARY_ID, BUNNY_API_KEY');
  process.exit(1);
}
const sanity = createClient({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET, token: SANITY_WRITE_TOKEN, apiVersion: '2025-01-01', useCdn: false });

let n = 0;
const key = () => 'k' + (n++).toString(36);

async function image(name) {
  if (!name) return undefined;
  const k = 'img:' + name;
  if (!cache[k]) {
    const file = path.join(M, name + '.jpg');
    if (!fs.existsSync(file)) { console.warn('  no image', name); return undefined; }
    const a = await sanity.assets.upload('image', fs.createReadStream(file), { filename: name + '.jpg' });
    cache[k] = a._id; save();
    console.log('  image', name);
  }
  return { _type: 'image', asset: { _type: 'reference', _ref: cache[k] } };
}

async function video(name) {
  if (!name) return undefined;
  const k = 'vid:' + name;
  if (!cache[k]) {
    const file = path.join(M, name + '.mp4');
    if (!fs.existsSync(file)) { console.warn('  no video', name); return undefined; }
    const api = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    const created = await (await fetch(api, { method: 'POST', headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name }) })).json();
    if (!created.guid) throw new Error('Bunny create failed: ' + JSON.stringify(created));
    const up = await fetch(`${api}/${created.guid}`, { method: 'PUT', headers: { AccessKey: BUNNY_API_KEY }, body: fs.readFileSync(file) });
    if (!up.ok) throw new Error('Bunny upload failed: ' + up.status);
    cache[k] = created.guid; save();
    console.log('  video', name, created.guid);
  }
  return { _type: 'bunnyVideo', videoId: cache[k] };
}

const arr = async (names, fn) => (await Promise.all((names || []).map(fn))).filter(Boolean).map((x) => ({ _key: key(), ...x }));
const docId = (prefix, id) => `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;

// reviews
const reviewIds = [];
for (const [i, r] of seed.reviews.entries()) {
  const _id = docId('review', r.name.toLowerCase().split(' ')[0] + i);
  reviewIds.push(_id);
  await sanity.createOrReplace({
    _id, _type: 'review', text: r.text, name: r.name, company: r.co === 'Client' ? undefined : r.co,
    source: r.source || undefined, url: r.url || undefined,
    note: /translated from Dutch/.test(r.ctx) ? 'translated from Dutch' : undefined, image: await image(r.bg),
  });
  console.log('review', r.name);
}

// projects (dates only order the archive: the seed order, newest first)
const projIds = {};
const today = new Date();
for (const [i, p] of seed.projects.entries()) {
  const _id = docId('project', p.id);
  projIds[p.id] = _id;
  const d = new Date(today); d.setMonth(d.getMonth() - i);
  const films = p.video2 ? [p.video2] : [];
  await sanity.createOrReplace({
    _id, _type: 'project', title: p.title, slug: { _type: 'slug', current: p.slug }, client: p.client,
    date: d.toISOString().slice(0, 10),
    mediaType: p.med.length > 1 ? 'both' : p.med[0] === 'Photo' ? 'photo' : 'film',
    work: p.work, kind: p.kind, type: p.type, role: p.role, place: p.place, lede: p.lede, desc: p.desc,
    film: await video(p.video),
    landingClips: await arr(p.landing, video),
    deliverables: [
      ...(await arr(films, async (v) => ({ _type: 'deliverable', label: 'Second take', video: await video(v) }))),
      ...(await arr(p.clips, async (v, k) => ({ _type: 'deliverable', label: 'Cut-down ' + String(k + 1).padStart(2, '0'), video: await video(v) }))),
    ],
    aboutClips: await arr(p.clips, video),
    heroImage: await image(p.bg),
    stills: await arr(p.stills, image),
  });
  console.log('project', p.title);
}

await sanity.createOrReplace({
  _id: 'siteSettings', _type: 'siteSettings',
  selected: seed.projects.filter((p) => p.sel).map((p) => ({ _key: key(), _type: 'reference', _ref: projIds[p.id] })),
  aboutImage: await image(seed.settings.aboutImage),
  clients: seed.clients.map((c) => ({ _key: key(), _type: 'clientItem', name: c.name, ...(c.project ? { project: { _type: 'reference', _ref: projIds[c.project] } } : {}) })),
  bts: await arr(seed.bts, async (b) => ({ _type: 'polaroid', caption: b.caption, image: await image(b.img) })),
  reviews: reviewIds.map((id) => ({ _key: key(), _type: 'reference', _ref: id })),
  contactVideo: await video(seed.settings.contactVideo),
  email: seed.settings.email, instagram: seed.settings.instagram, youtube: seed.settings.youtube, linkedin: seed.settings.linkedin,
});
console.log('settings done');
