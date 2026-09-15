// Direcciones (URLs) de cada página en cada idioma.
import type { Categoria, Idioma } from '../i18n/categorias';
import type { Proyecto } from './contenido';

const prefijo = (idioma: Idioma) => (idioma === 'en' ? '/en' : '');

export const urlInicio = (idioma: Idioma) => `${prefijo(idioma)}/`;
export const urlCategoria = (categoria: Categoria, idioma: Idioma) => `${prefijo(idioma)}/${categoria.slug[idioma]}/`;
export const urlProyecto = (proyecto: Proyecto, idioma: Idioma) =>
  `${prefijo(idioma)}/${proyecto.categoria.slug[idioma]}/${proyecto.slug}/`;
export const urlInfo = (idioma: Idioma) => `${prefijo(idioma)}/info/`;
export const urlAvisoLegal = (idioma: Idioma) => (idioma === 'en' ? '/en/legal-notice/' : '/aviso-legal/');
export const urlPrivacidad = (idioma: Idioma) => (idioma === 'en' ? '/en/privacy/' : '/privacidad/');
