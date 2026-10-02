// Maquetación automática de la galería de un proyecto:
// - dos fotos verticales seguidas → en pareja, una al lado de la otra
// - nunca se emparejan dos fotos de proyectos distintos: en las páginas de
//   categoría los proyectos van seguidos y sin título, así que una pareja a
//   caballo entre dos borraría la única pista de que ahí empieza otro trabajo
// - una foto marcada "sola" nunca se empareja, aunque sea vertical
// - todo lo demás → una fila para cada elemento
import type { Elemento } from './contenido';

export type Fila = { tipo: 'sola'; elemento: Elemento } | { tipo: 'pareja'; elementos: [Elemento, Elemento] };

export function agruparEnFilas(galeria: Elemento[]): Fila[] {
  const filas: Fila[] = [];
  for (let i = 0; i < galeria.length; i++) {
    const actual = galeria[i];
    const siguiente = galeria[i + 1];
    const esFotoVertical = (e?: Elemento) => e?.tipo === 'foto' && e.vertical && !e.sola;
    const mismoProyecto = siguiente && actual.proyecto === siguiente.proyecto;
    if (esFotoVertical(actual) && esFotoVertical(siguiente) && mismoProyecto) {
      filas.push({ tipo: 'pareja', elementos: [actual, siguiente] });
      i++;
    } else {
      filas.push({ tipo: 'sola', elemento: actual });
    }
  }
  return filas;
}
