// Categorías de la web, en el orden en que salen en el menú.
// "carpeta" es el nombre de la carpeta dentro de contenido/proyectos.
// "slug" es cómo aparece en la dirección web en cada idioma (/moda, /en/fashion).

export type Idioma = 'es' | 'en';

export interface Categoria {
  carpeta: string;
  slug: Record<Idioma, string>;
  nombre: Record<Idioma, string>;
}

export const categorias: Categoria[] = [
  { carpeta: 'moda', slug: { es: 'moda', en: 'fashion' }, nombre: { es: 'Moda', en: 'Fashion' } },
  { carpeta: 'interiorismo', slug: { es: 'interiorismo', en: 'interiors' }, nombre: { es: 'Interiorismo', en: 'Interiors' } },
  { carpeta: 'eventos', slug: { es: 'eventos', en: 'events' }, nombre: { es: 'Eventos', en: 'Events' } },
  { carpeta: 'foto-fija', slug: { es: 'foto-fija', en: 'film-stills' }, nombre: { es: 'Foto fija', en: 'Film stills' } },
  { carpeta: 'musica', slug: { es: 'musica', en: 'music' }, nombre: { es: 'Música', en: 'Music' } },
  { carpeta: 'viajes', slug: { es: 'viajes', en: 'travel' }, nombre: { es: 'Viajes', en: 'Travel' } },
];
