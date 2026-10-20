import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { Reserva, ReservaSource, SyncState } from "./reservasTypes";
import { SOURCE_LABEL } from "./reservasTypes";
import { addDays, formatLong, formatMoney, todayISO } from "./reservasUtils";
import "./reservasFacturacion.css";

const API = import.meta.env.VITE_API_URL;

// "Uso propio" no factura: queda fuera de los importes
const PLATFORMS: ReservaSource[] = ["web", "airbnb", "booking", "direct"];

// Solo cuentan las reservas que ocupan de verdad (Airbnb llega como "new")
const BILLABLE_STATUS = new Set(["confirmed", "new"]);

// Límite de la ruta /api/admin/reservas por cada scope
const API_LIMIT = 300;

const IVA_OPTIONS = [
    { id: "reducido", rate: 0.105, label: "Descontar IVA 10,5 %" },
    { id: "general", rate: 0.21, label: "Descontar IVA 21 %" },
] as const;
type IvaId = (typeof IVA_OPTIONS)[number]["id"];

type DateField = "arrival" | "booking";
type Preset = "todo" | "mes" | "mesAnterior" | "anio" | "anioAnterior" | "personalizado";

const PRESETS: { id: Exclude<Preset, "personalizado">; label: string }[] = [
    { id: "todo", label: "Todo" },
    { id: "mes", label: "Este mes" },
    { id: "mesAnterior", label: "Mes anterior" },
    { id: "anio", label: "Este año" },
    { id: "anioAnterior", label: "Año anterior" },
];

// ---------- Utilidades locales ----------

const pad = (n: number) => String(n).padStart(2, "0");

function monthRange(year: number, month: number): [string, string] {
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return [`${year}-${pad(month + 1)}-01`, `${year}-${pad(month + 1)}-${pad(last)}`];
}

function presetRange(preset: Preset): [string, string] {
    const today = todayISO();
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7)) - 1;
    switch (preset) {
        case "mes": return monthRange(y, m);
        case "mesAnterior": return m === 0 ? monthRange(y - 1, 11) : monthRange(y, m - 1);
        case "anio": return [`${y}-01-01`, `${y}-12-31`];
        case "anioAnterior": return [`${y - 1}-01-01`, `${y - 1}-12-31`];
        default: return ["", ""];
    }
}

const nightsBetween = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

// La fecha de reserva llega como timestamp: se pasa al día de España
const madridDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
});
const bookingDay = (b: Reserva) => (b.bookingTime ? madridDay.format(new Date(b.bookingTime)) : null);

const percentFmt = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 1 });
const numberFmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric", timeZone: "UTC" });

