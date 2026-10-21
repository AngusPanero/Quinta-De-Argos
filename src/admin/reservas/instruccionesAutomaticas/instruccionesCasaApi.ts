// instruccionesCasaApi.ts — Quinta de Argos
// Llamadas del panel para el envío automático de las instrucciones de la casa.
// Los errores se leen con toApiError (configApi.ts), igual que el resto de Configuración.

import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const opts = { withCredentials: true };
const BASE = `${API}/api/admin/instrucciones-casa`;

export interface InstruccionesConfig {
    activo: boolean;
    horasAntes: number;
    horaCheckIn: string; // "15:00" (hora de España)
    asunto: string;
    mensaje: string;
    ubicacionUrl: string;
    pdf: { nombre: string; tamano: number; subidoEn: string; subidoPor: string } | null;
    actualizadoEn: string | null;
    actualizadoPor: string;
}

export type EstadoEnvio =
    | "programado" // todavía no es la hora
    | "en_cola" // ya es la hora: sale en la próxima vuelta (máx. 5 min)
    | "enviando"
    | "enviado"
    | "error" // falló tras los reintentos
    | "sin_email"
    | "sin_pdf"
    | "inactivo"
    | "vencido"; // ya pasó el día de llegada

export interface EnvioProximo {
    id: string; // id de la reserva web
    codigo: string;
    nombre: string;
    email: string;
    checkIn: string;
    checkOut: string;
    envioProgramado: string;
    envioTexto: string;
    estado: EstadoEnvio;
    enviadoEn: string | null;
    error: string;
    intentos: number;
}

export interface EnvioHecho {
    id: string;
    reservaId: string;
    codigo: string;
    email: string;
    checkIn: string;
    estado: "enviado" | "error";
    manual: boolean;
    por: string;
    enviadoEn: string | null;
    error: string;
    fecha: string;
}

export interface InstruccionesListado {
    config: InstruccionesConfig;
    ejemplo: { checkIn: string; envioTexto: string };
    limites: { maxHorasAntes: number; maxPdfMb: number };
    automatico: boolean; // false si el servidor tiene INSTRUCCIONES_AUTO=off
    proximos: EnvioProximo[];
    ultimos: EnvioHecho[];
}

export interface InstruccionesRequest {
    activo: boolean;
    horasAntes: string;
    horaCheckIn: string;
    asunto: string;
    mensaje: string;
    ubicacionUrl: string;
}

export async function getInstrucciones(): Promise<InstruccionesListado> {
    const { data } = await axios.get(BASE, opts);
    return data;
}

export async function guardarInstrucciones(body: InstruccionesRequest, pin: string): Promise<{ config: InstruccionesConfig }> {
    const { data } = await axios.put(BASE, { ...body, pin }, opts);
    return data;
}

export async function subirPdfInstrucciones(archivo: File, pin: string): Promise<{ config: InstruccionesConfig }> {
    const form = new FormData();
    form.append("pdf", archivo);
    form.append("pin", pin);
    const { data } = await axios.post(`${BASE}/pdf`, form, opts);
    return data;
}

export async function borrarPdfInstrucciones(pin: string): Promise<{ config: InstruccionesConfig }> {
    const { data } = await axios.delete(`${BASE}/pdf`, { ...opts, data: { pin } });
    return data;
}

/** Descarga el PDF guardado (para verlo en otra pestaña). */
export async function verPdfInstrucciones(): Promise<Blob> {
    const { data } = await axios.get(`${BASE}/pdf`, { ...opts, responseType: "blob" });
    return data;
}

export async function enviarPruebaInstrucciones(email?: string): Promise<{ enviado: boolean; email: string }> {
    const { data } = await axios.post(`${BASE}/prueba`, email ? { email } : {}, opts);
    return data;
}

export async function enviarInstruccionesAhora(reservaWebId: string, pin: string): Promise<{ enviado: boolean; codigo: string; email: string }> {
    const { data } = await axios.post(`${BASE}/enviar/${reservaWebId}`, { pin }, opts);
    return data;
}