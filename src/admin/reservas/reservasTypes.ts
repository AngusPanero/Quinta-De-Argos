export type ReservaSource = "web" | "airbnb" | "booking" | "owner" | "direct";
export type ReservaStatus = "confirmed" | "new" | "request" | "black" | "cancelled" | "inquiry";
export type ReservaScope = "upcoming" | "past" | "cancelled";

export interface Reserva {
    beds24Id: number;
    status: ReservaStatus;
    source: ReservaSource;
    arrival: string;          // "YYYY-MM-DD"
    departure: string;        // "YYYY-MM-DD" (no es noche ocupada)
    nights: number;
    numAdult: number;
    numChild: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    country2?: string | null;
    comments?: string | null;
    price?: number | null;
    commission?: number | null;
    apiReference?: string | null;
    bookingTime?: string | null;
    cancelTime?: string | null;
}

export interface CalendarDay {
    date: string;
    available: boolean;
    minStay: number | null;
    price: number | null;
}

export interface SyncState {
    at: string | null;
    ok: boolean | null;
    error?: string | null;
    fetched?: number;
    markedDeleted?: number;
}

export const SOURCE_LABEL: Record<ReservaSource, string> = {
    web: "Web",
    airbnb: "Airbnb",
    booking: "Booking",
    owner: "Uso propio",
    direct: "Directa",
};

export const STATUS_LABEL: Record<ReservaStatus, string> = {
    confirmed: "Confirmada",
    new: "Confirmada",        // Airbnb llega como "new" pero ocupa igual
    request: "Pendiente",
    black: "Bloqueo",
    cancelled: "Cancelada",
    inquiry: "Consulta",
};