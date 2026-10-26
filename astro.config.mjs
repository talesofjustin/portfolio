import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sanity from '@sanity/astro';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const projectId = env.SANITY_PROJECT_ID || env.PUBLIC_SANITY_PROJECT_ID || 'missing';
const dataset = env.SANITY_DATASET || 'production';

export default defineConfig({
  site: 'https://talesofjustin.com',
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'never',
  vite: { define: {
    'import.meta.env.PUBLIC_SANITY_PROJECT_ID': JSON.stringify(projectId),
    'import.meta.env.PUBLIC_SANITY_DATASET': JSON.stringify(dataset),
  } },
  integrations: [
    // the CMS lives at talesofjustin.com/studio
    sanity({ projectId, dataset, useCdn: true, studioBasePath: '/studio' }),
    react(),
  ],
});
