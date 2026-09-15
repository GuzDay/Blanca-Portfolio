// @ts-check
import { defineConfig } from 'astro/config';

// Dirección de la web. Por defecto, blancagtarrio.com.
// Al publicar en GitHub Pages se cambian con variables de entorno
// (ver .github/workflows/publicar.yml): SITIO=https://guzday.github.io y RUTA_BASE=/Blanca-Portfolio
const SITIO = process.env.SITIO || 'https://blancagtarrio.com';
const RUTA_BASE = process.env.RUTA_BASE || '/';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: SITIO,
  base: RUTA_BASE,
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
