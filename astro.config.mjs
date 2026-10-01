// @ts-check
import { defineConfig } from 'astro/config';
import { readdirSync, readFileSync, statSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Astro deja en la web una copia de cada foto original de contenido/, aunque la
// página nunca la pida: lo que se ve son los WebP que genera a partir de ella.
// Con los maestros a 3000 px eso son casi 200 MB de archivos que no abre nadie,
// y GitHub Pages solo admite 1 GB por web. Al terminar de construir se repasa
// lo publicado y se borran las copias que no menciona ningún archivo.
function quitarOriginalesSinUsar() {
  return {
    name: 'quitar-originales-sin-usar',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const raiz = fileURLToPath(dir);
        const TEXTO = new Set(['.html', '.css', '.js', '.xml', '.json', '.txt', '.svg']);
        const mencionados = new Set();
        const archivos = [];

        const recorrer = (carpeta) => {
          for (const nombre of readdirSync(carpeta)) {
            const ruta = join(carpeta, nombre);
            if (statSync(ruta).isDirectory()) recorrer(ruta);
            else archivos.push(ruta);
          }
        };
        recorrer(raiz);

        for (const ruta of archivos) {
          if (!TEXTO.has(extname(ruta).toLowerCase())) continue;
          for (const trozo of readFileSync(ruta, 'utf8').matchAll(/_astro\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png)/g)) {
            mencionados.add(trozo[0].split('/').pop());
          }
        }

        let borrados = 0;
        let ahorro = 0;
        for (const ruta of archivos) {
          const nombre = ruta.split('/').pop();
          if (!/\.(jpe?g|png)$/i.test(nombre)) continue;
          if (!ruta.includes('_astro')) continue; // fuera de _astro no se toca nada
          if (mencionados.has(nombre)) continue;
          ahorro += statSync(ruta).size;
          rmSync(ruta);
          borrados++;
        }
        if (borrados) {
          logger.info(`${borrados} originales que no pedía ninguna página, fuera (${(ahorro / 1048576).toFixed(0)} MB)`);
        }
      },
    },
  };
}

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
  integrations: [quitarOriginalesSinUsar()],
});
