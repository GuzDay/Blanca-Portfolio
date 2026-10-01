// Pasa la carpeta de fotos de Blanca a la web: optimiza, publica y deja la web
// igual que esa carpeta.
//
// Uso normal: doble clic en "Actualizar web.command".
// A mano:     npm run actualizar            (usa la ruta de origen.txt)
//             npm run actualizar -- "/ruta" (usa esa carpeta)
//             npm run actualizar -- --sin-publicar   (prepara pero no sube)
//
// Qué hace con cada cosa:
//   Fotos de proyecto → 3000 px, calidad 92
//   Vídeos de proyecto → 1280x720 con sonido, más su portada
//   Carpeta "Contacto" → la lluvia de la página de contacto: fotos a 1400 px y
//     vídeos de 4 s sin sonido (se coge el trozo del medio, que suele ser el
//     que tiene movimiento), más su portada
//
// Solo trabaja con lo que ha cambiado: si un archivo ya está puesto y no se ha
// tocado desde entonces, se salta. Y lo que Blanca borre de su carpeta,
// desaparece también de la web.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
import { categorias } from '../src/i18n/categorias.ts';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const CONTENIDO = join(RAIZ, 'contenido');
const TEMPORAL = join(RAIZ, 'node_modules', '.cache-portadas');

// Carpeta de origen → carpeta de la web
const CATEGORIAS = {
  Moda: 'moda',
  Interiores: 'interiorismo',
  Eventos: 'eventos',
  'Foto fija': 'foto-fija',
  Música: 'musica',
  Personal: 'viajes',
};
const CARPETA_CONTACTO = 'Contacto';

const FOTOS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);
const VIDEOS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

const argumentos = process.argv.slice(2);
const publicar = !argumentos.includes('--sin-publicar');
const rutaSuelta = argumentos.find((a) => !a.startsWith('--'));

// ---------- De dónde salen las fotos ----------
const archivoOrigen = join(RAIZ, 'origen.txt');
const origen = (rutaSuelta ?? (existsSync(archivoOrigen) ? readFileSync(archivoOrigen, 'utf8') : '')).trim();

if (!origen || !existsSync(origen)) {
  console.error(`
No encuentro la carpeta de fotos${origen ? `: ${origen}` : ''}.

Escribe su ruta en el archivo "origen.txt" (en esta misma carpeta) o pásala así:
  npm run actualizar -- "/ruta/a/Fotos portfolio Blanquit"
`);
  process.exit(1);
}

// ---------- Utilidades ----------
const acentos = /[̀-ͯ]/g;
const sinTildes = (t) => t.normalize('NFD').replace(acentos, '');
const direccionWeb = (texto) =>
  sinTildes(texto)
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const ordenNatural = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
const listar = (carpeta) =>
  existsSync(carpeta) ? readdirSync(carpeta).filter((n) => !n.startsWith('.') && n !== 'Thumbs.db') : [];
const leerCarpeta = (nombre) => {
  const partes = nombre.match(/^\s*(\d+)?[\s.-]*(.+)$/);
  return { orden: partes?.[1] ? Number(partes[1]) : 999, titulo: (partes?.[2] ?? nombre).trim() };
};
const alDia = (fuente, destino) => existsSync(destino) && statSync(destino).mtimeMs >= statSync(fuente).mtimeMs;
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

const cuenta = { fotos: 0, videos: 0, saltados: 0, borrados: 0 };

const correr = (programa, args) => execFileSync(programa, args, { stdio: 'pipe' });

const duracion = (archivo) => {
  try {
    const salida = execFileSync(ffmpeg, ['-hide_banner', '-i', archivo], { stdio: 'pipe', encoding: 'utf8' });
    return salida;
  } catch (error) {
    const texto = String(error.stderr ?? '');
    const encontrado = texto.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (!encontrado) return 0;
    return Number(encontrado[1]) * 3600 + Number(encontrado[2]) * 60 + Number(encontrado[3]);
  }
};

async function optimizarFoto(fuente, destino, lado) {
  let entrada = fuente;
  if (['.heic', '.heif'].includes(extname(fuente).toLowerCase())) {
    mkdirSync(TEMPORAL, { recursive: true });
    entrada = join(TEMPORAL, 'convertida.jpg');
    correr('sips', ['-s', 'format', 'jpeg', fuente, '--out', entrada]);
  }
  await sharp(entrada)
    .rotate()
    .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
    // Calidad alta: este archivo no es el que ve nadie, es el maestro del que
    // Astro saca los WebP de la web. Si se comprime fuerte aquí, esa pérdida ya
    // no se recupera y se suma a la del WebP.
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(destino);
  cuenta.fotos++;
}

