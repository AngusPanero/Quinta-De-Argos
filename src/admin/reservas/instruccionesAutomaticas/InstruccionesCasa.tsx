import { useCallback, useEffect, useRef, useState } from "react";
import SignModal from "../config/SignModal";
import { toApiError } from "../config/configApi";
import { formatDate } from "../config/configUtils";
import {
    borrarPdfInstrucciones,
    enviarInstruccionesAhora,
    enviarPruebaInstrucciones,
    getInstrucciones,
    guardarInstrucciones,
    subirPdfInstrucciones,
    verPdfInstrucciones,
    type EnvioProximo,
    type EstadoEnvio,
    type InstruccionesConfig,
    type InstruccionesListado,
    type InstruccionesRequest,
} from "./instruccionesCasaApi";
import "./instruccionesCasa.css";

/**
 * InstruccionesCasa
 * ---------------------------------------------------------
 * Configuración → «Instrucciones de la casa».
 *
 * Envío automático, antes de cada llegada, de un correo con el PDF de
 * instrucciones a las reservas web pagadas.
 *   Hora de envío = día de llegada a la hora del check-in − «horas antes».
 *   (check-in 15:00 y 5 horas antes -> sale a las 10:00 del día de llegada)
 *
 * Todo se guarda en el servidor; guardar, cambiar el PDF y enviar a mano
 * piden la clave de firma.
 */

type Mensaje = { tone: "ok" | "error" | "warn"; text: string } | null;
type Firma = "config" | "pdf" | "borrarPdf" | "enviar" | null;

const ESTADO_LABEL: Record<EstadoEnvio, string> = {
    programado: "Programado",
    en_cola: "Sale en unos minutos",
    enviando: "Enviando",
    enviado: "Enviado",
    error: "Error",
    sin_email: "Sin correo",
    sin_pdf: "Falta el PDF",
    inactivo: "Envío desactivado",
    vencido: "No enviado",
};

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);
const fechaHora = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "";

const aFormulario = (c: InstruccionesConfig): InstruccionesRequest => ({
    activo: c.activo,
    horasAntes: String(c.horasAntes),
    horaCheckIn: c.horaCheckIn,
    asunto: c.asunto,
    mensaje: c.mensaje,
    ubicacionUrl: c.ubicacionUrl,
});

/** «a las 10:00 del día de llegada» / «a las 20:00 del día anterior» / «a las 15:00, 3 días antes». */
function textoHoraEnvio(horaCheckIn: string, horasTexto: string): string | null {
    const m = /^(\d{2}):(\d{2})$/.exec(horaCheckIn);
    const horas = Number(horasTexto);
    if (!m || horasTexto.trim() === "" || !Number.isInteger(horas) || horas < 0) return null;
    const minutos = Number(m[1]) * 60 + Number(m[2]) - horas * 60;
    const diasAntes = minutos >= 0 ? 0 : Math.ceil(-minutos / 1440);
    const delDia = minutos + diasAntes * 1440;
    const hora = `${String(Math.floor(delDia / 60)).padStart(2, "0")}:${String(delDia % 60).padStart(2, "0")}`;
    if (diasAntes === 0) return `a las ${hora} del día de llegada`;
    if (diasAntes === 1) return `a las ${hora} del día anterior a la llegada`;
    return `a las ${hora}, ${diasAntes} días antes de la llegada`;
}

