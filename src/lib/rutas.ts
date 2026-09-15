// Direcciones (URLs) de cada página en cada idioma.
import type { Categoria, Idioma } from '../i18n/categorias';
import type { Proyecto } from './contenido';

// Inicio de todas las direcciones: "" en blancagtarrio.com, "/Blanca-Portfolio" en GitHub Pages
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const conBase = (ruta: string) => `${BASE}${ruta}`;
const prefijo = (idioma: Idioma) => conBase(idioma === 'en' ? '/en' : '');

export const urlInicio = (idioma: Idioma) => `${prefijo(idioma)}/`;
export const urlCategoria = (categoria: Categoria, idioma: Idioma) => `${prefijo(idioma)}/${categoria.slug[idioma]}/`;
export const urlProyecto = (proyecto: Proyecto, idioma: Idioma) =>
  `${prefijo(idioma)}/${proyecto.categoria.slug[idioma]}/${proyecto.slug}/`;
export const urlInfo = (idioma: Idioma) => `${prefijo(idioma)}/info/`;
export const urlAvisoLegal = (idioma: Idioma) => conBase(idioma === 'en' ? '/en/legal-notice/' : '/aviso-legal/');
export const urlPrivacidad = (idioma: Idioma) => conBase(idioma === 'en' ? '/en/privacy/' : '/privacidad/');
