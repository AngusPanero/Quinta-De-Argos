import { useEffect, useState } from "react";
import axios from "axios";
import type { Reserva, ReservaScope, ReservaSource, SyncState } from "./reservasTypes";
import { SOURCE_LABEL, STATUS_LABEL } from "./reservasTypes";
import { formatDateTime, formatLong, formatMoney, formatShort, guestName, guestsLabel } from "./reservasUtils";
import "./reservasList.css";

const API = import.meta.env.VITE_API_URL;

const SCOPES: { id: ReservaScope; label: string }[] = [
    { id: "upcoming", label: "Próximas" },
    { id: "past", label: "Pasadas" },
    { id: "cancelled", label: "Canceladas" },
];

const SOURCES: ReservaSource[] = ["web", "airbnb", "booking", "owner", "direct"];

// Datos de la reserva hecha en la web (los adjunta el backend; null si no es web).
interface WebInfo {
    codigo: string;
    estado: string;
    huespedes: number;
    adultos: number | null; // null = reserva web antigua, sin desglose
    menores: number;
    cuna: boolean;
    reserva: number; // estancia: alojamiento + adicionales
    fianza: number;
    fianzaPorPersona: number;
    fianzaPersonas: number;
    fianzaDevuelta: number;
    total: number; // lo cobrado: reserva + fianza
}

type Row = Reserva & { web?: WebInfo | null };

// Espacio en blanco que mantiene la altura de las celdas vacías.
const VACIO = "\u00A0";

function partyText(w: WebInfo): string {
    if (w.adultos === null) return `${w.huespedes} ${w.huespedes === 1 ? "huésped" : "huéspedes"}`;
    const parts = [`${w.adultos} ${w.adultos === 1 ? "adulto" : "adultos"}`];
    if (w.menores > 0) parts.push(`${w.menores} ${w.menores === 1 ? "menor" : "menores"}`);
    return parts.join(" · ");
}

function Amount({ label, value, strong = false }: { label: string; value: number | null; strong?: boolean }) {
    const has = typeof value === "number";
    return (
        <span className={`rl-amount ${strong ? "rl-amount--total" : ""}`}>
            <span className="rl-amount-label">{has ? label : VACIO}</span>
            <span className="rl-amount-value">{has ? formatMoney(value as number) : VACIO}</span>
        </span>
    );
}

interface Props {
    refreshKey: number;
    onSyncInfo: (s: SyncState) => void;
}