export default function InstruccionesCasa() {
    const [datos, setDatos] = useState<InstruccionesListado | null>(null);
    const [form, setForm] = useState<InstruccionesRequest | null>(null);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [mensaje, setMensaje] = useState<Mensaje>(null);

    const [firmando, setFirmando] = useState<Firma>(null);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [envioManual, setEnvioManual] = useState<EnvioProximo | null>(null);
    const [emailPrueba, setEmailPrueba] = useState("");
    const [enviandoPrueba, setEnviandoPrueba] = useState(false);
    const [abriendoPdf, setAbriendoPdf] = useState(false);
    const inputPdf = useRef<HTMLInputElement>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setErrorCarga("");
        try {
            const d = await getInstrucciones();
            setDatos(d);
            setForm(aFormulario(d.config));
        } catch (err) {
            setErrorCarga(toApiError(err).detail);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const config = datos?.config ?? null;
    const cambiado = !!(config && form && JSON.stringify(aFormulario(config)) !== JSON.stringify(form));
    const horaEnvio = form ? textoHoraEnvio(form.horaCheckIn, form.horasAntes) : null;

    const editar = <K extends keyof InstruccionesRequest>(campo: K, valor: InstruccionesRequest[K]) => {
        if (!form) return;
        setForm({ ...form, [campo]: valor });
        setErrors((e) => ({ ...e, [campo]: "" }));
        setMensaje(null);
    };

    // ---------- Firma ----------
    const resultadoFirma = (err: unknown) => {
        const e = toApiError(err);
        if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
        if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
        setFirmando(null);
        return e;
    };

    const conConfigNueva = (c: InstruccionesConfig) => {
        setDatos((d) => (d ? { ...d, config: c } : d));
        setForm(aFormulario(c));
    };

    const handleFirmarConfig = async (pin: string) => {
        if (!form) return null;
        try {
            const r = await guardarInstrucciones(form, pin);
            setFirmando(null);
            setErrors({});
            conConfigNueva(r.config);
            setMensaje({
                tone: "ok",
                text: r.config.activo
                    ? `Guardado. El correo con el PDF sale solo ${textoHoraEnvio(r.config.horaCheckIn, String(r.config.horasAntes)) ?? ""}.`
                    : "Guardado. El envío automático está desactivado.",
            });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setErrors(r.errors ?? {});
            setMensaje({ tone: "error", text: r.detail });
            return null;
        }
    };

    const handleFirmarPdf = async (pin: string) => {
        if (!archivo) return null;
        try {
            const r = await subirPdfInstrucciones(archivo, pin);
            setFirmando(null);
            setArchivo(null);
            if (inputPdf.current) inputPdf.current.value = "";
            conConfigNueva(r.config);
            setMensaje({
                tone: "ok",
                text: r.config.activo
                    ? "PDF guardado. Los próximos correos ya llevan este archivo."
                    : "PDF guardado. Activa el envío automático y guarda para que empiece a enviarse.",
            });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setMensaje({ tone: "error", text: r.detail });
            return null;
        }
    };

    const handleFirmarBorrarPdf = async (pin: string) => {
        try {
            const r = await borrarPdfInstrucciones(pin);
            setFirmando(null);
            conConfigNueva(r.config);
            setMensaje({ tone: "warn", text: "PDF quitado. El envío automático queda desactivado hasta que subas otro." });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setMensaje({ tone: "error", text: r.detail });
            return null;
        }
    };

    const handleFirmarEnvio = async (pin: string) => {
        if (!envioManual) return null;
        try {
            const r = await enviarInstruccionesAhora(envioManual.id, pin);
            setFirmando(null);
            setEnvioManual(null);
            setMensaje({ tone: "ok", text: `Instrucciones enviadas a ${r.email} (reserva ${r.codigo}).` });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setEnvioManual(null);
            setMensaje({ tone: "error", text: r.detail });
            cargar();
            return null;
        }
    };

    // ---------- Sin firma ----------
    const elegirPdf = (f: File | null) => {
        setMensaje(null);
        if (!f) return setArchivo(null);
        const maxMb = datos?.limites.maxPdfMb ?? 5;
        if (f.type !== "application/pdf") {
            setMensaje({ tone: "error", text: "El archivo tiene que ser un PDF." });
            if (inputPdf.current) inputPdf.current.value = "";
            return;
        }
        if (f.size > maxMb * 1024 * 1024) {
            setMensaje({ tone: "error", text: `El PDF pesa demasiado (máximo ${maxMb} MB).` });
            if (inputPdf.current) inputPdf.current.value = "";
            return;
        }
        setArchivo(f);
    };

    const verPdf = async () => {
        setAbriendoPdf(true);
        const ventana = window.open("", "_blank"); // se abre ya para que el navegador no la bloquee
        try {
            const blob = await verPdfInstrucciones();
            const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            if (ventana) ventana.location.href = url;
            else window.location.href = url;
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (err) {
            ventana?.close();
            setMensaje({ tone: "error", text: toApiError(err).detail });
        } finally {
            setAbriendoPdf(false);
        }
    };

    const enviarPrueba = async () => {
        setEnviandoPrueba(true);
        setMensaje(null);
        try {
            const r = await enviarPruebaInstrucciones(emailPrueba.trim() || undefined);
            setMensaje({ tone: "ok", text: `Correo de prueba enviado a ${r.email}. Revisa también la carpeta de spam.` });
        } catch (err) {
            const e = toApiError(err);
            setErrors((x) => ({ ...x, ...(e.errors ?? {}) }));
            setMensaje({ tone: "error", text: e.detail });
        } finally {
            setEnviandoPrueba(false);
        }
    };

    // ---------- Textos de la firma ----------
    const lineasConfig = form
        ? [
              form.activo ? "Envío automático: activado" : "Envío automático: desactivado",
              `Check-in: ${form.horaCheckIn} h · ${form.horasAntes} ${form.horasAntes === "1" ? "hora" : "horas"} antes`,
              ...(horaEnvio ? [`El correo sale ${horaEnvio}`] : []),
          ]
        : [];

    if (cargando && !datos) return <p className="cq-help">Cargando…</p>;
    if (errorCarga && !datos) {
        return (
            <div className="ic">
                <p className="cq-message cq-message--error">{errorCarga}</p>
                <button type="button" className="cq-link" onClick={cargar}>Reintentar</button>
            </div>
        );
    }
    if (!datos || !form || !config) return null;

    return (
        <div className="ic">
            <p className="cq-intro">
                Antes de cada llegada, el huésped recibe un correo con las instrucciones de la casa en PDF. Se envía solo a las
                reservas web pagadas, una vez por reserva.
            </p>

            {!datos.automatico && (
                <p className="cq-message cq-message--warn">
                    Este servidor tiene el envío automático apagado (INSTRUCCIONES_AUTO=off). Los correos los envía el otro
                    servidor; desde aquí solo puedes enviar a mano.
                </p>
            )}

            {/* ---------- PDF ---------- */}
            <fieldset className="cq-fieldset">
                <legend className="cq-legend">PDF de instrucciones</legend>

                {config.pdf ? (
                    <div className="ic-pdf">
                        <span className="ic-pdf-icono" aria-hidden="true">PDF</span>
                        <div className="ic-pdf-info">
                            <span className="ic-pdf-nombre">{config.pdf.nombre}</span>
                            <span className="ic-detalle">
                                {kb(config.pdf.tamano)} · subido el {fechaHora(config.pdf.subidoEn)}
                                {config.pdf.subidoPor ? ` por ${config.pdf.subidoPor}` : ""}
                            </span>
                        </div>
                        <div className="ic-pdf-acciones">
                            <button type="button" className="cq-link" onClick={verPdf} disabled={abriendoPdf}>
                                {abriendoPdf ? "Abriendo…" : "Ver"}
                            </button>
                            <button type="button" className="cq-link" onClick={() => setFirmando("borrarPdf")}>Quitar</button>
                        </div>
                    </div>
                ) : (
                    <p className="cq-message cq-message--warn">Todavía no hay PDF. Súbelo para poder activar el envío.</p>
                )}

                <div className="ic-subida">
                    <input
                        ref={inputPdf}
                        id="ic-pdf"
                        className="ic-file"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => elegirPdf(e.target.files?.[0] ?? null)}
                    />
                    <label htmlFor="ic-pdf" className="cq-btn ic-btn-sec ic-file-label">
                        {config.pdf ? "Reemplazar PDF" : "Elegir PDF"}
                    </label>
                    {archivo && (
                        <>
                            <span className="ic-detalle">{archivo.name} · {kb(archivo.size)}</span>
                            <button type="button" className="cq-btn" onClick={() => setFirmando("pdf")}>Firmar y subir</button>
                        </>
                    )}
                </div>
                <p className="cq-help">Máximo {datos.limites.maxPdfMb} MB. Es el archivo que va adjunto al correo.</p>
            </fieldset>

            {/* ---------- Envío ---------- */}
            <fieldset className="cq-fieldset">
                <legend className="cq-legend">Cuándo se envía</legend>

                <label className="cq-check">
                    <input type="checkbox" checked={form.activo} disabled={!config.pdf}
                        onChange={(e) => editar("activo", e.target.checked)} />
                    Enviar automáticamente las instrucciones antes de cada llegada
                </label>
                {errors.activo && <p className="cq-field-error">{errors.activo}</p>}

                <div className="cq-grid">
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="ic-checkin">Hora del check-in</label>
                        <input id="ic-checkin" className="cq-input" type="time" value={form.horaCheckIn}
                            onChange={(e) => editar("horaCheckIn", e.target.value)} aria-invalid={!!errors.horaCheckIn} />
                        {errors.horaCheckIn && <p className="cq-field-error">{errors.horaCheckIn}</p>}
                    </div>
                    <div className="cq-field">
                        <label className="cq-label" htmlFor="ic-horas">Horas antes del check-in</label>
                        <div className="cq-input-wrap">
                            <input id="ic-horas" className="cq-input" type="number" inputMode="numeric" min={0}
                                max={datos.limites.maxHorasAntes} step={1} value={form.horasAntes}
                                onChange={(e) => editar("horasAntes", e.target.value)} aria-invalid={!!errors.horasAntes} />
                            <span className="cq-unit">h</span>
                        </div>
                        {errors.horasAntes && <p className="cq-field-error">{errors.horasAntes}</p>}
                    </div>
                </div>

                <p className={`ic-resumen ${form.activo ? "ic-resumen--on" : ""}`}>
                    {horaEnvio
                        ? <>El correo sale <strong>{horaEnvio}</strong> (hora de España).</>
                        : "Revisa la hora y las horas antes."}
                    {" "}Si alguien reserva cuando ya pasó esa hora, se le envía en unos minutos.
                </p>
            </fieldset>

            {/* ---------- Contenido ---------- */}
            <fieldset className="cq-fieldset">
                <legend className="cq-legend">Contenido del correo</legend>

                <div className="cq-field cq-field--wide">
                    <label className="cq-label" htmlFor="ic-asunto">Asunto (opcional)</label>
                    <input id="ic-asunto" className="cq-input" type="text" maxLength={150} value={form.asunto}
                        placeholder="Instrucciones para tu llegada a Quinta de Argos · reserva QA-…"
                        onChange={(e) => editar("asunto", e.target.value)} aria-invalid={!!errors.asunto} />
                    {errors.asunto && <p className="cq-field-error">{errors.asunto}</p>}
                </div>

                <div className="cq-field cq-field--wide">
                    <label className="cq-label" htmlFor="ic-mensaje">Mensaje (opcional)</label>
                    <textarea id="ic-mensaje" className="cq-input ic-textarea" rows={5} maxLength={3000} value={form.mensaje}
                        placeholder="Ej.: El código de la puerta es 1234. La llave del portón está en la caja junto al buzón."
                        onChange={(e) => editar("mensaje", e.target.value)} aria-invalid={!!errors.mensaje} />
                    <p className="cq-help">Va en el cuerpo del correo, encima de los datos de la reserva. {form.mensaje.length}/3000</p>
                    {errors.mensaje && <p className="cq-field-error">{errors.mensaje}</p>}
                </div>

                <div className="cq-field cq-field--wide">
                    <label className="cq-label" htmlFor="ic-ubicacion">Enlace de Google Maps (opcional)</label>
                    <input id="ic-ubicacion" className="cq-input" type="url" maxLength={500} value={form.ubicacionUrl}
                        placeholder="https://maps.app.goo.gl/…"
                        onChange={(e) => editar("ubicacionUrl", e.target.value)} aria-invalid={!!errors.ubicacionUrl} />
                    <p className="cq-help">Si lo pones, el correo lleva un botón «Cómo llegar».</p>
                    {errors.ubicacionUrl && <p className="cq-field-error">{errors.ubicacionUrl}</p>}
                </div>
            </fieldset>

            {mensaje && (
                <p className={`cq-message cq-message--${mensaje.tone}`} role={mensaje.tone === "error" ? "alert" : "status"}>
                    {mensaje.text}
                </p>
            )}

            <div className="cq-actions">
                <button type="button" className="cq-btn" onClick={() => setFirmando("config")} disabled={!cambiado}>
                    Firmar y guardar
                </button>
                {cambiado && (
                    <button type="button" className="cq-link" onClick={() => { setForm(aFormulario(config)); setErrors({}); }}>
                        Descartar cambios
                    </button>
                )}
            </div>

            {/* ---------- Prueba ---------- */}
            <section className="ic-block">
                <h3 className="cq-review-title">Correo de prueba</h3>
                <p className="cq-help">
                    Envía el correo con datos de ejemplo para ver cómo queda (usa lo que está guardado, no los cambios sin guardar).
                    Si no escribes ningún correo, se envía al tuyo.
                </p>
                <div className="ic-prueba">
                    <input className="cq-input" type="email" placeholder="correo@ejemplo.com (opcional)" value={emailPrueba}
                        onChange={(e) => { setEmailPrueba(e.target.value); setErrors((x) => ({ ...x, email: "" })); }}
                        aria-label="Correo para la prueba" aria-invalid={!!errors.email} />
                    <button type="button" className="cq-btn ic-btn-sec" onClick={enviarPrueba} disabled={enviandoPrueba || !config.pdf}>
                        {enviandoPrueba ? "Enviando…" : "Enviar prueba"}
                    </button>
                </div>
                {errors.email && <p className="cq-field-error">{errors.email}</p>}
            </section>

            {/* ---------- Próximas llegadas ---------- */}
            <section className="ic-block">
                <div className="ic-block-header">
                    <h3 className="cq-review-title">Próximas llegadas (30 días)</h3>
                    <button type="button" className="cq-link" onClick={cargar} disabled={cargando}>
                        {cargando ? "Cargando…" : "Actualizar"}
                    </button>
                </div>

                {datos.proximos.length === 0 && <p className="cq-help">No hay reservas web en los próximos 30 días.</p>}

                <ul className="ic-lista">
                    {datos.proximos.map((p) => (
                        <li key={`${p.id}-${p.checkIn}`} className="ic-fila">
                            <div className="ic-fila-info">
                                <span className={`ic-estado ic-estado--${p.estado}`}>{ESTADO_LABEL[p.estado]}</span>
                                <span className="ic-fechas">Llega el {formatDate(p.checkIn)}</span>
                                <span className="ic-detalle">
                                    {[p.nombre, p.codigo, p.email].filter(Boolean).join(" · ")}
                                </span>
                                <span className="ic-detalle">
                                    {p.estado === "enviado"
                                        ? `Enviado el ${fechaHora(p.enviadoEn)}`
                                        : p.estado === "error"
                                          ? `Falló ${p.intentos} veces: ${p.error}`
                                          : `Envío: ${p.envioTexto}`}
                                </span>
                            </div>
                            {config.pdf && p.email && (
                                <button type="button" className="cq-link ic-accion"
                                    onClick={() => { setEnvioManual(p); setFirmando("enviar"); }}>
                                    {p.estado === "enviado" ? "Reenviar" : "Enviar ahora"}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            {/* ---------- Últimos envíos ---------- */}
            {datos.ultimos.length > 0 && (
                <section className="ic-block">
                    <h3 className="cq-review-title">Últimos envíos</h3>
                    <ul className="ic-lista">
                        {datos.ultimos.map((u) => (
                            <li key={u.id} className="ic-fila">
                                <div className="ic-fila-info">
                                    <span className={`ic-estado ic-estado--${u.estado}`}>{u.estado === "enviado" ? "Enviado" : "Error"}</span>
                                    <span className="ic-fechas">{u.codigo} · llegada {formatDate(u.checkIn)}</span>
                                    <span className="ic-detalle">
                                        {[u.email, fechaHora(u.enviadoEn ?? u.fecha), u.manual ? `a mano por ${u.por}` : "automático"]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                    {u.error && <span className="ic-detalle ic-detalle--error">{u.error}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <SignModal
                open={firmando === "config"}
                title="Firmar instrucciones de la casa"
                lines={lineasConfig}
                onSign={handleFirmarConfig}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "pdf"}
                title="Firmar nuevo PDF"
                lines={archivo ? [`Archivo: ${archivo.name} (${kb(archivo.size)})`, "Se adjunta a todos los correos desde ahora"] : []}
                onSign={handleFirmarPdf}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "borrarPdf"}
                title="Firmar quitar PDF"
                lines={[`Se quita ${config.pdf?.nombre ?? "el PDF"}`, "El envío automático queda desactivado"]}
                onSign={handleFirmarBorrarPdf}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "enviar"}
                title="Firmar envío de instrucciones"
                lines={
                    envioManual
                        ? [
                              `${envioManual.nombre} (${envioManual.codigo})`,
                              `Llegada el ${formatDate(envioManual.checkIn)}`,
                              `Se envía ahora a ${envioManual.email}`,
                              ...(envioManual.estado === "enviado" ? ["Ya se le había enviado: es un reenvío"] : []),
                          ]
                        : []
                }
                onSign={handleFirmarEnvio}
                onClose={() => { setFirmando(null); setEnvioManual(null); }}
            />
        </div>
    );
}