/**
 * reservasWebTypes.ts — Quinta de Argos (panel)
 * ---------------------------------------------------------
 * Tipos de las reservas hechas desde la web, tal y como las
 * devuelve GET /api/admin/reservas-web (models/Reserva.js).
 * Además, formateadores y textos compartidos de la pestaña.
 */

// Las peticiones van con withCredentials (cookie de sesión de admin).
// Si tu panel manda el token de otra forma (cabecera Authorization,
// interceptor de axios…), adapta API_CONFIG.
export const API_BASE: string = import.meta.env.VITE_API_URL || '';
export const API_CONFIG = { withCredentials: true };

export type EstadoReserva = 'pendiente_pago' | 'pagada' | 'pago_fallido' | 'cancelada' | 'reembolsada';

export interface Aceptacion {
  aceptado: boolean;
  version: string | null;
  fecha: string;
  ip: string;
  userAgent: string;
}

export interface Comunicacion {
  _id: string;
  tipo: 'factura' | 'mensaje';
  destinatario: string;
  asunto: string;
  mensaje: string;
  estado: 'pendiente_envio' | 'enviado' | 'error';
  error: string;
  creadoPor: string;
  fecha: string;
}

export interface ReservaWeb {
  _id: string;
  codigo: string;
  estado: EstadoReserva;
  historialEstados: { estado: EstadoReserva; fecha: string; motivo: string }[];
  origen: string;
  estancia: { checkIn: string; checkOut: string; noches: number; huespedes: number };
  importes: {
    moneda: string;
    desglose: { fecha: string; precio: number }[];
    alojamiento: number;
    adicionales: { id: string; nombre: string; precio: number }[];
    totalAdicionales: number;
    total: number;
    totalCentimos: number;
  };
  contacto: { nombre: string; email: string; telefono: string };
  facturacion: {
    tipo: 'particular' | 'empresa';
    nombre: string;
    tipoDocumento: string;
    documento: string;
    direccion: {
      linea1: string;
      linea2: string;
      codigoPostal: string;
      ciudad: string;
      provincia: string;
      pais: string;
    };
  };
  consentimientos: {
    politicaPrivacidad: Aceptacion;
    condicionesReserva: Aceptacion;
    comunicacionesComerciales: Aceptacion;
  };
  pago: {
    proveedor: string;
    paymentIntentId: string | null;
    estadoProveedor: string | null;
    pagadoEn: string | null;
    errorMensaje: string;
  };
  beds24: { bookingId: string | null; sincronizadoEn: string | null; error: string };
  factura?: { numero: string | null; fechaEmision: string | null; ultimoEnvio: string | null };
  comunicaciones?: Comunicacion[];
  createdAt: string;
  updatedAt: string;
}

export interface ResultadoEnvio {
  enviado: boolean;
  motivo?: string;
  error?: string;
}

export const ESTADO_LABEL: Record<EstadoReserva, string> = {
  pendiente_pago: 'Pendiente de pago',
  pagada: 'Pagada',
  pago_fallido: 'Pago fallido',
  cancelada: 'Cancelada',
  reembolsada: 'Reembolsada',
};

export const COMUNICACION_ESTADO_LABEL: Record<Comunicacion['estado'], string> = {
  pendiente_envio: 'Pendiente de envío',
  enviado: 'Enviado',
  error: 'Error',
};

export const DOCUMENTO_LABEL: Record<string, string> = {
  NIF: 'DNI / NIF',
  NIE: 'NIE',
  CIF: 'CIF',
  PASAPORTE: 'Pasaporte',
  ID_EXTRANJERO: 'Documento extranjero',
};

// ---------- Formateadores (hora de España) ----------

export function formatEuros(value: number): string {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

/** "2026-11-10" → "mar, 10 nov 2026" (sin pasar por UTC). */
export function formatFechaCalendario(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Marca de tiempo → "8 oct 2026, 16:57" en hora de España. */
export function formatMomento(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Texto en minúsculas y sin tildes, para búsquedas. */
export function normalizarBusqueda(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}