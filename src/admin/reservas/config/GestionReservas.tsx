import { useCallback, useEffect, useState } from "react";
import SignModal from "./SignModal";
import { toApiError } from "./configApi";
import { addDays, formatDate } from "./configUtils";
import {
    cancelarReserva,
    crearReservaManual,
    devolverFianza,
    editarReserva,
    getFianzas,
    getGestionReservas,
    liberarNoches,
    modificarReserva,
    previewEdicion,
    previewModificacion,
    previewReservaManual,
    reintentarBeds24,
    type Bloqueo,
    type EdicionPreview,
    type EdicionRequest,
    type FianzaPendiente,
    type FianzasListado,
    type GestionListado,
    type LinkPendiente,
    type MetodoCobro,
    type ModificacionPreview,
    type ReembolsoModificacion,
    type PoliticaCancelacion,
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
 *   En las web se propone el reembolso según la política de cancelación
 *   (15 días o más: 100 %; 14 días o menos: 50 % de la estancia; la fianza
 *   siempre completa). Se puede cambiar por otro importe si hay un acuerdo.
 * - Devolver la fianza de las reservas web al terminar la estancia, sin
 *   cancelar la reserva.
 * - Editar una reserva particular o un uso propio (fechas, datos del cliente,
 *   precio, notas). Es la misma reserva en Beds24, así que Airbnb y Booking se
 *   actualizan solos. Si la estancia ya empezó, solo se puede cambiar la salida.
 * - Cambiar las fechas de una reserva web (la misma reserva en Beds24, así que
 *   Airbnb y Booking se actualizan solos):
 *     · acortar  -> se sugiere devolver lo que se pagó por las noches quitadas
 *                   (o otro importe, o nada)
 *     · alargar  -> disponibilidad desde la llegada real (sin la antelación de la web);
 *                   la diferencia se cobra por transferencia (se aplica ya; el cobro lo
 *                   gestiona el propietario) o con un link de pago de Stripe que vence en
 *                   23 h: la reserva NO cambia hasta que Stripe confirma el pago.
 *   Las de Airbnb y Booking se cancelan en cada plataforma.
 *
 * El navegador solo envía lo que escribe el usuario: el servidor valida,
 * calcula la política, comprueba solapes en Beds24 y pide la clave de firma para escribir.
 */

const TIPO_LABEL: Record<ReservaGestionable["tipo"], string> = {
    web: "Web",
    direct: "Particular",
    owner: "Uso propio",
};

const euros = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
const eurosC = (centimos: number) => euros(centimos / 100);
const nochesTxt = (n: number) => `${n} ${n === 1 ? "noche" : "noches"}`;
const diasTxt = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
// Céntimos -> "301" o "300.5" (lo que espera el campo «importe» del servidor)
const importeTexto = (centimos: number) => String(Math.round(centimos) / 100);
// "90,50" -> 9050 céntimos; vacío o no válido -> 0 (solo para mostrar el total en pantalla)
const aCentimos = (texto: string) => {
    const limpio = texto.trim().replace(/\s|€/g, "").replace(",", ".");
    return /^\d+(\.\d{1,2})?$/.test(limpio) ? Math.round(Number(limpio) * 100) : 0;
};
const horaTxt = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const listaNoches = (n: { fecha: string }[]) => n.map((x) => formatDate(x.fecha)).join(", ");

type Mensaje = { tone: "ok" | "error" | "warn"; text: string } | null;

const ORIGEN_LABEL: Record<string, string> = {
    web: "Reserva web",
    airbnb: "Reserva de Airbnb",
    booking: "Reserva de Booking",
    particular: "Reserva particular",
    uso_propio: "Uso propio",
};

/** Explicación de qué ocupa unas noches, en lenguaje del panel. */
function textoBloqueo(b: Bloqueo): { titulo: string; detalle: string } {
    const noches = b.noches.map(formatDate).join(", ");
    if (b.tipo === "cierre") {
        return { titulo: `Cierre manual: ${noches}`, detalle: "Esas noches se cerraron a mano en el calendario. Se pueden abrir desde aquí." };
    }
    if (b.tipo === "desconocido") {
        return {
            titulo: `No disponible: ${noches}`,
            detalle:
                "No hay ninguna reserva ni cierre en esas noches. Suele ser el margen de limpieza que Beds24 deja antes o después de otra reserva; si no, puede ser un retraso de Beds24: vuelve a comprobar en un par de minutos.",
        };
    }
    const quien = [ORIGEN_LABEL[b.origen] ?? "Reserva", b.codigo, b.nombre].filter(Boolean).join(" · ");
    const fechas = `${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}`;
    if (b.liberable) return { titulo: `${quien} (${fechas})`, detalle: `${b.motivo ?? "Quedó colgada."} Se puede liberar desde aquí.` };
    const consejo =
        b.origen === "airbnb" || b.origen === "booking"
            ? "Es una reserva real de otro canal: no se puede pisar."
            : b.origen === "web"
              ? "Es una reserva web pagada y vigente. Si es una prueba, cancélala en la lista de abajo."
              : "Si ya no vale, cancélala en la lista de abajo.";
    return { titulo: `${quien} (${fechas})`, detalle: consejo };
}

// «politica» es solo de la pantalla: al firmar se envía como total, parcial o ninguno.
type OpcionReembolso = "politica" | TipoReembolso;

interface CancelState {
    item: ReservaGestionable;
    reembolso: OpcionReembolso;
    importe: string;
    motivo: string;
}

interface ModState {
    item: ReservaGestionable;
    checkIn: string;
    checkOut: string;
    preview: ModificacionPreview | null;
    comprobando: boolean;
    error: string;
    errors: Record<string, string>;
    reembolso: ReembolsoModificacion;
    importe: string;
    fianzaAdicional: string;
    metodo: MetodoCobro;
    nota: string;
}

interface EditState {
    item: ReservaGestionable;
    checkIn: string;
    checkOut: string;
    nombre: string;
    email: string;
    telefono: string;
    huespedes: string;
    precio: string;
    notas: string;
    preview: EdicionPreview | null;
    comprobando: boolean;
    error: string;
    errors: Record<string, string>;
}

type CampoEdicion = "checkIn" | "checkOut" | "nombre" | "email" | "telefono" | "huespedes" | "precio" | "notas";

interface FianzaState {
    item: FianzaPendiente;
    modo: "toda" | "parte";
    importe: string;
    nota: string;
}

/** Explicación del cálculo: «Faltan 10 días: 50 % de la estancia (301 € de 602 €) + fianza 180 € = 481 €». */
function textoPolitica(p: PoliticaCancelacion): string {
    const plazo = p.diasHastaLlegada >= 15 ? `${diasTxt(p.diasHastaLlegada)} (15 o más)` : `${diasTxt(p.diasHastaLlegada)} (14 o menos)`;
    const fianza = p.fianzaCentimos > 0 ? ` + fianza ${eurosC(p.fianzaCentimos)}` : "";
    return `Faltan ${plazo} para la llegada: ${p.porcentaje} % de la estancia (${eurosC(p.estanciaDevueltaCentimos)} de ${eurosC(
        p.estanciaCentimos
    )})${fianza} = ${eurosC(p.reembolsoCentimos)}.`;
}

interface Props {
    today: string;
    initialFrom?: string;
    initialTo?: string; // último día incluido (como en «Precios y disponibilidad»)
}

export default function GestionReservas({ today, initialFrom, initialTo }: Props) {
    // ---------- Listado ----------
    const [listado, setListado] = useState<GestionListado | null>(null);
    const [fianzas, setFianzas] = useState<FianzasListado | null>(null);
    const [cargando, setCargando] = useState(true);
    const [errorListado, setErrorListado] = useState("");
    const [errorFianzas, setErrorFianzas] = useState("");

    const cargar = useCallback(async () => {
        setCargando(true);
        setErrorListado("");
        setErrorFianzas("");
        const [rListado, rFianzas] = await Promise.allSettled([getGestionReservas(), getFianzas()]);
        if (rListado.status === "fulfilled") setListado(rListado.value);
        else setErrorListado(toApiError(rListado.reason).detail);
        if (rFianzas.status === "fulfilled") setFianzas(rFianzas.value);
        else setErrorFianzas(toApiError(rFianzas.reason).detail);
        setCargando(false);
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
    const [firmando, setFirmando] = useState<"crear" | "cancelar" | "fianza" | "modificar" | "liberar" | "editar" | null>(null);
    const [cancelando, setCancelando] = useState<CancelState | null>(null);
    const [editando, setEditando] = useState<EditState | null>(null);
    const [devolviendo, setDevolviendo] = useState<FianzaState | null>(null);
    const [modificando, setModificando] = useState<ModState | null>(null);
    const [linkCreado, setLinkCreado] = useState<string | null>(null);
    const [copiado, setCopiado] = useState<string | null>(null);
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

    const politicaDe = (item: ReservaGestionable): PoliticaCancelacion | null =>
        item.web ? fianzas?.politica[String(item.beds24Id)] ?? null : null;

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

    // ---------- Cancelación ----------
    const politicaCancelando = cancelando ? politicaDe(cancelando.item) : null;
    // Lo que se puede devolver por Stripe: lo calcula el servidor (incluye pagos de ampliaciones)
    const maxReembolsoC = cancelando?.item.web
        ? politicaCancelando?.maximoCentimos ?? cancelando.item.web.totalCentimos - cancelando.item.web.reembolsadoCentimos
        : 0;
    const maxReembolso = maxReembolsoC / 100;

    /** Lo que se envía al servidor: «politica» se traduce a total, parcial o ninguno. */
    const reembolsoAEnviar = (c: CancelState): { reembolso: TipoReembolso; importe?: string } => {
        if (c.reembolso !== "politica") {
            return { reembolso: c.reembolso, importe: c.reembolso === "parcial" ? c.importe : undefined };
        }
        const p = politicaDe(c.item);
        if (!p || p.reembolsoCentimos >= maxReembolsoC) return { reembolso: "total" };
        if (p.reembolsoCentimos <= 0) return { reembolso: "ninguno" };
        return { reembolso: "parcial", importe: importeTexto(p.reembolsoCentimos) };
    };

    const abrirCancelacion = (item: ReservaGestionable) => {
        setDevolviendo(null);
        setModificando(null);
        setEditando(null);
        setCancelando({ item, reembolso: politicaDe(item) ? "politica" : "total", importe: "", motivo: "" });
    };

    const handleFirmarCancelar = async (pin: string) => {
        if (!cancelando) return null;
        const { item, motivo } = cancelando;
        try {
            const r = await cancelarReserva(
                item.beds24Id,
                item.web ? { ...reembolsoAEnviar(cancelando), motivo } : { motivo },
                pin
            );
            setFirmando(null);
            setCancelando(null);
            const devuelto = r.reembolsoCentimos ? ` Reembolso de ${eurosC(r.reembolsoCentimos)} (llega a la tarjeta en 5-10 días).` : "";
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

    // ---------- Devolución de fianza ----------
    const abrirFianza = (item: FianzaPendiente) => {
        setCancelando(null);
        setModificando(null);
        setEditando(null);
        setDevolviendo({ item, modo: "toda", importe: "", nota: "" });
    };

    const handleFirmarFianza = async (pin: string) => {
        if (!devolviendo) return null;
        const { item, modo, importe, nota } = devolviendo;
        try {
            const r = await devolverFianza(item.id, { importe: modo === "parte" ? importe : undefined, nota }, pin);
            setFirmando(null);
            setDevolviendo(null);
            const resto = r.pendienteCentimos > 0 ? ` Quedan ${eurosC(r.pendienteCentimos)} de fianza sin devolver.` : "";
            setMensaje({
                tone: "ok",
                text: `Fianza devuelta: ${eurosC(r.devueltoCentimos)} a ${item.nombre} (llega a la tarjeta en 5-10 días). La reserva sigue activa.${resto} El huésped recibe un correo en cuanto Stripe confirma la devolución.`,
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

    // ---------- Editar particular / uso propio ----------
    const abrirEdicion = (item: ReservaGestionable) => {
        setCancelando(null);
        setDevolviendo(null);
        setModificando(null);
        setLinkCreado(null);
        setEditando({
            item,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            nombre: item.nombre ?? "",
            email: item.email ?? "",
            telefono: item.telefono ?? "",
            huespedes: String(item.huespedes ?? 2),
            precio: item.precio != null ? String(item.precio) : "",
            notas: item.notas ?? "",
            preview: null,
            comprobando: false,
            error: "",
            errors: {},
        });
    };

    /** Cualquier cambio invalida la comprobación anterior. */
    const cambiarEdicion = (campo: CampoEdicion, valor: string) => {
        if (!editando) return;
        setEditando({ ...editando, [campo]: valor, preview: null, error: "", errors: {} });
    };

    /** Lo que se envía: en un uso propio no van precio, huéspedes ni contacto. */
    const edicionRequest = (e: EditState): EdicionRequest =>
        e.item.tipo === "owner"
            ? { checkIn: e.checkIn, checkOut: e.checkOut, nombre: e.nombre, notas: e.notas }
            : {
                  checkIn: e.checkIn,
                  checkOut: e.checkOut,
                  nombre: e.nombre,
                  email: e.email,
                  telefono: e.telefono,
                  huespedes: e.huespedes,
                  precio: e.precio,
                  notas: e.notas,
              };

    const handleComprobarEdicion = async () => {
        if (!editando) return;
        const actual = editando;
        setEditando({ ...actual, comprobando: true, error: "", errors: {} });
        try {
            const p = await previewEdicion(actual.item.beds24Id, edicionRequest(actual));
            setEditando({ ...actual, comprobando: false, preview: p });
        } catch (err) {
            const e = toApiError(err);
            setEditando({ ...actual, comprobando: false, preview: null, error: e.detail, errors: e.errors ?? {} });
        }
    };

    const handleFirmarEdicion = async (pin: string) => {
        if (!editando?.preview) return null;
        const e = editando;
        try {
            await editarReserva(e.item.beds24Id, edicionRequest(e), pin);
            setFirmando(null);
            setEditando(null);
            const cambianFechas = e.preview!.antes.checkIn !== e.preview!.datos.checkIn || e.preview!.antes.checkOut !== e.preview!.datos.checkOut;
            setMensaje({
                tone: "ok",
                text: cambianFechas
                    ? "Reserva actualizada en Beds24. Booking y Airbnb ajustan las fechas en unos minutos."
                    : "Reserva actualizada en Beds24.",
            });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setEditando({ ...e, preview: null, error: r.detail, errors: r.errors ?? {} });
            return null;
        }
    };

    const editPreview = editando?.preview ?? null;
    const edicionConflictos = editPreview?.conflictos ?? [];

    // ---------- Cambio de fechas (solo web) ----------
    const abrirModificacion = (item: ReservaGestionable) => {
        setCancelando(null);
        setDevolviendo(null);
        setEditando(null);
        setLinkCreado(null);
        setModificando({
            item,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            preview: null,
            comprobando: false,
            error: "",
            errors: {},
            reembolso: "ninguno",
            importe: "",
            fianzaAdicional: "",
            metodo: "stripe",
            nota: "",
        });
    };

    /** Cambiar una fecha invalida la comprobación anterior. */
    const cambiarFechaMod = (campo: "checkIn" | "checkOut", valor: string) => {
        if (!modificando) return;
        setModificando({ ...modificando, [campo]: valor, preview: null, error: "", errors: {} });
    };

    const handleComprobarMod = async () => {
        if (!modificando?.item.web) return;
        const actual = modificando;
        setModificando({ ...actual, comprobando: true, error: "", errors: {} });
        try {
            const p = await previewModificacion(actual.item.web!.id, { checkIn: actual.checkIn, checkOut: actual.checkOut });
            setModificando({
                ...actual,
                comprobando: false,
                preview: p,
                reembolso: p.nochesQuitadas.length && p.reembolsoSugeridoCentimos > 0 ? "sugerido" : "ninguno",
                importe: "",
            });
        } catch (err) {
            const e = toApiError(err);
            setModificando({ ...actual, comprobando: false, preview: null, error: e.detail, errors: e.errors ?? {} });
        }
    };

    const modPreview = modificando?.preview ?? null;
    const fianzaAdicionalC = modificando ? aCentimos(modificando.fianzaAdicional) : 0;
    const cargoModC = modPreview ? modPreview.cargoNochesCentimos + fianzaAdicionalC : 0;
    const reembolsoModC = !modPreview || !modificando
        ? 0
        : modificando.reembolso === "sugerido"
          ? modPreview.reembolsoSugeridoCentimos
          : modificando.reembolso === "otro"
            ? aCentimos(modificando.importe)
            : 0;

    const puedeFirmarMod =
        !!modPreview &&
        modPreview.disponible &&
        !(modificando?.reembolso === "otro" && !modificando.importe.trim());

    const handleFirmarMod = async (pin: string) => {
        if (!modificando?.item.web || !modPreview) return null;
        const m = modificando;
        try {
            const r = await modificarReserva(
                m.item.web!.id,
                {
                    checkIn: m.checkIn,
                    checkOut: m.checkOut,
                    reembolso: m.reembolso,
                    importeReembolso: m.reembolso === "otro" ? m.importe : undefined,
                    fianzaAdicional: m.fianzaAdicional.trim() || undefined,
                    metodoCobro: cargoModC > 0 ? m.metodo : undefined,
                    nota: m.nota,
                },
                pin
            );
            setFirmando(null);
            setModificando(null);
            const mod = r.modificacion;
            const fechas = `Del ${formatDate(mod.despues.checkIn)} al ${formatDate(mod.despues.checkOut)}`;
            let texto: string;
            if (r.checkoutUrl) {
                texto = `Link de pago de ${eurosC(mod.cargoCentimos)} creado y enviado al huésped por correo (vence ${
                    mod.venceEn ? `el ${horaTxt(mod.venceEn)}` : "en 23 h"
                }). La reserva no cambia todavía: en cuanto Stripe confirme el pago se pasa sola a ${fechas.toLowerCase()} en la web, Beds24, Airbnb y Booking. Si no paga, sigue igual.`;
                if (mod.reembolsoPendienteCentimos > 0) {
                    texto += ` El reembolso de ${eurosC(mod.reembolsoPendienteCentimos)} se hace cuando pague.`;
                }
                setLinkCreado(r.checkoutUrl);
            } else {
                texto = `Fechas cambiadas en la web y en Beds24 (${fechas}). Airbnb y Booking se actualizan en unos minutos.`;
            }
            if (mod.reembolsoCentimos > 0) texto += ` Reembolso de ${eurosC(mod.reembolsoCentimos)} (llega a la tarjeta en 5-10 días).`;
            if (!r.checkoutUrl && mod.metodoCobro === "transferencia") {
                texto += ` Se han sumado ${eurosC(mod.cargoCentimos)} a la reserva, a cobrar por transferencia.`;
            }
            setMensaje({ tone: r.aviso ? "warn" : "ok", text: r.aviso ? `${texto} ${r.aviso}` : texto });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setModificando({ ...m, preview: null, error: r.detail, errors: r.errors ?? {} });
            return null;
        }
    };

    const bloqueosLiberables = modPreview?.bloqueos.filter((b) => b.liberable) ?? [];

    const handleFirmarLiberar = async (pin: string) => {
        if (!modificando?.item.web) return null;
        const m = modificando;
        try {
            const r = await liberarNoches(m.item.web!.id, { checkIn: m.checkIn, checkOut: m.checkOut }, pin);
            setFirmando(null);
            setModificando({
                ...m,
                preview: r.calculo,
                error: "",
                errors: {},
                reembolso: r.calculo.nochesQuitadas.length && r.calculo.reembolsoSugeridoCentimos > 0 ? "sugerido" : "ninguno",
            });
            const partes = [
                r.liberadas.length ? `${r.liberadas.length === 1 ? "1 reserva colgada cancelada" : `${r.liberadas.length} reservas colgadas canceladas`}` : null,
                r.cierresQuitados.length ? `cierre quitado en ${r.cierresQuitados.length === 1 ? "1 noche" : `${r.cierresQuitados.length} noches`}` : null,
            ].filter(Boolean);
            setMensaje({
                tone: r.calculo.disponible ? "ok" : "warn",
                text: `Noches liberadas (${partes.join(" y ")}).${r.calculo.disponible ? " Ya puedes cambiar las fechas." : " Todavía queda algo ocupado: revisa el detalle."}`,
            });
            cargar();
            return null;
        } catch (err) {
            const r = resultadoFirma(err);
            if ("message" in r) return r;
            setModificando({ ...m, error: r.detail });
            return null;
        }
    };

    const lineasLiberar = bloqueosLiberables.map((b) => {
        const t = textoBloqueo(b);
        return b.tipo === "cierre" ? `Abrir ${t.titulo.toLowerCase()}` : `Cancelar en Beds24: ${t.titulo}`;
    });

    const copiar = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(url);
            setTimeout(() => setCopiado((c) => (c === url ? null : c)), 2000);
        } catch {
            window.prompt("Copia el link:", url);
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

    const lineaReembolso = (c: CancelState): string => {
        if (c.reembolso === "politica" && politicaCancelando) {
            return `Reembolso según política: ${eurosC(politicaCancelando.reembolsoCentimos)} (${politicaCancelando.porcentaje} % de la estancia + fianza)`;
        }
        if (c.reembolso === "total" || c.reembolso === "politica") return `Reembolso total: ${euros(maxReembolso)}`;
        if (c.reembolso === "parcial") return `Reembolso acordado: ${c.importe} €`;
        return "Sin reembolso";
    };

    const lineasCancelar = cancelando
        ? [
              `${TIPO_LABEL[cancelando.item.tipo]}${cancelando.item.nombre ? `: ${cancelando.item.nombre}` : ""}`,
              `Del ${formatDate(cancelando.item.checkIn)} al ${formatDate(cancelando.item.checkOut)}`,
              ...(cancelando.item.web ? [lineaReembolso(cancelando)] : []),
              "Las fechas vuelven a quedar libres en la web, Booking y Airbnb",
          ]
        : [];

    const lineasFianza = devolviendo
        ? [
              `Fianza de ${devolviendo.item.nombre} (${devolviendo.item.codigo})`,
              `Estancia del ${formatDate(devolviendo.item.checkIn)} al ${formatDate(devolviendo.item.checkOut)}`,
              devolviendo.modo === "toda"
                  ? `Se devuelve: ${eurosC(devolviendo.item.pendienteCentimos)} (toda la fianza pendiente)`
                  : `Se devuelve: ${devolviendo.importe} € de ${eurosC(devolviendo.item.pendienteCentimos)}`,
              "La reserva no se cancela: sigue pagada y con sus fechas",
          ]
        : [];

    const lineasModificar =
        modificando && modPreview
            ? [
                  `${modificando.item.nombre ?? "Reserva web"} (${modPreview.codigo})`,
                  `Antes: del ${formatDate(modPreview.antes.checkIn)} al ${formatDate(modPreview.antes.checkOut)} (${nochesTxt(modPreview.antes.noches ?? 0)})`,
                  `Ahora: del ${formatDate(modPreview.despues.checkIn)} al ${formatDate(modPreview.despues.checkOut)} (${nochesTxt(modPreview.despues.noches ?? 0)})`,
                  ...(modPreview.nochesQuitadas.length
                      ? [reembolsoModC > 0 ? `Se devuelven ${eurosC(reembolsoModC)} por las noches quitadas` : "Sin reembolso por las noches quitadas"]
                      : reembolsoModC > 0
                        ? [`Se devuelven ${eurosC(reembolsoModC)}`]
                        : []),
                  ...(cargoModC > 0
                      ? [
                            `A pagar por el huésped: ${eurosC(cargoModC)}${fianzaAdicionalC > 0 ? ` (incluye ${eurosC(fianzaAdicionalC)} de fianza adicional)` : ""}`,
                            modificando.metodo === "stripe"
                                ? "Cobro: link de pago de Stripe (vence en 23 h). La reserva cambia cuando pague"
                                : "Cobro: transferencia (la gestionas tú). La reserva cambia ya",
                        ]
                      : []),
                  cargoModC > 0 && modificando.metodo === "stripe"
                      ? "Al pagar, se cambia la misma reserva en Beds24: Airbnb y Booking se actualizan"
                      : "Se cambia la misma reserva en Beds24: Airbnb y Booking se actualizan",
              ]
            : [];

    const lineasEditar = (() => {
        if (!editando || !editPreview) return [];
        const { antes, datos } = editPreview;
        const lineas = [
            `${TIPO_LABEL[editando.item.tipo]}${datos.nombre ? `: ${datos.nombre}` : ""}`,
        ];
        const fechasAntes = `${formatDate(antes.checkIn)} → ${formatDate(antes.checkOut)}`;
        const fechasDespues = `${formatDate(datos.checkIn)} → ${formatDate(datos.checkOut)}`;
        lineas.push(
            fechasAntes === fechasDespues
                ? `Fechas sin cambios: ${fechasDespues} (${nochesTxt(datos.noches)})`
                : `Fechas: ${fechasAntes} pasa a ${fechasDespues} (${nochesTxt(datos.noches)})`
        );
        if (editando.item.tipo !== "owner") {
            if (antes.precio !== datos.precio) {
                lineas.push(`Precio: ${antes.precio != null ? euros(antes.precio) : "—"} pasa a ${euros(datos.precio)}`);
            }
            if (antes.huespedes !== datos.huespedes) {
                lineas.push(`Huéspedes: ${antes.huespedes ?? "—"} pasa a ${datos.huespedes}`);
            }
        }
        if ((antes.nombre ?? "") !== (datos.nombre ?? "")) lineas.push(`Nombre: ${antes.nombre ?? "—"} pasa a ${datos.nombre}`);
        lineas.push("Es la misma reserva en Beds24: Booking y Airbnb se actualizan");
        return lineas;
    })();

    const linksPendientes: Record<string, LinkPendiente> = fianzas?.linksPendientes ?? {};

    const maxHuespedes = listado?.limites.maxHuespedes ?? 6;
    const reservas = listado?.reservas ?? [];
    const pendientes = listado?.pendientes ?? [];
    const fianzasPendientes = fianzas?.pendientes ?? [];

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
            {linkCreado && (
                <div className="gr-link">
                    <input className="cq-input gr-link-url" type="text" readOnly value={linkCreado} aria-label="Link de pago"
                        onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className="cq-btn" onClick={() => copiar(linkCreado)}>
                        {copiado === linkCreado ? "Copiado" : "Copiar link"}
                    </button>
                </div>
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

            {/* ---------- Fianzas pendientes de devolver ---------- */}
            <section className="gr-block">
                <div className="gr-block-header">
                    <h3 className="cq-review-title">Fianzas pendientes de devolver</h3>
                    <button type="button" className="cq-link" onClick={cargar} disabled={cargando}>
                        {cargando ? "Cargando…" : "Actualizar"}
                    </button>
                </div>
                <p className="cq-help">
                    Reservas web pagadas con la fianza aún sin devolver. Al terminar la estancia, si la casa no tiene daños,
                    devuelve la fianza completa; si hubo algún daño, devuelve solo una parte. La reserva no se cancela y el
                    huésped recibe un correo cuando Stripe confirma la devolución.
                </p>

                {errorFianzas && <p className="cq-message cq-message--error">{errorFianzas}</p>}
                {!cargando && !errorFianzas && fianzasPendientes.length === 0 && (
                    <p className="cq-help">No hay fianzas pendientes.</p>
                )}

                <ul className="gr-lista">
                    {fianzasPendientes.map((f) => {
                        const abierta = devolviendo?.item.id === f.id;
                        return (
                            <li key={f.id} className={`gr-fila ${abierta ? "gr-fila--abierta" : ""}`}>
                                <div className="gr-fila-info">
                                    <span className={`gr-badge ${f.estanciaTerminada ? "gr-badge--terminada" : "gr-badge--web"}`}>
                                        {f.estanciaTerminada ? "Estancia terminada" : "Próxima"}
                                    </span>
                                    <span className="gr-fechas">
                                        {formatDate(f.checkIn)} → {formatDate(f.checkOut)}
                                    </span>
                                    <span className="gr-detalle">
                                        {[f.nombre, f.codigo, `Fianza ${eurosC(f.pendienteCentimos)}`,
                                            f.fianzaDevueltaCentimos > 0 ? `ya devueltos ${eurosC(f.fianzaDevueltaCentimos)}` : null]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                </div>
                                {!abierta && (
                                    <button type="button" className="cq-link gr-cancelar" onClick={() => abrirFianza(f)}>
                                        Devolver fianza
                                    </button>
                                )}

                                {abierta && devolviendo && (
                                    <div className="gr-cancel">
                                        {!f.estanciaTerminada && (
                                            <p className="cq-message cq-message--warn">
                                                La estancia todavía no ha terminado. Normalmente la fianza se devuelve después de la salida.
                                            </p>
                                        )}
                                        <div className="cq-segment" role="radiogroup" aria-label="Importe de la fianza">
                                            {(
                                                [
                                                    ["toda", `Devolver toda (${eurosC(f.pendienteCentimos)})`],
                                                    ["parte", "Devolver una parte"],
                                                ] as const
                                            ).map(([valor, label]) => (
                                                <button key={valor} type="button" role="radio" aria-checked={devolviendo.modo === valor}
                                                    className={`cq-segment-btn ${devolviendo.modo === valor ? "cq-segment-btn--on" : ""}`}
                                                    onClick={() => setDevolviendo({ ...devolviendo, modo: valor })}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        {devolviendo.modo === "parte" && (
                                            <div className="cq-input-wrap cq-input-wrap--short">
                                                <input className="cq-input" type="text" inputMode="decimal" aria-label="Importe a devolver de la fianza"
                                                    placeholder={importeTexto(f.pendienteCentimos)}
                                                    value={devolviendo.importe}
                                                    onChange={(e) => setDevolviendo({ ...devolviendo, importe: e.target.value })} />
                                                <span className="cq-unit">€</span>
                                            </div>
                                        )}
                                        <input className="cq-input" type="text" maxLength={300}
                                            placeholder={devolviendo.modo === "parte" ? "Motivo de la retención (ej. vaso roto)" : "Nota interna (opcional)"}
                                            aria-label="Nota de la devolución" value={devolviendo.nota}
                                            onChange={(e) => setDevolviendo({ ...devolviendo, nota: e.target.value })} />
                                        <p className="cq-help">La devolución vuelve a la tarjeta del huésped en 5-10 días.</p>
                                        <div className="gr-cancel-actions">
                                            <button type="button" className="cq-btn" onClick={() => setFirmando("fianza")}
                                                disabled={devolviendo.modo === "parte" && !devolviendo.importe.trim()}>
                                                Firmar y devolver
                                            </button>
                                            <button type="button" className="cq-link" onClick={() => setDevolviendo(null)}>No devolver</button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* ---------- Próximas reservas cancelables ---------- */}
            <section className="gr-block">
                <div className="gr-block-header">
                    <h3 className="cq-review-title">Próximas reservas que puedes cancelar aquí</h3>
                    <button type="button" className="cq-link" onClick={cargar} disabled={cargando}>
                        {cargando ? "Cargando…" : "Actualizar"}
                    </button>
                </div>
                <p className="cq-help">
                    Web, particulares y usos propios. En las web puedes cambiar las fechas; las particulares y los usos
                    propios se pueden editar enteros. Las de Airbnb y Booking se cancelan o cambian en cada plataforma.
                </p>

                {errorListado && <p className="cq-message cq-message--error">{errorListado}</p>}
                {!cargando && !errorListado && reservas.length === 0 && <p className="cq-help">No hay reservas próximas.</p>}

                <ul className="gr-lista">
                    {reservas.map((r) => {
                        const abierta = cancelando?.item.beds24Id === r.beds24Id;
                        const modAbierta = modificando?.item.beds24Id === r.beds24Id;
                        const editAbierta = editando?.item.beds24Id === r.beds24Id;
                        const hoyPanel = fianzas?.hoy ?? listado?.hoy ?? today;
                        const importe = r.web ? r.web.totalCentimos / 100 : r.precio;
                        const politica = politicaDe(r);
                        const link = r.web ? linksPendientes[String(r.beds24Id)] : undefined;
                        const empezada = r.checkIn <= (fianzas?.hoy ?? today);
                        return (
                            <li key={r.beds24Id} className={`gr-fila ${abierta || modAbierta || editAbierta ? "gr-fila--abierta" : ""}`}>
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
                                    {link && (
                                        <span className="gr-pendiente">
                                            Link de pago pendiente: {eurosC(link.cargoCentimos)} para pasar al{" "}
                                            {formatDate(link.despues.checkIn)} → {formatDate(link.despues.checkOut)} · vence el {horaTxt(link.venceEn)}
                                            {" · "}
                                            <button type="button" className="cq-link" onClick={() => copiar(link.url)}>
                                                {copiado === link.url ? "Copiado" : "Copiar link"}
                                            </button>
                                        </span>
                                    )}
                                </div>
                                {!abierta && !modAbierta && !editAbierta && (
                                    <div className="gr-fila-acciones">
                                        {r.web && !link && (
                                            <button type="button" className="cq-link" onClick={() => abrirModificacion(r)}>
                                                Cambiar fechas
                                            </button>
                                        )}
                                        {!r.web && r.tipo !== "web" && (
                                            <button type="button" className="cq-link" onClick={() => abrirEdicion(r)}>
                                                Editar
                                            </button>
                                        )}
                                        <button type="button" className="cq-link gr-cancelar" onClick={() => abrirCancelacion(r)}>
                                            Cancelar
                                        </button>
                                    </div>
                                )}

                                {editAbierta && editando && (() => {
                                    const e = editando;
                                    const id = r.beds24Id;
                                    const empezadaEd = r.checkIn <= hoyPanel;
                                    const esParticular = r.tipo === "direct";
                                    const nochesEd = e.checkOut > e.checkIn ? diasEntre(e.checkIn, e.checkOut) : 0;
                                    return (
                                        <div className="gr-cancel gr-mod">
                                            <div className="cq-grid">
                                                <div className="cq-field">
                                                    <label className="cq-label" htmlFor={`gr-ed-in-${id}`}>Llegada</label>
                                                    <input id={`gr-ed-in-${id}`} className="cq-input" type="date"
                                                        min={empezadaEd ? undefined : hoyPanel} value={e.checkIn} disabled={empezadaEd}
                                                        onChange={(ev) => cambiarEdicion("checkIn", ev.target.value)}
                                                        aria-invalid={!!e.errors.checkIn} />
                                                    {e.errors.checkIn && <p className="cq-field-error">{e.errors.checkIn}</p>}
                                                </div>
                                                <div className="cq-field">
                                                    <label className="cq-label" htmlFor={`gr-ed-out-${id}`}>Salida</label>
                                                    <input id={`gr-ed-out-${id}`} className="cq-input" type="date"
                                                        min={addDays(e.checkIn, 1)} value={e.checkOut}
                                                        onChange={(ev) => cambiarEdicion("checkOut", ev.target.value)}
                                                        aria-invalid={!!e.errors.checkOut} />
                                                    {e.errors.checkOut && <p className="cq-field-error">{e.errors.checkOut}</p>}
                                                </div>
                                            </div>
                                            <p className="cq-help">
                                                {empezadaEd
                                                    ? "La estancia ya ha empezado: solo se puede cambiar la salida."
                                                    : nochesEd > 0
                                                      ? `${nochesTxt(nochesEd)}. El día de salida queda libre para otra llegada.`
                                                      : "La salida tiene que ser posterior a la llegada."}
                                            </p>

                                            <div className="cq-field cq-field--wide">
                                                <label className="cq-label" htmlFor={`gr-ed-nombre-${id}`}>
                                                    {esParticular ? "Nombre del cliente" : "Nombre (opcional)"}
                                                </label>
                                                <input id={`gr-ed-nombre-${id}`} className="cq-input" type="text" maxLength={120}
                                                    placeholder={esParticular ? "" : "Uso propio"} value={e.nombre}
                                                    onChange={(ev) => cambiarEdicion("nombre", ev.target.value)}
                                                    aria-invalid={!!e.errors.nombre} />
                                                {e.errors.nombre && <p className="cq-field-error">{e.errors.nombre}</p>}
                                            </div>

                                            {esParticular && (
                                                <>
                                                    <div className="cq-grid">
                                                        <div className="cq-field">
                                                            <label className="cq-label" htmlFor={`gr-ed-precio-${id}`}>Precio total de la estancia</label>
                                                            <div className="cq-input-wrap">
                                                                <input id={`gr-ed-precio-${id}`} className="cq-input" type="text" inputMode="decimal"
                                                                    value={e.precio} onChange={(ev) => cambiarEdicion("precio", ev.target.value)}
                                                                    aria-invalid={!!e.errors.precio} />
                                                                <span className="cq-unit">€</span>
                                                            </div>
                                                            {e.errors.precio && <p className="cq-field-error">{e.errors.precio}</p>}
                                                        </div>
                                                        <div className="cq-field">
                                                            <label className="cq-label" htmlFor={`gr-ed-huespedes-${id}`}>Huéspedes</label>
                                                            <select id={`gr-ed-huespedes-${id}`} className="cq-input" value={e.huespedes}
                                                                onChange={(ev) => cambiarEdicion("huespedes", ev.target.value)}
                                                                aria-invalid={!!e.errors.huespedes}>
                                                                {Array.from({ length: maxHuespedes }, (_, i) => String(i + 1)).map((n) => (
                                                                    <option key={n} value={n}>{n}</option>
                                                                ))}
                                                            </select>
                                                            {e.errors.huespedes && <p className="cq-field-error">{e.errors.huespedes}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="cq-grid">
                                                        <div className="cq-field">
                                                            <label className="cq-label" htmlFor={`gr-ed-tel-${id}`}>Teléfono (opcional)</label>
                                                            <input id={`gr-ed-tel-${id}`} className="cq-input" type="tel" value={e.telefono}
                                                                onChange={(ev) => cambiarEdicion("telefono", ev.target.value)}
                                                                aria-invalid={!!e.errors.telefono} />
                                                            {e.errors.telefono && <p className="cq-field-error">{e.errors.telefono}</p>}
                                                        </div>
                                                        <div className="cq-field">
                                                            <label className="cq-label" htmlFor={`gr-ed-email-${id}`}>Correo (opcional)</label>
                                                            <input id={`gr-ed-email-${id}`} className="cq-input" type="email" value={e.email}
                                                                onChange={(ev) => cambiarEdicion("email", ev.target.value)}
                                                                aria-invalid={!!e.errors.email} />
                                                            {e.errors.email && <p className="cq-field-error">{e.errors.email}</p>}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            <div className="cq-field cq-field--wide">
                                                <label className="cq-label" htmlFor={`gr-ed-notas-${id}`}>Notas internas (opcional)</label>
                                                <textarea id={`gr-ed-notas-${id}`} className="cq-input gr-textarea" rows={2} maxLength={500}
                                                    value={e.notas} onChange={(ev) => cambiarEdicion("notas", ev.target.value)} />
                                            </div>

                                            {e.error && <p className="cq-message cq-message--error" role="alert">{e.error}</p>}

                                            {editPreview && edicionConflictos.length > 0 && (
                                                <div className="gr-bloqueos" role="alert">
                                                    <p className="gr-bloqueos-titulo">Esas fechas ya tienen otra reserva:</p>
                                                    <ul className="gr-bloqueos-lista">
                                                        {edicionConflictos.map((c) => (
                                                            <li key={c.beds24Id} className="gr-bloqueo">
                                                                <span className="gr-bloqueo-titulo">
                                                                    {[ORIGEN_LABEL[c.origen] ?? c.origen, c.nombre].filter(Boolean).join(" · ")}
                                                                </span>
                                                                <span className="gr-bloqueo-detalle">
                                                                    {formatDate(c.checkIn)} → {formatDate(c.checkOut)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {editPreview && edicionConflictos.length === 0 && (
                                                <div className="gr-mod-resumen">
                                                    <ul className="gr-resumen">
                                                        {lineasEditar.slice(1, -1).map((l) => <li key={l}>{l}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="gr-cancel-actions">
                                                {editPreview && edicionConflictos.length === 0 ? (
                                                    <button type="button" className="cq-btn" onClick={() => setFirmando("editar")}>
                                                        Firmar y guardar
                                                    </button>
                                                ) : (
                                                    <button type="button" className="cq-btn" onClick={handleComprobarEdicion}
                                                        disabled={e.comprobando || nochesEd < 1}>
                                                        {e.comprobando ? "Comprobando…" : "Comprobar cambios"}
                                                    </button>
                                                )}
                                                <button type="button" className="cq-link" onClick={() => setEditando(null)}>No editar</button>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {modAbierta && modificando && (
                                    <div className="gr-cancel gr-mod">
                                        <div className="cq-grid">
                                            <div className="cq-field">
                                                <label className="cq-label" htmlFor={`gr-mod-in-${r.beds24Id}`}>Llegada</label>
                                                <input id={`gr-mod-in-${r.beds24Id}`} className="cq-input" type="date"
                                                    min={empezada ? undefined : fianzas?.hoy ?? today}
                                                    value={modificando.checkIn} disabled={empezada}
                                                    onChange={(e) => cambiarFechaMod("checkIn", e.target.value)}
                                                    aria-invalid={!!modificando.errors.checkIn} />
                                                {modificando.errors.checkIn && <p className="cq-field-error">{modificando.errors.checkIn}</p>}
                                            </div>
                                            <div className="cq-field">
                                                <label className="cq-label" htmlFor={`gr-mod-out-${r.beds24Id}`}>Salida</label>
                                                <input id={`gr-mod-out-${r.beds24Id}`} className="cq-input" type="date"
                                                    min={addDays(modificando.checkIn, 1)} value={modificando.checkOut}
                                                    onChange={(e) => cambiarFechaMod("checkOut", e.target.value)}
                                                    aria-invalid={!!modificando.errors.checkOut} />
                                                {modificando.errors.checkOut && <p className="cq-field-error">{modificando.errors.checkOut}</p>}
                                            </div>
                                        </div>
                                        <p className="cq-help">
                                            {empezada
                                                ? "La estancia ya ha empezado: solo se puede cambiar la salida."
                                                : "La disponibilidad se comprueba en Beds24 desde la llegada real, sin la antelación mínima de la web."}
                                        </p>

                                        {modificando.error && <p className="cq-message cq-message--error" role="alert">{modificando.error}</p>}

                                        {!modPreview && (
                                            <div className="gr-cancel-actions">
                                                <button type="button" className="cq-btn" onClick={handleComprobarMod}
                                                    disabled={modificando.comprobando || modificando.checkOut <= modificando.checkIn}>
                                                    {modificando.comprobando ? "Comprobando…" : "Comprobar fechas"}
                                                </button>
                                                <button type="button" className="cq-link" onClick={() => setModificando(null)}>No cambiar</button>
                                            </div>
                                        )}

                                        {modPreview && (
                                            <>
                                                <div className="gr-mod-resumen">
                                                    <p className="gr-mod-linea">
                                                        <strong>Antes:</strong> {formatDate(modPreview.antes.checkIn)} → {formatDate(modPreview.antes.checkOut)} ({nochesTxt(modPreview.antes.noches ?? 0)})
                                                        {" · "}
                                                        <strong>Ahora:</strong> {formatDate(modPreview.despues.checkIn)} → {formatDate(modPreview.despues.checkOut)} ({nochesTxt(modPreview.despues.noches ?? 0)})
                                                    </p>

                                                    {modPreview.nochesQuitadas.length > 0 && (
                                                        <div className="gr-noches">
                                                            <span className="gr-noches-titulo">Noches que se quitan · pagado {eurosC(modPreview.valorQuitadasCentimos)}</span>
                                                            <ul className="gr-noches-lista">
                                                                {modPreview.nochesQuitadas.map((n) => (
                                                                    <li key={n.fecha}><span>{formatDate(n.fecha)}</span><span>{euros(n.precio)}</span></li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {modPreview.margenPropio.length > 0 && (
                                                        <p className="cq-help">
                                                            {modPreview.margenPropio.map(formatDate).join(", ")}: {modPreview.margenPropio.length === 1 ? "estaba bloqueada" : "estaban bloqueadas"} solo
                                                            por el margen de limpieza de esta misma reserva. Al cambiar las fechas, el margen se corre con ella.
                                                        </p>
                                                    )}

                                                    {modPreview.nochesNuevas.length > 0 && (
                                                        <div className="gr-noches">
                                                            <span className="gr-noches-titulo">Noches nuevas · {eurosC(modPreview.cargoNochesCentimos)}</span>
                                                            <ul className="gr-noches-lista">
                                                                {modPreview.nochesNuevas.map((n) => (
                                                                    <li key={n.fecha}><span>{formatDate(n.fecha)}</span><span>{euros(n.precio)}</span></li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                {!modPreview.disponible && (
                                                    <div className="gr-bloqueos" role="alert">
                                                        {modPreview.conflictos.length > 0 && (
                                                            <>
                                                                <p className="gr-bloqueos-titulo">
                                                                    Ocupadas: {modPreview.conflictos.map(formatDate).join(", ")}
                                                                </p>
                                                                <ul className="gr-bloqueos-lista">
                                                                    {modPreview.bloqueos.map((b, i) => {
                                                                        const t = textoBloqueo(b);
                                                                        return (
                                                                            <li key={i} className={b.liberable ? "gr-bloqueo gr-bloqueo--liberable" : "gr-bloqueo"}>
                                                                                <span className="gr-bloqueo-titulo">{t.titulo}</span>
                                                                                <span className="gr-bloqueo-detalle">{t.detalle}</span>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                                {bloqueosLiberables.length > 0 && (
                                                                    <button type="button" className="cq-btn gr-bloqueos-btn" onClick={() => setFirmando("liberar")}>
                                                                        Liberar y volver a comprobar
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {modPreview.sinTarifa.length > 0 && (
                                                            <p className="gr-bloqueos-titulo">
                                                                Sin precio en el calendario: {modPreview.sinTarifa.map(formatDate).join(", ")}. Ponles
                                                                precio en «Precios y disponibilidad».
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {modPreview.disponible && (
                                                    <>
                                                        {/* ---------- Reembolso ---------- */}
                                                        {modPreview.maximoReembolsoCentimos > 0 && (
                                                            <div className="gr-mod-bloque">
                                                                <span className="cq-label">Reembolso al huésped</span>
                                                                <div className="cq-segment" role="radiogroup" aria-label="Reembolso">
                                                                    {(
                                                                        [
                                                                            ...(modPreview.nochesQuitadas.length
                                                                                ? ([["sugerido", `Según noches quitadas (${eurosC(modPreview.reembolsoSugeridoCentimos)})`]] as const)
                                                                                : []),
                                                                            ["otro", "Otro importe"],
                                                                            ["ninguno", "Sin reembolso"],
                                                                        ] as ReadonlyArray<readonly [ReembolsoModificacion, string]>
                                                                    ).map(([valor, label]) => (
                                                                        <button key={valor} type="button" role="radio" aria-checked={modificando.reembolso === valor}
                                                                            className={`cq-segment-btn ${modificando.reembolso === valor ? "cq-segment-btn--on" : ""}`}
                                                                            onClick={() => setModificando({ ...modificando, reembolso: valor })}>
                                                                            {label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {modificando.reembolso === "otro" && (
                                                                    <div className="cq-input-wrap cq-input-wrap--short">
                                                                        <input className="cq-input" type="text" inputMode="decimal" aria-label="Importe a devolver"
                                                                            placeholder={importeTexto(modPreview.reembolsoSugeridoCentimos)}
                                                                            value={modificando.importe}
                                                                            onChange={(e) => setModificando({ ...modificando, importe: e.target.value })}
                                                                            aria-invalid={!!modificando.errors.importeReembolso} />
                                                                        <span className="cq-unit">€</span>
                                                                    </div>
                                                                )}
                                                                {modificando.errors.importeReembolso && <p className="cq-field-error">{modificando.errors.importeReembolso}</p>}
                                                                <p className="cq-help">
                                                                    {modPreview.nochesQuitadas.length
                                                                        ? `Lo sugerido es lo que pagó por esas noches (${listaNoches(modPreview.nochesQuitadas)}). `
                                                                        : ""}
                                                                    Se puede devolver por Stripe hasta {eurosC(modPreview.maximoReembolsoCentimos)}; vuelve a la tarjeta en 5-10 días.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* ---------- Cobro de la diferencia ---------- */}
                                                        <div className="gr-mod-bloque">
                                                            <div className="cq-field">
                                                                <label className="cq-label" htmlFor={`gr-mod-fianza-${r.beds24Id}`}>Fianza adicional (opcional)</label>
                                                                <div className="cq-input-wrap cq-input-wrap--short">
                                                                    <input id={`gr-mod-fianza-${r.beds24Id}`} className="cq-input" type="text" inputMode="decimal"
                                                                        placeholder="0" value={modificando.fianzaAdicional}
                                                                        onChange={(e) => setModificando({ ...modificando, fianzaAdicional: e.target.value })}
                                                                        aria-invalid={!!modificando.errors.fianzaAdicional} />
                                                                    <span className="cq-unit">€</span>
                                                                </div>
                                                                {modificando.errors.fianzaAdicional && <p className="cq-field-error">{modificando.errors.fianzaAdicional}</p>}
                                                                <p className="cq-help">
                                                                    La fianza actual es por persona para toda la estancia ({eurosC(modPreview.fianzaActualCentimos)}), así que no
                                                                    cambia sola. Si quieres pedir más fianza por los días nuevos, escríbela aquí: se suma al cobro y se
                                                                    devuelve con el resto de la fianza.
                                                                </p>
                                                            </div>

                                                            {cargoModC > 0 ? (
                                                                <>
                                                                    <p className="gr-politica gr-politica--on">
                                                                        A pagar por el huésped: {eurosC(cargoModC)}
                                                                        {modPreview.cargoNochesCentimos > 0 && ` (noches nuevas ${eurosC(modPreview.cargoNochesCentimos)}`}
                                                                        {fianzaAdicionalC > 0 && `${modPreview.cargoNochesCentimos > 0 ? " + " : " ("}fianza ${eurosC(fianzaAdicionalC)}`}
                                                                        {")"}
                                                                    </p>
                                                                    <span className="cq-label">¿Cómo paga la diferencia?</span>
                                                                    <div className="cq-segment" role="radiogroup" aria-label="Forma de pago">
                                                                        {(
                                                                            [
                                                                                ["stripe", "Link de pago de Stripe"],
                                                                                ["transferencia", "Transferencia (la gestionas tú)"],
                                                                            ] as const
                                                                        ).map(([valor, label]) => (
                                                                            <button key={valor} type="button" role="radio" aria-checked={modificando.metodo === valor}
                                                                                className={`cq-segment-btn ${modificando.metodo === valor ? "cq-segment-btn--on" : ""}`}
                                                                                onClick={() => setModificando({ ...modificando, metodo: valor })}>
                                                                                {label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    {modificando.errors.metodoCobro && <p className="cq-field-error">{modificando.errors.metodoCobro}</p>}
                                                                    <p className="cq-help">
                                                                        {modificando.metodo === "stripe"
                                                                            ? "El huésped recibe por correo un link para pagar con tarjeta. La reserva no cambia hasta que Stripe confirma el pago; entonces se comprueba otra vez que las noches sigan libres y se aplica sola. Si para entonces alguien las reservó, se le devuelve el pago entero. Si no paga en 23 h, no pasa nada."
                                                                            : "El cambio se aplica ya y el importe se suma a la reserva. El cobro lo gestionas tú; lo pagado por transferencia no se puede devolver por Stripe."}
                                                                        {modificando.metodo === "stripe" && reembolsoModC > 0 && " El reembolso se hace cuando pague."}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <p className="cq-help">No hay nada que cobrar.</p>
                                                            )}
                                                        </div>

                                                        <input className="cq-input" type="text" maxLength={300} placeholder="Nota interna (opcional)"
                                                            aria-label="Nota del cambio de fechas" value={modificando.nota}
                                                            onChange={(e) => setModificando({ ...modificando, nota: e.target.value })} />
                                                    </>
                                                )}

                                                <div className="gr-cancel-actions">
                                                    <button type="button" className="cq-btn" onClick={() => setFirmando("modificar")} disabled={!puedeFirmarMod}>
                                                        Firmar y cambiar fechas
                                                    </button>
                                                    <button type="button" className="cq-link"
                                                        onClick={() => setModificando({ ...modificando, preview: null })}>
                                                        Cambiar otras fechas
                                                    </button>
                                                    <button type="button" className="cq-link" onClick={() => setModificando(null)}>No cambiar</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {abierta && cancelando && (
                                    <div className="gr-cancel">
                                        {r.web && (
                                            <>
                                                <div className="cq-segment" role="radiogroup" aria-label="Reembolso">
                                                    {(
                                                        [
                                                            ...(politica
                                                                ? ([["politica", `Según política (${eurosC(politica.reembolsoCentimos)})`]] as const)
                                                                : []),
                                                            ["total", `Devolver todo (${euros(maxReembolso)})`],
                                                            ["parcial", "Otra cantidad"],
                                                            ["ninguno", "Sin reembolso"],
                                                        ] as ReadonlyArray<readonly [OpcionReembolso, string]>
                                                    ).map(([valor, label]) => (
                                                        <button key={valor} type="button" role="radio" aria-checked={cancelando.reembolso === valor}
                                                            className={`cq-segment-btn ${cancelando.reembolso === valor ? "cq-segment-btn--on" : ""}`}
                                                            onClick={() => setCancelando({ ...cancelando, reembolso: valor })}>
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {politica && (
                                                    <p className={`gr-politica ${cancelando.reembolso === "politica" ? "gr-politica--on" : ""}`}>
                                                        {textoPolitica(politica)}
                                                    </p>
                                                )}

                                                {cancelando.reembolso === "parcial" && (
                                                    <>
                                                        <div className="cq-input-wrap cq-input-wrap--short">
                                                            <input className="cq-input" type="text" inputMode="decimal" aria-label="Importe a devolver"
                                                                placeholder={politica ? importeTexto(politica.reembolsoCentimos) : ""}
                                                                value={cancelando.importe}
                                                                onChange={(e) => setCancelando({ ...cancelando, importe: e.target.value })} />
                                                            <span className="cq-unit">€</span>
                                                        </div>
                                                        <p className="cq-help">
                                                            Para un acuerdo puntual con el huésped: puede ser más o menos que la política, hasta {euros(maxReembolso)}.
                                                        </p>
                                                    </>
                                                )}
                                                <p className="cq-help">El reembolso vuelve a la tarjeta del cliente en 5-10 días.</p>
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
            <SignModal
                open={firmando === "liberar"}
                title="Firmar liberación de noches"
                lines={[...lineasLiberar, "Solo se liberan reservas que ya no valen y cierres manuales"]}
                onSign={handleFirmarLiberar}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "modificar"}
                title="Firmar cambio de fechas"
                lines={lineasModificar}
                onSign={handleFirmarMod}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "editar"}
                title="Firmar edición de la reserva"
                lines={lineasEditar}
                onSign={handleFirmarEdicion}
                onClose={() => setFirmando(null)}
            />
            <SignModal
                open={firmando === "fianza"}
                title="Firmar devolución de fianza"
                lines={lineasFianza}
                onSign={handleFirmarFianza}
                onClose={() => setFirmando(null)}
            />
        </div>
    );
}