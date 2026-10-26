// gestionReservasApi.ts — Quinta de Argos
// Llamadas del panel para reservas particulares, uso propio, cancelaciones y fianzas.
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
    // Para rellenar el formulario de edición (particular / uso propio)
    email?: string | null;
    telefono?: string | null;
    notas?: string | null;
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

// ---------- Editar reserva particular / uso propio ----------

/** Lo mismo que al crear, sin el tipo (no se cambia) ni quitarCierre. */
export interface EdicionRequest {
    checkIn: string;
    checkOut: string;
    nombre?: string;
    email?: string;
    telefono?: string;
    huespedes?: string;
    precio?: string;
    notas?: string;
}

export interface DatosReservaManual {
    tipo: TipoManual;
    checkIn: string;
    checkOut: string;
    noches: number;
    nombre: string;
    huespedes: number;
    precio: number;
    email?: string;
    telefono?: string;
    notas?: string;
}

export interface EdicionPreview {
    antes: {
        checkIn: string;
        checkOut: string;
        noches: number;
        nombre: string | null;
        huespedes: number | null;
        precio: number | null;
    };
    datos: DatosReservaManual;
    conflictos: Conflicto[];
    empezada: boolean; // si ya empezó, solo se puede cambiar la salida
}

export interface CancelarRequest {
    reembolso?: TipoReembolso;
    importe?: string;
    motivo?: string;
}

// ---------- Fianzas y política de cancelación ----------

/** Reembolso que corresponde si se cancela hoy (lo calcula el servidor). Todo en céntimos. */
export interface PoliticaCancelacion {
    diasHastaLlegada: number;
    porcentaje: number; // 100 o 50
    estanciaCentimos: number;
    estanciaDevueltaCentimos: number;
    fianzaCentimos: number; // fianza pendiente: se devuelve siempre completa
    reembolsoCentimos: number; // estancia según política + fianza
    maximoCentimos: number;
}

export interface FianzaPendiente {
    id: string; // id de la reserva web
    beds24Id: number | null;
    codigo: string;
    nombre: string;
    email: string;
    checkIn: string;
    checkOut: string;
    huespedes: number;
    estanciaTerminada: boolean;
    fianzaCentimos: number;
    fianzaDevueltaCentimos: number;
    pendienteCentimos: number;
}

export interface FianzasListado {
    hoy: string;
    reglas: { diasReembolsoTotal: number; porcentajeTardio: number };
    pendientes: FianzaPendiente[];
    politica: Record<string, PoliticaCancelacion>; // por id de Beds24
    linksPendientes: Record<string, LinkPendiente>; // por id de Beds24
}

// ---------- Cambio de fechas de reservas web ----------

export interface Fechas {
    checkIn: string;
    checkOut: string;
    noches?: number;
}

/** Link de pago de Stripe de una ampliación que el huésped todavía no ha pagado. */
export interface LinkPendiente {
    url: string;
    cargoCentimos: number;
    venceEn: string;
    antes: Fechas;
    despues: Fechas;
}

export interface NochePrecio {
    fecha: string;
    precio: number; // euros
}

/** Qué ocupa una noche que no está libre. */
export type Bloqueo =
    | {
          tipo: "reserva";
          beds24Id: number;
          origen: "web" | "airbnb" | "booking" | "particular" | "uso_propio";
          nombre: string | null;
          checkIn: string;
          checkOut: string;
          noches: string[];
          codigo: string | null;
          estadoWeb: string | null;
          liberable: boolean; // quedó colgada: se puede liberar desde el panel
          motivo: string | null;
      }
    | { tipo: "cierre"; noches: string[]; liberable: true }
    | { tipo: "desconocido"; noches: string[]; liberable: false };

/** Lo que calcula el servidor antes de cambiar las fechas. Importes en céntimos. */
export interface ModificacionPreview {
    codigo: string;
    empezada: boolean; // si ya empezó, solo se puede cambiar la salida
    antes: Fechas;
    despues: Fechas;
    nochesQuitadas: NochePrecio[]; // con el precio que se pagó por cada una
    nochesNuevas: NochePrecio[]; // con el precio web de hoy
    conflictos: string[]; // noches nuevas ya ocupadas
    bloqueos: Bloqueo[]; // qué ocupa cada una
    margenPropio: string[]; // bloqueadas solo por el margen de limpieza de esta reserva (cuentan como libres)
    sinTarifa: string[]; // noches nuevas sin precio en el calendario
    disponible: boolean;
    valorQuitadasCentimos: number;
    reembolsoSugeridoCentimos: number;
    maximoReembolsoCentimos: number;
    cargoNochesCentimos: number;
    fianzaActualCentimos: number;
}

