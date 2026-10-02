// Pasa la carpeta de fotos de Blanca a la web: optimiza, publica y deja la web
// igual que esa carpeta.
//
// Uso normal: doble clic en "Actualizar web.command".
// A mano:     npm run actualizar            (usa la ruta de origen.txt)
//             npm run actualizar -- "/ruta" (usa esa carpeta)
//             npm run actualizar -- --sin-publicar   (prepara pero no sube)
//
// Qué hace con cada cosa:
//   Fotos de proyecto → 3000 px. Las que ya caben se copian tal cual, sin
//     recomprimirlas; solo se reduce (calidad 92) lo que no cabe.
//   Vídeos de proyecto → 1280x720 con sonido, más su portada
//   Carpeta "Contacto" → la lluvia de la página de contacto: fotos a 1400 px y
//     vídeos de 4 s sin sonido (se coge el trozo del medio, que suele ser el
//     que tiene movimiento), más su portada
//
// Solo trabaja con lo que ha cambiado: si un archivo ya está puesto y no se ha
// tocado desde entonces, se salta. Y lo que Blanca borre de su carpeta,
// desaparece también de la web.
import { execFileSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
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

// ---------- De qué archivo salió cada foto de la web ----------
// Las fotos de un proyecto se guardan por POSICIÓN (01.jpg, 02.jpg...), no por
// nombre. Si Blanca reordena su carpeta, renombrar no cambia la fecha del
// archivo, así que mirando solo fechas el cambio pasaría desapercibido y la web
// se quedaría con el orden viejo sin avisar de nada. Por eso se apunta de qué
// archivo salió cada una, con su tamaño y su fecha: si cualquiera de las tres
// cosas no cuadra, se rehace.
// Una foto cuyo nombre lleve "sola" no se empareja con la de al lado: ocupa
// ella sola el ancho. Es la única decisión de maquetación que se toma a mano,
// y va en el nombre del archivo para que viaje con la foto si se reordena.
const RUTA_MAQUETACION = join(CONTENIDO, 'maquetacion.json');
const vaSola = (archivo) => /(^|[\s_-])sola([\s_.-]|$)/i.test(archivo);
const solas = [];

const RUTA_FUENTES = join(CONTENIDO, 'fuentes.json');
const fuentesPrevias = existsSync(RUTA_FUENTES) ? JSON.parse(readFileSync(RUTA_FUENTES, 'utf8')) : {};
const fuentes = {};

const señas = (fuente) => {
  const info = statSync(fuente);
  // La ruta se guarda relativa a la carpeta de Blanca, para que siga valiendo
  // si algún día esa carpeta cambia de sitio
  return { de: fuente.slice(origen.length + 1), bytes: info.size, fecha: Math.round(info.mtimeMs) };
};

const mismoArchivo = (fuente, destino) => {
  if (!existsSync(destino)) return false;
  const antes = fuentesPrevias[destino.slice(CONTENIDO.length + 1)];
  // La primera vez todavía no hay registro de nada: se confía en la fecha, como
  // se hacía antes, y de paso queda apuntado. A partir de ahí ya se detecta todo.
  if (!antes) return alDia(fuente, destino);
  const ahora = señas(fuente);
  return antes.de === ahora.de && antes.bytes === ahora.bytes && antes.fecha === ahora.fecha;
};

const apuntarFuente = (fuente, destino) => {
  fuentes[destino.slice(CONTENIDO.length + 1)] = señas(fuente);
};
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

  // Este archivo no lo ve nadie: es el maestro del que Astro saca los WebP de
  // la web. Si la foto ya cabe, se copia tal cual. Recomprimirla aquí sería una
  // pérdida de calidad que ya no se recupera, y encima sin ganar nada: quien
  // manda en el peso de la web es el WebP, no esto.
  const ficha = await sharp(entrada).metadata();
  const yaCabe = Math.max(ficha.width, ficha.height) <= lado;
  const derecha = !ficha.orientation || ficha.orientation === 1;
  if (yaCabe && derecha && ficha.format === 'jpeg') {
    copyFileSync(entrada, destino);
  } else {
    await sharp(entrada)
      .rotate()
      .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(destino);
  }
  cuenta.fotos++;
}

// ---------- Cuánta calidad necesita cada foto ----------
// Una misma calidad para todas deja unas estupendas y otras regulares: las que
// tienen grano o mucho detalle fino se estropean antes que una pared lisa. Aquí
// se busca, foto a foto, la calidad más baja que todavía se ve bien, y la web
// usa esa. Las fáciles pesan menos y las difíciles dejan de quedarse atrás.
const DIFERENCIA_ACEPTABLE = 2.6; // elegido midiendo; por encima se empieza a notar
const CALIDADES = [70, 74, 78, 82, 86, 90, 94];
const CALIDAD_POR_DEFECTO = 86;
const calidades = {};

