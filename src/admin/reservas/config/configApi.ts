import axios from "axios";
import type {
    ApiError, CalendarPreview, CalendarRequest, CalendarSummary, CalendarViewResponse,
    ConfigResponse, FieldChange, FormSection, Values,
} from "./configTypes";

const API = import.meta.env.VITE_API_URL;
const opts = { withCredentials: true };

export function toApiError(err: unknown): ApiError {
    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data ?? {};
        if (status === 401 && !data.message?.startsWith("CLAVE")) {
            return { code: "SESION", detail: "Tu sesión expiró. Volvé a iniciar sesión." };
        }
        if (status === 403) return { code: "SIN_PERMISO", detail: "Tu cuenta no tiene permiso de administrador." };
        if (data.message) {
            return { code: data.message, detail: data.detail || "No se pudo completar la operación.", errors: data.errors, remaining: data.remaining };
        }
        if (!err.response) return { code: "RED", detail: "Sin conexión con el servidor. Revisá tu internet y probá de nuevo." };
    }
    return { code: "DESCONOCIDO", detail: "No se pudo completar la operación." };
}

export async function fetchConfig(): Promise<ConfigResponse> {
    const { data } = await axios.get(`${API}/api/admin/config`, opts);
    return data;
}

export async function previewCalendar(body: CalendarRequest): Promise<CalendarPreview> {
    const { data } = await axios.post(`${API}/api/admin/config/calendario/preview`, body, opts);
    return data;
}

export async function applyCalendar(body: CalendarRequest, pin: string): Promise<{ applied: CalendarSummary; skipped: CalendarPreview["skipped"] }> {
    const { data } = await axios.post(`${API}/api/admin/config/calendario`, { ...body, pin }, opts);
    return data;
}

export async function previewSection(section: FormSection, values: Values): Promise<FieldChange[]> {
    const { data } = await axios.post(`${API}/api/admin/config/${section}/preview`, { values }, opts);
    return data.changes;
}

export async function applySection(section: FormSection, values: Values, pin: string): Promise<{ applied: number; config: ConfigResponse }> {
    const { data } = await axios.post(`${API}/api/admin/config/${section}`, { values, pin }, opts);
    return data;
}

export async function fetchCalendarView(from: string, to: string): Promise<CalendarViewResponse> {
    const { data } = await axios.get(`${API}/api/admin/config/calendario`, { ...opts, params: { from, to } });
    return data;
}