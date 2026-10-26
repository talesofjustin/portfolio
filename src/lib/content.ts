// All site content in one shape, the shape the front-end script reads (window.__TOJ).
// With Sanity configured it comes from the CMS; without, from the local seed (the prototype's content).
import seed from '../data/seed.json';

type Media = Record<string, { img?: string; mp4?: string; hls?: string; poster?: string; hi?: string; lo?: string }>;
export type Content = typeof seed & { media: Media; local: string; source: 'seed' | 'sanity' };

const env = import.meta.env;
const PID = env.SANITY_PROJECT_ID as string | undefined;
const DS = (env.SANITY_DATASET as string) || 'production';
const BUNNY_HOST = env.BUNNY_CDN_HOST as string | undefined; // e.g. vz-1234abcd-567.b-cdn.net
const BUNNY_LIB = env.BUNNY_LIBRARY_ID as string | undefined;
const BUNNY_KEY = env.BUNNY_API_KEY as string | undefined;

let cache: Promise<Content> | null = null;
export function getContent(): Promise<Content> {
  if (!cache) cache = PID ? fromSanity() : Promise.resolve({ ...seed, media: {}, local: '/m/', source: 'seed' } as Content);
  return cache;
}

/* ---------- Sanity ---------- */

const Q = `{
  "settings": *[_id == "siteSettings"][0]{
    ..., "selected": selected[]->_id, "reviews": reviews[]->{...},
    "clients": clients[]{name, "project": project->_id},
    "bts": bts[]{caption, image}, btsRail, aboutImage, contactVideo
  },
  "projects": *[_type == "project" && !(_id in path("drafts.**"))] | order(date desc){..., "quote": quote->_id}
}`;

async function groq(query: string) {
  const url = `https://${PID}.apicdn.sanity.io/v2025-01-01/data/query/${DS}?query=${encodeURIComponent(query)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sanity query failed: ${r.status} ${await r.text()}`);
  return (await r.json()).result;
}

