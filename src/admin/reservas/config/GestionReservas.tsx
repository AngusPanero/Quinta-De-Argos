import { useCallback, useEffect, useState } from "react";
import SignModal from "./SignModal";
import { toApiError } from "./configApi";
import { addDays, formatDate } from "./configUtils";
import {
    cancelarReserva,
    crearReservaManual,
    getGestionReservas,
    previewReservaManual,
    reintentarBeds24,
    type GestionListado,
    type ReservaGestionable,
    type ReservaManualPreview,
    type ReservaManualRequest,
    type TipoManual,
    type TipoReembolso,
} from "./gestionReservasApi";
import "./gestionReservas.css";

/**
 * GestionReservas
 * ---------------------------------------------------------
 * Configuración → Calendario → «Reservas particulares y uso propio».
 *
 * - Crear una reserva particular (cliente propio: nombre, precio, fechas)
 *   o un uso propio. Se crean como reservas reales en Beds24, así que
 *   bloquean Booking y Airbnb y aparecen en el panel de reservas.
 * - Cancelar reservas de la web (con reembolso), particulares y usos propios.
 *   Las de Airbnb y Booking se cancelan en cada plataforma.
 *
 * El navegador solo envía lo que escribe el usuario: el servidor valida,
 * comprueba solapes en Beds24 y pide la clave de firma para escribir.
 */

const TIPO_LABEL: Record<ReservaGestionable["tipo"], string> = {
    web: "Web",
    direct: "Particular",
    owner: "Uso propio",
};

const euros = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
const nochesTxt = (n: number) => `${n} ${n === 1 ? "noche" : "noches"}`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

type Mensaje = { tone: "ok" | "error" | "warn"; text: string } | null;

interface CancelState {
    item: ReservaGestionable;
    reembolso: TipoReembolso;
    importe: string;
    motivo: string;
}

interface Props {
    today: string;
    initialFrom?: string;
    initialTo?: string; // último día incluido (como en «Precios y disponibilidad»)
}

