// Textos fijos de la web en cada idioma.
import type { Idioma } from './categorias';

const es = {
  profesion: 'Fotografía',
  profesionPersona: 'Fotógrafa',
  descripcion: 'Fotógrafa de moda, interiorismo, eventos, foto fija y música.',
  menu: 'Menú principal',
  idiomas: 'Idioma',
  saltar: 'Saltar al contenido',
  info: 'Info',
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
};

const en: typeof es = {
  profesion: 'Photography',
  profesionPersona: 'Photographer',
  descripcion: 'Photographer working across fashion, interiors, events, film stills and music.',
  menu: 'Main menu',
  idiomas: 'Language',
  saltar: 'Skip to content',
  info: 'Info',
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
};

export const textos: Record<Idioma, typeof es> = { es, en };
