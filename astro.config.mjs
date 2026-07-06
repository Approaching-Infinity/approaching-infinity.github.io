// @ts-check
import { defineConfig } from 'astro/config';

// Published at the org-root GitHub Pages URL, so base is '/'.
// A custom domain later needs only a public/CNAME file + this `site` value updated.
export default defineConfig({
  site: 'https://approaching-infinity.github.io',
  build: { format: 'directory' },
});