export default function GestionReservas({ today, initialFrom, initialTo }: Props) {
    // ---------- Listado ----------
    const [listado, setListado] = useState<GestionListado | null>(null);
    const [cargando, setCargando] = useState(true);
    const [errorListado, setErrorListado] = useState("");

    const cargar = useCallback(async () => {
        setCargando(true);
        setErrorListado("");
        try {
            setListado(await getGestionReservas());
        } catch (err) {
            setErrorListado(toApiError(err).detail);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // ---------- Formulario ----------
    const [tipo, setTipo] = useState<TipoManual>("particular");
    const [checkIn, setCheckIn] = useState(initialFrom ?? today);
    const [checkOut, setCheckOut] = useState(initialTo ? addDays(initialTo, 1) : addDays(initialFrom ?? today, 3));
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [telefono, setTelefono] = useState("");
    const [huespedes, setHuespedes] = useState("2");
    const [precio, setPrecio] = useState("");
    const [notas, setNotas] = useState("");
    const [quitarCierre, setQuitarCierre] = useState(true);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<ReservaManualPreview | null>(null);
    const [revisando, setRevisando] = useState(false);
    const [mensaje, setMensaje] = useState<Mensaje>(null);

    // ---------- Firma ----------
    const [firmando, setFirmando] = useState<"crear" | "cancelar" | null>(null);
    const [cancelando, setCancelando] = useState<CancelState | null>(null);
    const [reintentando, setReintentando] = useState<string | null>(null);

    const touch = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPreview(null);
        setMensaje(null);
    };

    const request: ReservaManualRequest = {
        tipo,
        checkIn,
        checkOut,
        nombre,
        notas,
        quitarCierre,
        ...(tipo === "particular" ? { email, telefono, huespedes, precio } : {}),
    };

    const noches = checkOut > checkIn ? diasEntre(checkIn, checkOut) : 0;

    const handleRevisar = async () => {
        setRevisando(true);
        setMensaje(null);
        try {
            const result = await previewReservaManual(request);
            setErrors({});
            if (result.conflictos.length) {
                setPreview(null);
                const lista = result.conflictos
                    .map((c) => `${c.origen}${c.nombre ? ` (${c.nombre})` : ""}: ${formatDate(c.checkIn)} → ${formatDate(c.checkOut)}`)
                    .join(" · ");
                setMensaje({ tone: "error", text: `Esas fechas ya están reservadas. ${lista}` });
            } else {
                setPreview(result);
            }
        } catch (err) {
            const e = toApiError(err);
            setErrors(e.errors ?? {});
            setMensaje({ tone: "error", text: e.detail });
        } finally {
            setRevisando(false);
        }
    };

    const resultadoFirma = (err: unknown) => {
        const e = toApiError(err);
        if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
        if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
        setFirmando(null);
        return e;
    };

    const handleFirmarCrear = async (pin: string) => {
        try {
            const r = await crearReservaManual(request, pin);
            setFirmando(null);
            setPreview(null);
            setNombre("");
            setEmail("");
            setTelefono("");
            setPrecio("");
            setNotas("");
            const que = r.tipo === "uso_propio" ? "El uso propio" : "La reserva particular";
            setMensaje({
                tone: r.aviso ? "warn" : "ok",
                text:
                    r.aviso ??
                    `${que} se ha creado en Beds24 (nº ${r.bookingId}). Booking y Airbnb bloquean esas fechas en unos minutos.`,
            });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setErrors(r.errors ?? {});
            setPreview(null);
            setMensaje({ tone: "error", text: r.detail });
            return null;
        }
    };

    const handleFirmarCancelar = async (pin: string) => {
        if (!cancelando) return null;
        const { item, reembolso, importe, motivo } = cancelando;
        try {
            const r = await cancelarReserva(
                item.beds24Id,
                item.web ? { reembolso, importe: reembolso === "parcial" ? importe : undefined, motivo } : { motivo },
                pin
            );
            setFirmando(null);
            setCancelando(null);
            const devuelto = r.reembolsoCentimos ? ` Reembolso de ${euros(r.reembolsoCentimos / 100)} (llega a la tarjeta en 5-10 días).` : "";
            setMensaje({ tone: "ok", text: `Reserva cancelada: las fechas vuelven a estar libres en todos los canales.${devuelto}` });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setMensaje({ tone: "error", text: r.detail });
            return null;
        }
    };

    const handleReintentar = async (id: string) => {
        setReintentando(id);
        setMensaje(null);
        try {
            const r = await reintentarBeds24(id);
            setMensaje(
                r.estado === "conflicto"
                    ? { tone: "warn", text: "Esas fechas ya estaban ocupadas: se ha devuelto el pago completo al cliente." }
                    : { tone: "ok", text: "La reserva ya está en Beds24." }
            );
            cargar();
        } catch (err) {
            setMensaje({ tone: "error", text: toApiError(err).detail });
        } finally {
            setReintentando(null);
        }
    };

    // ---------- Textos de la firma ----------
    const lineasCrear = preview
        ? [
              preview.datos.tipo === "uso_propio" ? "Uso propio" : `Reserva particular: ${preview.datos.nombre}`,
              `Del ${formatDate(preview.datos.checkIn)} al ${formatDate(preview.datos.checkOut)} (${nochesTxt(preview.datos.noches)})`,
              ...(preview.datos.tipo === "particular"
                  ? [`${preview.datos.huespedes} huéspedes · ${euros(preview.datos.precio)} en total`]
                  : []),
              ...(preview.cierres.length && quitarCierre
                  ? [`Se quita el cierre manual de ${preview.cierres.length === 1 ? "1 noche" : `${preview.cierres.length} noches`}`]
                  : []),
          ]
        : [];

    const maxReembolso = cancelando?.item.web
        ? (cancelando.item.web.totalCentimos - cancelando.item.web.reembolsadoCentimos) / 100
        : 0;
    const lineasCancelar = cancelando
        ? [
              `${TIPO_LABEL[cancelando.item.tipo]}${cancelando.item.nombre ? `: ${cancelando.item.nombre}` : ""}`,
              `Del ${formatDate(cancelando.item.checkIn)} al ${formatDate(cancelando.item.checkOut)}`,
              ...(cancelando.item.web
                  ? [
                        cancelando.reembolso === "total"
                            ? `Reembolso total: ${euros(maxReembolso)}`
                            : cancelando.reembolso === "parcial"
                              ? `Reembolso parcial: ${cancelando.importe} €`
                              : "Sin reembolso",
                    ]
                  : []),
              "Las fechas vuelven a quedar libres en la web, Booking y Airbnb",
          ]
        : [];

    const maxHuespedes = listado?.limites.maxHuespedes ?? 6;
    const reservas = listado?.reservas ?? [];
    const pendientes = listado?.pendientes ?? [];

    return (
        <div className="gr">
            <p className="cq-intro">
                Si alquilas la casa por tu cuenta o la vas a usar tú, créalo aquí como una reserva: aparece con nombre y
                precio en el calendario, bloquea Booking y Airbnb, y si la cancelas las fechas se abren solas.
            </p>

            {/* ---------- Nueva reserva ---------- */}
            <fieldset className="cq-fieldset">
                <legend className="cq-legend">Nueva reserva</legend>

                <div className="cq-segment" role="radiogroup" aria-label="Tipo de reserva">
                    {(
                        [
                            ["particular", "Reserva particular"],
                            ["uso_propio", "Uso propio"],
                        ] as const
                    ).map(([valor, label]) => (
                        <button
                            key={valor}
                            type="button"
                            role="radio"
                            aria-checked={tipo === valor}
                            className={`cq-segment-btn ${tipo === valor ? "cq-segment-btn--on" : ""}`}
                            onClick={() => touch(setTipo)(valor)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <p className="cq-help">
                    {tipo === "particular"
                        ? "Para clientes que te contratan directamente (teléfono, WhatsApp, conocidos)."
                        : "Para los días en que la casa la usas tú o tu familia. No lleva precio."}
                </p>

                <div className="cq-grid">
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="gr-in">Llegada</label>
                        <input id="gr-in" className="cq-input" type="date" min={today} value={checkIn}
                            onChange={(e) => touch(setCheckIn)(e.target.value)} aria-invalid={!!errors.checkIn} />
                        {errors.checkIn && <p className="cq-field-error">{errors.checkIn}</p>}
                    </div>
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="gr-out">Salida</label>
                        <input id="gr-out" className="cq-input" type="date" min={addDays(checkIn || today, 1)} value={checkOut}
                            onChange={(e) => touch(setCheckOut)(e.target.value)} aria-invalid={!!errors.checkOut} />
                        {errors.checkOut && <p className="cq-field-error">{errors.checkOut}</p>}
                    </div>
                </div>
                {noches > 0 && <p className="cq-help">{nochesTxt(noches)}. El día de salida queda libre para otra llegada.</p>}

                {tipo === "particular" ? (
                    <>
                        <div className="cq-field cq-field--wide">
                            <label className="cq-label" htmlFor="gr-nombre">Nombre del cliente</label>
                            <input id="gr-nombre" className="cq-input" type="text" value={nombre} maxLength={120}
                                onChange={(e) => touch(setNombre)(e.target.value)} aria-invalid={!!errors.nombre} />
                            {errors.nombre && <p className="cq-field-error">{errors.nombre}</p>}
                        </div>

                        <div className="cq-grid">
                            <div className="cq-field">
                                <label className="cq-label" htmlFor="gr-precio">Precio total de la estancia</label>
                                <div className="cq-input-wrap">
                                    <input id="gr-precio" className="cq-input" type="text" inputMode="decimal" value={precio}
                                        placeholder="900" onChange={(e) => touch(setPrecio)(e.target.value)} aria-invalid={!!errors.precio} />
                                    <span className="cq-unit">€</span>
                                </div>
                                {errors.precio && <p className="cq-field-error">{errors.precio}</p>}
                            </div>
                            <div className="cq-field">
                                <label className="cq-label" htmlFor="gr-huespedes">Huéspedes</label>
                                <select id="gr-huespedes" className="cq-input" value={huespedes}
                                    onChange={(e) => touch(setHuespedes)(e.target.value)} aria-invalid={!!errors.huespedes}>
                                    {Array.from({ length: maxHuespedes }, (_, i) => String(i + 1)).map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                {errors.huespedes && <p className="cq-field-error">{errors.huespedes}</p>}
                            </div>
                        </div>

                        <div className="cq-grid">
                            <div className="cq-field">
                                <label className="cq-label" htmlFor="gr-tel">Teléfono (opcional)</label>
                                <input id="gr-tel" className="cq-input" type="tel" value={telefono}
                                    onChange={(e) => touch(setTelefono)(e.target.value)} aria-invalid={!!errors.telefono} />
                                {errors.telefono && <p className="cq-field-error">{errors.telefono}</p>}
                            </div>
                            <div className="cq-field">
                                <label className="cq-label" htmlFor="gr-email">Correo (opcional)</label>
                                <input id="gr-email" className="cq-input" type="email" value={email}
                                    onChange={(e) => touch(setEmail)(e.target.value)} aria-invalid={!!errors.email} />
                                {errors.email && <p className="cq-field-error">{errors.email}</p>}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="cq-field cq-field--wide">
                        <label className="cq-label" htmlFor="gr-nombre-uso">Nombre (opcional)</label>
                        <input id="gr-nombre-uso" className="cq-input" type="text" value={nombre} maxLength={120}
                            placeholder="Uso propio" onChange={(e) => touch(setNombre)(e.target.value)} />
                    </div>
                )}

                <div className="cq-field cq-field--wide">
                    <label className="cq-label" htmlFor="gr-notas">Notas internas (opcional)</label>
                    <textarea id="gr-notas" className="cq-input gr-textarea" rows={2} maxLength={500} value={notas}
                        onChange={(e) => touch(setNotas)(e.target.value)} />
                </div>

                <label className="cq-check">
                    <input type="checkbox" checked={quitarCierre} onChange={(e) => touch(setQuitarCierre)(e.target.checked)} />
                    Si esas fechas estaban cerradas a mano, quitar el cierre (la reserva ya las bloquea)
                </label>
            </fieldset>

            {mensaje && (
                <p className={`cq-message cq-message--${mensaje.tone}`} role={mensaje.tone === "error" ? "alert" : "status"}>
                    {mensaje.text}
                </p>
            )}

            {preview && (
                <div className="cq-review">
                    <h3 className="cq-review-title">Se va a crear</h3>
                    <ul className="gr-resumen">
                        {lineasCrear.map((l) => <li key={l}>{l}</li>)}
                    </ul>
                    {preview.cierres.length > 0 && !quitarCierre && (
                        <p className="cq-message cq-message--warn">
                            Esas fechas tienen un cierre manual. Si luego cancelas la reserva, seguirán cerradas hasta que las abras.
                        </p>
                    )}
                </div>
            )}

            <div className="cq-actions">
                {preview ? (
                    <button type="button" className="cq-btn" onClick={() => setFirmando("crear")}>Firmar y crear</button>
                ) : (
                    <button type="button" className="cq-btn" onClick={handleRevisar} disabled={revisando || noches < 1}>
                        {revisando ? "Comprobando…" : "Comprobar fechas"}
                    </button>
                )}
            </div>

            {/* ---------- Pagos web sin pasar a Beds24 ---------- */}
            {pendientes.length > 0 && (
                <section className="gr-block">
                    <h3 className="cq-review-title">Pagos web que no llegaron a Beds24</h3>
                    <p className="cq-message cq-message--warn">
                        Están cobrados pero todavía no bloquean Booking ni Airbnb. Se reintenta solo; si sigue aquí, pulsa «Reintentar».
                    </p>
                    <ul className="gr-lista">
                        {pendientes.map((p) => (
                            <li key={p.id} className="gr-fila">
                                <div className="gr-fila-info">
                                    <span className="gr-fechas">{formatDate(p.checkIn)} → {formatDate(p.checkOut)}</span>
                                    <span className="gr-detalle">{p.codigo} · {p.nombre} · {euros(p.total)}</span>
                                    {p.error && <span className="gr-detalle gr-detalle--error">{p.error}</span>}
                                </div>
                                <button type="button" className="cq-link" disabled={reintentando === p.id} onClick={() => handleReintentar(p.id)}>
                                    {reintentando === p.id ? "Reintentando…" : "Reintentar"}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ---------- Próximas reservas cancelables ---------- */}
            <section className="gr-block">
                <div className="gr-block-header">
                    <h3 className="cq-review-title">Próximas reservas que puedes cancelar aquí</h3>
                    <button type="button" className="cq-link" onClick={cargar} disabled={cargando}>
                        {cargando ? "Cargando…" : "Actualizar"}
                    </button>
                </div>
                <p className="cq-help">Web, particulares y usos propios. Las de Airbnb y Booking se cancelan en cada plataforma.</p>

                {errorListado && <p className="cq-message cq-message--error">{errorListado}</p>}
                {!cargando && !errorListado && reservas.length === 0 && <p className="cq-help">No hay reservas próximas.</p>}

                <ul className="gr-lista">
                    {reservas.map((r) => {
                        const abierta = cancelando?.item.beds24Id === r.beds24Id;
                        const importe = r.web ? r.web.totalCentimos / 100 : r.precio;
                        return (
                            <li key={r.beds24Id} className={`gr-fila ${abierta ? "gr-fila--abierta" : ""}`}>
                                <div className="gr-fila-info">
                                    <span className={`gr-badge gr-badge--${r.tipo}`}>{TIPO_LABEL[r.tipo]}</span>
                                    <span className="gr-fechas">
                                        {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {nochesTxt(r.noches)}
                                    </span>
                                    <span className="gr-detalle">
                                        {[r.nombre, r.web?.codigo, r.tipo !== "owner" && importe != null ? euros(importe) : null]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                </div>
                                {!abierta && (
                                    <button type="button" className="cq-link gr-cancelar"
                                        onClick={() => setCancelando({ item: r, reembolso: "total", importe: "", motivo: "" })}>
                                        Cancelar
                                    </button>
                                )}

                                {abierta && cancelando && (
                                    <div className="gr-cancel">
                                        {r.web && (
                                            <>
                                                <div className="cq-segment" role="radiogroup" aria-label="Reembolso">
                                                    {(
                                                        [
                                                            ["total", `Devolver todo (${euros(maxReembolso)})`],
                                                            ["parcial", "Devolver una parte"],
                                                            ["ninguno", "Sin reembolso"],
                                                        ] as const
                                                    ).map(([valor, label]) => (
                                                        <button key={valor} type="button" role="radio" aria-checked={cancelando.reembolso === valor}
                                                            className={`cq-segment-btn ${cancelando.reembolso === valor ? "cq-segment-btn--on" : ""}`}
                                                            onClick={() => setCancelando({ ...cancelando, reembolso: valor })}>
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {cancelando.reembolso === "parcial" && (
                                                    <div className="cq-input-wrap cq-input-wrap--short">
                                                        <input className="cq-input" type="text" inputMode="decimal" aria-label="Importe a devolver"
                                                            value={cancelando.importe}
                                                            onChange={(e) => setCancelando({ ...cancelando, importe: e.target.value })} />
                                                        <span className="cq-unit">€</span>
                                                    </div>
                                                )}
                                                <p className="cq-help">El reembolso vuelve a la tarjeta del cliente en 5-10 días. Revisa tus condiciones de cancelación.</p>
                                            </>
                                        )}
                                        <input className="cq-input" type="text" maxLength={300} placeholder="Motivo (opcional)"
                                            aria-label="Motivo de la cancelación" value={cancelando.motivo}
                                            onChange={(e) => setCancelando({ ...cancelando, motivo: e.target.value })} />
                                        <div className="gr-cancel-actions">
                                            <button type="button" className="cq-btn" onClick={() => setFirmando("cancelar")}
                                                disabled={cancelando.reembolso === "parcial" && !cancelando.importe.trim()}>
                                                Firmar y cancelar
                                            </button>
                                            <button type="button" className="cq-link" onClick={() => setCancelando(null)}>No cancelar</button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            <SignModal
                open={firmando === "crear"}
                title={tipo === "uso_propio" ? "Firmar uso propio" : "Firmar reserva particular"}
                lines={lineasCrear}
                onSign={handleFirmarCrear}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "cancelar"}
                title="Firmar cancelación"
                lines={lineasCancelar}
                onSign={handleFirmarCancelar}
                onClose={() => setFirmando(null)}
            />
        </div>
    );
}