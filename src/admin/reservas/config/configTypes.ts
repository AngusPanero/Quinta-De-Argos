export type FieldType = "int" | "number" | "select" | "time" | "email" | "phone" | "text" | "textarea";

export interface FieldOption {
    value: string;
    label: string;
}

export interface FieldDef {
    key: string;
    label: string;
    type: FieldType;
    min?: number;
    max?: number;
    unit?: string;
    help?: string;
    maxLength?: number;
    group?: string;
    options?: FieldOption[];
}

export type FieldValue = string | number | null;
export type Values = Record<string, FieldValue>;

export interface SectionConfig {
    values: Values;
    fields: FieldDef[];
}

export interface Limit {
    min: number;
    max: number;
}

export interface CalendarOptions {
    overrides: FieldOption[];
    limits: {
        maxDays: number;
        price: Limit;
        percent: Limit;
        minStay: Limit;
        maxStay: Limit;
    };
    today: string;
}

export interface ConfigResponse {
    reglas: SectionConfig;
    propiedad: SectionConfig;
    calendario: CalendarOptions;
}

export type FormSection = "reglas" | "propiedad";

export interface FieldChange {
    key: string;
    label: string;
    before: FieldValue;
    after: FieldValue;
}

export type CalendarField = "price" | "minStay" | "maxStay" | "override";

export interface CalendarDayState {
    price: number | null;
    minStay: number | null;
    maxStay: number | null;
    override: string;
}

export interface CalendarChange {
    date: string;
    weekday: number;
    before: CalendarDayState;
    after: CalendarDayState;
    fields: CalendarField[];
}

export interface CalendarRequest {
    from: string;
    to: string;
    weekdays: number[];
    price?: { mode: "fixed" | "percent"; value: string };
    minStay?: string;
    maxStay?: string;
    override?: string;
}

export interface CalendarSummary {
    from: string;
    to: string;
    weekdays: number[];
    days: number;
    ranges: number;
}

export interface CalendarPreview {
    summary: CalendarSummary;
    changes: CalendarChange[];
    skipped: { date: string; reason: string }[];
}

export interface ApiError {
    code: string;
    detail: string;
    errors?: Record<string, string>;
    remaining?: number;
}

// ---------- Vista mensual ----------
export type BookingSource = "web" | "airbnb" | "booking" | "owner" | "direct";

export interface CalendarViewDay extends CalendarDayState {
    date: string;
}

export interface CalendarViewBooking {
    beds24Id: number;
    status: string;
    source: BookingSource;
    arrival: string;
    departure: string;
    nights: number;
    numAdult: number;
    numChild: number;
    firstName?: string | null;
    lastName?: string | null;
}

export interface CalendarViewResponse {
    days: CalendarViewDay[];
    bookings: CalendarViewBooking[];
}

export interface DateRange {
    from: string;
    to: string;
}

// ---------- Precios de la web (no van a Beds24) ----------
export type WebPriceMode = "fixed" | "percent" | "auto";

export interface WebPricesState {
    today: string;
    lastDay: string;
    descuento: number;            // % general de la web, p. ej. 5
    descuentoPorDefecto: number;  // el del código (config/reservasConfig.js)
    limits: {
        precio: Limit;
        porcentaje: Limit;
        descuento: Limit;
        maxDias: number;
    };
    // Precios fijados a mano, agrupados en rangos con el mismo precio
    manuales: { from: string; to: string; precio: number }[];
}

export interface WebPriceRequest {
    from: string;
    to: string;
    weekdays: number[];
    mode: WebPriceMode;
    value?: string;
}

export interface WebPriceChange {
    date: string;
    weekday: number;
    channels: number;   // precio de Booking y Airbnb (reglas)
    before: { price: number; manual: boolean };
    after: { price: number; manual: boolean };
}

export interface WebPricePreview {
    summary: { from: string; to: string; weekdays: number[]; mode: WebPriceMode; days: number };
    changes: WebPriceChange[];
    skipped: { date: string; reason: string }[];
}

export interface WebPriceDay {
    date: string;
    price: number | null;   // lo que cobra la web esa noche
    manual: boolean;        // true = precio propio fijado en "Precios de la web"
}

// Dónde se quiere cambiar un día desde el calendario
export type EditTarget = "canales" | "web";

export interface WebDiscountPreview {
    before: number;
    after: number;
    examples: { price: number; before: number; after: number }[];
    manuales: number;
}