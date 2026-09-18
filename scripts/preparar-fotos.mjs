// Prepara fotos para la web a partir de una carpeta de originales.
// Uso:  node scripts/preparar-fotos.mjs "/ruta/a/la/carpeta de originales"
//
// - NO toca los originales: solo los lee.
// - Deja las fotos a 2500 px de lado largo y ~1 MB, que es lo que pide la web.
// - Cada carpeta de categoría se convierte en un proyecto. Si dentro hay subcarpetas,
//   cada subcarpeta es un proyecto distinto.
// - Los vídeos no se tocan: se listan al final para meterlos a mano.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { categorias } from '../src/i18n/categorias.ts';

const CONTENIDO = fileURLToPath(new URL('../contenido/', import.meta.url));
const LADO_LARGO = 2500;
const CALIDAD = 82;
const FOTOS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.heif']);
const VIDEOS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv']);

// Nombres de carpeta que se aceptan para cada categoría de la web
const EQUIVALENCIAS = {
  moda: 'moda',
  fashion: 'moda',
  interiores: 'interiorismo',
  interiorismo: 'interiorismo',
  interiors: 'interiorismo',
  eventos: 'eventos',
  events: 'eventos',
  'foto fija': 'foto-fija',
  'foto-fija': 'foto-fija',
  'still photography': 'foto-fija',
  musica: 'musica',
  music: 'musica',
  personal: 'viajes', // Blanca llama "Personal" a la carpeta de viajes
  viajes: 'viajes',
  travel: 'viajes',
};

const origen = process.argv[2];
if (!origen || !existsSync(origen)) {
  console.error('Dime la carpeta de originales:\n  node scripts/preparar-fotos.mjs "/ruta/a/la/carpeta"');
  process.exit(1);
}

// Quita tildes y mayúsculas para poder comparar nombres de carpeta
const normalizar = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// "Fashion Week Copenhagen" → "fashion-week-copenhagen"
const aSlug = (texto) =>
  normalizar(texto)
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ordenNatural = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
const carpetas = (ruta) => readdirSync(ruta).filter((n) => !n.startsWith('.') && statSync(join(ruta, n)).isDirectory());
const archivos = (ruta) => readdirSync(ruta).filter((n) => !n.startsWith('.') && statSync(join(ruta, n)).isFile());
const fotosDe = (ruta) => archivos(ruta).filter((n) => FOTOS.has(extname(n).toLowerCase())).sort(ordenNatural);
const videosDe = (ruta) => archivos(ruta).filter((n) => VIDEOS.has(extname(n).toLowerCase()));

// Busca la carpeta que contiene las categorías (a veces hay una carpeta intermedia)
function encontrarCategorias(ruta) {
  const hijas = carpetas(ruta);
  if (hijas.some((n) => EQUIVALENCIAS[normalizar(n)])) return ruta;
  for (const hija of hijas) {
    const dentro = encontrarCategorias(join(ruta, hija));
    if (dentro) return dentro;
  }
  return null;
}

const raiz = encontrarCategorias(origen);
if (!raiz) {
  console.error(`No encuentro carpetas de categoría dentro de "${origen}".`);
  console.error(`Nombres válidos: ${[...new Set(Object.values(EQUIVALENCIAS))].join(', ')}`);
  process.exit(1);
}

async function convertir(entrada, salida) {
  await sharp(entrada)
    .rotate() // respeta la orientación de la cámara
    .resize({ width: LADO_LARGO, height: LADO_LARGO, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: CALIDAD, mozjpeg: true })
    .toFile(salida);
  return statSync(salida).size;
}

const videosPendientes = [];
let totalFotos = 0;
let totalBytes = 0;

console.log(`Originales: ${raiz}\n`);

for (const nombreCarpeta of carpetas(raiz).sort(ordenNatural)) {
  const categoria = EQUIVALENCIAS[normalizar(nombreCarpeta)];

  // La carpeta de retrato va a contenido/info/, no a un proyecto
  if (normalizar(nombreCarpeta) === 'contacto' || normalizar(nombreCarpeta) === 'about') {
    const rutaCarpeta = join(raiz, nombreCarpeta);
    const primera = fotosDe(rutaCarpeta)[0];
    if (primera) {
      const bytes = await convertir(join(rutaCarpeta, primera), join(CONTENIDO, 'info', 'retrato.jpg'));
      console.log(`retrato    ← ${nombreCarpeta}/${primera}  (${(bytes / 1e6).toFixed(2)} MB)`);
      totalFotos += 1;
      totalBytes += bytes;
    }
    continue;
  }

  if (!categoria) {
    console.log(`(me salto "${nombreCarpeta}": no es ninguna categoría de la web)`);
    continue;
  }

  const rutaCategoria = join(raiz, nombreCarpeta);
  const subcarpetas = carpetas(rutaCategoria);
  // Con subcarpetas, cada una es un proyecto. Sin ellas, todas las fotos van a un único proyecto.
  const proyectos = subcarpetas.length
    ? subcarpetas.map((n) => ({ titulo: n, ruta: join(rutaCategoria, n) }))
    : [{ titulo: 'Selección', ruta: rutaCategoria }];

  let orden = 1;
  for (const proyecto of proyectos) {
    const fotos = fotosDe(proyecto.ruta);
    videosPendientes.push(...videosDe(proyecto.ruta).map((v) => `${nombreCarpeta}/${v}`));
    if (!fotos.length) continue;

    const slug = aSlug(proyecto.titulo);
    const destino = join(CONTENIDO, 'proyectos', categoria, slug);
    rmSync(destino, { recursive: true, force: true });
    mkdirSync(destino, { recursive: true });

    let bytesProyecto = 0;
    for (const [i, foto] of fotos.entries()) {
      const numero = String(i + 1).padStart(2, '0');
      bytesProyecto += await convertir(join(proyecto.ruta, foto), join(destino, `${numero}.jpg`));
    }

    writeFileSync(join(destino, 'proyecto.yaml'), `titulo: "${proyecto.titulo}"\norden: ${orden}\n`);
    console.log(
      `${categoria}/${slug}  ${String(fotos.length).padStart(3)} fotos  ${(bytesProyecto / 1e6).toFixed(1)} MB`,
    );
    totalFotos += fotos.length;
    totalBytes += bytesProyecto;
    orden += 1;
  }
}

console.log(`\nListo: ${totalFotos} fotos, ${(totalBytes / 1e6).toFixed(0)} MB en total.`);
if (videosPendientes.length) {
  console.log(`\nVídeos encontrados (no se han tocado): ${videosPendientes.join(', ')}`);
}
console.log('Comprueba el resultado con "npm run revisar".');
