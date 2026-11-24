import { Orden } from './modelos';

export const ESTADOS = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA'];
export const NOMBRE_ESTADO: Record<string, string> = { PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada' };
export const NOMBRE_TIPO: Record<string, string> = { IMPORTACION: 'Importación', EXPORTACION: 'Exportación' };
export const ESTADOS_INC = ['ABIERTA', 'EN_INVESTIGACION', 'RESUELTA'];
export const NOMBRE_ESTADO_INC: Record<string, string> = { ABIERTA: 'Abierta', EN_INVESTIGACION: 'En investigación', RESUELTA: 'Resuelta' };
export const TIPOS_INC = ['PERDIDA', 'EXTRAVIO', 'ROBO', 'DANO'];
export const NOMBRE_TIPO_INC: Record<string, string> = { PERDIDA: 'Pérdida', EXTRAVIO: 'Extravío', ROBO: 'Robo', DANO: 'Daño' };
export const TAM_PAGINA = 8;

const formatoDinero = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' });
const formatoNumero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

export function dinero(n: number | null | undefined): string { return formatoDinero.format(n || 0); }
export function numero(n: number | null | undefined): string { return formatoNumero.format(n || 0); }

// Minúsculas y sin tildes, para que "revision" encuentre "revisión"
export function normalizar(texto: unknown): string {
  return String(texto == null ? '' : texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// "2026-09-06" -> "06 sept 2026" (se arma a mano para evitar desfases de zona horaria)
export function fechaCorta(iso: string | null | undefined): string {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!p) return iso || '';
  return new Date(+p[1], +p[2] - 1, +p[3]).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function hoyISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function fechaHora(iso: string | null | undefined): string {
  return (iso || '').replace('T', ' ').slice(0, 16);
}

function comparar(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), 'es', { numeric: true, sensitivity: 'base' });
}

// Ordena una copia de la lista; si empatan, lo más nuevo (id mayor) primero
export function ordenar<T extends { id: number }>(lista: T[], orden: Orden): T[] {
  const signo = orden.dir === 'asc' ? 1 : -1;
  return lista.slice().sort((x, y) => {
    const r = comparar((x as Record<string, unknown>)[orden.col], (y as Record<string, unknown>)[orden.col]);
    return r !== 0 ? r * signo : y.id - x.id;
  });
}

// Al cambiar de columna: los números y fechas arrancan de mayor a menor; los textos de A a Z
const COLUMNAS_DESC = ['valor', 'cantidad', 'peso', 'fecha', 'nMercancias', 'cantidadAfectada'];
export function siguienteOrden(actual: Orden, col: string): Orden {
  if (actual.col === col) return { col, dir: actual.dir === 'asc' ? 'desc' : 'asc' };
  return { col, dir: COLUMNAS_DESC.includes(col) ? 'desc' : 'asc' };
}

// Lista de páginas a mostrar: 1 … 4 5 6 … 12 (0 = puntos suspensivos)
export function paginasVisibles(actual: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>();
  [1, total, actual - 1, actual, actual + 1].forEach(p => { if (p >= 1 && p <= total) set.add(p); });
  const lista = Array.from(set).sort((a, b) => a - b);
  const res: number[] = [];
  lista.forEach((p, i) => {
    if (i > 0 && p - lista[i - 1] > 1) res.push(0);
    res.push(p);
  });
  return res;
}

// ----- CSV (se abre directo en Excel: separador ; y BOM para las tildes) -----
function celdaCsv(v: unknown): string {
  let t = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(t) && isNaN(Number(t))) t = "'" + t; // evita que Excel lo trate como fórmula
  return '"' + t.replace(/"/g, '""') + '"';
}

export function descargarCsv(nombre: string, cabeceras: string[], filas: unknown[][]): void {
  const texto = [cabeceras, ...filas].map(f => f.map(celdaCsv).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre + '-' + hoyISO() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
