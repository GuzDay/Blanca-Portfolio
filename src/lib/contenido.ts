// Lee la carpeta contenido/ y la convierte en datos para las páginas.
// Para añadir proyectos NO hace falta tocar este archivo: basta con crear carpetas.
import type { MarkdownInstance } from 'astro';
import { parse } from 'yaml';
import { categorias, type Categoria, type Idioma } from '../i18n/categorias';
import textoAjustes from '../../contenido/ajustes.yaml?raw';
import textoInicio from '../../contenido/home.yaml?raw';

export interface Foto {
  tipo: 'foto';
  archivo: string;
  imagen: ImageMetadata;
  vertical: boolean;
}

export interface Video {
  tipo: 'video';
  archivo: string;
  src: string;
  portada?: ImageMetadata;
  ancho: number;
  alto: number;
  vertical: boolean;
}

export type Elemento = Foto | Video;

export interface Proyecto {
  categoria: Categoria;
  slug: string;
  titulo: string;
  orden: number;
  portada: ImageMetadata;
  galeria: Elemento[];
}

export interface FotoInicio {
  imagen: ImageMetadata;
  vertical: boolean;
  proyecto: Proyecto;
}

export interface Ajustes {
  nombre: string;
  email: string;
  instagram: string;
  telefono?: string;
  titular: string;
  nif: string;
  domicilio: string;
}

const textosProyecto = import.meta.glob<string>('/contenido/proyectos/*/*/proyecto.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const imagenes = import.meta.glob<ImageMetadata>('/contenido/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  import: 'default',
  eager: true,
});
const videos = import.meta.glob<string>('/contenido/proyectos/*/*/*.{mp4,webm,MP4,WEBM}', {
  query: '?url',
  import: 'default',
  eager: true,
});
const bios = import.meta.glob<MarkdownInstance<Record<string, unknown>>>('/contenido/info/bio-*.md', { eager: true });

const nombreDe = (ruta: string) => ruta.slice(ruta.lastIndexOf('/') + 1);
const sinExtension = (archivo: string) => archivo.replace(/\.[^.]+$/, '').toLowerCase();
const ordenNatural = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

function leerProyecto(rutaYaml: string, texto: string): Proyecto {
  // rutaYaml = /contenido/proyectos/<categoria>/<proyecto>/proyecto.yaml
  const [, , , carpetaCategoria, slug] = rutaYaml.split('/');
  const categoria = categorias.find((c) => c.carpeta === carpetaCategoria);
  if (!categoria) {
    throw new Error(
      `"${carpetaCategoria}" no es una categoría. Carpetas válidas: ${categorias.map((c) => c.carpeta).join(', ')}`,
    );
  }

  const datos = (parse(texto) ?? {}) as { titulo?: unknown; orden?: unknown; portada?: unknown };
  if (datos.titulo === undefined || datos.titulo === null) {
    throw new Error(`Falta "titulo" en ${rutaYaml}`);
  }

  // Solo los archivos que están directamente dentro de la carpeta del proyecto
  const carpeta = `/contenido/proyectos/${carpetaCategoria}/${slug}/`;
  const dentro = (ruta: string) => ruta.startsWith(carpeta) && !ruta.slice(carpeta.length).includes('/');
  const rutasImagen = Object.keys(imagenes).filter(dentro);
  const rutasVideo = Object.keys(videos).filter(dentro);
  const basesVideo = new Set(rutasVideo.map((ruta) => sinExtension(nombreDe(ruta))));

  // La galería sigue el orden de los nombres de archivo (01, 02, 03…)
  const galeria: Elemento[] = [];
  const todas = [...rutasImagen, ...rutasVideo].sort((a, b) => ordenNatural(nombreDe(a), nombreDe(b)));
  for (const ruta of todas) {
    const archivo = nombreDe(ruta);
    const base = sinExtension(archivo);
    if (ruta in videos) {
      // La portada de un vídeo es la foto con el mismo nombre (03.mp4 → 03.jpg)
      const rutaPortada = rutasImagen.find((r) => sinExtension(nombreDe(r)) === base);
      const portada = rutaPortada ? imagenes[rutaPortada] : undefined;
      galeria.push({
        tipo: 'video',
        archivo,
        src: videos[ruta],
        portada,
        ancho: portada?.width ?? 16,
        alto: portada?.height ?? 9,
        vertical: portada ? portada.height > portada.width : false,
      });
    } else if (!basesVideo.has(base)) {
      const imagen = imagenes[ruta];
      galeria.push({ tipo: 'foto', archivo, imagen, vertical: imagen.height > imagen.width });
    }
  }

  const fotos = galeria.filter((e): e is Foto => e.tipo === 'foto');
  const nombrePortada = typeof datos.portada === 'string' ? datos.portada.toLowerCase() : undefined;
  const portada =
    fotos.find((f) => f.archivo.toLowerCase() === nombrePortada)?.imagen ??
    fotos[0]?.imagen ??
    galeria.find((e): e is Video => e.tipo === 'video' && e.portada !== undefined)?.portada;
  if (!portada) {
    throw new Error(`El proyecto ${carpetaCategoria}/${slug} no tiene ninguna foto.`);
  }

  return {
    categoria,
    slug,
    titulo: String(datos.titulo),
    orden: typeof datos.orden === 'number' ? datos.orden : 999,
    portada,
    galeria,
  };
}

export const proyectos: Proyecto[] = Object.entries(textosProyecto)
  .map(([ruta, texto]) => leerProyecto(ruta, texto))
  .sort((a, b) => a.orden - b.orden || ordenNatural(a.titulo, b.titulo));

export const proyectosDe = (categoria: Categoria) => proyectos.filter((p) => p.categoria === categoria);

export function siguienteProyecto(proyecto: Proyecto): Proyecto | undefined {
  const lista = proyectosDe(proyecto.categoria);
  if (lista.length < 2) return undefined;
  return lista[(lista.indexOf(proyecto) + 1) % lista.length];
}

export const ajustes = parse(textoAjustes) as Ajustes;

export const fotosInicio: FotoInicio[] = ((parse(textoInicio)?.fotos ?? []) as unknown[]).map((valor) => {
  const ruta = String(valor).trim().replace(/^\/+/, '');
  const imagen = imagenes[`/contenido/proyectos/${ruta}`];
  const [carpetaCategoria, slug] = ruta.split('/');
  const proyecto = proyectos.find((p) => p.categoria.carpeta === carpetaCategoria && p.slug === slug);
  if (!imagen || !proyecto) {
    throw new Error(`home.yaml: no se encuentra la foto "${ruta}" (formato: categoría/proyecto/archivo)`);
  }
  return { imagen, vertical: imagen.height > imagen.width, proyecto };
});

const rutaRetrato = Object.keys(imagenes).find((ruta) => ruta.startsWith('/contenido/info/retrato.'));
export const retrato: ImageMetadata | undefined = rutaRetrato ? imagenes[rutaRetrato] : undefined;

export const bioDe = (idioma: Idioma) => bios[`/contenido/info/bio-${idioma}.md`]?.Content;
