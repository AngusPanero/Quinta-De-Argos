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

interface Props {
    refreshKey: number;
    onSyncInfo: (s: SyncState) => void;
}

export default function ReservasList({ refreshKey, onSyncInfo }: Props) {
    const [scope, setScope] = useState<ReservaScope>("upcoming");
    const [sources, setSources] = useState<ReservaSource[]>([]);
    const [bookings, setBookings] = useState<Reserva[]>([]);
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
                            const hasNet = b.source === "airbnb" && !!b.commission && typeof b.price === "number";
                            const contact = [b.email, b.phone || b.mobile].filter(Boolean);
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
                                        <span className="rl-pills">
                                            <span className={`rl-pill rl-pill--${b.source}`}>{SOURCE_LABEL[b.source]}</span>
                                            {b.status === "cancelled" && <span className="rl-pill rl-pill--cancelled">Cancelada</span>}
                                            {b.status === "request" && <span className="rl-pill rl-pill--request">Pendiente</span>}
                                        </span>
                                        <span className="rl-price">
                                            {typeof b.price === "number" && b.price > 0 ? formatMoney(b.price) : ""}
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
                                                    <dd>{guestsLabel(b.numAdult, b.numChild)}</dd>
                                                </div>
                                            )}
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
                                            {typeof b.price === "number" && b.price > 0 && (
                                                <div className="rl-field">
                                                    <dt>Importe</dt>
                                                    <dd>
                                                        {formatMoney(b.price)}
                                                        {hasNet && (
                                                            <span className="rl-net">
                                                                Neto {formatMoney((b.price as number) - (b.commission as number))} (comisión {formatMoney(b.commission as number)})
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                            )}
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