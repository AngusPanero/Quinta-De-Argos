import { useEffect, useMemo, useState } from "react";
import SignModal from "./SignModal";
import { fetchWebPrices, toApiError } from "./configApi";
import { WEEKDAYS, formatDate, weekdayList } from "./configUtils";
import type { DateRange, Limit } from "./configTypes";
import {
    applyPreciosTodos,
    previewPreciosTodos,
    type PreciosTodosDay,
    type PreciosTodosRequest,
    type PreciosTodosSummary,
} from "./preciosTodosApi";

/**
 * CambiarEnTodos
 * ---------------------------------------------------------
 * Un solo cambio de precio para Beds24 (Booking y Airbnb) y la web.
 * El propietario escribe el precio de Beds24; la web queda automáticamente
 * con el descuento general de «Precios de la web» (hoy 5 %), redondeado al euro.
 * Antes de firmar se ve, día por día, cómo queda en los dos sitios.
 *
 * No sustituye a las opciones de siempre: «Solo Booking y Airbnb» y «Solo la web»
 * siguen funcionando igual.
 */

const PRESETS = [
    { label: "Todos", days: [1, 2, 3, 4, 5, 6, 7] },
    { label: "Domingo a jueves", days: [7, 1, 2, 3, 4] },
    { label: "Viernes y sábado", days: [5, 6] },
];

interface Props {
    today: string;
    initialRange?: DateRange | null; // viene del calendario al tocar «Cambiar este día»
    priceLimit?: Limit; // solo para el campo; el servidor valida igual
    onApplied?: () => void; // p. ej. recargar el calendario
}

const euros = (v: number | null) => (v === null ? "Sin precio" : `${v} €`);

