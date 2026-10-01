// Textos fijos de la web en cada idioma.
import type { Idioma } from './categorias';

// Pone en mayúscula la primera letra, para empezar una frase con el género
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

const es = {
  profesion: 'Fotografía',
  profesionPersona: 'Fotógrafa',
  descripcion: 'Fotógrafa de moda, interiorismo, eventos, foto fija, música y viajes.',
  menu: 'Menú principal',
  abrirMenu: 'Abrir menú',
  cerrarMenu: 'Cerrar menú',
  idiomas: 'Idioma',
  saltar: 'Saltar al contenido',
  contacto: 'Contacto',
  siguienteProyecto: 'Siguiente proyecto',
  proximamente: 'Próximamente.',
  ampliar: 'Ampliar foto',
  foto: 'foto',
  video: 'vídeo',
  visor: 'Visor de fotos',
  cerrar: 'Cerrar',
  anterior: 'Anterior',
  siguiente: 'Siguiente',
  reproducir: 'Reproducir vídeo',
  avisoLegal: 'Aviso legal',
  privacidad: 'Privacidad',

  // Cada página lleva su propia descripción: es la frase que Google enseña
  // debajo del título en sus resultados. Si todas dicen lo mismo, Google no
  // sabe qué distingue a una de otra.
  descripcionCategoria: (genero: string, nombre: string, proyectos: string[]) =>
    `${mayuscula(genero)} de ${nombre}.` +
    (proyectos.length ? ` Proyectos: ${proyectos.slice(0, 4).join(', ')}.` : ''),
  descripcionProyecto: (titulo: string, genero: string, nombre: string, cuantas: number) =>
    `${titulo}: ${genero} de ${nombre}. ${cuantas} fotografías.`,
  descripcionContacto: (nombre: string) =>
    `Contacta con ${nombre}, fotógrafa de moda, interiorismo, eventos, foto fija, música y viajes.`,
  fotoDe: (titulo: string, genero: string, numero: number) =>
    `${titulo}, ${genero} — foto ${numero}`,
};

const en: typeof es = {
  profesion: 'Photography',
  profesionPersona: 'Photographer',
  descripcion: 'Photographer working across fashion, interiors, events, film stills, music and travel.',
  menu: 'Main menu',
  abrirMenu: 'Open menu',
  cerrarMenu: 'Close menu',
  idiomas: 'Language',
  saltar: 'Skip to content',
  contacto: 'Contact',
  siguienteProyecto: 'Next project',
  proximamente: 'Coming soon.',
  ampliar: 'Enlarge photo',
  foto: 'photo',
  video: 'video',
  visor: 'Photo viewer',
  cerrar: 'Close',
  anterior: 'Previous',
  siguiente: 'Next',
  reproducir: 'Play video',
  avisoLegal: 'Legal notice',
  privacidad: 'Privacy',

  descripcionCategoria: (genero: string, nombre: string, proyectos: string[]) =>
    `${mayuscula(genero)} by ${nombre}.` +
    (proyectos.length ? ` Projects: ${proyectos.slice(0, 4).join(', ')}.` : ''),
  descripcionProyecto: (titulo: string, genero: string, nombre: string, cuantas: number) =>
    `${titulo}: ${genero} by ${nombre}. ${cuantas} photographs.`,
  descripcionContacto: (nombre: string) =>
    `Get in touch with ${nombre}, photographer working across fashion, interiors, events, film stills, music and travel.`,
  fotoDe: (titulo: string, genero: string, numero: number) =>
    `${titulo}, ${genero} — photo ${numero}`,
};

export const textos: Record<Idioma, typeof es> = { es, en };
