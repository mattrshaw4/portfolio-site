import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mattrshaw.com',
  trailingSlash: 'always',
  markdown: { syntaxHighlight: false },
  integrations: [sitemap()],
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
