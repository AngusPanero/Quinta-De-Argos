/**
 * bookingConfig.ts — Quinta de Argos
 * ---------------------------------------------------------
 * Configuración de reservas compartida entre Reservations.tsx
 * y Checkout.tsx. Todo lo que afecta el precio vive acá para
 * que las dos pantallas nunca queden desincronizadas.
 */

export interface Addon {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
}

// 💶 Único lugar para cambiar el precio por noche.
export const PRICE_PER_NIGHT = 220;

// 📅 Máximo de noches que se pueden reservar de una vez.
export const MAX_NIGHTS = 14;

// 👥 Capacidad máxima de huéspedes.
export const MAX_GUESTS = 6;

// 🔭 Hasta cuántos días hacia el futuro se puede reservar desde hoy.
export const MAX_BOOKING_HORIZON_DAYS = 365;

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
    descripcion: 'Flores, velas y detalles para aniversarios, pedidas o cumpleaños.',
    precio: 60,
  },
  {
    id: 'traslado',
    nombre: 'Traslado desde Caravaca de la Cruz',
    descripcion: 'Te recogemos y llevamos de vuelta a la estación o terminal más cercana.',
    precio: 40,
  },
  {
    id: 'desayuno-gourmet',
    nombre: 'Desayuno gourmet en el porche',
    descripcion: 'Selección de productos locales servida cada mañana de tu estancia.',
    precio: 25,
  },
];