export default function ReservasList({ refreshKey, onSyncInfo }: Props) {
    const [scope, setScope] = useState<ReservaScope>("upcoming");
    const [sources, setSources] = useState<ReservaSource[]>([]);
    const [bookings, setBookings] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API}/api/admin/reservas`, {
                    withCredentials: true,
                    params: { scope, source: sources.length ? sources.join(",") : undefined },
                });
                if (cancelled) return;
                setBookings(data.bookings);
                if (data.lastSync) onSyncInfo(data.lastSync);
            } catch (err) {
                if (cancelled) return;
                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                setError(status === 401 || status === 403
                    ? "Tu sesión expiró. Volvé a iniciar sesión para ver las reservas."
                    : "No se pudieron cargar las reservas. Probá de nuevo en unos segundos.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [scope, sources, refreshKey, onSyncInfo]);

    const toggleSource = (s: ReservaSource) =>
        setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

    return (
        <div className="rl-wrap">
            <div className="rl-toolbar">
                <div className="rl-scopes" role="tablist">
                    {SCOPES.map((s) => (
                        <button
                            key={s.id}
                            role="tab"
                            aria-selected={scope === s.id}
                            className={`rl-scope ${scope === s.id ? "rl-scope--active" : ""}`}
                            onClick={() => { setScope(s.id); setOpenId(null); }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="rl-sources">
                    {SOURCES.map((s) => (
                        <button
                            key={s}
                            aria-pressed={sources.includes(s)}
                            className={`rl-chip rl-chip--${s} ${sources.includes(s) ? "rl-chip--on" : ""}`}
                            onClick={() => toggleSource(s)}
                        >
                            <span className="rl-chip-dot" aria-hidden="true" />
                            {SOURCE_LABEL[s]}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="rl-error" role="alert">{error}</p>}

            {!error && loading && <p className="rl-empty">Cargando reservas…</p>}

            {!error && !loading && bookings.length === 0 && (
                <p className="rl-empty">
                    {scope === "upcoming" && "No hay reservas próximas con estos filtros."}
                    {scope === "past" && "Todavía no hay reservas pasadas registradas."}
                    {scope === "cancelled" && "No hay reservas canceladas."}
                </p>
            )}

            {!error && !loading && bookings.length > 0 && (
                <>
                    <p className="rl-count">
                        {bookings.length} {bookings.length === 1 ? "reserva" : "reservas"}
                    </p>
                    <ul className="rl-list">
                        {bookings.map((b) => {
                            const open = openId === b.beds24Id;
                            const w = b.web ?? null;
                            const hasNet = !w && b.source === "airbnb" && !!b.commission && typeof b.price === "number";
                            const contact = [b.email, b.phone || b.mobile].filter(Boolean);

                            // Importes: en las reservas web, los de nuestra base (reserva + fianza = total).
                            // En el resto, solo el total de Beds24; reserva y fianza quedan vacías.
                            const beds24Price = typeof b.price === "number" && b.price > 0 ? b.price : null;
                            const amountReserva = w ? w.reserva : null;
                            const amountFianza = w ? w.fianza : null;
                            const amountTotal = w ? w.total : beds24Price;

                            return (
                                <li key={b.beds24Id} className={`rl-item rl-item--${b.source} ${open ? "rl-item--open" : ""}`}>
                                    <button
                                        className="rl-row"
                                        aria-expanded={open}
                                        onClick={() => setOpenId(open ? null : b.beds24Id)}
                                    >
                                        <span className="rl-dates">
                                            <span className="rl-dates-range">
                                                {formatShort(b.arrival)} – {formatLong(b.departure)}
                                            </span>
                                            <span className="rl-dates-nights">
                                                {b.nights} {b.nights === 1 ? "noche" : "noches"}
                                            </span>
                                        </span>
                                        <span className="rl-guest">{guestName(b)}</span>
                                        <span className="rl-party">
                                            <span className="rl-party-text">{w ? partyText(w) : VACIO}</span>
                                            <span className="rl-party-crib">
                                                {w?.cuna ? <span className="rl-tag">Cuna</span> : VACIO}
                                            </span>
                                        </span>
                                        <span className="rl-pills">
                                            <span className={`rl-pill rl-pill--${b.source}`}>{SOURCE_LABEL[b.source]}</span>
                                            {b.status === "cancelled" && <span className="rl-pill rl-pill--cancelled">Cancelada</span>}
                                            {b.status === "request" && <span className="rl-pill rl-pill--request">Pendiente</span>}
                                        </span>
                                        <span className="rl-amounts">
                                            <Amount label="Reserva" value={amountReserva} />
                                            <Amount label="Fianza" value={amountFianza} />
                                            <Amount label="Total" value={amountTotal} strong />
                                        </span>
                                    </button>

                                    {open && (
                                        <dl className="rl-detail">
                                            <div className="rl-field">
                                                <dt>Estado</dt>
                                                <dd>{STATUS_LABEL[b.status]}</dd>
                                            </div>
                                            {b.source !== "owner" && (
                                                <div className="rl-field">
                                                    <dt>Huéspedes</dt>
                                                    <dd>{w ? partyText(w) : guestsLabel(b.numAdult, b.numChild)}</dd>
                                                </div>
                                            )}
                                            <div className="rl-field">
                                                <dt>Cuna para bebé</dt>
                                                <dd>{w ? (w.cuna ? "Sí (gratuita)" : "No") : VACIO}</dd>
                                            </div>
                                            {b.source !== "owner" && (
                                                <div className="rl-field">
                                                    <dt>Contacto</dt>
                                                    <dd>
                                                        {contact.length > 0
                                                            ? contact.join(", ")
                                                            : b.source === "airbnb" || b.source === "booking"
                                                                ? `Sin datos de contacto. Escribile desde ${SOURCE_LABEL[b.source]}.`
                                                                : "Sin datos de contacto"}
                                                    </dd>
                                                </div>
                                            )}

                                            {/* ---------- Importes: reserva, fianza y total ---------- */}
                                            <div className="rl-field">
                                                <dt>Reserva</dt>
                                                <dd>
                                                    {w ? formatMoney(w.reserva) : VACIO}
                                                    <span className="rl-net">{w ? "Alojamiento y adicionales" : VACIO}</span>
                                                </dd>
                                            </div>
                                            <div className="rl-field">
                                                <dt>Fianza</dt>
                                                <dd>
                                                    {w ? formatMoney(w.fianza) : VACIO}
                                                    <span className="rl-net">
                                                        {w && w.fianza > 0
                                                            ? w.fianzaDevuelta > 0
                                                                ? `Devuelta ${formatMoney(w.fianzaDevuelta)} de ${formatMoney(w.fianza)}`
                                                                : `${w.fianzaPersonas} × ${formatMoney(w.fianzaPorPersona)} · pendiente de devolver`
                                                            : VACIO}
                                                    </span>
                                                </dd>
                                            </div>
                                            <div className="rl-field">
                                                <dt>Total</dt>
                                                <dd>
                                                    {amountTotal !== null ? formatMoney(amountTotal) : VACIO}
                                                    <span className="rl-net">
                                                        {w
                                                            ? "Cobrado con Stripe"
                                                            : hasNet
                                                                ? `Neto ${formatMoney((b.price as number) - (b.commission as number))} (comisión ${formatMoney(b.commission as number)})`
                                                                : VACIO}
                                                    </span>
                                                </dd>
                                            </div>

                                            {b.apiReference && (
                                                <div className="rl-field">
                                                    <dt>Nº en {SOURCE_LABEL[b.source]}</dt>
                                                    <dd className="rl-ref">{b.apiReference}</dd>
                                                </div>
                                            )}
                                            {b.bookingTime && (
                                                <div className="rl-field">
                                                    <dt>Reservada el</dt>
                                                    <dd>{formatDateTime(b.bookingTime)}</dd>
                                                </div>
                                            )}
                                            {b.cancelTime && (
                                                <div className="rl-field">
                                                    <dt>Cancelada el</dt>
                                                    <dd>{formatDateTime(b.cancelTime)}</dd>
                                                </div>
                                            )}
                                            {b.comments && (
                                                <div className="rl-field rl-field--wide">
                                                    <dt>Comentarios</dt>
                                                    <dd className="rl-comments">{b.comments}</dd>
                                                </div>
                                            )}
                                            <div className="rl-field">
                                                <dt>ID Beds24</dt>
                                                <dd className="rl-ref">{b.beds24Id}</dd>
                                            </div>
                                        </dl>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
}