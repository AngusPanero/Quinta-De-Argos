import { useCallback, useEffect, useState } from "react";
import SignModal from "./SignModal";
import { toApiError } from "./configApi";
import {
    applyAirbnbMultiplier, fetchCanales, previewAirbnbMultiplier,
    type AirbnbConfig, type MultiplierPreview,
} from "./canalesApi";

const formatPercent = (p: number) => (p === 0 ? "Sin ajuste" : `${p > 0 ? "+" : ""}${p}%`);
const formatEuro = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} €`;

export default function ConfigCanales() {
    const [airbnb, setAirbnb] = useState<AirbnbConfig | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [percent, setPercent] = useState("");
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [preview, setPreview] = useState<MultiplierPreview | null>(null);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
    const [signing, setSigning] = useState(false);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const data = await fetchCanales();
            setAirbnb(data.airbnb);
            setPercent(String(data.airbnb.multiplier.percent));
        } catch (err) {
            setLoadError(toApiError(err).detail);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const changePercent = (v: string) => {
        setPercent(v);
        setPreview(null);
        setMessage(null);
        setFieldError(null);
    };

    const handleReview = async () => {
        setChecking(true);
        setMessage(null);
        try {
            setPreview(await previewAirbnbMultiplier(percent));
        } catch (err) {
            const e = toApiError(err);
            setFieldError(e.errors?.percent ?? null);
            setMessage({ tone: "error", text: e.detail });
        } finally {
            setChecking(false);
        }
    };

    const handleSign = async (pin: string) => {
        try {
            const result = await applyAirbnbMultiplier(percent, pin);
            setSigning(false);
            setPreview(null);
            setAirbnb(result.airbnb);
            setPercent(String(result.airbnb.multiplier.percent));
            setMessage({ tone: "ok", text: "Ajuste guardado en Beds24. Airbnb recibe los precios nuevos en unos minutos." });
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

    if (loadError) {
        return (
            <div className="cq-state">
                <p className="cq-message cq-message--error" role="alert">{loadError}</p>
                <button type="button" className="cq-btn cq-btn--ghost" onClick={load}>Reintentar</button>
            </div>
        );
    }
    if (!airbnb) return <p className="cq-state">Cargando la configuración de los canales…</p>;

    const { multiplier, discounts } = airbnb;

    return (
        <div className="cq-panel">
            <p className="cq-intro">
                Ajuste de precio por canal sobre el precio del calendario. La web y el calendario siguen mostrando el precio base.
            </p>

            {/* ---------- Airbnb ---------- */}
            <section className="cq-channel" aria-labelledby="cq-ch-airbnb">
                <header className="cq-channel-head">
                    <h3 id="cq-ch-airbnb" className="cq-channel-name">Airbnb</h3>
                    <span className="cq-channel-current">Ajuste actual: <strong>{formatPercent(multiplier.percent)}</strong></span>
                </header>

                <div className="cq-option">
                    <label className="cq-label" htmlFor="cq-airbnb-pct">Ajuste de precio</label>
                    <div className="cq-input-wrap cq-input-wrap--short">
                        <input id="cq-airbnb-pct" className="cq-input" type="number" inputMode="decimal" step="0.5"
                            min={multiplier.limits.min} max={multiplier.limits.max}
                            value={percent} onChange={(e) => changePercent(e.target.value)}
                            aria-invalid={!!fieldError} aria-describedby="cq-airbnb-help" />
                        <span className="cq-unit">%</span>
                    </div>
                    <p id="cq-airbnb-help" className="cq-help">
                        10 sube un 10% todos los precios que se envían a Airbnb. Un número negativo los baja. 0 quita el ajuste.
                    </p>
                    {fieldError && <p className="cq-field-error">{fieldError}</p>}
                </div>

                {(discounts.lastMinutePercent || discounts.weekPercent || discounts.monthPercent) ? (
                    <p className="cq-help cq-channel-note">
                        Airbnb aplica además sus descuentos sobre el precio ajustado:
                        {discounts.lastMinutePercent ? ` ${discounts.lastMinutePercent}% de último minuto (reservas a ${discounts.lastMinuteDays} días o menos),` : ""}
                        {discounts.weekPercent ? ` ${discounts.weekPercent}% desde 7 noches,` : ""}
                        {discounts.monthPercent ? ` ${discounts.monthPercent}% desde 28 noches` : ""}.
                    </p>
                ) : null}

                {message && (
                    <p className={`cq-message cq-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
                        {message.text}
                    </p>
                )}

                {preview && (
                    <div className="cq-review">
                        <h4 className="cq-review-title">
                            {formatPercent(preview.before.percent)} pasa a {formatPercent(preview.after.percent)}
                        </h4>
                        <ul className="cq-examples">
                            {preview.examples.map((ex) => (
                                <li key={ex.price} className="cq-example">
                                    <span className="cq-example-base">{formatEuro(ex.price)}</span>
                                    <span className="cq-example-arrow" aria-hidden="true">→</span>
                                    <span className="cq-example-new">{formatEuro(ex.airbnb)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="cq-help">Precios del calendario y cómo se envían a Airbnb.</p>
                    </div>
                )}

                <div className="cq-actions">
                    {preview ? (
                        <button type="button" className="cq-btn" onClick={() => setSigning(true)}>Firmar y aplicar</button>
                    ) : (
                        <button type="button" className="cq-btn" onClick={handleReview}
                            disabled={checking || percent.trim() === "" || Number(percent) === multiplier.percent}>
                            {checking ? "Revisando…" : "Revisar cambios"}
                        </button>
                    )}
                </div>
            </section>

            {/* ---------- Booking ---------- */}
            <section className="cq-channel cq-channel--readonly" aria-labelledby="cq-ch-booking">
                <header className="cq-channel-head">
                    <h3 id="cq-ch-booking" className="cq-channel-name">Booking</h3>
                </header>
                <p className="cq-help">
                    La API de Beds24 no permite cambiar el ajuste de Booking. Se configura en el panel de Beds24:
                    Channel Manager → Booking.com → Mapping → Multiplier. Por ejemplo, *1.10 sube un 10%.
                </p>
            </section>

            <SignModal
                open={signing}
                title="Firmar ajuste de Airbnb"
                lines={preview ? [
                    `Airbnb: ${formatPercent(preview.before.percent)} pasa a ${formatPercent(preview.after.percent)}`,
                    ...preview.examples.slice(0, 3).map((ex) => `${formatEuro(ex.price)} se envía como ${formatEuro(ex.airbnb)}`),
                ] : []}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </div>
    );
}