export type ReembolsoModificacion = "sugerido" | "otro" | "ninguno";
export type MetodoCobro = "stripe" | "transferencia";

export interface ModificarRequest {
    checkIn: string;
    checkOut: string;
    reembolso: ReembolsoModificacion;
    importeReembolso?: string;
    fianzaAdicional?: string;
    metodoCobro?: MetodoCobro;
    nota?: string;
}

export interface ModificacionResultado {
    modificacion: {
        estado: "aplicada" | "pendiente_pago" | "pagada" | "vencida" | "rechazada";
        antes: Fechas;
        despues: Fechas;
        cargoCentimos: number;
        fianzaAdicionalCentimos: number;
        metodoCobro: MetodoCobro | "sin_cargo";
        reembolsoCentimos: number;
        reembolsoPendienteCentimos: number;
        venceEn?: string;
    };
    checkoutUrl: string | null;
    aviso: string | null;
}

export async function getGestionReservas(): Promise<GestionListado> {
    const { data } = await axios.get(`${API}/api/admin/gestion-reservas`, opts);
    return data;
}

export async function getFianzas(): Promise<FianzasListado> {
    const { data } = await axios.get(`${API}/api/admin/fianzas`, opts);
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

/** Comprueba la edición de una particular / uso propio sin tocar nada. */
export async function previewEdicion(beds24Id: number, body: EdicionRequest): Promise<EdicionPreview> {
    const { data } = await axios.post(`${API}/api/admin/gestion-reservas/${beds24Id}/editar/preview`, body, opts);
    return data;
}

/** Guarda la edición en Beds24 (la misma reserva: Booking y Airbnb se actualizan). */
export async function editarReserva(
    beds24Id: number,
    body: EdicionRequest,
    pin: string
): Promise<{ editada: boolean; beds24Id: number; antes: EdicionPreview["antes"]; datos: DatosReservaManual }> {
    const { data } = await axios.put(`${API}/api/admin/gestion-reservas/${beds24Id}`, { ...body, pin }, opts);
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

/** Devuelve la fianza (toda, o solo `importe` en euros). La reserva no se cancela. */
export async function devolverFianza(
    reservaWebId: string,
    body: { importe?: string; nota?: string },
    pin: string
): Promise<{ devueltoCentimos: number; totalDevueltoCentimos: number; pendienteCentimos: number }> {
    const { data } = await axios.post(`${API}/api/admin/fianzas/${reservaWebId}/devolver`, { ...body, pin }, opts);
    return data;
}

/** Calcula el cambio de fechas sin tocar nada. */
export async function previewModificacion(reservaWebId: string, body: { checkIn: string; checkOut: string }): Promise<ModificacionPreview> {
    const { data } = await axios.post(`${API}/api/admin/reservas-web/${reservaWebId}/modificar/preview`, body, opts);
    return data;
}

/** Cambia las fechas en Beds24 y en la web, devuelve y/o cobra la diferencia. */
export async function modificarReserva(reservaWebId: string, body: ModificarRequest, pin: string): Promise<ModificacionResultado> {
    const { data } = await axios.post(`${API}/api/admin/reservas-web/${reservaWebId}/modificar`, { ...body, pin }, opts);
    return data;
}

/** Libera las noches ocupadas por algo colgado y devuelve el cálculo nuevo. */
export async function liberarNoches(
    reservaWebId: string,
    body: { checkIn: string; checkOut: string },
    pin: string
): Promise<{ liberadas: number[]; cierresQuitados: string[]; calculo: ModificacionPreview }> {
    const { data } = await axios.post(`${API}/api/admin/reservas-web/${reservaWebId}/modificar/liberar`, { ...body, pin }, opts);
    return data;
}

export async function reintentarBeds24(reservaWebId: string): Promise<{ estado: string; bookingId?: string }> {
    const { data } = await axios.post(`${API}/api/admin/reservas-web/${reservaWebId}/beds24`, {}, opts);
    return data;
}