async function portada(video, destino) {
  mkdirSync(TEMPORAL, { recursive: true });
  const suelta = join(TEMPORAL, 'portada.jpg');
  // Un fotograma de la mitad del vídeo: el principio suele estar en negro o
  // con la cámara todavía moviéndose
  const largo = duracion(video);
  const momento = largo > 1 ? (largo / 2).toFixed(2) : '0';
  correr(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', momento, '-i', video, '-frames:v', '1', suelta]);
  await sharp(suelta).resize({ width: 1200, height: 1200, fit: 'inside' }).jpeg({ quality: 80, mozjpeg: true }).toFile(destino);
}

async function optimizarVideoProyecto(fuente, destino) {
  correr(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', fuente,
    '-vf', 'scale=-2:720', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', destino,
  ]);
  await portada(destino, destino.replace(/\.mp4$/, '.jpg'));
  cuenta.videos++;
}

async function optimizarVideoLluvia(fuente, destino) {
  const total = duracion(fuente);
  const trozo = 4;
  const desde = total > trozo + 0.5 ? Math.max(0, (total - trozo) / 2) : 0; // el medio suele ser lo bueno
  correr(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error', '-ss', String(desde.toFixed(2)), '-i', fuente,
    '-t', String(trozo), '-an', '-vf', 'scale=-2:640,fps=30',
    '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', destino,
  ]);
  await portada(destino, destino.replace(/\.mp4$/, '.jpg'));
  cuenta.videos++;
}

// ---------- Proyectos ----------
async function pasarProyectos() {
  for (const [carpetaOrigen, categoria] of Object.entries(CATEGORIAS)) {
    const base = join(origen, carpetaOrigen);
    if (!existsSync(base)) {
      console.log(`⚠  No está la carpeta "${carpetaOrigen}" en el origen; se salta.`);
      continue;
    }
    const destinoCategoria = join(CONTENIDO, 'proyectos', categoria);
    mkdirSync(destinoCategoria, { recursive: true });

    const proyectos = listar(base).filter((n) => statSync(join(base, n)).isDirectory());
    const esperados = new Set();

    for (const proyecto of proyectos.sort(ordenNatural)) {
      const { orden, titulo } = leerCarpeta(proyecto);
      const slug = direccionWeb(titulo);
      esperados.add(slug);
      const carpeta = join(destinoCategoria, slug);
      mkdirSync(carpeta, { recursive: true });

      const archivos = listar(join(base, proyecto))
        .filter((n) => statSync(join(base, proyecto, n)).isFile())
        .sort(ordenNatural);

      const quedan = new Set(['proyecto.yaml']);
      let n = 0;
      for (const archivo of archivos) {
        const extension = extname(archivo).toLowerCase();
        const fuente = join(base, proyecto, archivo);
        if (FOTOS.has(extension)) {
          n++;
          const destino = join(carpeta, `${String(n).padStart(2, '0')}.jpg`);
          quedan.add(`${String(n).padStart(2, '0')}.jpg`);
          if (alDia(fuente, destino)) { cuenta.saltados++; continue; }
          await optimizarFoto(fuente, destino, 3000);
          console.log(`   ${categoria}/${slug}/${String(n).padStart(2, '0')}.jpg`);
        } else if (VIDEOS.has(extension)) {
          n++;
          const nombre = String(n).padStart(2, '0');
          const destino = join(carpeta, `${nombre}.mp4`);
          quedan.add(`${nombre}.mp4`);
          quedan.add(`${nombre}.jpg`);
          if (alDia(fuente, destino)) { cuenta.saltados++; continue; }
          console.log(`   ${categoria}/${slug}/${nombre}.mp4 (comprimiendo vídeo, tarda un poco)`);
          await optimizarVideoProyecto(fuente, destino);
        }
      }

      // El título y el orden del proyecto
      const yaml = `titulo: "${titulo.replace(/"/g, "'")}"\norden: ${orden}\n`;
      const rutaYaml = join(carpeta, 'proyecto.yaml');
      if (!existsSync(rutaYaml) || readFileSync(rutaYaml, 'utf8') !== yaml) {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(rutaYaml, yaml);
      }

      // Lo que ya no está en la carpeta de Blanca, fuera
      for (const sobra of listar(carpeta).filter((f) => !quedan.has(f))) {
        rmSync(join(carpeta, sobra), { force: true });
        cuenta.borrados++;
      }
    }

    for (const sobra of listar(destinoCategoria).filter((c) => !esperados.has(c))) {
      rmSync(join(destinoCategoria, sobra), { recursive: true, force: true });
      cuenta.borrados++;
      console.log(`   quitado el proyecto ${categoria}/${sobra}`);
    }
  }
}

