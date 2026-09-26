// Vuelca las fotos originales en contenido/, optimizadas para la web.
//
// Uso:  npm run importar -- "/ruta/a/Fotos portfolio Blanquit"
//
// La carpeta de origen tiene una carpeta por categoría y, dentro, una por proyecto
// con el número delante:  Moda/01 White&One 1/White&One (1) 3.jpg
//
// OJO: borra y rehace las carpetas de contenido/proyectos, así que la web queda
// igual que la carpeta de origen (lo que no esté ahí, desaparece de la web).
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const LADO_MAX = 2500; // píxeles del lado largo
const CALIDAD = 82;
const FOTOS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEOS = new Set(['.mp4', '.mov', '.webm', '.m4v', '.avi']);

// Carpeta de origen → carpeta de la web
const CATEGORIAS = {
  Moda: 'moda',
  Interiores: 'interiorismo',
  Eventos: 'eventos',
  'Foto fija': 'foto-fija',
  Música: 'musica',
  Personal: 'viajes',
};

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const DESTINO = join(RAIZ, 'contenido', 'proyectos');
const origen = process.argv[2];

if (!origen) {
  console.error('Falta la carpeta de origen.\nUso: npm run importar -- "/ruta/a/Fotos portfolio Blanquit"');
  process.exit(1);
}

const MB = 1024 * 1024;
const acentos = /[̀-ͯ]/g;
const direccionWeb = (texto) =>
  texto
    .normalize('NFD')
    .replace(acentos, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// "04 Basyco - Estudio" → { orden: 4, titulo: "Basyco - Estudio" }
const leerCarpeta = (nombre) => {
  const [, numero, titulo] = nombre.match(/^\s*(\d+)?[\s.-]*(.+)$/) ?? [];
  return { orden: numero ? Number(numero) : 999, titulo: (titulo ?? nombre).trim() };
};

const ordenNatural = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
const listar = async (carpeta) => (await readdir(carpeta, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'));

const saltados = [];
let totalFotos = 0;
let totalBytes = 0;

async function optimizar(entrada, salida) {
  const info = await sharp(entrada)
    .rotate() // respeta la orientación de la cámara
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: CALIDAD, mozjpeg: true, progressive: true })
    .toFile(salida);
  totalFotos++;
  totalBytes += info.size;
}

for (const [carpetaOrigen, categoria] of Object.entries(CATEGORIAS)) {
  const rutaCategoria = join(origen, carpetaOrigen);
  let proyectos;
  try {
    proyectos = (await listar(rutaCategoria)).filter((e) => e.isDirectory());
  } catch {
    console.log(`⚠  No existe la carpeta "${carpetaOrigen}" en el origen; se salta.`);
    continue;
  }

  // Se rehace la categoría entera
  await rm(join(DESTINO, categoria), { recursive: true, force: true });
  await mkdir(join(DESTINO, categoria), { recursive: true });

  for (const proyecto of proyectos.sort((a, b) => ordenNatural(a.name, b.name))) {
    const { orden, titulo } = leerCarpeta(proyecto.name);
    const slug = direccionWeb(titulo);
    const carpetaDestino = join(DESTINO, categoria, slug);
    await mkdir(carpetaDestino, { recursive: true });

    const archivos = (await listar(join(rutaCategoria, proyecto.name)))
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort(ordenNatural);

    let n = 0;
    for (const archivo of archivos) {
      const extension = extname(archivo).toLowerCase();
      const entrada = join(rutaCategoria, proyecto.name, archivo);
      if (FOTOS.has(extension)) {
        n++;
        await optimizar(entrada, join(carpetaDestino, `${String(n).padStart(2, '0')}.jpg`));
      } else if (VIDEOS.has(extension)) {
        saltados.push(`${carpetaOrigen}/${proyecto.name}/${archivo}`);
      }
    }

    await writeFile(join(carpetaDestino, 'proyecto.yaml'), `titulo: "${titulo}"\norden: ${orden}\n`);
    console.log(`${categoria}/${slug}  →  ${n} foto(s)`);
  }

  // Vídeos sueltos en la categoría, fuera de un proyecto
  for (const suelto of (await listar(rutaCategoria)).filter((e) => e.isFile())) {
    if (VIDEOS.has(extname(suelto.name).toLowerCase())) saltados.push(`${carpetaOrigen}/${suelto.name}`);
  }
}

// La foto de la página de contacto
const carpetaContacto = join(origen, 'Contacto');
try {
  const fotos = (await listar(carpetaContacto))
    .filter((e) => e.isFile() && FOTOS.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort(ordenNatural);
  if (fotos[0]) {
    await optimizar(join(carpetaContacto, fotos[0]), join(RAIZ, 'contenido', 'info', 'retrato.jpg'));
    console.log(`info/retrato.jpg  →  ${fotos[0]}`);
  }
} catch {
  console.log('⚠  No hay carpeta "Contacto" en el origen; se deja el retrato que había.');
}

console.log(`\n✔ ${totalFotos} fotos optimizadas (${(totalBytes / MB).toFixed(1)} MB en total).`);
if (saltados.length) {
  console.log(`\n⚠  Vídeos NO importados (hay que comprimirlos antes, máximo 50 MB):`);
  for (const v of saltados) console.log(`   ${v}`);
}
console.log('\nRevisa con "npm run revisar" y mira la web con "npm run dev".');
