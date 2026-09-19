# Portfolio de Blanca G. Tarrío

Web portfolio de Blanca. Hecha con [Astro](https://astro.build): una web estática, rápida, en español e inglés, donde las fotos y los vídeos están dentro del propio proyecto.

**Web publicada (versión de prueba):** https://guzday.github.io/Blanca-Portfolio/
**Dominio final:** blancagtarrio.com (comprado en Hostinger, pendiente de conectar)

---

## Dónde vive cada cosa

| Sitio | Qué guarda |
|---|---|
| **Tu ordenador** | Copia completa del proyecto (código + fotos + vídeos) |
| **GitHub** | Lo mismo, en la nube, con el historial de cambios |
| **GitHub Pages** | La web ya construida que ve la gente. Se actualiza sola con cada cambio en `main` |
| **Hostinger** | Solo la propiedad del dominio (se renueva cada año) |

---

## Cómo está organizado

```
contenido/                    ← LO QUE SE TOCA PARA AÑADIR O CAMBIAR CONTENIDO
├─ proyectos/
│  ├─ moda/
│  │  └─ nombre-proyecto/     ← una carpeta = un proyecto (el nombre sale en la dirección web)
│  │     ├─ proyecto.yaml     ← título y orden
│  │     ├─ 01.jpg            ← la galería sigue el orden de los nombres
│  │     ├─ 02.jpg
│  │     ├─ 03.mp4            ← vídeo
│  │     └─ 03.jpg            ← portada del vídeo (mismo nombre que el vídeo)
│  ├─ interiorismo/  eventos/  foto-fija/  musica/  viajes/
├─ home.yaml                  ← fotos de la página de inicio
├─ ajustes.yaml               ← nombre, email, Instagram y datos legales
└─ info/
   ├─ retrato.jpg
   ├─ bio-es.md
   └─ bio-en.md

src/                          ← EL CÓDIGO (diseño y funcionamiento)
├─ pages/                     ← cada archivo es una página
├─ components/                ← piezas: cabecera, pie, galería, visor, vídeo…
├─ layouts/Base.astro         ← marco común de todas las páginas
├─ styles/global.css          ← colores, tipografía y maquetación
├─ i18n/                      ← categorías y textos fijos en ES y EN
└─ lib/                       ← lee la carpeta contenido/ y genera las direcciones

.github/workflows/publicar.yml ← publica la web en GitHub Pages con cada cambio
scripts/revisar-archivos.mjs   ← revisa pesos y formatos antes de publicar
public/                        ← favicon y robots.txt
```

---

## Añadir un proyecto

1. **Prepara el material**
   - **Fotos:** JPG, **2500 px** de lado largo, calidad 80–85 (≈ 0,5–1 MB cada una). No subas RAW, TIFF ni HEIC.
   - **Vídeos:** comprímelos con [HandBrake](https://handbrake.fr) (gratis) → preset *Fast 1080p30* → MP4. **Máximo 50 MB por vídeo** (≈ 2 min en 1080p). Si pesa más, prueba *Fast 720p30*.
   - Para cada vídeo, exporta un fotograma como JPG para usarlo de portada.
2. **Crea la carpeta** dentro de su categoría, con el nombre en minúsculas y guiones, sin tildes ni espacios:
   `contenido/proyectos/moda/zara-verano-2026/`
3. **Mete los archivos numerados** en el orden en que quieres que salgan: `01.jpg`, `02.jpg`, `03.mp4` + `03.jpg`…
   - Dos fotos verticales seguidas se colocan solas en pareja; las horizontales van a ancho completo.
4. **Crea `proyecto.yaml`** en esa carpeta:
   ```yaml
   titulo: "Zara"
   orden: 1          # posición dentro de la categoría (1 = la primera)
   # portada: "02.jpg"   # opcional; si no, se usa la primera foto
   ```
5. **(Opcional)** Añade alguna foto a `contenido/home.yaml`.
6. **Comprueba** que todo está bien: `npm run revisar`. Si quieres verlo antes, usa `npm run dev` (ver abajo).
7. **Publica** con GitHub Desktop: escribe un mensaje (p. ej. "Añado proyecto Zara") → **Commit to main** → **Push origin**. GitHub construye y publica la web en unos minutos. El progreso se ve en la pestaña **Actions** del repositorio (✅ publicado, ❌ algo ha fallado: al pulsar se ve el motivo).

Para **quitar** un proyecto, borra su carpeta (y sus fotos de `home.yaml` si las había) y publica igual.

---

## Ver la web en tu ordenador

Solo la primera vez, instala [Node.js](https://nodejs.org) (versión LTS) y, en la carpeta del proyecto, ejecuta:

```sh
npm install
```

Después, cada vez que quieras verla:

```sh
npm run dev
```

Y abre http://localhost:4321 en el navegador. Los cambios en `contenido/` se ven al recargar. Para pararla: `Ctrl + C`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Web en local para probar |
| `npm run revisar` | Revisa pesos, formatos y archivos que falten |
| `npm run build` | Revisa y construye la web final en `dist/` (lo hace GitHub al publicar) |
| `npm run preview` | Muestra en local la web construida con `build` |

---

## Límites (GitHub Pages, gratis)

| Límite | Valor |
|---|---|
| Tamaño por archivo | GitHub avisa a partir de 50 MB y rechaza más de 100 MB |
| Tamaño de la web publicada | 1 GB (cada foto genera ~6 tamaños: la web ocupa ~3 veces las fotos) |
| Tráfico | 100 GB al mes (orientativo) |
| Publicaciones | ~10 por hora |
| Uso | No se permite para tiendas online o venta; un portfolio sí |

El script de revisión se ejecuta automáticamente antes de construir la web: si algo supera los límites, **para la publicación y explica qué arreglar**.

Con GitHub gratis, GitHub Pages solo funciona si el repositorio es **público**: cualquiera puede ver el código y los archivos (lo mismo que ya muestra la web).

---

## Pendiente antes de publicar de verdad

- [ ] Elegir el diseño de la Home en `/maquetas/` y borrar la carpeta `src/pages/maquetas/`
- [ ] Borrar el **contenido de prueba** (`contenido/proyectos/*/ejemplo-*`, `contenido/info/retrato.jpg`) y meter el real
- [ ] Rellenar `contenido/ajustes.yaml` (email, Instagram, datos legales) y confirmar el nombre
- [ ] Escribir la bio en `contenido/info/bio-es.md` y `bio-en.md`
- [ ] Revisar los textos de aviso legal y privacidad
- [ ] Conectar blancagtarrio.com y quitar el aviso de "no indexar" (en `.github/workflows/publicar.yml`)

El contenido de prueba usa fotos de [Picsum/Unsplash](https://picsum.photos) y el vídeo *Big Buck Bunny* (© Blender Foundation, CC BY 3.0).

---

## Glosario

| Palabra | Significado |
|---|---|
| **Repositorio** | La carpeta del proyecto en GitHub, con todo su historial |
| **Commit** | Guardar un cambio con un mensaje. Es un punto al que se puede volver |
| **Push** | Subir los commits de tu ordenador a GitHub |
| **main** | La versión principal del proyecto, la que se publica |
| **Build** | Construir la web final a partir del código y el contenido |
| **Deploy** | Poner la web construida en internet |
| **GitHub Actions** | Tareas automáticas de GitHub; aquí, construir y publicar la web con cada push |
| **GitHub Pages** | El servicio gratuito de GitHub que aloja la web |
| **localhost** | La web funcionando solo en tu ordenador |
| **npm / node_modules** | Herramienta que instala las piezas del proyecto y carpeta donde se guardan (no se sube a GitHub) |
| **YAML** | Formato de texto sencillo tipo `clave: "valor"` que usan `proyecto.yaml`, `home.yaml` y `ajustes.yaml` |
| **Slug** | Parte de la dirección de una página: en `blancagtarrio.com/moda/zara`, el slug es `zara` |
| **DNS / nameservers** | La agenda que traduce el dominio a la dirección del servidor, y quién la guarda |
