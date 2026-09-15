// Revisa la carpeta contenido/ antes de publicar.
// Se ejecuta solo antes de "npm run build" y también a mano con "npm run revisar".
// Si encuentra un ERROR, para la publicación y explica qué arreglar. Los AVISOS no paran nada.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { categorias } from '../src/i18n/categorias.ts';

const CONTENIDO = fileURLToPath(new URL('../contenido/', import.meta.url));
const MB = 1024 * 1024;
const LIMITE_ARCHIVO = 50 * MB; // GitHub avisa a partir de 50 MB y rechaza archivos de más de 100 MB
const AVISO_FOTO = 3 * MB;
const AVISO_TOTAL = 350 * MB; // la web publicada ocupa ~3 veces las fotos, y GitHub Pages permite 1 GB

const FOTOS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEOS = new Set(['.mp4', '.webm']);
const FORMATOS_A_CONVERTIR = {
  '.heic': 'Exporta la foto a JPG',
  '.heif': 'Exporta la foto a JPG',
  '.tif': 'Exporta la foto a JPG',
  '.tiff': 'Exporta la foto a JPG',
  '.psd': 'Exporta la foto a JPG',
  '.dng': 'Exporta la foto a JPG',
  '.raw': 'Exporta la foto a JPG',
  '.cr2': 'Exporta la foto a JPG',
  '.cr3': 'Exporta la foto a JPG',
  '.nef': 'Exporta la foto a JPG',
  '.arw': 'Exporta la foto a JPG',
  '.mov': 'Convierte el vídeo a MP4 con HandBrake',
  '.m4v': 'Convierte el vídeo a MP4 con HandBrake',
  '.avi': 'Convierte el vídeo a MP4 con HandBrake',
  '.mkv': 'Convierte el vídeo a MP4 con HandBrake',
};
const NOMBRE_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errores = [];
const avisos = [];
let pesoTotal = 0;

const mb = (bytes) => `${(bytes / MB).toFixed(1)} MB`;
const listar = (carpeta) =>
  existsSync(carpeta) ? readdirSync(carpeta).filter((nombre) => !nombre.startsWith('.') && nombre !== 'Thumbs.db') : [];
const sugerirNombre = (nombre) =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const leerYaml = (ruta, nombreVisible) => {
  try {
    return parse(readFileSync(ruta, 'utf8')) ?? {};
  } catch (error) {
    errores.push(`${nombreVisible}: no se puede leer (${error.message.split('\n')[0]}). Revisa comillas y dos puntos.`);
    return undefined;
  }
};

// ---------- Proyectos ----------
const carpetaProyectos = join(CONTENIDO, 'proyectos');
const carpetasCategoria = categorias.map((categoria) => categoria.carpeta);

for (const categoria of listar(carpetaProyectos)) {
  const carpetaCategoria = join(carpetaProyectos, categoria);
  if (!statSync(carpetaCategoria).isDirectory()) {
    avisos.push(`proyectos/${categoria}: archivo suelto fuera de una categoría, se ignora.`);
    continue;
  }
  if (!carpetasCategoria.includes(categoria)) {
    errores.push(`proyectos/${categoria}: no es una categoría. Carpetas válidas: ${carpetasCategoria.join(', ')}.`);
    continue;
  }

  for (const proyecto of listar(carpetaCategoria)) {
    const carpeta = join(carpetaCategoria, proyecto);
    const ruta = `proyectos/${categoria}/${proyecto}`;
    if (!statSync(carpeta).isDirectory()) {
      avisos.push(`${ruta}: archivo suelto; debería estar dentro de la carpeta de un proyecto. Se ignora.`);
      continue;
    }
    if (!NOMBRE_VALIDO.test(proyecto)) {
      errores.push(
        `${ruta}: el nombre de la carpeta forma parte de la dirección web. Usa solo minúsculas, números y guiones, sin espacios ni tildes (p. ej. "${sugerirNombre(proyecto)}").`,
      );
    }

    const rutaYaml = join(carpeta, 'proyecto.yaml');
    if (!existsSync(rutaYaml)) {
      errores.push(`${ruta}: falta el archivo proyecto.yaml (como mínimo con la línea  titulo: "Nombre").`);
    } else {
      const datos = leerYaml(rutaYaml, `${ruta}/proyecto.yaml`);
      if (datos && (datos.titulo === undefined || datos.titulo === null || String(datos.titulo).trim() === '')) {
        errores.push(`${ruta}/proyecto.yaml: falta el título (titulo: "Nombre").`);
      }
      if (datos?.portada && !existsSync(join(carpeta, String(datos.portada)))) {
        errores.push(`${ruta}/proyecto.yaml: la portada "${datos.portada}" no existe en la carpeta.`);
      }
    }

    const basesFoto = new Set();
    const videos = [];
    for (const archivo of listar(carpeta)) {
      if (archivo === 'proyecto.yaml') continue;
      const rutaArchivo = join(carpeta, archivo);
      const info = statSync(rutaArchivo);
      if (info.isDirectory()) {
        avisos.push(`${ruta}/${archivo}: las subcarpetas dentro de un proyecto se ignoran.`);
        continue;
      }
      pesoTotal += info.size;
      const extension = extname(archivo).toLowerCase();
      const base = archivo.slice(0, archivo.length - extension.length).toLowerCase();

      if (info.size > LIMITE_ARCHIVO) {
        errores.push(
          `${ruta}/${archivo}: pesa ${mb(info.size)} y el máximo es 50 MB. ${VIDEOS.has(extension) ? 'Comprímelo con HandBrake (1080p o 720p).' : 'Expórtalo más pequeño.'}`,
        );
      }
      if (FOTOS.has(extension)) {
        basesFoto.add(base);
        if (info.size > AVISO_FOTO) {
          avisos.push(`${ruta}/${archivo}: la foto pesa ${mb(info.size)}. Mejor exportarla a 2500 px y calidad 80 (≈ 1 MB).`);
        }
      } else if (VIDEOS.has(extension)) {
        videos.push({ archivo, base });
      } else if (FORMATOS_A_CONVERTIR[extension]) {
        errores.push(`${ruta}/${archivo}: formato no válido. ${FORMATOS_A_CONVERTIR[extension]}.`);
      } else {
        avisos.push(`${ruta}/${archivo}: tipo de archivo desconocido, se ignora.`);
      }
    }

    for (const video of videos) {
      if (!basesFoto.has(video.base)) {
        avisos.push(`${ruta}/${video.archivo}: el vídeo no tiene portada. Añade una foto con el mismo nombre (${video.base}.jpg).`);
      }
    }
    if (basesFoto.size === 0) {
      errores.push(`${ruta}: no tiene ninguna foto (hace falta al menos una para la portada).`);
    }
  }
}

