// Categorías de la web, en el orden en que salen en el menú.
// "carpeta" es el nombre de la carpeta dentro de contenido/proyectos.
// "slug" es cómo aparece en la dirección web en cada idioma (/moda, /en/fashion).

export type Idioma = 'es' | 'en';

export interface Categoria {
  carpeta: string;
  slug: Record<Idioma, string>;
  nombre: Record<Idioma, string>;
  // Cómo se nombra este trabajo cuando alguien lo busca. "Moda" sola no la
  // busca nadie; "fotografía de moda", sí. Se usa en las descripciones de cada
  // página y en el texto alternativo de las fotos.
  genero: Record<Idioma, string>;
}

export const categorias: Categoria[] = [
  {
    carpeta: 'moda',
    slug: { es: 'moda', en: 'fashion' },
    nombre: { es: 'Moda', en: 'Fashion' },
    genero: { es: 'fotografía de moda', en: 'fashion photography' },
  },
  {
    carpeta: 'interiorismo',
    slug: { es: 'interiorismo', en: 'interiors' },
    nombre: { es: 'Interiorismo', en: 'Interiors' },
    genero: { es: 'fotografía de interiorismo', en: 'interiors photography' },
  },
  {
    carpeta: 'eventos',
    slug: { es: 'eventos', en: 'events' },
    nombre: { es: 'Eventos', en: 'Events' },
    genero: { es: 'fotografía de eventos', en: 'event photography' },
  },
  {
    carpeta: 'foto-fija',
    slug: { es: 'foto-fija', en: 'film-stills' },
    nombre: { es: 'Foto fija', en: 'Film stills' },
    genero: { es: 'foto fija de rodaje', en: 'film stills photography' },
  },
  {
    carpeta: 'musica',
    slug: { es: 'musica', en: 'music' },
    nombre: { es: 'Música', en: 'Music' },
    genero: { es: 'fotografía musical', en: 'music photography' },
  },
  {
    carpeta: 'viajes',
    slug: { es: 'viajes', en: 'travel' },
    nombre: { es: 'Viajes', en: 'Travel' },
    genero: { es: 'fotografía de viajes', en: 'travel photography' },
  },
];
