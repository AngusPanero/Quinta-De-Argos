import type { FieldDef, FieldValue } from "./configTypes";

export const WEEKDAYS = [
    { id: 1, short: "Lun", long: "lunes" },
    { id: 2, short: "Mar", long: "martes" },
    { id: 3, short: "Mié", long: "miércoles" },
    { id: 4, short: "Jue", long: "jueves" },
    { id: 5, short: "Vie", long: "viernes" },
    { id: 6, short: "Sáb", long: "sábado" },
    { id: 7, short: "Dom", long: "domingo" },
];

// Estado de un día en el calendario (cómo queda, no la acción)
export const OVERRIDE_STATE: Record<string, string> = {
    none: "Abierta",
    blackout: "Cerrada",
    noCheckIn: "Sin entrada",
    noCheckOut: "Sin salida",
    noCheckInOrCheckOut: "Sin entrada ni salida",
};

// "2026-10-05" → "05/10/2026"
export const formatDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function addDays(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function weekdayList(ids: number[]): string {
    if (ids.length === 7) return "todos los días";
    return WEEKDAYS.filter((w) => ids.includes(w.id)).map((w) => w.long).join(", ");
}

// Valor legible de un campo para mostrar antes/después
export function displayValue(field: FieldDef | undefined, value: FieldValue): string {
    if (value === null || value === "") return "Vacío";
    if (field?.type === "select") {
        return field.options?.find((o) => o.value === value)?.label ?? String(value);
    }
    const text = String(value);
    if (field?.type === "textarea" || text.length > 90) {
        return text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text;
    }
    return field?.unit ? `${text} ${field.unit}` : text;
}

export const toFormString = (value: FieldValue) => (value === null || value === undefined ? "" : String(value));