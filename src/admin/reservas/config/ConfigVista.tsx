import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { fetchCalendarView, fetchWebPriceDays, toApiError } from "./configApi";
import {
    OVERRIDE_HELP, OVERRIDE_STATE, SOURCE_LABEL, WEEKDAYS,
    formatDate, formatLongDate, monthGrid, monthLabel,
} from "./configUtils";
import type { CalendarViewBooking, CalendarViewDay, DateRange, EditTarget, WebPriceDay } from "./configTypes";

export interface ViewMonth {
    year: number;
    month: number;   // 0-11
}

interface Props {
    today: string;
    defaults: { minStay: number | null; maxStay: number | null };
    month: ViewMonth;
    onMonthChange: (m: ViewMonth) => void;
    onEdit: (range: DateRange, target: EditTarget) => void;
}

const guestName = (b: CalendarViewBooking) => {
    if (b.source === "owner") return "Uso propio";
    return [b.firstName, b.lastName].filter(Boolean).join(" ").trim() || "Sin nombre";
};

export default function ConfigVista({ today, defaults, month, onMonthChange, onEdit }: Props) {
    const { year, month: m } = month;
    const grid = useMemo(() => monthGrid(year, m), [year, m]);
    const monthPrefix = `${year}-${String(m + 1).padStart(2, "0")}`;

    const [days, setDays] = useState<CalendarViewDay[]>([]);
    const [bookings, setBookings] = useState<CalendarViewBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [reload, setReload] = useState(0);
    // Precio de la web por día (no viene de Beds24: lo calcula el backend con las reglas,
    // el descuento general y los precios propios de "Precios de la web")
    const [webDays, setWebDays] = useState<Map<string, WebPriceDay>>(new Map());
    const [webDiscount, setWebDiscount] = useState<number | null>(null);
    // Pregunta "¿dónde quieres cambiarlo?" al tocar "Cambiar este día"
    const [choosing, setChoosing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchCalendarView(grid[0], grid[grid.length - 1]);
                if (cancelled) return;
                setDays(data.days);
                setBookings(data.bookings);
            } catch (err) {
                if (!cancelled) setError(toApiError(err).detail);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [grid, reload]);

    useEffect(() => {
        let cancelled = false;
        fetchWebPriceDays(grid[0], grid[grid.length - 1])
            .then((data) => {
                if (cancelled) return;
                setWebDays(new Map(data.days.map((d) => [d.date, d])));
                setWebDiscount(data.descuento);
            })
            .catch(() => {
                // Sin precio web el calendario sigue funcionando con el de Beds24.
                if (!cancelled) setWebDays(new Map());
            });
        return () => { cancelled = true; };
    }, [grid, reload]);

    // Escape cierra la pregunta
    useEffect(() => {
        if (!choosing) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setChoosing(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [choosing]);

    const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

    // Escala de precios del mes para la intensidad del fondo
    const priceRange = useMemo(() => {
        const prices = days.filter((d) => d.date.startsWith(monthPrefix) && d.price !== null).map((d) => d.price as number);
        if (!prices.length) return null;
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }, [days, monthPrefix]);

    const heat = (price: number | null) => {
        if (price === null || !priceRange) return 0;
        if (priceRange.max === priceRange.min) return 0.35;
        return 0.12 + 0.88 * ((price - priceRange.min) / (priceRange.max - priceRange.min));
    };

    // Reserva que ocupa esa noche (la salida no cuenta como noche)
    const bookingOn = (date: string) => bookings.find((b) => b.arrival <= date && date < b.departure);
    const departingOn = (date: string) => bookings.find((b) => b.departure === date);

    const goMonth = (delta: number) => {
        const next = new Date(Date.UTC(year, m + delta, 1));
        onMonthChange({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
        setSelected(null);
    };

    const goToday = () => {
        onMonthChange({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
        setSelected(today);
    };

    const sel = selected ? dayMap.get(selected) : undefined;
    const selWeb = selected ? webDays.get(selected) : undefined;

    const chooseTarget = (target: EditTarget) => {
        if (!selected) return;
        setChoosing(false);
        onEdit({ from: selected, to: selected }, target);
    };
    const selBooking = selected ? bookingOn(selected) : undefined;
    const selDeparting = selected ? departingOn(selected) : undefined;
    const nights = (n: number | null) => `${n} ${n === 1 ? "noche" : "noches"}`;

    return (
        <div className="cq-cv">
            <div className="cq-cv-toolbar">
                <div className="cq-cv-nav">
                    <button type="button" className="cq-cv-nav-btn" onClick={() => goMonth(-1)} aria-label="Mes anterior">‹</button>
                    <h2 className="cq-cv-month">{monthLabel(year, m)}</h2>
                    <button type="button" className="cq-cv-nav-btn" onClick={() => goMonth(1)} aria-label="Mes siguiente">›</button>
                </div>
                <button type="button" className="cq-btn cq-btn--ghost cq-cv-today" onClick={goToday}>Hoy</button>
            </div>

            <ul className="cq-cv-legend">
                <li className="cq-cv-legend-item cq-cv-legend-item--heat">Más intenso, precio más alto</li>
                <li className="cq-cv-legend-item cq-cv-legend-item--booked">Reservada</li>
                <li className="cq-cv-legend-item cq-cv-legend-item--restricted">Sin entrada o salida</li>
                <li className="cq-cv-legend-item cq-cv-legend-item--closed">Cerrada</li>
            </ul>

            {error && (
                <div className="cq-state">
                    <p className="cq-message cq-message--error" role="alert">{error}</p>
                    <button type="button" className="cq-btn cq-btn--ghost" onClick={() => setReload((r) => r + 1)}>Reintentar</button>
                </div>
            )}

            <div className={`cq-cv-grid ${loading ? "cq-cv-grid--loading" : ""}`} aria-busy={loading}>
                {WEEKDAYS.map((w) => <div key={w.id} className="cq-cv-weekday">{w.short}</div>)}

                {grid.map((date) => {
                    const info = dayMap.get(date);
                    const booking = bookingOn(date);
                    const override = info?.override ?? "none";
                    const minStay = info?.minStay ?? defaults.minStay;
                    const web = webDays.get(date);
                    const classes = [
                        "cq-cv-cell",
                        !date.startsWith(monthPrefix) && "cq-cv-cell--outside",
                        date < today && "cq-cv-cell--past",
                        date === today && "cq-cv-cell--today",
                        override === "blackout" && "cq-cv-cell--closed",
                        override !== "none" && override !== "blackout" && "cq-cv-cell--restricted",
                        booking && `cq-cv-cell--booked cq-cv-cell--${booking.source}`,
                        selected === date && "cq-cv-cell--selected",
                    ].filter(Boolean).join(" ");

                    const style = { "--cq-heat": heat(info?.price ?? null) } as CSSProperties;

                    return (
                        <button
                            key={date}
                            type="button"
                            className={classes}
                            style={style}
                            onClick={() => setSelected(date)}
                            aria-pressed={selected === date}
                            aria-label={`${formatLongDate(date)}${info?.price != null ? `, ${info.price} euros` : ", sin precio"}${web?.price != null ? `, web ${web.price} euros` : ""}${minStay != null ? `, mínimo ${minStay} noches` : ""}, ${OVERRIDE_STATE[override] ?? override}${booking ? ", reservada" : ""}`}
                        >
                            <span className="cq-cv-daynum">{Number(date.slice(8, 10))}</span>
                            <span className="cq-cv-prices">
                                <span className="cq-cv-price">{info?.price != null ? `${info.price} €` : "—"}</span>
                                {web?.price != null && (
                                    <span
                                        className={`cq-cv-web ${web.manual ? "cq-cv-web--manual" : ""}`}
                                        title={web.manual ? "Precio propio de la web" : "Precio de la web"}
                                    >
                                        <span className="cq-cv-web-label">Web</span>{web.price} €
                                    </span>
                                )}
                            </span>
                            {minStay != null && <span className="cq-cv-min">mín. {minStay}</span>}
                            {override !== "none" && override !== "blackout" && (
                                <span className="cq-cv-flag">{OVERRIDE_STATE[override]}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {selected && (
                <aside className="cq-cv-detail" aria-live="polite">
                    <div className="cq-cv-detail-head">
                        <h3 className="cq-cv-detail-date">{formatLongDate(selected)}</h3>
                        <button type="button" className="cq-cv-close" onClick={() => setSelected(null)} aria-label="Cerrar detalle">×</button>
                    </div>

                    {!sel && !loading ? (
                        <p className="cq-help">Este día no está en el mes que se está mostrando.</p>
                    ) : sel && (
                        <dl className="cq-cv-detail-list">
                            <div>
                                <dt>Estado</dt>
                                <dd>
                                    {OVERRIDE_STATE[sel.override] ?? sel.override}
                                    <span className="cq-cv-sub">{OVERRIDE_HELP[sel.override] ?? ""}</span>
                                </dd>
                            </div>
                            <div>
                                <dt>Precio en Booking y Airbnb</dt>
                                <dd>
                                    {sel.price != null ? `${sel.price} €` : "Sin precio"}
                                    {sel.price == null && <span className="cq-cv-sub">Sin precio no se puede reservar.</span>}
                                </dd>
                            </div>
                            <div>
                                <dt>Precio en la web</dt>
                                <dd>
                                    {selWeb?.price != null ? `${selWeb.price} €` : "Sin precio"}
                                    <span className="cq-cv-sub">
                                        {selWeb?.price == null
                                            ? "No se puede reservar en la web."
                                            : selWeb.manual
                                                ? "Precio propio, fijado en «Precios de la web»."
                                                : `Automático${webDiscount != null ? `: ${String(webDiscount).replace(".", ",")} % menos que en las reglas` : ""}.`}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt>Estancia mínima</dt>
                                <dd>
                                    {sel.minStay != null ? nights(sel.minStay) : defaults.minStay != null ? nights(defaults.minStay) : "Sin definir"}
                                    {sel.minStay == null && <span className="cq-cv-sub">Valor por defecto de la casa</span>}
                                </dd>
                            </div>
                            <div>
                                <dt>Estancia máxima</dt>
                                <dd>
                                    {sel.maxStay != null ? nights(sel.maxStay) : defaults.maxStay != null ? nights(defaults.maxStay) : "Sin definir"}
                                    {sel.maxStay == null && <span className="cq-cv-sub">Valor por defecto de la casa</span>}
                                </dd>
                            </div>
                            <div className="cq-cv-detail-wide">
                                <dt>Ocupación</dt>
                                <dd>
                                    {selBooking ? (
                                        <>
                                            {guestName(selBooking)}, {SOURCE_LABEL[selBooking.source] ?? selBooking.source}
                                            <span className="cq-cv-sub">
                                                Del {formatDate(selBooking.arrival)} al {formatDate(selBooking.departure)}, {nights(selBooking.nights)}
                                                {selBooking.source !== "owner" && `, ${selBooking.numAdult + selBooking.numChild} huéspedes`}
                                            </span>
                                        </>
                                    ) : "Libre"}
                                    {selDeparting && !selBooking && (
                                        <span className="cq-cv-sub">Este día sale {guestName(selDeparting)}.</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    )}

                    {selected >= today && (
                        <div className="cq-cv-detail-actions">
                            <button type="button" className="cq-btn" onClick={() => setChoosing(true)}>
                                Cambiar este día
                            </button>
                        </div>
                    )}
                </aside>
            )}

            {choosing && selected && (
                <div className="cq-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setChoosing(false); }}>
                    <div className="cq-modal cq-choice" role="dialog" aria-modal="true" aria-labelledby="cq-choice-title">
                        <h2 id="cq-choice-title" className="cq-modal-title">¿Dónde quieres cambiarlo?</h2>
                        <p className="cq-choice-date">{formatLongDate(selected)}</p>

                        <div className="cq-choice-list">
                            <button type="button" className="cq-choice-btn" onClick={() => chooseTarget("web")} autoFocus>
                                <span className="cq-choice-head">
                                    <span className="cq-choice-title">En la web</span>
                                    {selWeb?.price != null && <span className="cq-cv-web">{selWeb.price} €</span>}
                                </span>
                                <span className="cq-choice-sub">
                                    Solo el precio para quien reserva en quintadeargos.com. Booking y Airbnb no cambian.
                                </span>
                            </button>
                            <button type="button" className="cq-choice-btn" onClick={() => chooseTarget("canales")}>
                                <span className="cq-choice-head">
                                    <span className="cq-choice-title">En Booking y Airbnb</span>
                                    {sel?.price != null && <span className="cq-cv-price">{sel.price} €</span>}
                                </span>
                                <span className="cq-choice-sub">
                                    Precio, estancia y disponibilidad en Beds24, que lo pasa a Booking y Airbnb. El precio de la web no cambia.
                                </span>
                            </button>
                        </div>

                        <div className="cq-modal-actions">
                            <button type="button" className="cq-btn cq-btn--ghost" onClick={() => setChoosing(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}