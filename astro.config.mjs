// @ts-check
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://blancagtarrio.com',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: false, // español sin prefijo (/moda), inglés con /en (/en/fashion)
    },
  },
  build: {
    format: 'directory',
  },
});