export default function CambiarEnTodos({ today, initialRange, priceLimit, onApplied }: Props) {
    const [from, setFrom] = useState(initialRange?.from ?? today);
    const [to, setTo] = useState(initialRange?.to ?? initialRange?.from ?? today);
    const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
    const [precio, setPrecio] = useState("");
    const [descuento, setDescuento] = useState<number | null>(null); // % (5 = 5 %)

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<{ summary: PreciosTodosSummary; days: PreciosTodosDay[] } | null>(null);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);
    const [signing, setSigning] = useState(false);

    // El descuento general de la web, para mostrar el precio web mientras se escribe
    useEffect(() => {
        let vivo = true;
        fetchWebPrices()
            .then((s) => vivo && setDescuento(s.descuento))
            .catch(() => vivo && setDescuento(null));
        return () => {
            vivo = false;
        };
    }, []);

    const touch = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPreview(null);
        setMessage(null);
    };

    const toggleDay = (id: number) =>
        touch(setWeekdays)(weekdays.includes(id) ? weekdays.filter((d) => d !== id) : [...weekdays, id].sort());

    const request: PreciosTodosRequest = useMemo(() => ({ from, to, weekdays, precio }), [from, to, weekdays, precio]);

    // Cálculo en vivo (el servidor vuelve a calcularlo al revisar y al firmar)
    const precioNum = Number(precio.replace(",", "."));
    const precioValido = precio.trim() !== "" && Number.isFinite(precioNum) && precioNum > 0;
    const precioBeds24 = precioValido ? Math.round(precioNum) : null;
    const precioWeb = precioBeds24 !== null && descuento !== null ? Math.round(precioBeds24 * (1 - descuento / 100)) : null;

    const handleReview = async () => {
        setChecking(true);
        setMessage(null);
        try {
            const result = await previewPreciosTodos(request);
            setErrors({});
            const { diasBeds24, diasWeb } = result.summary;
            if (!diasBeds24 && !diasWeb) {
                setPreview(null);
                setMessage({ tone: "ok", text: "Las fechas elegidas ya tienen ese precio en Booking, Airbnb y la web. No hay nada que cambiar." });
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
            const { applied } = await applyPreciosTodos(request, pin);
            setSigning(false);
            setPreview(null);
            const dias = Math.max(applied.diasBeds24, applied.diasWeb);
            setMessage({
                tone: "ok",
                text: `Listo: ${dias === 1 ? "1 día" : `${dias} días`} a ${applied.precioBeds24} € en Booking y Airbnb y a ${applied.precioWeb} € en la web. Booking y Airbnb lo reciben en unos minutos.`,
            });
            onApplied?.();
            return null;
        } catch (err) {
            const e = toApiError(err);
            if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
            if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
            setSigning(false);
            setErrors(e.errors ?? {});
            setPreview(null);
            setMessage({ tone: e.code === "WEB_SIN_ACTUALIZAR" ? "warn" : "error", text: e.detail });
            return null;
        }
    };

    const signLines = preview
        ? [
              `Del ${formatDate(from)} al ${formatDate(to)}, ${weekdayList(weekdays)}`,
              `Booking y Airbnb (Beds24): ${preview.summary.precioBeds24} € por noche`,
              `Web: ${preview.summary.precioWeb} € por noche (${Math.round(preview.summary.descuento * 100)} % menos)`,
              `Cambian ${preview.summary.diasBeds24} ${preview.summary.diasBeds24 === 1 ? "día" : "días"} en Beds24 y ${preview.summary.diasWeb} en la web`,
          ]
        : [];

    return (
        <div className="cq-panel">
            <p className="cq-intro">
                Escribe el precio de Booking y Airbnb y se aplica en los dos sitios a la vez: Beds24 recibe ese precio y la web
                queda con el descuento de la web. Antes de firmar verás día por día cómo queda.
            </p>

            <fieldset className="cq-fieldset">
                <legend className="cq-legend">Fechas</legend>
                <div className="cq-grid">
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="ct-from">Desde</label>
                        <input id="ct-from" className="cq-input" type="date" min={today} value={from}
                            onChange={(e) => {
                                const v = e.target.value;
                                touch(setFrom)(v);
                                if (to < v) setTo(v);
                            }}
                            aria-invalid={!!errors.from} />
                        {errors.from && <p className="cq-field-error">{errors.from}</p>}
                    </div>
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="ct-to">Hasta (incluido)</label>
                        <input id="ct-to" className="cq-input" type="date" min={from || today} value={to}
                            onChange={(e) => touch(setTo)(e.target.value)} aria-invalid={!!errors.to} />
                        {errors.to && <p className="cq-field-error">{errors.to}</p>}
                    </div>
                </div>

                <div className="cq-field cq-field--wide">
                    <span className="cq-label" id="ct-days-label">Días de la semana</span>
                    <div className="cq-days" role="group" aria-labelledby="ct-days-label">
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
            </fieldset>

            <fieldset className="cq-fieldset">
                <legend className="cq-legend">Precio por noche</legend>
                <div className="cq-option">
                    <label className="cq-label" htmlFor="ct-precio">Booking y Airbnb</label>
                    <div className="cq-input-wrap cq-input-wrap--short">
                        <input id="ct-precio" className="cq-input" type="number" inputMode="decimal"
                            min={priceLimit?.min} max={priceLimit?.max}
                            value={precio} onChange={(e) => touch(setPrecio)(e.target.value)} aria-invalid={!!errors.price} />
                        <span className="cq-unit">€</span>
                    </div>
                    {errors.price && <p className="cq-field-error">{errors.price}</p>}
                    <p className="cq-help">Es el precio que se guarda en Beds24. Airbnb le aplica después su multiplicador, como siempre.</p>
                </div>

                <dl className="ct-result" aria-live="polite">
                    <div className="ct-result-row">
                        <dt>Booking y Airbnb</dt>
                        <dd>{precioBeds24 !== null ? `${precioBeds24} €` : "—"}</dd>
                    </div>
                    <div className="ct-result-row ct-result-row--web">
                        <dt>
                            Web
                            {descuento !== null && <span className="ct-result-note">{descuento} % menos</span>}
                        </dt>
                        <dd>{precioWeb !== null ? `${precioWeb} €` : "—"}</dd>
                    </div>
                </dl>
                {descuento === null && (
                    <p className="cq-help">No se ha podido leer el descuento de la web: el precio web se calcula al revisar.</p>
                )}
            </fieldset>

            {message && (
                <p className={`cq-message cq-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
                    {message.text}
                </p>
            )}

            {preview && <TablaTodos preview={preview} />}

            <div className="cq-actions">
                {preview ? (
                    <button type="button" className="cq-btn" onClick={() => setSigning(true)}>Firmar y aplicar en todos lados</button>
                ) : (
                    <button type="button" className="cq-btn" onClick={handleReview} disabled={!precioValido || !weekdays.length || checking}>
                        {checking ? "Revisando…" : "Revisar cambios"}
                    </button>
                )}
            </div>

            <SignModal
                open={signing}
                title="Firmar precio en todos lados"
                lines={signLines}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </div>
    );
}

// ---------- Vista previa día por día ----------
function TablaTodos({ preview }: { preview: { summary: PreciosTodosSummary; days: PreciosTodosDay[] } }) {
    const { summary, days } = preview;
    const cell = (cambia: boolean, antes: string, despues: string) =>
        cambia
            ? <td className="cq-td cq-td--changed"><span className="cq-old">{antes}</span> {despues}</td>
            : <td className="cq-td cq-td--same">{despues}</td>;

    return (
        <div className="cq-review">
            <h3 className="cq-review-title">
                {days.length === 1 ? "1 día" : `${days.length} días`}: {summary.precioBeds24} € en Booking y Airbnb, {summary.precioWeb} € en la web
            </h3>
            <div className="cq-table-wrap">
                <table className="cq-table">
                    <thead>
                        <tr>
                            <th className="cq-th">Fecha</th>
                            <th className="cq-th">Día</th>
                            <th className="cq-th">Booking y Airbnb</th>
                            <th className="cq-th">Web</th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((d) => (
                            <tr key={d.date}>
                                <td className="cq-td">{formatDate(d.date)}</td>
                                <td className="cq-td">{WEEKDAYS[d.weekday - 1]?.short}</td>
                                {cell(d.beds24.cambia, euros(d.beds24.antes), euros(d.beds24.despues))}
                                {cell(d.web.cambia, euros(d.web.antes), euros(d.web.despues))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}