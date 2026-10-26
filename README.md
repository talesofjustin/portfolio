# talesofjustin.com

Portfolio van Justin Nederkoorn. Astro-site met de Viewfinder-vormgeving (GSAP + Lenis), content uit Sanity, video via Bunny Stream, gehost op Vercel.

## Hoe het in elkaar zit

| Onderdeel | Waar | Wat |
|---|---|---|
| Site | `src/components/Site.astro`, `body.html`, `public/app.js`, `src/styles/site.css` | Het prototype (v36), gevoed met data in plaats van vaste lijsten |
| Content | `src/lib/content.ts` | Haalt alles uit Sanity; zonder Sanity-instellingen draait de site op `src/data/seed.json` + `public/m` |
| CMS | `talesofjustin.com/studio` (`sanity.config.ts`, `src/sanity/*`) | Projecten, reviews, polaroids, klanten, teksten |
| Video | Bunny Stream | MP4 (720p/1080p, per scherm) voor de loops, HLS (adaptief) voor de volledige film |
| Beeld | Sanity CDN | Originelen uploaden; formaat (WebP/AVIF) en grootte gaan automatisch |
| Contact | `src/pages/api/contact.ts` | Formulier → Resend → je inbox, met reply-to naar de afzender |
| Projectpagina's | `/work/<slug>` | Eigen URL, titel en deelplaatje per project |
| Oude Shopify-links | `vercel.json` | Doorgestuurd naar de nieuwe site |

## Lokaal draaien

```
npm install
cp .env.example .env   # invullen, of leeg laten voor de seed-content
npm run dev
```

## Omgevingsvariabelen (Vercel → Settings → Environment Variables)

Zie `.env.example`. `SANITY_PROJECT_ID`, `BUNNY_CDN_HOST`, `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY`, `RESEND_API_KEY`.

## Publiceren

Wijzigingen in de Studio worden pas zichtbaar na een nieuwe build. Koppel daarom een Vercel Deploy Hook aan een Sanity-webhook (Sanity → API → Webhooks, trigger op create/update/delete). Dan staat elke publicatie binnen een minuut live.

## Eenmalig: prototype-content naar Sanity en Bunny

```
SANITY_PROJECT_ID=… SANITY_WRITE_TOKEN=… BUNNY_LIBRARY_ID=… BUNNY_API_KEY=… node scripts/import-seed.mjs
```
