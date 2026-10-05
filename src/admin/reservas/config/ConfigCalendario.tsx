import { useMemo, useState } from "react";
import SignModal from "./SignModal";
import { applyCalendar, previewCalendar, toApiError } from "./configApi";
import { OVERRIDE_STATE, WEEKDAYS, addDays, formatDate, weekdayList } from "./configUtils";
import type { CalendarOptions, CalendarPreview, CalendarRequest } from "./configTypes";

type PriceMode = "none" | "fixed" | "percent";

const PRESETS = [
    { label: "Todos", days: [1, 2, 3, 4, 5, 6, 7] },
    { label: "Domingo a jueves", days: [7, 1, 2, 3, 4] },
    { label: "Viernes y sábado", days: [5, 6] },
];

interface Props {
    options: CalendarOptions;
}

export default function ConfigCalendario({ options }: Props) {
    const { today, limits, overrides } = options;
    const [from, setFrom] = useState(today);
    const [to, setTo] = useState(addDays(today, 6));
    const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
    const [priceMode, setPriceMode] = useState<PriceMode>("none");
    const [priceValue, setPriceValue] = useState("");
    const [minStayOn, setMinStayOn] = useState(false);
    const [minStay, setMinStay] = useState("");
    const [maxStayOn, setMaxStayOn] = useState(false);
    const [maxStay, setMaxStay] = useState("");
    const [override, setOverride] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<CalendarPreview | null>(null);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
    const [signing, setSigning] = useState(false);

    // Cualquier cambio en el formulario invalida la vista previa
    const touch = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPreview(null);
        setMessage(null);
    };

    const request: CalendarRequest = useMemo(() => {
        const body: CalendarRequest = { from, to, weekdays };
        if (priceMode !== "none") body.price = { mode: priceMode, value: priceValue };
        if (minStayOn) body.minStay = minStay;
        if (maxStayOn) body.maxStay = maxStay;
        if (override) body.override = override;
        return body;
    }, [from, to, weekdays, priceMode, priceValue, minStayOn, minStay, maxStayOn, maxStay, override]);

    const nothingSelected = priceMode === "none" && !minStayOn && !maxStayOn && !override;

    const toggleDay = (id: number) =>
        touch(setWeekdays)(weekdays.includes(id) ? weekdays.filter((d) => d !== id) : [...weekdays, id].sort());

    const handleReview = async () => {
        setChecking(true);
        setMessage(null);
        try {
            const result = await previewCalendar(request);
            setErrors({});
            if (!result.changes.length) {
                setPreview(null);
                setMessage({ tone: "ok", text: "Las fechas elegidas ya tienen esos valores. No hay nada para cambiar." });
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
            const result = await applyCalendar(request, pin);
            setSigning(false);
            setPreview(null);
            const n = result.applied.days;
            setMessage({
                tone: "ok",
                text: `${n === 1 ? "Se actualizó 1 día" : `Se actualizaron ${n} días`} en Beds24. Booking y Airbnb los reciben en unos minutos.`,
            });
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

    const overrideLabel = overrides.find((o) => o.value === override)?.label;
    const signLines = [
        `Del ${formatDate(from)} al ${formatDate(to)}, ${weekdayList(weekdays)}`,
        ...(priceMode === "fixed" ? [`Precio por noche: ${priceValue} €`] : []),
        ...(priceMode === "percent" ? [`Precio: ${Number(priceValue) > 0 ? "+" : ""}${priceValue}%`] : []),
        ...(minStayOn ? [`Estancia mínima: ${minStay} noches`] : []),
        ...(maxStayOn ? [`Estancia máxima: ${maxStay} noches`] : []),
        ...(overrideLabel ? [overrideLabel] : []),
        ...(preview ? [`Cambian ${preview.changes.length} ${preview.changes.length === 1 ? "día" : "días"}`] : []),
    ];

    return (
        <div className="cq-panel">
            <p className="cq-intro">
                Elegí las fechas, los días de la semana y qué querés cambiar. Antes de aplicar vas a ver día por día cómo queda.
            </p>

            <fieldset className="cq-fieldset">
                <legend className="cq-legend">Fechas</legend>
                <div className="cq-grid">
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="cq-from">Desde</label>
                        <input id="cq-from" className="cq-input" type="date" min={today} value={from}
                            onChange={(e) => touch(setFrom)(e.target.value)} aria-invalid={!!errors.from} />
                        {errors.from && <p className="cq-field-error">{errors.from}</p>}
                    </div>
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="cq-to">Hasta (incluido)</label>
                        <input id="cq-to" className="cq-input" type="date" min={from || today} value={to}
                            onChange={(e) => touch(setTo)(e.target.value)} aria-invalid={!!errors.to} />
                        {errors.to && <p className="cq-field-error">{errors.to}</p>}
                    </div>
                </div>

                <div className="cq-field cq-field--wide">
                    <span className="cq-label" id="cq-days-label">Días de la semana</span>
                    <div className="cq-days" role="group" aria-labelledby="cq-days-label">
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
                <legend className="cq-legend">Qué cambiar</legend>

                <div className="cq-option">
                    <span className="cq-label">Precio por noche</span>
                    <div className="cq-segment" role="radiogroup" aria-label="Precio por noche">
                        {([["none", "Sin cambios"], ["fixed", "Precio fijo"], ["percent", "Subir o bajar %"]] as const).map(([mode, label]) => (
                            <button key={mode} type="button" role="radio" aria-checked={priceMode === mode}
                                className={`cq-segment-btn ${priceMode === mode ? "cq-segment-btn--on" : ""}`}
                                onClick={() => touch(setPriceMode)(mode)}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {priceMode !== "none" && (
                        <div className="cq-input-wrap cq-input-wrap--short">
                            <input className="cq-input" type="number" inputMode="decimal" aria-label={priceMode === "fixed" ? "Precio en euros" : "Porcentaje"}
                                min={priceMode === "fixed" ? limits.price.min : limits.percent.min}
                                max={priceMode === "fixed" ? limits.price.max : limits.percent.max}
                                value={priceValue} onChange={(e) => touch(setPriceValue)(e.target.value)} aria-invalid={!!errors.price} />
                            <span className="cq-unit">{priceMode === "fixed" ? "€" : "%"}</span>
                        </div>
                    )}
                    {priceMode === "percent" && <p className="cq-help">Usá un número negativo para bajar, por ejemplo −10. Se redondea al euro.</p>}
                    {errors.price && <p className="cq-field-error">{errors.price}</p>}
                </div>

                <div className="cq-grid">
                    <div className="cq-option">
                        <label className="cq-check">
                            <input type="checkbox" checked={minStayOn} onChange={(e) => touch(setMinStayOn)(e.target.checked)} />
                            Estancia mínima
                        </label>
                        {minStayOn && (
                            <div className="cq-input-wrap cq-input-wrap--short">
                                <input className="cq-input" type="number" inputMode="numeric" aria-label="Estancia mínima"
                                    min={limits.minStay.min} max={limits.minStay.max}
                                    value={minStay} onChange={(e) => touch(setMinStay)(e.target.value)} aria-invalid={!!errors.minStay} />
                                <span className="cq-unit">noches</span>
                            </div>
                        )}
                        {errors.minStay && <p className="cq-field-error">{errors.minStay}</p>}
                    </div>

                    <div className="cq-option">
                        <label className="cq-check">
                            <input type="checkbox" checked={maxStayOn} onChange={(e) => touch(setMaxStayOn)(e.target.checked)} />
                            Estancia máxima
                        </label>
                        {maxStayOn && (
                            <div className="cq-input-wrap cq-input-wrap--short">
                                <input className="cq-input" type="number" inputMode="numeric" aria-label="Estancia máxima"
                                    min={limits.maxStay.min} max={limits.maxStay.max}
                                    value={maxStay} onChange={(e) => touch(setMaxStay)(e.target.value)} aria-invalid={!!errors.maxStay} />
                                <span className="cq-unit">noches</span>
                            </div>
                        )}
                        {errors.maxStay && <p className="cq-field-error">{errors.maxStay}</p>}
                    </div>
                </div>

                <div className="cq-option">
                    <label className="cq-label" htmlFor="cq-override">Disponibilidad</label>
                    <select id="cq-override" className="cq-input cq-input--short" value={override}
                        onChange={(e) => touch(setOverride)(e.target.value)} aria-invalid={!!errors.override}>
                        <option value="">Sin cambios</option>
                        {overrides.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {errors.override && <p className="cq-field-error">{errors.override}</p>}
                </div>
            </fieldset>

            {errors._ && <p className="cq-message cq-message--error" role="alert">{errors._}</p>}
            {message && (
                <p className={`cq-message cq-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
                    {message.text}
                </p>
            )}

            {preview && <CalendarPreviewTable preview={preview} />}

            <div className="cq-actions">
                {preview ? (
                    <button type="button" className="cq-btn" onClick={() => setSigning(true)}>Firmar y aplicar</button>
                ) : (
                    <button type="button" className="cq-btn" onClick={handleReview} disabled={nothingSelected || checking}>
                        {checking ? "Revisando…" : "Revisar cambios"}
                    </button>
                )}
            </div>

            <SignModal
                open={signing}
                title="Firmar cambios del calendario"
                lines={signLines}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </div>
    );
}

// ---------- Vista previa día por día ----------
function CalendarPreviewTable({ preview }: { preview: CalendarPreview }) {
    const n = preview.changes.length;
    const cell = (changed: boolean, before: string, after: string) =>
        changed
            ? <td className="cq-td cq-td--changed"><span className="cq-old">{before}</span> {after}</td>
            : <td className="cq-td cq-td--same">{after}</td>;
    const price = (v: number | null) => (v === null ? "Sin precio" : `${v} €`);
    const nights = (v: number | null) => (v === null ? "Por defecto" : String(v));
    const state = (v: string) => OVERRIDE_STATE[v] ?? v;

    return (
        <div className="cq-review">
            <h3 className="cq-review-title">
                {n === 1 ? "Cambia 1 día" : `Cambian ${n} días`}
            </h3>

            {preview.skipped.length > 0 && (
                <p className="cq-message cq-message--warn">
                    {preview.skipped.length === 1 ? "1 día no tiene precio cargado" : `${preview.skipped.length} días no tienen precio cargado`} y no se les aplica el ajuste: {preview.skipped.slice(0, 5).map((s) => formatDate(s.date)).join(", ")}{preview.skipped.length > 5 ? "…" : ""}.
                </p>
            )}

            <div className="cq-table-wrap">
                <table className="cq-table">
                    <thead>
                        <tr>
                            <th className="cq-th">Fecha</th>
                            <th className="cq-th">Día</th>
                            <th className="cq-th">Precio</th>
                            <th className="cq-th">Mínima</th>
                            <th className="cq-th">Máxima</th>
                            <th className="cq-th">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.changes.map((c) => (
                            <tr key={c.date}>
                                <td className="cq-td">{formatDate(c.date)}</td>
                                <td className="cq-td">{WEEKDAYS[c.weekday - 1]?.short}</td>
                                {cell(c.fields.includes("price"), price(c.before.price), price(c.after.price))}
                                {cell(c.fields.includes("minStay"), nights(c.before.minStay), nights(c.after.minStay))}
                                {cell(c.fields.includes("maxStay"), nights(c.before.maxStay), nights(c.after.maxStay))}
                                {cell(c.fields.includes("override"), state(c.before.override), state(c.after.override))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}