async function calidadQueNecesita(maestro) {
  // Una foto pequeña la acaba estirando el navegador para llenar su hueco, y
  // estirar amplifica cualquier defecto de la compresión. A esas no se les baja
  // tanto la calidad aunque la medición diga que aguantan.
  const ficha = await sharp(maestro).metadata();
  const seVaAEstirar = Math.max(ficha.width, ficha.height) < 1800;
  const suelo = seVaAEstirar ? 82 : 70;

  // Se compara al tamaño que recibe un móvil, que es donde más se mira
  const base = sharp(maestro).resize({ width: 1400, withoutEnlargement: true });
  const referencia = await base.clone().raw().toBuffer();
  for (const calidad of CALIDADES.filter((q) => q >= suelo)) {
    const prueba = await base.clone().webp({ quality: calidad }).toBuffer();
    const pixeles = await sharp(prueba).raw().toBuffer();
    const hasta = Math.min(pixeles.length, referencia.length);
    let suma = 0;
    for (let i = 0; i < hasta; i++) suma += Math.abs(pixeles[i] - referencia[i]);
    if (suma / hasta <= DIFERENCIA_ACEPTABLE) return calidad;
  }
  return 96;
}

// Apunta la calidad de una foto recién preparada (o conserva la que ya tenía)
async function anotarCalidad(destino, rehecha) {
  const clave = destino.slice(CONTENIDO.length + 1);
  if (!rehecha && calidadesPrevias[clave]) {
    calidades[clave] = calidadesPrevias[clave];
    return;
  }
  calidades[clave] = await calidadQueNecesita(destino);
}

const RUTA_CALIDADES = join(CONTENIDO, 'calidades.json');
const calidadesPrevias = existsSync(RUTA_CALIDADES)
  ? JSON.parse(readFileSync(RUTA_CALIDADES, 'utf8'))
  : {};

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
          apuntarFuente(fuente, destino);
          if (vaSola(archivo)) solas.push(destino.slice(CONTENIDO.length + 1));
          if (mismoArchivo(fuente, destino)) {
            cuenta.saltados++;
            await anotarCalidad(destino, false);
            continue;
          }
          await optimizarFoto(fuente, destino, 3000);
          await anotarCalidad(destino, true);
          console.log(`   ${categoria}/${slug}/${String(n).padStart(2, '0')}.jpg`);
        } else if (VIDEOS.has(extension)) {
          n++;
          const nombre = String(n).padStart(2, '0');
          const destino = join(carpeta, `${nombre}.mp4`);
          quedan.add(`${nombre}.mp4`);
          quedan.add(`${nombre}.jpg`);
          apuntarFuente(fuente, destino);
          if (vaSola(archivo)) solas.push(destino.slice(CONTENIDO.length + 1));
          if (mismoArchivo(fuente, destino)) { cuenta.saltados++; continue; }
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
    if (alDia(join(base, fuenteRetrato), retrato)) {
      cuenta.saltados++;
      await anotarCalidad(retrato, false);
    } else {
      await optimizarFoto(join(base, fuenteRetrato), retrato, 2000);
      await anotarCalidad(retrato, true);
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
      if (alDia(fuente, salida)) {
        cuenta.saltados++;
        await anotarCalidad(salida, false);
        continue;
      }
      await optimizarFoto(fuente, salida, 1400);
      await anotarCalidad(salida, true);
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

// Ordenado por nombre, para que los cambios se lean bien en el historial.
// (Ojo: el segundo argumento de JSON.stringify no sirve para esto; ahí una
// lista de claves actúa de filtro y se lleva por delante lo que haya dentro.)
const ordenado = (objeto) =>
  Object.fromEntries(Object.keys(objeto).sort().map((clave) => [clave, objeto[clave]]));

// La calidad que necesita cada foto, para que la web la use
writeFileSync(RUTA_CALIDADES, `${JSON.stringify(ordenado(calidades), null, 2)}\n`);
// Y de qué archivo de Blanca salió cada una, para detectar reordenaciones
writeFileSync(RUTA_FUENTES, `${JSON.stringify(ordenado(fuentes), null, 2)}\n`);
// Las que van solas, por llevar "sola" en el nombre
writeFileSync(RUTA_MAQUETACION, `${JSON.stringify({ solas: solas.sort() }, null, 2)}\n`);

const puestas = Object.values(calidades);
const reparto = {};
for (const q of puestas) reparto[q] = (reparto[q] ?? 0) + 1;

console.log(`
Resumen: ${cuenta.fotos} fotos y ${cuenta.videos} vídeos preparados · ${cuenta.saltados} ya estaban al día · ${cuenta.borrados} retirados`);
console.log(`Calidad a medida: ${Object.keys(reparto).sort((a, b) => a - b).map((q) => `${reparto[q]} a ${q}`).join(' · ')}`);

if (publicar) publicarEnLaWeb();
else console.log('\nPreparado sin publicar (--sin-publicar). Para verlo: npm run dev\n');
