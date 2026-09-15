// Maquetación automática de la galería de un proyecto:
// - dos fotos verticales seguidas → en pareja, una al lado de la otra
// - todo lo demás → una fila para cada elemento
import type { Elemento } from './contenido';

export type Fila = { tipo: 'sola'; elemento: Elemento } | { tipo: 'pareja'; elementos: [Elemento, Elemento] };

export function agruparEnFilas(galeria: Elemento[]): Fila[] {
  const filas: Fila[] = [];
  for (let i = 0; i < galeria.length; i++) {
    const actual = galeria[i];
    const siguiente = galeria[i + 1];
    const esFotoVertical = (e?: Elemento) => e?.tipo === 'foto' && e.vertical;
    if (esFotoVertical(actual) && esFotoVertical(siguiente)) {
      filas.push({ tipo: 'pareja', elementos: [actual, siguiente] });
      i++;
    } else {
      filas.push({ tipo: 'sola', elemento: actual });
    }
  }
  return filas;
}