async function fromSanity(): Promise<Content> {
  const { settings: S = {}, projects: docs = [] } = await groq(Q);
  const media: Media = {};

  // images: one name per asset, served by the Sanity CDN in any size and format
  const img = (i: any): string | null => {
    const ref: string | undefined = i?.asset?._ref;
    if (!ref) return null;
    const [, id, dim, fmt] = ref.split('-'); // image-<id>-<w>x<h>-<fmt>
    const name = 'i-' + id;
    if (!media[name]) {
      let url = `https://cdn.sanity.io/images/${PID}/${DS}/${id}-${dim}.${fmt}`;
      // the focus point chosen in the CMS
      if (i.hotspot) url += `?fp-x=${i.hotspot.x.toFixed(3)}&fp-y=${i.hotspot.y.toFixed(3)}&crop=focalpoint&fit=crop`;
      media[name] = { img: url };
    }
    return name;
  };
  // videos: a Bunny Stream id; MP4 renditions for loops, HLS for the full film
  const vids: string[] = [];
  const vid = (v: any): string | null => {
    const id: string | undefined = (typeof v === 'string' ? v : v?.videoId)?.trim();
    if (!id || !BUNNY_HOST) return null;
    const name = 'v-' + id;
    if (!media[name]) {
      const base = `https://${BUNNY_HOST}/${id}/`;
      media[name] = { mp4: base + 'play_', hls: base + 'playlist.m3u8', poster: base + 'thumbnail.jpg' };
      vids.push(id);
    }
    return name;
  };
  const imgs = (a: any[] | undefined) => (a || []).map(img).filter(Boolean) as string[];

  const ordered = [
    ...((S.selected || []) as string[]).map((id) => docs.find((d: any) => d._id === id)).filter(Boolean),
    ...docs.filter((d: any) => !(S.selected || []).includes(d._id)),
  ];
  const reviews = (S.reviews || []).filter(Boolean);

  const projects = ordered.map((d: any) => {
    const stills = imgs(d.stills);
    const hero = img(d.heroImage);
    const film = vid(d.film);
    const landing = (d.landingClips || []).map(vid).filter(Boolean);
    const deliverables = (d.deliverables || []).map((x: any) => [vid(x.video), x.label || 'Cut-down']).filter((x: any) => x[0]);
    const med = d.mediaType === 'photo' ? ['Photo'] : d.mediaType === 'both' ? ['Film', 'Photo'] : ['Film'];
    const qi = d.quote ? reviews.findIndex((r: any) => r._id === d.quote) : -1;
    return {
      id: d._id,
      slug: d.slug?.current,
      title: d.title,
      client: d.client || '',
      type: d.type || '',
      role: d.role || '',
      place: d.place || undefined,
      lede: d.lede || '',
      desc: d.desc || '',
      video: film || undefined,
      bg: hero || undefined,
      stills: stills.length ? stills : hero ? [hero] : [],
      med,
      work: d.work || 'Commercial',
      kind: d.kind || '',
      sel: (S.selected || []).includes(d._id),
      landing,
      clips: (d.aboutClips || []).map(vid).filter(Boolean),
      films: film || deliverables.length ? [...(film ? [[film, 'The film']] : []), ...deliverables] : [],
      brief: d.brief || undefined,
      brief2: d.brief2 || undefined,
      askImage: img(d.askImage) || undefined,
      approachLead: d.approachLead || undefined,
      approachText: d.approachText || undefined,
      approachImage: img(d.approachImage) || undefined,
      how: (d.how || []).map((h: any) => ({
        title: h.title, text: h.text,
        media: h.video ? vid(h.video) : img(h.image), video: !!h.video,
      })),
      btsImages: imgs(d.btsImages),
      credits: (d.credits || []).map((c: any) => [c.role, c.name || null]),
      quote: qi > -1 ? qi : undefined,
      off: d.hide || {},
    };
  }).filter((p: any) => p.slug && p.stills.length);

  const content: Content = {
    projects,
    reviews: reviews.map((r: any) => ({
      text: r.text, name: r.name, co: r.company || '',
      ctx: [r.company, r.source ? 'on ' + r.source : '', r.note].filter(Boolean).join(', '),
      bg: img(r.image) || projects[0]?.stills[0], source: r.source || '', url: r.url || '',
    })),
    clients: (S.clients || []).map((c: any) => ({ name: c.name, project: c.project || null })),
    bts: (S.bts || []).map((b: any) => ({ img: img(b.image), caption: b.caption || '' })).filter((b: any) => b.img),
    btsRail: imgs(S.btsRail),
    landing: projects.filter((p: any) => p.sel).flatMap((p: any) => p.landing),
    settings: {
      aboutImage: img(S.aboutImage) || projects[0]?.stills[0],
      contactVideo: vid(S.contactVideo) || 'sea',
      email: S.email || seed.settings.email,
      linkedin: S.linkedin || seed.settings.linkedin,
      instagram: S.instagram || seed.settings.instagram,
      youtube: S.youtube || seed.settings.youtube,
    },
    media, local: '/m/', source: 'sanity',
  } as any;
  await bunnyResolutions(vids, media);
  return content;
}

// which MP4 renditions exist for each video (Bunny never upscales, and stops at 1080p)
async function bunnyResolutions(ids: string[], media: Media) {
  if (!BUNNY_LIB || !BUNNY_KEY) return;
  await Promise.all(ids.map(async (id) => {
    try {
      const r = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIB}/videos/${id}`, { headers: { AccessKey: BUNNY_KEY } });
      if (!r.ok) return;
      const v = await r.json();
      const have = String(v.availableResolutions || '').split(',').map((x) => parseInt(x)).filter((x) => x && x <= 1080).sort((a, b) => a - b);
      if (!have.length) return;
      const hi = have[have.length - 1];
      const lo = have.filter((x) => x <= 720).pop() || have[0];
      media['v-' + id].hi = hi + 'p';
      media['v-' + id].lo = lo + 'p';
    } catch {}
  }));
}
