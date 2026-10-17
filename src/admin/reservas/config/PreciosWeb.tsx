import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SignModal from "./SignModal";
import GestionReservas from "./GestionReservas";
import {
    applyWebDiscount, applyWebPrices, fetchWebPrices, previewWebDiscount, previewWebPrices, toApiError,
} from "./configApi";
import { WEEKDAYS, addDays, formatDate, weekdayList } from "./configUtils";
import type {
    DateRange, WebDiscountPreview, WebPriceMode, WebPricePreview, WebPriceRequest, WebPricesState,
} from "./configTypes";

// Precios SOLO de la web: no se envían a Beds24, Booking ni Airbnb.

const PRESETS = [
    { label: "Todos", days: [1, 2, 3, 4, 5, 6, 7] },
    { label: "Domingo a jueves", days: [7, 1, 2, 3, 4] },
    { label: "Viernes y sábado", days: [5, 6] },
];

const MODES: [WebPriceMode, string][] = [
    ["fixed", "Precio fijo"],
    ["percent", "% sobre Booking y Airbnb"],
    ["auto", "Volver al automático"],
];

type Message = { tone: "ok" | "error"; text: string } | null;

export type WebModo = "precios" | "reservas";

const fmtPercent = (n: number) => `${String(n).replace(".", ",")} %`;

interface Props {
    today: string;
    initialRange?: DateRange | null;   // viene del calendario al tocar "Cambiar este día" → "En la web"
    initialModo?: WebModo;             // "reservas" cuando se llega desde "créalo como reserva particular"
}

export default function PreciosWeb({ today, initialRange, initialModo = "precios" }: Props) {
    const [modo, setModo] = useState<WebModo>(initialModo);

    return (
        <div className="cq-panel">
            <div className="cq-segment" role="radiogroup" aria-label="Qué quieres hacer">
                {([["precios", "Precios de la web"], ["reservas", "Reservas particulares y uso propio"]] as const).map(([valor, label]) => (
                    <button key={valor} type="button" role="radio" aria-checked={modo === valor}
                        className={`cq-segment-btn ${modo === valor ? "cq-segment-btn--on" : ""}`}
                        onClick={() => setModo(valor)}>
                        {label}
                    </button>
                ))}
            </div>

            {modo === "precios" ? (
                <Precios today={today} initialRange={initialRange ?? null} />
            ) : (
                <GestionReservas today={today} initialFrom={initialRange?.from} initialTo={initialRange?.to} />
            )}
        </div>
    );
}

// ---------- Precios de la web ----------
function Precios({ today, initialRange }: { today: string; initialRange: DateRange | null }) {
    const [state, setState] = useState<WebPricesState | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            setState(await fetchWebPrices());
        } catch (err) {
            setLoadError(toApiError(err).detail);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loadError && !state) {
        return (
            <div className="cq-state">
                <p className="cq-message cq-message--error" role="alert">{loadError}</p>
                <button type="button" className="cq-btn cq-btn--ghost" onClick={load}>Reintentar</button>
            </div>
        );
    }
    if (!state) return <p className="cq-state">Cargando los precios de la web…</p>;

    return (
        <div className="pw">
            <p className="cq-intro">
                Estos precios son solo para quien reserva en la web. Booking y Airbnb no cambian.
                Si una noche no tiene precio propio, la web cobra el de Booking y Airbnb con el descuento general.
            </p>

            <Descuento state={state} onApplied={load} />
            <PreciosPorFecha state={state} today={today} initialRange={initialRange} onApplied={load} />
            <Manuales state={state} onApplied={load} />
        </div>
    );
}

