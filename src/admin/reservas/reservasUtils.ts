// Fechas como "YYYY-MM-DD", sin librerías externas.
import type { Reserva } from "./reservasTypes";

const pad = (n: number) => String(n).padStart(2, "0");

// month: 0-11
export const toISO = (year: number, month: number, day: number) =>
    `${year}-${pad(month + 1)}-${pad(day)}`;

export function addDays(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
    const now = new Date();
    return toISO(now.getFullYear(), now.getMonth(), now.getDate());
}

// Grilla del mes empezando en lunes, con las semanas justas
export function monthGrid(year: number, month: number): string[] {
    const first = new Date(Date.UTC(year, month, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
    const start = addDays(toISO(year, month, 1), -offset);
    return Array.from({ length: cells }, (_, i) => addDays(start, i));
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const monthLabel = (year: number, month: number) => `${MONTHS[month]} ${year}`;

const shortFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export const formatShort = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatLong = (iso: string) => longFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatDateTime = (value: string) => dateTimeFmt.format(new Date(value));

const moneyFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
export const formatMoney = (value: number) => moneyFmt.format(value);

export function relativeTime(value: string | null): string {
    if (!value) return "todavía no";
    const minutes = Math.floor((Date.now() - Date.parse(value)) / 60000);
    if (minutes < 1) return "hace un momento";
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    return formatDateTime(value);
}

export function guestName(r: Pick<Reserva, "source" | "firstName" | "lastName">): string {
    if (r.source === "owner") return "Uso propio";
    const name = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
    return name || "Sin nombre";
}

export function guestsLabel(adults: number, children: number): string {
    const a = `${adults} ${adults === 1 ? "adulto" : "adultos"}`;
    if (!children) return a;
    return `${a} y ${children} ${children === 1 ? "niño" : "niños"}`;
}