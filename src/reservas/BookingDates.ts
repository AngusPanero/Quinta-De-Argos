/**
 * bookingDates.ts — Quinta de Argos
 * ---------------------------------------------------------
 * Utilidades de fecha compartidas entre BookingCalendar,
 * Reservations.tsx y Checkout.tsx. Sin librerías externas.
 *
 * Con el backend las fechas viajan SIEMPRE como "YYYY-MM-DD"
 * (toISODate / fromISODate). Nunca uses toISOString() para
 * mandar una fecha de calendario: convierte a UTC y en España
 * te puede devolver el día anterior.
 */

export const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function diffInDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Fecha local → "YYYY-MM-DD" (sin pasar por UTC). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" → Date local a medianoche. Devuelve null si el texto no es una fecha válida. */
export function fromISODate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = ISO_DATE_RE.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toISODate(date) === value ? date : null;
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function addDaysISO(value: string, days: number): string {
  const date = fromISODate(value);
  return date ? toISODate(addDays(date, days)) : value;
}

export function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // 0 = Lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDayMonth(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

export function formatPrice(value: number): string {
  return value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}