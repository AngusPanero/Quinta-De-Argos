/**
 * bookingConfig.ts — Quinta de Argos
 * ---------------------------------------------------------
 * Configuración de PRESENTACIÓN compartida entre Reservations.tsx
 * y Checkout.tsx.
 *
 * ⚠️ Nada de lo que hay aquí decide lo que se cobra. Los precios por
 * noche, la estancia mínima, la antelación de 72 h y el precio real de
 * los adicionales los controla el backend (data/tarifas.js y
 * config/reservasConfig.js). Si cambias un adicional, cámbialo también
 * allí con el mismo id.
 */

export interface Addon {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number; // solo para mostrar; el backend cobra el suyo
}

// 📅 Máximo de noches (valor por defecto mientras carga la disponibilidad).
export const MAX_NIGHTS = 30;

// 👥 Capacidad máxima (valor por defecto mientras carga la disponibilidad).
export const MAX_GUESTS = 6;

// ⏱️ Antelación mínima para reservar, en horas (solo para el texto informativo).
export const MIN_NOTICE_HOURS = 72;

// ✨ Adicionales contratables. Si este array queda vacío ([]),
// el wizard de Reservations salta directo al botón de pago.
export const ADDONS: Addon[] = [
  {
    id: 'cena-privada',
    nombre: 'Cena privada en el porche',
    descripcion: 'Chef a domicilio para una cena exclusiva con vistas al atardecer.',
    precio: 180,
  },
  {
    id: 'decoracion-especial',
    nombre: 'Decoración especial',
    descripcion: 'Flores, velas y detalles para aniversarios, pedidas de mano o cumpleaños.',
    precio: 60,
  },
  {
    id: 'traslado',
    nombre: 'Traslado desde Caravaca de la Cruz',
    descripcion: 'Te recogemos y te llevamos de vuelta a la estación o terminal más cercana.',
    precio: 40,
  },
  {
    id: 'desayuno-gourmet',
    nombre: 'Desayuno gourmet en el porche',
    descripcion: 'Selección de productos locales servida cada mañana de tu estancia.',
    precio: 25,
  },
];