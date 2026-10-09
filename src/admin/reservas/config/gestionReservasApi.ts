// gestionReservasApi.ts — Quinta de Argos
// Llamadas del panel para reservas particulares, uso propio y cancelaciones.
// Los errores se leen con toApiError (configApi.ts), igual que el resto de Configuración.

import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const opts = { withCredentials: true };

export type TipoManual = "particular" | "uso_propio";
export type TipoReserva = "web" | "direct" | "owner";
export type TipoReembolso = "total" | "parcial" | "ninguno";

export interface ReservaGestionable {
    beds24Id: number;
    tipo: TipoReserva;
    checkIn: string;
    checkOut: string;
    noches: number;
    nombre: string | null;
    huespedes: number | null;
    precio: number | null;
    web: {
        id: string;
        codigo: string;
        estado: string;
        totalCentimos: number;
        reembolsadoCentimos: number;
    } | null;
}

export interface PagoSinBeds24 {
    id: string;
    codigo: string;
    checkIn: string;
    checkOut: string;
    nombre: string;
    total: number;
    error: string;
    intentos: number;
}

export interface GestionListado {
    hoy: string;
    limites: { maxHuespedes: number; maxNoches: number };
    reservas: ReservaGestionable[];
    pendientes: PagoSinBeds24[];
}

export interface ReservaManualRequest {
    tipo: TipoManual;
    checkIn: string;
    checkOut: string;
    nombre?: string;
    email?: string;
    telefono?: string;
    huespedes?: string;
    precio?: string;
    notas?: string;
    quitarCierre: boolean;
}

export interface Conflicto {
    beds24Id: number;
    origen: string;
    nombre: string | null;
    checkIn: string;
    checkOut: string;
}

export interface ReservaManualPreview {
    datos: {
        tipo: TipoManual;
        checkIn: string;
        checkOut: string;
        noches: number;
        nombre: string;
        huespedes: number;
        precio: number;
    };
    conflictos: Conflicto[];
    cierres: string[];
}

export interface CancelarRequest {
    reembolso?: TipoReembolso;
    importe?: string;
    motivo?: string;
}

export async function getGestionReservas(): Promise<GestionListado> {
    const { data } = await axios.get(`${API}/api/admin/gestion-reservas`, opts);
    return data;
}

export async function previewReservaManual(body: ReservaManualRequest): Promise<ReservaManualPreview> {
    const { data } = await axios.post(`${API}/api/admin/gestion-reservas/preview`, body, opts);
    return data;
}

export async function crearReservaManual(
    body: ReservaManualRequest,
    pin: string
): Promise<{ bookingId: string; tipo: TipoManual; cierresQuitados: number; aviso: string | null }> {
    const { data } = await axios.post(`${API}/api/admin/gestion-reservas`, { ...body, pin }, opts);
    return data;
}

export async function cancelarReserva(
    beds24Id: number,
    body: CancelarRequest,
    pin: string
): Promise<{ cancelada: boolean; reembolsoCentimos?: number; totalDevueltoCentimos?: number }> {
    const { data } = await axios.post(`${API}/api/admin/gestion-reservas/${beds24Id}/cancelar`, { ...body, pin }, opts);
    return data;
}

export async function reintentarBeds24(reservaWebId: string): Promise<{ estado: string; bookingId?: string }> {
    const { data } = await axios.post(`${API}/api/admin/reservas-web/${reservaWebId}/beds24`, {}, opts);
    return data;
}