// ---------- Lluvia de la página de contacto ----------
async function pasarContacto() {
  const base = join(origen, CARPETA_CONTACTO);
  if (!existsSync(base)) return;
  const destino = join(CONTENIDO, 'contacto');
  mkdirSync(destino, { recursive: true });

  const archivos = listar(base).sort(ordenNatural);

  // El retrato de la pagina de contacto es la unica foto suelta de la carpeta:
  // la que no se llama "Contacto - Animacion N". Si hubiera varias, manda la primera.
  const esLluvia = (archivo) => sinTildes(archivo).includes('Anima');
  const fuenteRetrato = archivos.find(
    (archivo) => FOTOS.has(extname(archivo).toLowerCase()) && !esLluvia(archivo),
  );
  if (fuenteRetrato) {
    const retrato = join(CONTENIDO, 'info', 'retrato.jpg');
    if (alDia(join(base, fuenteRetrato), retrato)) cuenta.saltados++;
    else {
      await optimizarFoto(join(base, fuenteRetrato), retrato, 2000);
      console.log('   info/retrato.jpg');
    }
  }

  const quedan = new Set();
  for (const archivo of archivos) {
    const fuente = join(base, archivo);
    if (!statSync(fuente).isFile()) continue;
    if (!esLluvia(archivo)) continue;
    const extension = extname(archivo).toLowerCase();
    const numero = archivo.match(/([0-9]+)\.[^.]+$/)?.[1];

    const n = String(Number(numero)).padStart(2, '0');
    if (FOTOS.has(extension)) {
      const salida = join(destino, `${n}.jpg`);
      quedan.add(`${n}.jpg`);
      if (alDia(fuente, salida)) { cuenta.saltados++; continue; }
      await optimizarFoto(fuente, salida, 1400);
      console.log(`   contacto/${n}.jpg`);
    } else if (VIDEOS.has(extension)) {
      const salida = join(destino, `${n}.mp4`);
      quedan.add(`${n}.mp4`);
      quedan.add(`${n}.jpg`);
      if (alDia(fuente, salida)) { cuenta.saltados++; continue; }
      console.log(`   contacto/${n}.mp4 (comprimiendo vídeo)`);
      await optimizarVideoLluvia(fuente, salida);
    }
  }

  for (const sobra of listar(destino).filter((f) => !quedan.has(f))) {
    rmSync(join(destino, sobra), { force: true });
    cuenta.borrados++;
  }
}

// ---------- Publicar ----------
function publicarEnLaWeb() {
  const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' });
  const cambios = git('status', '--porcelain').trim();
  if (!cambios) {
    console.log('\nNo hay nada nuevo que publicar: la web ya está igual que la carpeta.\n');
    return;
  }
  console.log('\nSubiendo a la web...');
  git('add', '-A');
  git('commit', '-m', 'Contenido actualizado desde la carpeta de fotos');
  git('push', 'origin', 'main');
  console.log(`
✔ Subido. GitHub tarda dos o tres minutos en publicarlo.
  Míralo en https://blancagtarrio.com (si lo ves igual, recarga con ⌘ + Shift + R)
`);
}

// ---------- Adelante ----------
console.log(`\nLeyendo: ${origen}\n`);
await pasarProyectos();
await pasarContacto();

console.log(`
Resumen: ${cuenta.fotos} fotos y ${cuenta.videos} vídeos preparados · ${cuenta.saltados} ya estaban al día · ${cuenta.borrados} retirados`);

if (publicar) publicarEnLaWeb();
else console.log('\nPreparado sin publicar (--sin-publicar). Para verlo: npm run dev\n');