// ---------- Home ----------
const rutaInicio = join(CONTENIDO, 'home.yaml');
if (!existsSync(rutaInicio)) {
  avisos.push('home.yaml no existe: la página de inicio saldrá vacía.');
} else {
  const datos = leerYaml(rutaInicio, 'home.yaml');
  for (const foto of datos?.fotos ?? []) {
    const ruta = String(foto).trim().replace(/^\/+/, '');
    const partes = ruta.split('/');
    if (partes.length !== 3 || !existsSync(join(carpetaProyectos, ruta))) {
      errores.push(`home.yaml: no existe la foto "${ruta}". Formato: categoría/proyecto/archivo (p. ej. moda/zara/02.jpg).`);
    } else if (!existsSync(join(carpetaProyectos, partes[0], partes[1], 'proyecto.yaml'))) {
      errores.push(`home.yaml: la foto "${ruta}" está en una carpeta sin proyecto.yaml.`);
    }
  }
}

// ---------- Ajustes e Info ----------
const rutaAjustes = join(CONTENIDO, 'ajustes.yaml');
if (!existsSync(rutaAjustes)) {
  errores.push('Falta contenido/ajustes.yaml (nombre, email, Instagram y datos legales).');
} else {
  const ajustes = leerYaml(rutaAjustes, 'ajustes.yaml') ?? {};
  for (const campo of ['nombre', 'email', 'instagram', 'titular', 'nif', 'domicilio']) {
    const valor = ajustes[campo];
    if (valor === undefined || valor === null || String(valor).trim() === '') {
      errores.push(`ajustes.yaml: falta "${campo}".`);
    } else if (String(valor).includes('[')) {
      avisos.push(`ajustes.yaml: "${campo}" está pendiente de rellenar (${valor}).`);
    }
  }
}

for (const [idioma, nombre] of [
  ['es', 'español'],
  ['en', 'inglés'],
]) {
  if (!existsSync(join(CONTENIDO, 'info', `bio-${idioma}.md`))) {
    avisos.push(`info/bio-${idioma}.md no existe: la bio en ${nombre} saldrá vacía.`);
  }
}

if (pesoTotal > AVISO_TOTAL) {
  avisos.push(`Las fotos y vídeos ocupan ${mb(pesoTotal)}. La web publicada podría acercarse a 1 GB, el máximo de GitHub Pages.`);
}

// ---------- Resultado ----------
console.log('\nRevisión de contenido/\n');
for (const aviso of avisos) console.log(`  ⚠  ${aviso}`);
for (const error of errores) console.log(`  ✖  ${error}`);

if (errores.length > 0) {
  console.log(`\n✖ ${errores.length} error(es). Arréglalos y vuelve a intentarlo.\n`);
  process.exit(1);
}
console.log(`\n✔ Todo correcto${avisos.length ? ` (${avisos.length} aviso/s)` : ''}. Fotos y vídeos: ${mb(pesoTotal)}.\n`);
