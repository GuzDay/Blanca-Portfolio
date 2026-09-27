// Instrucciones para los buscadores. Se genera solo para que la dirección del
// mapa del sitio sea la de verdad (github.io ahora, el dominio propio después).
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  // BASE_URL es "/" con dominio propio y "/Blanca-Portfolio" en GitHub Pages,
  // con barra final o sin ella según el caso
  const base = import.meta.env.BASE_URL.replace(/\/*$/, '/');
  const mapa = new URL(`${base}sitemap.xml`, site).href;
  const texto = `User-agent: *
Allow: /

Sitemap: ${mapa}
`;
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