const formatPercent = (value: number) => percentFmt.format(Number.isFinite(value) ? value : 0);
const formatNumber = (value: number) => numberFmt.format(Number.isFinite(value) ? value : 0);
const formatMonth = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`));

const priceOf = (b: Reserva) => (typeof b.price === "number" && b.price > 0 ? b.price : 0);

// Noches de la reserva que caen dentro del periodo [from, to]
function overlapNights(b: Reserva, from: string, to: string): number {
    const start = b.arrival > from ? b.arrival : from;
    const endExclusive = addDays(to, 1);
    const end = b.departure < endExclusive ? b.departure : endExclusive;
    return Math.max(0, nightsBetween(start, end));
}

// ---------- Componente ----------

interface Props {
    refreshKey: number;
    onSyncInfo: (s: SyncState) => void;
}

export default function ReservasFacturacion({ refreshKey, onSyncInfo }: Props) {
    const [bookings, setBookings] = useState<Reserva[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [truncated, setTruncated] = useState(false);

    const [preset, setPreset] = useState<Preset>("todo");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [dateField, setDateField] = useState<DateField>("arrival");
    const [platforms, setPlatforms] = useState<ReservaSource[]>([]);
    const [iva, setIva] = useState<IvaId | null>(null);

    // Se piden los tres listados y se juntan: así entran todas las reservas guardadas
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const scopes = ["upcoming", "past", "cancelled"] as const;
                const responses = await Promise.all(scopes.map((scope) =>
                    axios.get(`${API}/api/admin/reservas`, { withCredentials: true, params: { scope } })
                ));
                if (cancelled) return;

                const byId = new Map<number, Reserva>();
                responses.forEach((r) => (r.data.bookings as Reserva[]).forEach((b) => byId.set(b.beds24Id, b)));
                setBookings([...byId.values()]);
                setTruncated(responses.some((r) => r.data.bookings.length >= API_LIMIT));

                const last = responses.find((r) => r.data.lastSync)?.data.lastSync;
                if (last) onSyncInfo(last);
            } catch (err) {
                if (cancelled) return;
                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                setError(status === 401 || status === 403
                    ? "Tu sesión ha caducado. Vuelve a iniciar sesión para ver la facturación."
                    : "No se ha podido cargar la facturación. Inténtalo de nuevo en unos segundos.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [refreshKey, onSyncInfo]);

    const choosePreset = (p: Exclude<Preset, "personalizado">) => {
        const [f, t] = presetRange(p);
        setPreset(p);
        setFrom(f);
        setTo(t);
    };

    const changeFrom = (value: string) => { setFrom(value); setPreset("personalizado"); };
    const changeTo = (value: string) => { setTo(value); setPreset("personalizado"); };

    const togglePlatform = (s: ReservaSource) =>
        setPlatforms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

    // Los dos IVA son excluyentes: un mismo importe no lleva dos tipos a la vez
    const toggleIva = (id: IvaId) => setIva((prev) => (prev === id ? null : id));

    const invalidRange = !!from && !!to && from > to;

    const stats = useMemo(() => {
        const rate = IVA_OPTIONS.find((o) => o.id === iva)?.rate ?? 0;
        const noTax = (gross: number) => gross / (1 + rate);

        const refDate = (b: Reserva) => (dateField === "arrival" ? b.arrival : bookingDay(b));
        const inPeriod = (b: Reserva) => {
            if (!from && !to) return true;
            const d = refDate(b);
            if (!d) return false;
            return (!from || d >= from) && (!to || d <= to);
        };
        const platformOk = (b: Reserva) => platforms.length === 0 || platforms.includes(b.source);

        const matches = invalidRange ? [] : bookings.filter((b) => b.source !== "owner" && platformOk(b) && inPeriod(b));
        const billable = matches.filter((b) => BILLABLE_STATUS.has(b.status));
        const cancelledList = matches.filter((b) => b.status === "cancelled");
        const pending = matches.filter((b) => b.status === "request");

        const gross = billable.reduce((acc, b) => acc + priceOf(b), 0);
        const base = noTax(gross);
        const taxAmount = gross - base;

        const priced = billable.filter((b) => priceOf(b) > 0);
        const pricedNights = priced.reduce((acc, b) => acc + b.nights, 0);
        const nights = billable.reduce((acc, b) => acc + b.nights, 0);
        const guests = billable.reduce((acc, b) => acc + (b.numAdult || 0) + (b.numChild || 0), 0);

        const leadTimes = billable
            .map((b) => { const d = bookingDay(b); return d ? nightsBetween(d, b.arrival) : null; })
            .filter((v): v is number => v !== null && v >= 0);

        // Ocupación: noches realmente ocupadas dentro del periodo (sea cual sea el criterio de fecha)
        const occupying = invalidRange ? [] : bookings.filter((b) => BILLABLE_STATUS.has(b.status) && b.source !== "owner" && platformOk(b));
        const ownerStays = invalidRange ? [] : bookings.filter((b) => b.source === "owner" && b.status !== "cancelled");
        const allStays = [...occupying, ...ownerStays];
        const occFrom = from || allStays.reduce((min, b) => (!min || b.arrival < min ? b.arrival : min), "");
        const occTo = to || allStays.reduce((max, b) => {
            const lastNight = addDays(b.departure, -1);
            return !max || lastNight > max ? lastNight : max;
        }, "");
        const periodNights = occFrom && occTo && occFrom <= occTo ? nightsBetween(occFrom, occTo) + 1 : 0;
        const soldNights = periodNights ? occupying.reduce((acc, b) => acc + overlapNights(b, occFrom, occTo), 0) : 0;
        const ownerNights = periodNights ? ownerStays.reduce((acc, b) => acc + overlapNights(b, occFrom, occTo), 0) : 0;

        const byPlatform = (platforms.length ? platforms : PLATFORMS).map((source) => {
            const list = billable.filter((b) => b.source === source);
            const g = list.reduce((acc, b) => acc + priceOf(b), 0);
            return {
                source,
                count: list.length,
                nights: list.reduce((acc, b) => acc + b.nights, 0),
                amount: noTax(g),
                share: gross ? g / gross : 0,
            };
        });

        const monthMap = new Map<string, { amount: number; count: number }>();
        billable.forEach((b) => {
            const d = refDate(b);
            if (!d) return;
            const key = d.slice(0, 7);
            const entry = monthMap.get(key) || { amount: 0, count: 0 };
            entry.amount += noTax(priceOf(b));
            entry.count += 1;
            monthMap.set(key, entry);
        });
        const byMonth = [...monthMap.entries()]
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([month, v]) => ({ month, ...v }));
        const maxMonth = byMonth.reduce((max, m) => Math.max(max, m.amount), 0);

        return {
            rate,
            gross,
            taxAmount,
            base,
            count: billable.length,
            nights,
            guests,
            adr: pricedNights ? base / pricedNights : 0,
            ticket: priced.length ? noTax(priced.reduce((acc, b) => acc + priceOf(b), 0)) / priced.length : 0,
            avgStay: billable.length ? nights / billable.length : 0,
            leadTime: leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null,
            withoutPrice: billable.length - priced.length,
            cancelled: cancelledList.length,
            cancelRate: billable.length + cancelledList.length
                ? cancelledList.length / (billable.length + cancelledList.length)
                : 0,
            pending: pending.length,
            periodNights,
            soldNights,
            ownerNights,
            occupancy: periodNights ? soldNights / periodNights : 0,
            occFrom,
            occTo,
            byPlatform,
            byMonth,
            maxMonth,
            missingBookingDate: dateField === "booking" && (from || to)
                ? bookings.filter((b) => b.source !== "owner" && !b.bookingTime).length
                : 0,
        };
    }, [bookings, from, to, dateField, platforms, iva, invalidRange]);

    const periodLabel = !from && !to
        ? "Todo el historial"
        : from && to
            ? `${formatLong(from)} – ${formatLong(to)}`
            : from ? `Desde el ${formatLong(from)}` : `Hasta el ${formatLong(to)}`;

    const platformLabel = platforms.length === 0
        ? "Todas las plataformas"
        : platforms.map((p) => SOURCE_LABEL[p]).join(", ");

    const heroAmount = stats.rate ? stats.base : stats.gross;
    const ivaLabel = IVA_OPTIONS.find((o) => o.id === iva)?.label.replace("Descontar ", "");

    return (
        <div className="rf-wrap">
            {/* ---------- Filtros ---------- */}
            <div className="rf-filters">
                <div className="rf-group">
                    <span className="rf-label">Periodo</span>
                    <div className="rf-presets">
                        {PRESETS.map((p) => (
                            <button
                                key={p.id}
                                aria-pressed={preset === p.id}
                                className={`rf-preset ${preset === p.id ? "rf-preset--on" : ""}`}
                                onClick={() => choosePreset(p.id)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rf-group rf-group--dates">
                    <label className="rf-date">
                        <span className="rf-label">Desde</span>
                        <input type="date" value={from} max={to || undefined} onChange={(e) => changeFrom(e.target.value)} />
                    </label>
                    <label className="rf-date">
                        <span className="rf-label">Hasta</span>
                        <input type="date" value={to} min={from || undefined} onChange={(e) => changeTo(e.target.value)} />
                    </label>
                    <div className="rf-date">
                        <span className="rf-label">Contar por fecha de</span>
                        <div className="rf-segmented" role="radiogroup">
                            <button
                                role="radio"
                                aria-checked={dateField === "arrival"}
                                className={`rf-seg ${dateField === "arrival" ? "rf-seg--on" : ""}`}
                                onClick={() => setDateField("arrival")}
                            >
                                Llegada
                            </button>
                            <button
                                role="radio"
                                aria-checked={dateField === "booking"}
                                className={`rf-seg ${dateField === "booking" ? "rf-seg--on" : ""}`}
                                onClick={() => setDateField("booking")}
                            >
                                Reserva
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rf-group">
                    <span className="rf-label">Plataforma</span>
                    <div className="rf-chips">
                        <button
                            aria-pressed={platforms.length === 0}
                            className={`rf-chip ${platforms.length === 0 ? "rf-chip--on" : ""}`}
                            onClick={() => setPlatforms([])}
                        >
                            Todas
                        </button>
                        {PLATFORMS.map((s) => (
                            <button
                                key={s}
                                aria-pressed={platforms.includes(s)}
                                className={`rf-chip rf-chip--${s} ${platforms.includes(s) ? "rf-chip--on" : ""}`}
                                onClick={() => togglePlatform(s)}
                            >
                                <span className="rf-dot" aria-hidden="true" />
                                {SOURCE_LABEL[s]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {invalidRange && (
                <p className="rf-warning" role="alert">La fecha «Desde» es posterior a «Hasta». Corrige el periodo.</p>
            )}
            {error && <p className="rf-error" role="alert">{error}</p>}

            {/* ---------- Resultado ---------- */}
            <section className={`rf-hero ${loading ? "rf-hero--loading" : ""}`} aria-busy={loading} aria-live="polite">
                <div className="rf-hero-main">
                    <p className="rf-hero-label">
                        {stats.rate ? `Facturación sin IVA (${ivaLabel})` : "Facturación total"}
                    </p>
                    <p className="rf-hero-amount">{loading ? "…" : formatMoney(heroAmount)}</p>
                    <p className="rf-hero-context">
                        {periodLabel} · {platformLabel} · {stats.count} {stats.count === 1 ? "reserva" : "reservas"}
                    </p>

                    <div className="rf-iva">
                        {IVA_OPTIONS.map((o) => (
                            <label key={o.id} className="rf-check">
                                <input type="checkbox" checked={iva === o.id} onChange={() => toggleIva(o.id)} />
                                <span>{o.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <dl className="rf-breakdown">
                    <div className="rf-line">
                        <dt>Total cobrado</dt>
                        <dd>{formatMoney(stats.gross)}</dd>
                    </div>
                    {stats.rate > 0 && (
                        <>
                            <div className="rf-line rf-line--minus">
                                <dt>IVA incluido ({ivaLabel})</dt>
                                <dd>−{formatMoney(stats.taxAmount)}</dd>
                            </div>
                            <div className="rf-line rf-line--sub">
                                <dt>Base imponible</dt>
                                <dd>{formatMoney(stats.base)}</dd>
                            </div>
                        </>
                    )}
                </dl>
            </section>

            {!loading && (
                <>
                    {/* ---------- Indicadores ---------- */}
                    <div className="rf-stats">
                        <article className="rf-stat">
                            <p className="rf-stat-label">Reservas</p>
                            <p className="rf-stat-value">{stats.count}</p>
                            {stats.pending > 0 && <p className="rf-stat-note">+{stats.pending} pendientes sin contar</p>}
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Noches vendidas</p>
                            <p className="rf-stat-value">{stats.nights}</p>
                            <p className="rf-stat-note">{stats.guests} huéspedes</p>
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Precio medio por noche</p>
                            <p className="rf-stat-value">{formatMoney(stats.adr)}</p>
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Importe medio por reserva</p>
                            <p className="rf-stat-value">{formatMoney(stats.ticket)}</p>
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Estancia media</p>
                            <p className="rf-stat-value">
                                {formatNumber(stats.avgStay)} <span className="rf-stat-unit">noches</span>
                            </p>
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Ocupación</p>
                            <p className="rf-stat-value">{formatPercent(stats.occupancy)}</p>
                            <p className="rf-stat-note">
                                {stats.periodNights
                                    ? `${stats.soldNights} de ${stats.periodNights} noches${stats.ownerNights ? ` · ${stats.ownerNights} de uso propio` : ""}`
                                    : "Sin estancias en el periodo"}
                            </p>
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Antelación media</p>
                            <p className="rf-stat-value">
                                {stats.leadTime === null ? "—" : <>{formatNumber(stats.leadTime)} <span className="rf-stat-unit">días</span></>}
                            </p>
                        </article>
                        <article className="rf-stat">
                            <p className="rf-stat-label">Cancelaciones</p>
                            <p className="rf-stat-value">{stats.cancelled}</p>
                            <p className="rf-stat-note">{formatPercent(stats.cancelRate)} del total</p>
                        </article>
                    </div>

                    {/* ---------- Por plataforma ---------- */}
                    <section className="rf-section">
                        <h3 className="rf-section-title">Por plataforma</h3>
                        <ul className="rf-platforms">
                            {stats.byPlatform.map((p) => (
                                <li key={p.source} className={`rf-platform rf-platform--${p.source}`}>
                                    <div className="rf-platform-head">
                                        <span className="rf-platform-name">
                                            <span className="rf-dot" aria-hidden="true" />
                                            {SOURCE_LABEL[p.source]}
                                        </span>
                                        <span className="rf-platform-amount">{formatMoney(p.amount)}</span>
                                    </div>
                                    <div className="rf-bar" aria-hidden="true">
                                        <span className="rf-bar-fill" style={{ width: `${p.share * 100}%` }} />
                                    </div>
                                    <p className="rf-platform-meta">
                                        {formatPercent(p.share)} · {p.count} {p.count === 1 ? "reserva" : "reservas"} · {p.nights} noches
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ---------- Por mes ---------- */}
                    <section className="rf-section">
                        <h3 className="rf-section-title">
                            Por mes <span className="rf-section-hint">({dateField === "arrival" ? "según llegada" : "según fecha de reserva"})</span>
                        </h3>
                        {stats.byMonth.length === 0 ? (
                            <p className="rf-empty">No hay reservas con importe en este periodo.</p>
                        ) : (
                            <ul className="rf-months">
                                {stats.byMonth.map((m) => (
                                    <li key={m.month} className="rf-month">
                                        <span className="rf-month-label">{formatMonth(m.month)}</span>
                                        <span className="rf-bar" aria-hidden="true">
                                            <span
                                                className="rf-bar-fill-mes"
                                                style={{ width: `${stats.maxMonth ? (m.amount / stats.maxMonth) * 100 : 0}%` }}
                                            />
                                        </span>
                                        <span className="rf-month-amount">
                                            {formatMoney(m.amount)}
                                            <span className="rf-month-count">{m.count} {m.count === 1 ? "reserva" : "reservas"}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* ---------- Avisos ---------- */}
                    <div className="rf-notes">
                        {stats.rate > 0 && (
                            <p>El IVA se calcula como incluido en el precio: base = total ÷ {formatNumber(1 + stats.rate)}.</p>
                        )}
                        {stats.withoutPrice > 0 && (
                            <p>{stats.withoutPrice} {stats.withoutPrice === 1 ? "reserva no tiene" : "reservas no tienen"} importe cargado y no suman a la facturación.</p>
                        )}
                        {stats.missingBookingDate > 0 && (
                            <p>{stats.missingBookingDate} {stats.missingBookingDate === 1 ? "reserva no tiene" : "reservas no tienen"} fecha de reserva y quedan fuera al filtrar por ella.</p>
                        )}
                        {truncated && (
                            <p>Hay más de {API_LIMIT} reservas en algún listado: las más antiguas pueden no estar incluidas.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}