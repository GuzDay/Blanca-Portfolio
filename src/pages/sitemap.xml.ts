// Mapa del sitio para Google: lista todas las páginas en los dos idiomas.
import type { APIRoute } from 'astro';
import { categorias, type Idioma } from '../i18n/categorias';
import { proyectos } from '../lib/contenido';
import { urlAvisoLegal, urlCategoria, urlContacto, urlInicio, urlPrivacidad, urlProyecto } from '../lib/rutas';

export const GET: APIRoute = ({ site }) => {
  const idiomas: Idioma[] = ['es', 'en'];
  const rutas = idiomas.flatMap((idioma) => [
    urlInicio(idioma),
    ...categorias.map((categoria) => urlCategoria(categoria, idioma)),
    ...proyectos.map((proyecto) => urlProyecto(proyecto, idioma)),
    urlContacto(idioma),
    urlAvisoLegal(idioma),
    urlPrivacidad(idioma),
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((ruta) => `  <url><loc>${new URL(ruta, site).href}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
