import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { CalendarDay, Reserva, ReservaSource, SyncState } from "./reservasTypes";
import { SOURCE_LABEL } from "./reservasTypes";
import {
    formatLong, formatMoney, formatShort, guestName, guestsLabel, monthGrid, monthLabel, todayISO,
} from "./reservasUtils";
import "./reservasCalendar.css";

const API = import.meta.env.VITE_API_URL;
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LEGEND: ReservaSource[] = ["web", "airbnb", "booking", "owner", "direct"];

// webPrice lo añade el backend (precio de la web, con el descuento ya aplicado).
type CalendarDayConWeb = CalendarDay & { webPrice?: number | null };

type CalendarBooking = Pick<Reserva,
    "beds24Id" | "status" | "source" | "arrival" | "departure" | "nights" |
    "numAdult" | "numChild" | "firstName" | "lastName" | "price" | "commission" | "apiReference">;

interface Props {
    refreshKey: number;
    onSyncInfo: (s: SyncState) => void;
}

export default function ReservasCalendar({ refreshKey, onSyncInfo }: Props) {
    const today = todayISO();
    const [year, setYear] = useState(() => Number(today.slice(0, 4)));
    const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1);
    const [days, setDays] = useState<CalendarDayConWeb[]>([]);
    const [bookings, setBookings] = useState<CalendarBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<CalendarBooking | null>(null);
    // Precio de la web por fecha (con el descuento ya aplicado), del mismo endpoint
    // que usa el calendario público: así se ve exactamente lo que se cobra.
    const [webPrices, setWebPrices] = useState<Map<string, number>>(new Map());

    const grid = useMemo(() => monthGrid(year, month), [year, month]);
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API}/api/admin/calendario`, {
                    withCredentials: true,
                    params: { from: grid[0], to: grid[grid.length - 1] },
                });
                if (cancelled) return;
                setDays(data.days);
                setBookings(data.bookings);
                if (data.lastSync) onSyncInfo(data.lastSync);
            } catch (err) {
                if (cancelled) return;
                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                setError(status === 401 || status === 403
                    ? "Tu sesión expiró. Volvé a iniciar sesión para ver el calendario."
                    : "No se pudo cargar el calendario desde Beds24. Probá de nuevo en unos segundos.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [grid, refreshKey, onSyncInfo]);

    useEffect(() => {
        let cancelled = false;
        axios
            .get(`${API}/api/reservas/disponibilidad`)
            .then(({ data }) => {
                if (cancelled) return;
                const dias: Record<string, { estado?: string; precio?: number }> =
                    data?.dias ?? data?.calendario?.dias ?? {};
                const mapa = new Map<string, number>();
                for (const [fecha, d] of Object.entries(dias)) {
                    if (typeof d?.precio === "number") mapa.set(fecha, d.precio);
                }
                setWebPrices(mapa);
            })
            .catch(() => {
                // Sin precios web el calendario sigue funcionando con los de Beds24.
            });
        return () => { cancelled = true; };
    }, [refreshKey]);

    const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

    // La reserva que ocupa esa noche (la salida no cuenta)
    const bookingOn = (date: string) => bookings.find((b) => b.arrival <= date && date < b.departure);

    const goMonth = (delta: number) => {
        const next = new Date(Date.UTC(year, month + delta, 1));
        setYear(next.getUTCFullYear());
        setMonth(next.getUTCMonth());
        setSelected(null);
    };

    const goToday = () => {
        setYear(Number(today.slice(0, 4)));
        setMonth(Number(today.slice(5, 7)) - 1);
        setSelected(null);
    };

    return (
        <div className="rc-wrap">
            <div className="rc-toolbar">
                <div className="rc-nav">
                    <button className="rc-nav-btn" onClick={() => goMonth(-1)} aria-label="Mes anterior">‹</button>
                    <h2 className="rc-month">{monthLabel(year, month)}</h2>
                    <button className="rc-nav-btn" onClick={() => goMonth(1)} aria-label="Mes siguiente">›</button>
                </div>
                <button className="rc-today" onClick={goToday}>Hoy</button>
            </div>

            <ul className="rc-legend">
                {LEGEND.map((s) => (
                    <li key={s} className={`rc-legend-item rc-legend-item--${s}`}>{SOURCE_LABEL[s]}</li>
                ))}
                <li className="rc-legend-item rc-legend-item--closed">No disponible</li>
                <li className="rc-legend-price">
                    <span className="rc-price">240 €</span>Beds24
                </li>
                <li className="rc-legend-price">
                    <span className="rc-price-web"><span className="rc-price-web-label">Web</span>228 €</span>Precio web
                </li>
            </ul>

            {error && <p className="rc-error" role="alert">{error}</p>}

            <div className={`rc-grid ${loading ? "rc-grid--loading" : ""}`} aria-busy={loading}>
                {WEEKDAYS.map((w) => <div key={w} className="rc-weekday">{w}</div>)}

                {grid.map((date, i) => {
                    const info = dayMap.get(date);
                    const booking = bookingOn(date);
                    const inMonth = date.startsWith(monthPrefix);
                    const isPast = date < today;
                    const isStart = !!booking && (booking.arrival === date || i % 7 === 0);
                    const closed = !booking && info && !info.available;
                    const webPrice = info?.webPrice ?? webPrices.get(date) ?? null;

                    const classes = [
                        "rc-cell",
                        !inMonth && "rc-cell--outside",
                        isPast && "rc-cell--past",
                        date === today && "rc-cell--today",
                        booking && `rc-cell--booked rc-cell--${booking.source}`,
                        booking && booking.arrival === date && "rc-cell--arrival",
                        closed && "rc-cell--closed",
                        selected && booking && selected.beds24Id === booking.beds24Id && "rc-cell--selected",
                    ].filter(Boolean).join(" ");

                    const content = (
                        <>
                            <span className="rc-daynum">{Number(date.slice(8, 10))}</span>
                            {booking && isStart && <span className="rc-guest">{guestName(booking)}</span>}
                            {!booking && info && info.available && (
                                <span className="rc-meta">
                                    <span className="rc-prices">
                                        {info.price !== null && (
                                            <span className="rc-price" title="Precio en Beds24 (Booking y Airbnb)">
                                                {Math.round(info.price)} €
                                            </span>
                                        )}
                                        {webPrice !== null && (
                                            <span className="rc-price-web" title="Precio en la web">
                                                <span className="rc-price-web-label">Web</span>{webPrice} €
                                            </span>
                                        )}
                                    </span>
                                    {info.minStay !== null && <span className="rc-minstay">mín. {info.minStay}</span>}
                                </span>
                            )}
                        </>
                    );

                    return booking ? (
                        <button
                            key={date}
                            className={classes}
                            onClick={() => setSelected(booking)}
                            aria-label={`${formatLong(date)}: ${SOURCE_LABEL[booking.source]}, ${guestName(booking)}`}
                        >
                            {content}
                        </button>
                    ) : (
                        <div key={date} className={classes}>{content}</div>
                    );
                })}
            </div>

            {selected && (
                <aside className={`rc-detail rc-detail--${selected.source}`}>
                    <div className="rc-detail-head">
                        <h3 className="rc-detail-name">{guestName(selected)}</h3>
                        <button className="rc-detail-close" onClick={() => setSelected(null)} aria-label="Cerrar detalle">×</button>
                    </div>
                    <p className="rc-detail-dates">
                        {formatShort(selected.arrival)} – {formatLong(selected.departure)}, {selected.nights} {selected.nights === 1 ? "noche" : "noches"}
                    </p>
                    <dl className="rc-detail-list">
                        <div><dt>Origen</dt><dd>{SOURCE_LABEL[selected.source]}</dd></div>
                        {selected.source !== "owner" && (
                            <div><dt>Huéspedes</dt><dd>{guestsLabel(selected.numAdult, selected.numChild)}</dd></div>
                        )}
                        {typeof selected.price === "number" && selected.price > 0 && (
                            <div><dt>Importe</dt><dd>{formatMoney(selected.price)}</dd></div>
                        )}
                        {selected.apiReference && (
                            <div><dt>Nº en {SOURCE_LABEL[selected.source]}</dt><dd>{selected.apiReference}</dd></div>
                        )}
                    </dl>
                </aside>
            )}
        </div>
    );
}