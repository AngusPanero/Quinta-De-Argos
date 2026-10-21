// preciosTodosApi.ts — Quinta de Argos
// «Cambiar en todos lados»: un precio que va a Beds24 (Booking y Airbnb) y a la web a la vez.
// Archivo aparte para no tocar configApi.ts. Los errores se leen con toApiError (configApi.ts).

import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const opts = { withCredentials: true };

export interface PreciosTodosRequest {
    from: string;
    to: string;
    weekdays: number[];
    precio: string; // precio de Beds24 por noche, en euros
}

export interface PreciosTodosSummary {
    from: string;
    to: string;
    weekdays: number[];
    precioBeds24: number;
    precioWeb: number;
    descuento: number; // fracción: 0.05 = 5 %
    diasBeds24: number; // días que cambian en Beds24
    diasWeb: number; // días que cambian en la web
}

export interface PreciosTodosDay {
    date: string;
    weekday: number;
    beds24: { antes: number | null; despues: number; cambia: boolean };
    web: { antes: number | null; antesManual: boolean; despues: number; cambia: boolean };
}

export async function previewPreciosTodos(body: PreciosTodosRequest): Promise<{ summary: PreciosTodosSummary; days: PreciosTodosDay[] }> {
    const { data } = await axios.post(`${API}/api/admin/precios-todos/preview`, body, opts);
    return data;
}

export async function applyPreciosTodos(body: PreciosTodosRequest, pin: string): Promise<{ applied: PreciosTodosSummary }> {
    const { data } = await axios.post(`${API}/api/admin/precios-todos`, { ...body, pin }, opts);
    return data;
}