// ---------- Descuento general ----------
function Descuento({ state, onApplied }: { state: WebPricesState; onApplied: () => void }) {
    const [value, setValue] = useState(String(state.descuento));
    const [preview, setPreview] = useState<WebDiscountPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<Message>(null);
    const [checking, setChecking] = useState(false);
    const [signing, setSigning] = useState(false);
    const { min, max } = state.limits.descuento;

    const change = (v: string) => {
        setValue(v);
        setPreview(null);
        setMessage(null);
        setError(null);
    };

    const unchanged = Number(value.replace(",", ".")) === state.descuento;

    const handleReview = async () => {
        setChecking(true);
        setMessage(null);
        try {
            setPreview(await previewWebDiscount(value));
            setError(null);
        } catch (err) {
            const e = toApiError(err);
            setError(e.errors?.percent ?? null);
            setMessage({ tone: "error", text: e.detail });
        } finally {
            setChecking(false);
        }
    };

    const handleSign = async (pin: string) => {
        try {
            const r = await applyWebDiscount(value, pin);
            setSigning(false);
            setPreview(null);
            setMessage({ tone: "ok", text: `Listo: la web ya aplica un ${fmtPercent(r.descuento)} de descuento.` });
            onApplied();
            return null;
        } catch (err) {
            const e = toApiError(err);
            if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
            if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
            setSigning(false);
            setPreview(null);
            setMessage({ tone: "error", text: e.detail });
            return null;
        }
    };

    return (
        <section className="pw-block">
            <div className="pw-block-head">
                <h3 className="cq-legend pw-title">Descuento general</h3>
                <span className="pw-current">
                    Ahora: <strong>{fmtPercent(state.descuento)}</strong>
                </span>
            </div>
            <p className="cq-help pw-help">
                Se resta al precio de Booking y Airbnb en todas las noches sin precio propio. Se redondea al euro.
            </p>

            <div className="pw-inline">
                <div className="cq-input-wrap cq-input-wrap--short">
                    <input className="cq-input" type="number" inputMode="decimal" min={min} max={max} step="0.5"
                        aria-label="Descuento de la web" value={value} onChange={(e) => change(e.target.value)}
                        aria-invalid={!!error} />
                    <span className="cq-unit">%</span>
                </div>
                {preview ? (
                    <button type="button" className="cq-btn" onClick={() => setSigning(true)}>Firmar y aplicar</button>
                ) : (
                    <button type="button" className="cq-btn cq-btn--ghost" onClick={handleReview} disabled={checking || unchanged || !value}>
                        {checking ? "Revisando…" : "Revisar cambio"}
                    </button>
                )}
            </div>
            {error && <p className="cq-field-error">{error}</p>}

            {message && (
                <p className={`cq-message cq-message--${message.tone} pw-message`} role={message.tone === "error" ? "alert" : "status"}>
                    {message.text}
                </p>
            )}

            {preview && (
                <div className="cq-review pw-review">
                    <h4 className="cq-review-title">
                        {fmtPercent(preview.before)} → {fmtPercent(preview.after)}
                    </h4>
                    <ul className="cq-examples">
                        {preview.examples.map((ex) => (
                            <li key={ex.price} className="cq-example">
                                <span className="cq-example-base" title="Booking y Airbnb">{ex.price} €</span>
                                <span className="cq-example-arrow">→</span>
                                {ex.before !== ex.after && <span className="cq-old">{ex.before} €</span>}
                                <span className="cq-example-new">{ex.after} €</span>
                            </li>
                        ))}
                    </ul>
                    {preview.manuales > 0 && (
                        <p className="cq-help">
                            {preview.manuales === 1 ? "1 noche tiene" : `${preview.manuales} noches tienen`} precio propio y no cambia.
                        </p>
                    )}
                </div>
            )}

            <SignModal
                open={signing}
                title="Firmar descuento de la web"
                lines={[
                    `Descuento general: ${fmtPercent(preview?.before ?? state.descuento)} → ${fmtPercent(preview?.after ?? Number(value))}`,
                    "Solo cambia la web. Booking y Airbnb no se tocan.",
                ]}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </section>
    );
}

// ---------- Precios por fechas ----------
interface PorFechaProps {
    state: WebPricesState;
    today: string;
    initialRange: DateRange | null;
    onApplied: () => void;
}

