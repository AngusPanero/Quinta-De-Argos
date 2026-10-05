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