function PreciosPorFecha({ state, today, initialRange, onApplied }: PorFechaProps) {
    const { limits, lastDay } = state;
    const [from, setFrom] = useState(initialRange?.from ?? today);
    const [to, setTo] = useState(initialRange?.to ?? addDays(today, 6));
    const sectionRef = useRef<HTMLElement>(null);

    // Si se llega desde el calendario, se baja directo a esta sección
    useEffect(() => {
        if (initialRange) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [initialRange]);
    const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
    const [mode, setMode] = useState<WebPriceMode>("fixed");
    const [value, setValue] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<WebPricePreview | null>(null);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState<Message>(null);
    const [signing, setSigning] = useState(false);

    const touch = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPreview(null);
        setMessage(null);
    };

    const request: WebPriceRequest = useMemo(
        () => ({ from, to, weekdays, mode, ...(mode === "auto" ? {} : { value }) }),
        [from, to, weekdays, mode, value]
    );

    const toggleDay = (id: number) =>
        touch(setWeekdays)(weekdays.includes(id) ? weekdays.filter((d) => d !== id) : [...weekdays, id].sort());

    const handleReview = async () => {
        setChecking(true);
        setMessage(null);
        try {
            const result = await previewWebPrices(request);
            setErrors({});
            if (!result.changes.length) {
                setPreview(null);
                setMessage({ tone: "ok", text: "Las fechas elegidas ya tienen ese precio en la web. No hay nada para cambiar." });
            } else {
                setPreview(result);
            }
        } catch (err) {
            const e = toApiError(err);
            setErrors(e.errors ?? {});
            setMessage({ tone: "error", text: e.detail });
        } finally {
            setChecking(false);
        }
    };

    const handleSign = async (pin: string) => {
        try {
            const result = await applyWebPrices(request, pin);
            setSigning(false);
            setPreview(null);
            const n = result.applied.days;
            setMessage({
                tone: "ok",
                text: `${n === 1 ? "Se ha actualizado 1 noche" : `Se han actualizado ${n} noches`} en la web. Ya se ven en el calendario de reservas.`,
            });
            onApplied();
            return null;
        } catch (err) {
            const e = toApiError(err);
            if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
            if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
            setSigning(false);
            setErrors(e.errors ?? {});
            setPreview(null);
            setMessage({ tone: "error", text: e.detail });
            return null;
        }
    };

    const modeLine =
        mode === "fixed" ? `Precio en la web: ${value} € por noche`
            : mode === "percent" ? `Precio en la web: ${Number(value) > 0 ? "+" : ""}${value} % sobre Booking y Airbnb`
                : `Vuelven al precio automático (descuento del ${fmtPercent(state.descuento)})`;

    const signLines = [
        `Del ${formatDate(from)} al ${formatDate(to)}, ${weekdayList(weekdays)}`,
        modeLine,
        ...(preview ? [`Cambian ${preview.changes.length} ${preview.changes.length === 1 ? "noche" : "noches"}`] : []),
        "Booking y Airbnb no se tocan.",
    ];

    return (
        <section className="pw-block" ref={sectionRef}>
            <div className="pw-block-head">
                <h3 className="cq-legend pw-title">Precios por fechas</h3>
            </div>
            <p className="cq-help pw-help">
                Para fechas concretas: un precio fijo, un porcentaje sobre Booking y Airbnb, o volver al precio automático.
            </p>

            <div className="cq-grid">
                <div className="cq-field">
                    <label className="cq-label" htmlFor="pw-from">Desde</label>
                    <input id="pw-from" className="cq-input" type="date" min={today} max={lastDay} value={from}
                        onChange={(e) => touch(setFrom)(e.target.value)} aria-invalid={!!errors.from} />
                    {errors.from && <p className="cq-field-error">{errors.from}</p>}
                </div>
                <div className="cq-field">
                    <label className="cq-label" htmlFor="pw-to">Hasta (incluido)</label>
                    <input id="pw-to" className="cq-input" type="date" min={from || today} max={lastDay} value={to}
                        onChange={(e) => touch(setTo)(e.target.value)} aria-invalid={!!errors.to} />
                    {errors.to && <p className="cq-field-error">{errors.to}</p>}
                </div>
            </div>

            <div className="cq-field cq-field--wide">
                <span className="cq-label" id="pw-days-label">Días de la semana</span>
                <div className="cq-days" role="group" aria-labelledby="pw-days-label">
                    {WEEKDAYS.map((d) => (
                        <button key={d.id} type="button" aria-pressed={weekdays.includes(d.id)}
                            className={`cq-day ${weekdays.includes(d.id) ? "cq-day--on" : ""}`}
                            onClick={() => toggleDay(d.id)}>
                            {d.short}
                        </button>
                    ))}
                </div>
                <div className="cq-presets">
                    {PRESETS.map((p) => (
                        <button key={p.label} type="button" className="cq-link" onClick={() => touch(setWeekdays)([...p.days].sort())}>
                            {p.label}
                        </button>
                    ))}
                </div>
                {errors.weekdays && <p className="cq-field-error">{errors.weekdays}</p>}
            </div>

            <div className="cq-option pw-mode">
                <span className="cq-label">Precio por noche en la web</span>
                <div className="cq-segment" role="radiogroup" aria-label="Precio por noche en la web">
                    {MODES.map(([m, label]) => (
                        <button key={m} type="button" role="radio" aria-checked={mode === m}
                            className={`cq-segment-btn ${mode === m ? "cq-segment-btn--on" : ""}`}
                            onClick={() => touch(setMode)(m)}>
                            {label}
                        </button>
                    ))}
                </div>
                {mode !== "auto" && (
                    <div className="cq-input-wrap cq-input-wrap--short">
                        <input className="cq-input" type="number" inputMode="decimal"
                            aria-label={mode === "fixed" ? "Precio en euros" : "Porcentaje"}
                            min={mode === "fixed" ? limits.precio.min : limits.porcentaje.min}
                            max={mode === "fixed" ? limits.precio.max : limits.porcentaje.max}
                            value={value} onChange={(e) => touch(setValue)(e.target.value)} aria-invalid={!!errors.value} />
                        <span className="cq-unit">{mode === "fixed" ? "€" : "%"}</span>
                    </div>
                )}
                {mode === "percent" && (
                    <p className="cq-help">Negativo para bajar: −10 deja la web un 10 % por debajo de Booking y Airbnb. Se redondea al euro.</p>
                )}
                {mode === "auto" && (
                    <p className="cq-help">Quita los precios propios de esas fechas: vuelven a Booking y Airbnb con el descuento general.</p>
                )}
                {errors.value && <p className="cq-field-error">{errors.value}</p>}
            </div>

            {message && (
                <p className={`cq-message cq-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
                    {message.text}
                </p>
            )}

            {preview && <PreviewTable preview={preview} />}

            <div className="cq-actions">
                {preview ? (
                    <button type="button" className="cq-btn" onClick={() => setSigning(true)}>Firmar y aplicar</button>
                ) : (
                    <button type="button" className="cq-btn" onClick={handleReview}
                        disabled={checking || (mode !== "auto" && !value)}>
                        {checking ? "Revisando…" : "Revisar cambios"}
                    </button>
                )}
            </div>

            <SignModal
                open={signing}
                title="Firmar precios de la web"
                lines={signLines}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </section>
    );
}

// ---------- Vista previa día por día ----------
function PreviewTable({ preview }: { preview: WebPricePreview }) {
    const n = preview.changes.length;
    return (
        <div className="cq-review">
            <h4 className="cq-review-title">{n === 1 ? "Cambia 1 noche" : `Cambian ${n} noches`}</h4>

            {preview.skipped.length > 0 && (
                <p className="cq-message cq-message--warn">
                    {preview.skipped.length === 1 ? "1 noche no tiene" : `${preview.skipped.length} noches no tienen`} precio en las reglas y no se cambia:{" "}
                    {preview.skipped.slice(0, 5).map((s) => formatDate(s.date)).join(", ")}{preview.skipped.length > 5 ? "…" : ""}.
                </p>
            )}

            <div className="cq-table-wrap">
                <table className="cq-table">
                    <thead>
                        <tr>
                            <th className="cq-th">Fecha</th>
                            <th className="cq-th">Día</th>
                            <th className="cq-th">Booking y Airbnb</th>
                            <th className="cq-th">Web</th>
                            <th className="cq-th">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.changes.map((c) => (
                            <tr key={c.date}>
                                <td className="cq-td">{formatDate(c.date)}</td>
                                <td className="cq-td">{WEEKDAYS[c.weekday - 1]?.short}</td>
                                <td className="cq-td cq-td--same">{c.channels} €</td>
                                <td className="cq-td cq-td--changed">
                                    {c.before.price !== c.after.price && <span className="cq-old">{c.before.price} €</span>} {c.after.price} €
                                </td>
                                <td className="cq-td">
                                    <span className={`pw-tag ${c.after.manual ? "pw-tag--manual" : ""}`}>
                                        {c.after.manual ? "Propio" : "Automático"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ---------- Fechas con precio propio: editar o quitar ----------
type Tramo = WebPricesState["manuales"][number];
type Accion = "editar" | "quitar";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const tramoKey = (t: Tramo) => `${t.from}_${t.to}`;
const tramoLabel = (t: Tramo) => (t.from === t.to ? formatDate(t.from) : `${formatDate(t.from)} – ${formatDate(t.to)}`);

function Manuales({ state, onApplied }: { state: WebPricesState; onApplied: () => void }) {
    const { manuales, limits } = state;
    const [activo, setActivo] = useState<{ tramo: Tramo; accion: Accion } | null>(null);
    const [valor, setValor] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<WebPricePreview | null>(null);
    const [checking, setChecking] = useState(false);
    const [signing, setSigning] = useState(false);
    const [message, setMessage] = useState<Message>(null);

    const request = (t: Tramo, accion: Accion, v: string): WebPriceRequest =>
        accion === "quitar"
            ? { from: t.from, to: t.to, weekdays: ALL_DAYS, mode: "auto" }
            : { from: t.from, to: t.to, weekdays: ALL_DAYS, mode: "fixed", value: v };

    const revisar = async (t: Tramo, accion: Accion, v: string) => {
        setChecking(true);
        setError(null);
        setMessage(null);
        try {
            const r = await previewWebPrices(request(t, accion, v));
            if (!r.changes.length) {
                setPreview(null);
                setError("Ese tramo ya tiene ese precio. No hay nada para cambiar.");
            } else {
                setPreview(r);
            }
        } catch (err) {
            const e = toApiError(err);
            setPreview(null);
            setError(e.errors?.value ?? e.errors?.from ?? e.errors?.to ?? e.detail);
        } finally {
            setChecking(false);
        }
    };

    const abrir = (tramo: Tramo, accion: Accion) => {
        setActivo({ tramo, accion });
        setValor(String(tramo.precio));
        setPreview(null);
        setError(null);
        setMessage(null);
        // Quitar no necesita datos: se revisa directamente
        if (accion === "quitar") revisar(tramo, "quitar", "");
    };

    const cerrar = () => {
        setActivo(null);
        setPreview(null);
        setError(null);
    };

    const handleSign = async (pin: string) => {
        if (!activo) return null;
        try {
            const r = await applyWebPrices(request(activo.tramo, activo.accion, valor), pin);
            setSigning(false);
            const n = r.applied.days;
            const noches = n === 1 ? "1 noche" : `${n} noches`;
            setMessage({
                tone: "ok",
                text: activo.accion === "quitar"
                    ? `Precio propio quitado (${noches}): vuelven al precio automático de las reglas con el descuento general.`
                    : `Precio actualizado en ${noches}.`,
            });
            cerrar();
            onApplied();
            return null;
        } catch (err) {
            const e = toApiError(err);
            if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
            if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
            setSigning(false);
            setPreview(null);
            setError(e.detail);
            return null;
        }
    };

    const signLines = activo
        ? [
              `Tramo: ${tramoLabel(activo.tramo)}`,
              activo.accion === "quitar"
                  ? `Se quita el precio propio (${activo.tramo.precio} €): vuelve al automático (reglas con un ${fmtPercent(state.descuento)} de descuento)`
                  : `Precio en la web: ${activo.tramo.precio} € → ${valor} € por noche`,
              ...(preview ? [`Cambian ${preview.changes.length} ${preview.changes.length === 1 ? "noche" : "noches"}`] : []),
              "Booking y Airbnb no se tocan.",
          ]
        : [];

    return (
        <section className="pw-block pw-block--last">
            <div className="pw-block-head">
                <h3 className="cq-legend pw-title">Fechas con precio propio</h3>
                <span className="pw-current">{manuales.length ? `${manuales.length} ${manuales.length === 1 ? "tramo" : "tramos"}` : "Ninguna"}</span>
            </div>

            {message && (
                <p className={`cq-message cq-message--${message.tone} pw-message`} role={message.tone === "error" ? "alert" : "status"}>
                    {message.text}
                </p>
            )}

            {manuales.length === 0 ? (
                <p className="cq-help pw-help">Todas las noches usan el precio automático.</p>
            ) : (
                <ul className="pw-list">
                    {manuales.map((m) => {
                        const abierto = activo && tramoKey(activo.tramo) === tramoKey(m) ? activo.accion : null;
                        return (
                            <li key={tramoKey(m)} className={`pw-list-item ${abierto ? "pw-list-item--open" : ""}`}>
                                <div className="pw-list-row">
                                    <span className="pw-list-dates">{tramoLabel(m)}</span>
                                    <span className="pw-list-price">{m.precio} €</span>
                                    {!abierto && (
                                        <span className="pw-list-actions">
                                            <button type="button" className="cq-link" onClick={() => abrir(m, "editar")}>Editar</button>
                                            <button type="button" className="cq-link pw-link-danger" onClick={() => abrir(m, "quitar")}>Quitar</button>
                                        </span>
                                    )}
                                </div>

                                {abierto && (
                                    <div className="pw-edit">
                                        {abierto === "editar" ? (
                                            <div className="pw-inline">
                                                <div className="cq-input-wrap cq-input-wrap--short">
                                                    <input className="cq-input" type="number" inputMode="decimal" autoFocus
                                                        aria-label={`Nuevo precio para ${tramoLabel(m)}`}
                                                        min={limits.precio.min} max={limits.precio.max}
                                                        value={valor}
                                                        onChange={(e) => { setValor(e.target.value); setPreview(null); setError(null); }}
                                                        aria-invalid={!!error} />
                                                    <span className="cq-unit">€</span>
                                                </div>
                                                {!preview && (
                                                    <button type="button" className="cq-btn cq-btn--ghost"
                                                        onClick={() => revisar(m, "editar", valor)}
                                                        disabled={checking || !valor || Number(valor) === m.precio}>
                                                        {checking ? "Revisando…" : "Revisar cambio"}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="cq-help">
                                                Al quitarlo, estas noches vuelven al precio automático: el de las reglas con el descuento general ({fmtPercent(state.descuento)}).
                                                {checking && " Calculando…"}
                                            </p>
                                        )}

                                        {error && <p className="cq-field-error">{error}</p>}
                                        {preview && <PreviewTable preview={preview} />}

                                        <div className="pw-edit-actions">
                                            <button type="button" className="cq-btn cq-btn--ghost" onClick={cerrar}>Cancelar</button>
                                            {preview && (
                                                <button type="button" className="cq-btn" onClick={() => setSigning(true)}>
                                                    {abierto === "quitar" ? "Firmar y quitar" : "Firmar y guardar"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <SignModal
                open={signing}
                title={activo?.accion === "quitar" ? "Firmar: quitar precio propio" : "Firmar: cambiar precio propio"}
                lines={signLines}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </section>
    );
}