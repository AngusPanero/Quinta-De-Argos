import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { UseTheme } from "../../contexts/ThemeContext";
import "./adminSesHospedajes.css";

const API = import.meta.env.VITE_API_URL;

// Horas por defecto del contrato (se pueden cambiar en cada parte)
const HORA_ENTRADA = "16:00";
const HORA_SALIDA = "11:00";

// ==========================================================
// TIPOS
// ==========================================================

type Estado = "borrador" | "enviando" | "enviado" | "comunicado" | "error" | "anulacion_enviada" | "anulado" | "externo";
type ViaExterno = "portal" | "gestoria" | "otro";
type Origen = "web" | "airbnb" | "booking" | "direct" | "owner";

interface Direccion {
    direccion: string;
    direccionComplementaria: string;
    codigoMunicipio: string;
    nombreMunicipio: string;
    codigoPostal: string;
    pais: string;
}

interface Persona {
    nombre: string;
    apellido1: string;
    apellido2: string;
    tipoDocumento: string;
    numeroDocumento: string;
    soporteDocumento: string;
    fechaNacimiento: string;
    nacionalidad: string;
    sexo: string;
    direccion: Direccion;
    telefono: string;
    telefono2: string;
    correo: string;
    parentesco: string;
}

interface Envio {
    tipo: "alta" | "anulacion";
    entorno?: string;
    lote?: string | null;
    fecha?: string;
    codigoEstado?: number | null;
    descEstado?: string | null;
}

interface Parte {
    _id: string;
    beds24Id?: number | null;
    origen?: Origen | null;
    nombreReserva?: string | null;
    contrato: {
        referencia?: string;
        fechaContrato?: string;
        fechaEntrada?: string;
        fechaSalida?: string;
        numHabitaciones?: number | null;
        internet?: boolean | null;
        pago?: { tipoPago?: string; fechaPago?: string; medioPago?: string; titular?: string };
    };
    personas: Partial<Persona>[];
    estado: Estado;
    codigoComunicacion?: string | null;
    ultimoError?: string | null;
    envios?: Envio[];
    externo?: { fecha?: string | null; via?: ViaExterno; nota?: string; marcadoPor?: string; marcadoEn?: string } | null;
    updatedAt?: string;
}

interface ParteResumen {
    _id: string;
    estado: Estado;
    codigoComunicacion: string | null;
    ultimoError: string | null;
}

interface ReservaSes {
    beds24Id: number;
    source: Origen;
    status: string;
    arrival: string;
    departure: string;
    nights: number;
    numAdult: number;
    numChild: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    country2?: string | null;
    apiReference?: string | null;
    bookingTime?: string | null;
    parte: ParteResumen | null;
}

interface EstadoSes {
    configurado: boolean;
    faltan: string[];
    entorno: "pruebas" | "produccion";
    establecimiento: string | null;
}

interface Draft {
    id: string | null;
    beds24Id: number | null;
    origen: Origen | null;
    nombreReserva: string;
    contrato: {
        referencia: string;
        fechaContrato: string;
        entradaFecha: string;
        entradaHora: string;
        salidaFecha: string;
        salidaHora: string;
        numHabitaciones: string;
        internet: "" | "si" | "no";
        pago: { tipoPago: string; fechaPago: string; medioPago: string; titular: string };
    };
    personas: Persona[];
}

// Formulario «Ya comunicado por fuera»
interface ExternoForm {
    beds24Id: number;
    codigoComunicacion: string;
    fecha: string;
    via: ViaExterno;
    nota: string;
}

type Errors = Record<string, string>;
type SubTab = "reservas" | "historial";
type Notice = { type: "ok" | "error"; text: string } | null;

// ==========================================================
// CATÁLOGOS (manual del Ministerio)
// ==========================================================

const TIPOS_DOCUMENTO = [
    { value: "NIF", label: "DNI español" },
    { value: "NIE", label: "NIE o TIE" },
    { value: "PAS", label: "Pasaporte" },
    { value: "OTRO", label: "Otro documento" },
];

const SEXOS = [
    { value: "H", label: "Hombre" },
    { value: "M", label: "Mujer" },
    { value: "O", label: "Otro" },
];

const PARENTESCOS = [
    { value: "PM", label: "Padre o madre" },
    { value: "HJ", label: "Hijo o hija" },
    { value: "TU", label: "Tutor o tutora" },
    { value: "AB", label: "Abuelo o abuela" },
    { value: "NI", label: "Nieto o nieta" },
    { value: "HR", label: "Hermano o hermana" },
    { value: "TI", label: "Tío o tía" },
    { value: "SB", label: "Sobrino o sobrina" },
    { value: "CY", label: "Cónyuge" },
    { value: "CD", label: "Cuñado o cuñada" },
    { value: "SG", label: "Suegro o suegra" },
    { value: "YN", label: "Yerno o nuera" },
    { value: "BA", label: "Bisabuelo o bisabuela" },
    { value: "BN", label: "Bisnieto o bisnieta" },
    { value: "OT", label: "Otro" },
];

const TIPOS_PAGO = [
    { value: "TARJT", label: "Tarjeta" },
    { value: "PLATF", label: "Plataforma de pago" },
    { value: "TRANS", label: "Transferencia" },
    { value: "EFECT", label: "Efectivo" },
    { value: "MOVIL", label: "Pago por móvil" },
    { value: "DESTI", label: "Pago en destino" },
    { value: "TREG", label: "Tarjeta regalo" },
    { value: "OTRO", label: "Otro" },
];

const ORIGEN_LABEL: Record<Origen, string> = {
    web: "Web",
    airbnb: "Airbnb",
    booking: "Booking",
    direct: "Directa",
    owner: "Uso propio",
};

// Canales que aparecen en «Por comunicar»
const ORIGENES_LISTADOS: Origen[] = ["web", "airbnb", "booking"];

const ESTADO_LABEL: Record<Estado, string> = {
    borrador: "Borrador",
    enviando: "Enviando…",
    enviado: "Esperando respuesta",
    comunicado: "Comunicado",
    error: "Rechazado",
    anulacion_enviada: "Anulación en curso",
    anulado: "Anulado",
    externo: "Comunicado por fuera",
};

const VIA_LABEL: Record<ViaExterno, string> = {
    portal: "en el portal de SES.Hospedajes",
    gestoria: "por la gestoría",
    otro: "por otra vía",
};

// Ya no hay que hacer nada con estas reservas
const yaComunicada = (estado?: Estado) => estado === "comunicado" || estado === "externo";

// ISO 3166-1: alfa-3 + alfa-2 (el alfa-2 sirve para el nombre en español y para Beds24)
const COUNTRY_CODES =
    "ABWAW,AFGAF,AGOAO,AIAAI,ALAAX,ALBAL,ANDAD,AREAE,ARGAR,ARMAM,ASMAS,ATAAQ,ATFTF,ATGAG,AUSAU,AUTAT,AZEAZ,BDIBI,BELBE,BENBJ,BESBQ,BFABF,BGDBD,BGRBG,BHRBH,BHSBS,BIHBA,BLMBL,BLRBY,BLZBZ,BMUBM,BOLBO,BRABR,BRBBB,BRNBN,BTNBT,BVTBV,BWABW,CAFCF,CANCA,CCKCC,CHECH,CHLCL,CHNCN,CIVCI,CMRCM,CODCD,COGCG,COKCK,COLCO,COMKM,CPVCV,CRICR,CUBCU,CUWCW,CXRCX,CYMKY,CYPCY,CZECZ,DEUDE,DJIDJ,DMADM,DNKDK,DOMDO,DZADZ,ECUEC,EGYEG,ERIER,ESHEH,ESPES,ESTEE,ETHET,FINFI,FJIFJ,FLKFK,FRAFR,FROFO,FSMFM,GABGA,GBRGB,GEOGE,GGYGG,GHAGH,GIBGI,GINGN,GLPGP,GMBGM,GNBGW,GNQGQ,GRCGR,GRDGD,GRLGL,GTMGT,GUFGF,GUMGU,GUYGY,HKGHK,HMDHM,HNDHN,HRVHR,HTIHT,HUNHU,IDNID,IMNIM,INDIN,IOTIO,IRLIE,IRNIR,IRQIQ,ISLIS,ISRIL,ITAIT,JAMJM,JEYJE,JORJO,JPNJP,KAZKZ,KENKE,KGZKG,KHMKH,KIRKI,KNAKN,KORKR,KWTKW,LAOLA,LBNLB,LBRLR,LBYLY,LCALC,LIELI,LKALK,LSOLS,LTULT,LUXLU,LVALV,MACMO,MAFMF,MARMA,MCOMC,MDAMD,MDGMG,MDVMV,MEXMX,MHLMH,MKDMK,MLIML,MLTMT,MMRMM,MNEME,MNGMN,MNPMP,MOZMZ,MRTMR,MSRMS,MTQMQ,MUSMU,MWIMW,MYSMY,MYTYT,NAMNA,NCLNC,NERNE,NFKNF,NGANG,NICNI,NIUNU,NLDNL,NORNO,NPLNP,NRUNR,NZLNZ,OMNOM,PAKPK,PANPA,PCNPN,PERPE,PHLPH,PLWPW,PNGPG,POLPL,PRIPR,PRKKP,PRTPT,PRYPY,PSEPS,PYFPF,QATQA,REURE,ROURO,RUSRU,RWARW,SAUSA,SDNSD,SENSN,SGPSG,SGSGS,SHNSH,SJMSJ,SLBSB,SLESL,SLVSV,SMRSM,SOMSO,SPMPM,SRBRS,SSDSS,STPST,SURSR,SVKSK,SVNSI,SWESE,SWZSZ,SXMSX,SYCSC,SYRSY,TCATC,TCDTD,TGOTG,THATH,TJKTJ,TKLTK,TKMTM,TLSTL,TONTO,TTOTT,TUNTN,TURTR,TUVTV,TWNTW,TZATZ,UGAUG,UKRUA,UMIUM,URYUY,USAUS,UZBUZ,VATVA,VCTVC,VENVE,VGBVG,VIRVI,VNMVN,VUTVU,WLFWF,WSMWS,YEMYE,ZAFZA,ZMBZM,ZWEZW";

const COUNTRY_PAIRS = COUNTRY_CODES.split(",").map((s) => ({ a3: s.slice(0, 3), a2: s.slice(3) }));
const A2_TO_A3 = new Map(COUNTRY_PAIRS.map((c) => [c.a2, c.a3]));

const COUNTRIES = (() => {
    let names: Intl.DisplayNames | null = null;
    try {
        names = new Intl.DisplayNames(["es"], { type: "region" });
    } catch {
        names = null;
    }
    const list = COUNTRY_PAIRS.map((c) => ({ code: c.a3, name: names?.of(c.a2) || c.a3 }));
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    const esp = list.findIndex((c) => c.code === "ESP");
    if (esp > 0) list.unshift(...list.splice(esp, 1));
    return list;
})();

// ==========================================================
// UTILIDADES
// ==========================================================

const madridDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
});
const todayMadrid = () => madridDay.format(new Date());
const toMadridDate = (value?: string | null) => (value ? madridDay.format(new Date(value)) : "");

const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const formatDate = (iso?: string) => (iso ? dateFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : "—");
const formatShort = (iso?: string) => (iso ? shortFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : "—");
const formatDateTime = (value?: string) => (value ? dateTimeFmt.format(new Date(value)) : "");

const daysBetween = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

// Número de soporte: DNI = 3 letras + 6 números (AAA123456) · NIE/TIE = 9 caracteres
const SOPORTE_DNI = /^[A-Z]{3}\d{6}$/;
const SOPORTE_DNI_PARCIAL = /^[A-Z]{0,3}$|^[A-Z]{3}\d{0,6}$/;
const limpiarSoporte = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);

/** Error mientras se escribe (sin esperar al servidor). */
function errorSoporte(tipo: string, valor: string): string | undefined {
    if (!valor) return undefined;
    if (tipo === "NIF") {
        if (!SOPORTE_DNI_PARCIAL.test(valor)) return "Son 3 letras y después 6 números (p. ej. AAA123456)";
        if (valor.length === 9 && !SOPORTE_DNI.test(valor)) return "Son 3 letras y 6 números (p. ej. AAA123456)";
    }
    return undefined;
}

function ageOn(birth: string, onDate: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) return null;
    const [by, bm, bd] = birth.split("-").map(Number);
    const [y, m, d] = onDate.split("-").map(Number);
    let age = y - by;
    if (m < bm || (m === bm && d < bd)) age -= 1;
    return age;
}

const emptyDireccion = (): Direccion => ({
    direccion: "", direccionComplementaria: "", codigoMunicipio: "", nombreMunicipio: "", codigoPostal: "", pais: "",
});

const emptyPersona = (): Persona => ({
    nombre: "", apellido1: "", apellido2: "", tipoDocumento: "", numeroDocumento: "", soporteDocumento: "",
    fechaNacimiento: "", nacionalidad: "", sexo: "", direccion: emptyDireccion(),
    telefono: "", telefono2: "", correo: "", parentesco: "",
});

function guestName(r: { firstName?: string | null; lastName?: string | null }) {
    return [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "Sin nombre";
}

function draftFromReserva(r: ReservaSes): Draft {
    const total = Math.max(1, (r.numAdult || 0) + (r.numChild || 0));
    const pais = r.country2 ? A2_TO_A3.get(r.country2.toUpperCase()) || "" : "";
    const [apellido1 = "", ...resto] = (r.lastName || "").trim().split(/\s+/);
    const fechaContrato = toMadridDate(r.bookingTime) || todayMadrid();

    const titular: Persona = {
        ...emptyPersona(),
        nombre: r.firstName || "",
        apellido1,
        apellido2: resto.join(" "),
        nacionalidad: pais,
        correo: r.email || "",
        telefono: r.phone || r.mobile || "",
        direccion: { ...emptyDireccion(), pais },
    };

    return {
        id: null,
        beds24Id: r.beds24Id,
        origen: r.source,
        nombreReserva: guestName(r),
        contrato: {
            referencia: r.apiReference || `QA-${r.beds24Id}`,
            fechaContrato,
            entradaFecha: r.arrival,
            entradaHora: HORA_ENTRADA,
            salidaFecha: r.departure,
            salidaHora: HORA_SALIDA,
            numHabitaciones: "",
            internet: "",
            pago: {
                tipoPago: r.source === "airbnb" || r.source === "booking" ? "PLATF" : r.source === "web" ? "TARJT" : "",
                fechaPago: fechaContrato,
                medioPago: r.source === "web" ? "Stripe" : r.source === "airbnb" ? "Airbnb" : r.source === "booking" ? "Booking.com" : "",
                titular: guestName(r) === "Sin nombre" ? "" : guestName(r),
            },
        },
        personas: [titular, ...Array.from({ length: total - 1 }, emptyPersona)],
    };
}

function draftFromParte(p: Parte): Draft {
    const c = p.contrato || {};
    const pago = c.pago || {};
    return {
        id: p._id,
        beds24Id: p.beds24Id ?? null,
        origen: p.origen ?? null,
        nombreReserva: p.nombreReserva || "",
        contrato: {
            referencia: c.referencia || "",
            fechaContrato: c.fechaContrato || "",
            entradaFecha: c.fechaEntrada?.slice(0, 10) || "",
            entradaHora: c.fechaEntrada?.slice(11, 16) || HORA_ENTRADA,
            salidaFecha: c.fechaSalida?.slice(0, 10) || "",
            salidaHora: c.fechaSalida?.slice(11, 16) || HORA_SALIDA,
            numHabitaciones: c.numHabitaciones ? String(c.numHabitaciones) : "",
            internet: c.internet === true ? "si" : c.internet === false ? "no" : "",
            pago: {
                tipoPago: pago.tipoPago || "",
                fechaPago: pago.fechaPago || "",
                medioPago: pago.medioPago || "",
                titular: pago.titular || "",
            },
        },
        personas: (p.personas || []).map((x) => ({
            ...emptyPersona(),
            ...Object.fromEntries(Object.entries(x).filter(([, v]) => v !== null && v !== undefined)),
            direccion: { ...emptyDireccion(), ...Object.fromEntries(Object.entries(x.direccion || {}).filter(([, v]) => v !== null && v !== undefined)) },
        })) as Persona[],
    };
}

function payloadFromDraft(d: Draft) {
    const c = d.contrato;
    const dt = (date: string, time: string) => (date ? `${date}T${(time || "00:00").slice(0, 5)}:00` : "");
    return {
        beds24Id: d.beds24Id,
        origen: d.origen,
        nombreReserva: d.nombreReserva,
        contrato: {
            referencia: c.referencia,
            fechaContrato: c.fechaContrato,
            fechaEntrada: dt(c.entradaFecha, c.entradaHora),
            fechaSalida: dt(c.salidaFecha, c.salidaHora),
            numHabitaciones: c.numHabitaciones === "" ? null : Number(c.numHabitaciones),
            internet: c.internet === "" ? null : c.internet === "si",
            pago: c.pago,
        },
        personas: d.personas,
    };
}

function apiMessage(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return "Tu sesión ha caducado. Vuelve a iniciar sesión.";
        return err.response?.data?.message || fallback;
    }
    return fallback;
}

function apiErrors(err: unknown): Errors | null {
    if (axios.isAxiosError(err) && err.response?.status === 422) return err.response.data?.errors || {};
    return null;
}

// ==========================================================
// PIEZAS DE FORMULARIO
// ==========================================================

function Field({ label, error, hint, wide, children }: {
    label: string; error?: string; hint?: ReactNode; wide?: boolean; children: ReactNode;
}) {
    return (
        <label className={`sh-field ${wide ? "sh-field--wide" : ""} ${error ? "sh-field--error" : ""}`}>
            <span className="sh-label">{label}</span>
            {children}
            {error ? <span className="sh-field-error">{error}</span> : hint ? <span className="sh-hint">{hint}</span> : null}
        </label>
    );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Elige un país</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
    );
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function AdminSesHospedajes() {
    const { theme } = UseTheme();

    const [subTab, setSubTab] = useState<SubTab>(() => {
        try {
            return localStorage.getItem("qa_ses_tab") === "historial" ? "historial" : "reservas";
        } catch {
            return "reservas";
        }
    });
    const [estadoSes, setEstadoSes] = useState<EstadoSes | null>(null);
    const [estadoError, setEstadoError] = useState<string | null>(null);
    const [reservas, setReservas] = useState<ReservaSes[]>([]);
    const [partes, setPartes] = useState<Parte[]>([]);
    const [today, setToday] = useState(todayMadrid());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [soloPendientes, setSoloPendientes] = useState(true);
    const [notice, setNotice] = useState<Notice>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [externo, setExterno] = useState<ExternoForm | null>(null);
    const [externoErrors, setExternoErrors] = useState<Errors>({});
    const [guardandoExterno, setGuardandoExterno] = useState(false);

    const [draft, setDraft] = useState<Draft | null>(null);
    const [errors, setErrors] = useState<Errors>({});
    const [saving, setSaving] = useState(false);

    const [probando, setProbando] = useState(false);
    const probarConexion = async () => {
        setProbando(true);
        setNotice(null);
        try {
            const { data } = await axios.post(`${API}/api/admin/ses/probar`, {}, { withCredentials: true });
            setNotice({ type: data?.ok ? "ok" : "error", text: data?.message || "Respuesta inesperada del servidor" });
        } catch (err) {
            setNotice({ type: "error", text: apiMessage(err, "No se ha podido probar la conexión") });
        } finally {
            setProbando(false);
        }
    };

    const changeSubTab = (t: SubTab) => {
        setSubTab(t);
        setNotice(null);
        try {
            localStorage.setItem("qa_ses_tab", t);
        } catch {
            // sin storage: la pestaña no se recuerda
        }
    };

    // ---------- Carga ----------
    useEffect(() => {
        axios.get(`${API}/api/admin/ses/estado`, { withCredentials: true })
            .then(({ data }) => {
                // Si la ruta no existe en el backend puede llegar otra cosa (HTML, un objeto vacío…)
                if (!data || typeof data !== "object" || typeof data.configurado !== "boolean") {
                    setEstadoSes(null);
                    setEstadoError("El servidor no reconoce las rutas del registro de viajeros. Revisa que sesHospedajesRouter esté montado en index.js y desplegado.");
                    return;
                }
                setEstadoSes({
                    configurado: data.configurado,
                    faltan: Array.isArray(data.faltan) ? data.faltan : [],
                    entorno: data.entorno === "produccion" ? "produccion" : "pruebas",
                    establecimiento: data.establecimiento ?? null,
                });
            })
            .catch((err) => {
                setEstadoSes(null);
                setEstadoError(axios.isAxiosError(err) && err.response?.status === 404
                    ? "El servidor no reconoce las rutas del registro de viajeros. Revisa que sesHospedajesRouter esté montado en index.js y desplegado."
                    : apiMessage(err, "No se ha podido comprobar la configuración del servicio web."));
            });
    }, []);

    const loadReservas = useCallback(async () => {
        const { data } = await axios.get(`${API}/api/admin/ses/reservas`, { withCredentials: true });
        setReservas(Array.isArray(data?.reservas) ? data.reservas : []);
        if (data.today) setToday(data.today);
    }, []);

    const loadPartes = useCallback(async () => {
        const { data } = await axios.get(`${API}/api/admin/ses/partes`, { withCredentials: true });
        setPartes(Array.isArray(data?.partes) ? data.partes : []);
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            await (subTab === "reservas" ? loadReservas() : loadPartes());
        } catch (err) {
            setLoadError(apiMessage(err, "No se han podido cargar los datos. Inténtalo de nuevo en unos segundos."));
        } finally {
            setLoading(false);
        }
    }, [subTab, loadReservas, loadPartes]);

    useEffect(() => {
        if (!draft) reload();
    }, [reload, draft]);

    // Mientras haya lotes sin respuesta, el historial se actualiza solo cada 20 s
    const listaPartes = Array.isArray(partes) ? partes : [];
    const hayPendientes = listaPartes.some((p) => p.estado === "enviado" || p.estado === "anulacion_enviada");
    useEffect(() => {
        if (subTab !== "historial" || draft || !hayPendientes) return;
        const id = setInterval(() => { loadPartes().catch(() => undefined); }, 20000);
        return () => clearInterval(id);
    }, [subTab, draft, hayPendientes, loadPartes]);

    // ---------- Abrir editor ----------
    const openFromReserva = async (r: ReservaSes) => {
        setNotice(null);
        setErrors({});
        if (!r.parte) {
            setDraft(draftFromReserva(r));
            return;
        }
        try {
            const { data } = await axios.get(`${API}/api/admin/ses/partes/${r.parte._id}`, { withCredentials: true });
            const parte: Parte = data.parte;
            if (parte.estado === "borrador" || parte.estado === "error") {
                setDraft(draftFromParte(parte));
                if (parte.ultimoError) setNotice({ type: "error", text: `El Ministerio rechazó el envío anterior: ${parte.ultimoError}` });
            } else {
                changeSubTab("historial");
            }
        } catch (err) {
            setNotice({ type: "error", text: apiMessage(err, "No se ha podido abrir el parte") });
        }
    };

    const openParte = (p: Parte) => {
        setNotice(p.ultimoError ? { type: "error", text: `El Ministerio rechazó el envío anterior: ${p.ultimoError}` } : null);
        setErrors({});
        setDraft(draftFromParte(p));
    };

    const newManual = () => {
        setNotice(null);
        setErrors({});
        const base = draftFromReserva({
            beds24Id: 0, source: "direct", status: "confirmed", arrival: todayMadrid(), departure: "", nights: 0,
            numAdult: 1, numChild: 0, parte: null,
        });
        setDraft({
            ...base,
            beds24Id: null,
            origen: null,
            nombreReserva: "",
            contrato: { ...base.contrato, referencia: "", pago: { ...base.contrato.pago, medioPago: "", titular: "" } },
        });
    };

    // ---------- Comunicado por fuera ----------
    const abrirExterno = (r: ReservaSes) => {
        setNotice(null);
        setExternoErrors({});
        setExterno({ beds24Id: r.beds24Id, codigoComunicacion: "", fecha: "", via: "portal", nota: "" });
    };

    const guardarExterno = async () => {
        if (!externo) return;
        setGuardandoExterno(true);
        setExternoErrors({});
        try {
            const { beds24Id, ...body } = externo;
            await axios.post(`${API}/api/admin/ses/reservas/${beds24Id}/externo`, body, { withCredentials: true });
            setExterno(null);
            setNotice({ type: "ok", text: "Marcada como comunicada por fuera. Ya no aparece como pendiente y queda en el historial." });
            await loadReservas();
        } catch (err) {
            const fieldErrors = apiErrors(err);
            if (fieldErrors) setExternoErrors(fieldErrors);
            setNotice({ type: "error", text: apiMessage(err, "No se ha podido guardar") });
        } finally {
            setGuardandoExterno(false);
        }
    };

    const closeEditor = () => {
        setDraft(null);
        setErrors({});
    };

    // ---------- Guardar y enviar ----------
    const save = async (enviar: boolean) => {
        if (!draft) return;
        if (enviar && estadoSes?.entorno === "produccion"
            && !window.confirm("Se va a enviar el parte al Ministerio del Interior. ¿Continuar?")) return;

        setSaving(true);
        setErrors({});
        setNotice(null);
        try {
            const payload = payloadFromDraft(draft);
            const { data } = draft.id
                ? await axios.put(`${API}/api/admin/ses/partes/${draft.id}`, payload, { withCredentials: true })
                : await axios.post(`${API}/api/admin/ses/partes`, payload, { withCredentials: true });
            const saved: Parte = data.parte;
            setDraft((d) => (d ? { ...d, id: saved._id } : d));

            if (!enviar) {
                setNotice({ type: "ok", text: "Borrador guardado." });
                return;
            }

            const res = await axios.post(`${API}/api/admin/ses/partes/${saved._id}/enviar`, {}, { withCredentials: true });
            const sent: Parte = res.data.parte;
            setDraft(null);
            changeSubTab("historial");
            setNotice(sent.estado === "error"
                ? { type: "error", text: `El Ministerio rechazó el parte: ${sent.ultimoError}` }
                : { type: "ok", text: "Parte enviado. En unos minutos el Ministerio confirma si lo acepta; esta lista se actualiza sola." });
        } catch (err) {
            const fieldErrors = apiErrors(err);
            if (fieldErrors) setErrors(fieldErrors);
            setNotice({ type: "error", text: apiMessage(err, "No se ha podido guardar el parte") });
        } finally {
            setSaving(false);
        }
    };

    // ---------- Acciones del historial ----------
    const runAction = async (p: Parte, action: "enviar" | "consultar" | "anular" | "borrar") => {
        if (action === "anular" && !window.confirm("Se anulará este parte en SES.Hospedajes. ¿Continuar?")) return;
        if (action === "borrar" && !window.confirm(p.estado === "externo"
            ? "¿Quitar la marca de «comunicado por fuera»? La reserva volverá a aparecer en «Por comunicar»."
            : "¿Borrar este parte? No se ha comunicado al Ministerio.")) return;
        if (action === "enviar" && estadoSes?.entorno === "produccion"
            && !window.confirm("Se va a enviar el parte al Ministerio del Interior. ¿Continuar?")) return;

        setBusyId(p._id);
        setNotice(null);
        try {
            if (action === "borrar") {
                await axios.delete(`${API}/api/admin/ses/partes/${p._id}`, { withCredentials: true });
                setPartes((prev) => prev.filter((x) => x._id !== p._id));
                setNotice({ type: "ok", text: p.estado === "externo" ? "Marca quitada." : "Parte borrado." });
                return;
            }
            const { data } = await axios.post(`${API}/api/admin/ses/partes/${p._id}/${action}`, {}, { withCredentials: true });
            const updated: Parte = data.parte;
            setPartes((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
            if (updated.estado === "error") setNotice({ type: "error", text: `El Ministerio rechazó el parte: ${updated.ultimoError}` });
            else if (action === "consultar" && (updated.estado === "enviado" || updated.estado === "anulacion_enviada")) {
                setNotice({ type: "ok", text: "El Ministerio todavía lo está procesando. Vuelve a consultar en unos minutos." });
            }
        } catch (err) {
            const fieldErrors = apiErrors(err);
            if (fieldErrors) {
                setDraft(draftFromParte(p));
                setErrors(fieldErrors);
            }
            setNotice({ type: "error", text: apiMessage(err, "No se ha podido completar la acción") });
        } finally {
            setBusyId(null);
        }
    };

    // ---------- Edición del borrador ----------
    const setContrato = <K extends keyof Draft["contrato"]>(key: K, value: Draft["contrato"][K]) =>
        setDraft((d) => (d ? { ...d, contrato: { ...d.contrato, [key]: value } } : d));

    const setPago = (key: keyof Draft["contrato"]["pago"], value: string) =>
        setDraft((d) => (d ? { ...d, contrato: { ...d.contrato, pago: { ...d.contrato.pago, [key]: value } } } : d));

    const setPersona = (i: number, patch: Partial<Persona>) =>
        setDraft((d) => (d ? { ...d, personas: d.personas.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) } : d));

    const setDireccion = (i: number, patch: Partial<Direccion>) =>
        setDraft((d) => (d ? {
            ...d,
            personas: d.personas.map((p, idx) => (idx === i ? { ...p, direccion: { ...p.direccion, ...patch } } : p)),
        } : d));

    const addPersona = () => setDraft((d) => (d ? { ...d, personas: [...d.personas, emptyPersona()] } : d));
    const removePersona = (i: number) =>
        setDraft((d) => (d ? { ...d, personas: d.personas.filter((_, idx) => idx !== i) } : d));

    const copyFromFirst = (i: number, what: "direccion" | "contacto") =>
        setDraft((d) => {
            if (!d) return d;
            const first = d.personas[0];
            const patch = what === "direccion"
                ? { direccion: { ...first.direccion } }
                : { telefono: first.telefono, correo: first.correo };
            return { ...d, personas: d.personas.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) };
        });

    // ---------- Listas ----------
    // Solo reservas de la web, Airbnb y Booking (ni directas ni usos propios)
    const reservasVisibles = useMemo(
        () => {
            const list = (Array.isArray(reservas) ? reservas : []).filter((r) => ORIGENES_LISTADOS.includes(r.source));
            return soloPendientes ? list.filter((r) => !yaComunicada(r.parte?.estado)) : list;
        },
        [reservas, soloPendientes]
    );

    const plazo = (r: ReservaSes) => {
        if (yaComunicada(r.parte?.estado)) return null;
        const diff = daysBetween(today, r.arrival);
        if (diff < 0) return { cls: "sh-due--late", text: "Fuera de plazo" };
        if (diff === 0) return { cls: "sh-due--today", text: "Llega hoy" };
        if (diff <= 2) return { cls: "sh-due--soon", text: diff === 1 ? "Llega mañana" : `Llega en ${diff} días` };
        return null;
    };

    const e = (path: string) => errors[path];

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
        <section className={`sh-page ${theme === "dark" ? "theme-dark" : ""}`}>
            <div className="sh-inner">
                <header className="sh-header">
                    <div>
                        <h1 className="sh-title">Registro de viajeros</h1>
                        <p className="sh-subtitle">Partes de viajeros a SES.Hospedajes, del Ministerio del Interior (Real Decreto 933/2021)</p>
                    </div>
                    {estadoSes && (
                        <div className="sh-env">
                            <span className={`sh-env-pill ${estadoSes.entorno === "produccion" ? "sh-env-pill--prod" : ""}`}>
                                {estadoSes.entorno === "produccion" ? "Producción" : "Entorno de pruebas"}
                            </span>
                            {estadoSes.establecimiento && <span className="sh-env-code">Establecimiento {estadoSes.establecimiento}</span>}
                            {estadoSes.configurado && (
                                <button className="sh-link" onClick={probarConexion} disabled={probando}>
                                    {probando ? "Probando…" : "Probar conexión"}
                                </button>
                            )}
                        </div>
                    )}
                </header>

                {estadoSes && !estadoSes.configurado && (
                    <p className="sh-alert sh-alert--warn" role="alert">
                        Falta configurar el servicio web del Ministerio en el servidor
                        {estadoSes.faltan.length > 0 && <> ({estadoSes.faltan.join(", ")})</>}.
                        Puedes preparar los partes, pero no enviarlos.
                    </p>
                )}

                {estadoError && <p className="sh-alert sh-alert--error" role="alert">{estadoError}</p>}

                {notice && (
                    <p className={`sh-alert ${notice.type === "error" ? "sh-alert--error" : "sh-alert--ok"}`} role={notice.type === "error" ? "alert" : "status"}>
                        {notice.text}
                    </p>
                )}

                {/* ---------------- EDITOR ---------------- */}
                {draft ? (
                    <div className="sh-editor">
                        <div className="sh-editor-head">
                            <button className="sh-link" onClick={closeEditor}>‹ Volver</button>
                            <h2 className="sh-editor-title">
                                {draft.nombreReserva || "Parte sin reserva"}
                                {draft.origen && <span className={`sh-source sh-source--${draft.origen}`}>{ORIGEN_LABEL[draft.origen]}</span>}
                            </h2>
                        </div>

                        <section className="sh-card">
                            <h3 className="sh-card-title">Contrato</h3>
                            <div className="sh-grid">
                                <Field label="Referencia" error={e("contrato.referencia")} hint="Nº de reserva o de contrato">
                                    <input value={draft.contrato.referencia} maxLength={50}
                                        onChange={(ev) => setContrato("referencia", ev.target.value)} />
                                </Field>
                                <Field label="Fecha del contrato" error={e("contrato.fechaContrato")}>
                                    <input type="date" value={draft.contrato.fechaContrato}
                                        onChange={(ev) => setContrato("fechaContrato", ev.target.value)} />
                                </Field>
                                <Field label="Entrada" error={e("contrato.fechaEntrada")}>
                                    <span className="sh-pair">
                                        <input type="date" value={draft.contrato.entradaFecha}
                                            onChange={(ev) => setContrato("entradaFecha", ev.target.value)} />
                                        <input type="time" value={draft.contrato.entradaHora} aria-label="Hora de entrada"
                                            onChange={(ev) => setContrato("entradaHora", ev.target.value)} />
                                    </span>
                                </Field>
                                <Field label="Salida" error={e("contrato.fechaSalida")}>
                                    <span className="sh-pair">
                                        <input type="date" value={draft.contrato.salidaFecha}
                                            onChange={(ev) => setContrato("salidaFecha", ev.target.value)} />
                                        <input type="time" value={draft.contrato.salidaHora} aria-label="Hora de salida"
                                            onChange={(ev) => setContrato("salidaHora", ev.target.value)} />
                                    </span>
                                </Field>
                                <Field label="Habitaciones" error={e("contrato.numHabitaciones")} hint="Opcional">
                                    <input type="number" min={1} inputMode="numeric" value={draft.contrato.numHabitaciones}
                                        onChange={(ev) => setContrato("numHabitaciones", ev.target.value)} />
                                </Field>
                                <Field label="Internet" hint="Opcional">
                                    <select value={draft.contrato.internet}
                                        onChange={(ev) => setContrato("internet", ev.target.value as Draft["contrato"]["internet"])}>
                                        <option value="">Sin indicar</option>
                                        <option value="si">Sí</option>
                                        <option value="no">No</option>
                                    </select>
                                </Field>
                            </div>

                            <h4 className="sh-sub-title">Pago</h4>
                            <div className="sh-grid">
                                <Field label="Tipo de pago" error={e("contrato.pago.tipoPago")}>
                                    <select value={draft.contrato.pago.tipoPago} onChange={(ev) => setPago("tipoPago", ev.target.value)}>
                                        <option value="">Elige uno</option>
                                        {TIPOS_PAGO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Fecha del pago" error={e("contrato.pago.fechaPago")} hint="Opcional">
                                    <input type="date" value={draft.contrato.pago.fechaPago} onChange={(ev) => setPago("fechaPago", ev.target.value)} />
                                </Field>
                                <Field label="Medio de pago" error={e("contrato.pago.medioPago")} hint="Opcional, p. ej. Stripe o Airbnb">
                                    <input value={draft.contrato.pago.medioPago} maxLength={50} onChange={(ev) => setPago("medioPago", ev.target.value)} />
                                </Field>
                                <Field label="Titular del pago" error={e("contrato.pago.titular")} hint="Opcional">
                                    <input value={draft.contrato.pago.titular} maxLength={100} onChange={(ev) => setPago("titular", ev.target.value)} />
                                </Field>
                            </div>
                        </section>

                        {e("personas") && <p className="sh-alert sh-alert--error" role="alert">{e("personas")}</p>}

                        {draft.personas.map((p, i) => {
                            const k = (f: string) => e(`personas.${i}.${f}`);
                            const edad = ageOn(p.fechaNacimiento, draft.contrato.entradaFecha || today);
                            const menor = edad !== null && edad < 18;
                            const conSoporte = p.tipoDocumento === "NIF" || p.tipoDocumento === "NIE";
                            return (
                                <section key={i} className="sh-card">
                                    <div className="sh-card-head">
                                        <h3 className="sh-card-title">
                                            Viajero {i + 1}
                                            {menor && <span className="sh-tag">Menor</span>}
                                        </h3>
                                        <div className="sh-card-actions">
                                            {i > 0 && (
                                                <>
                                                    <button type="button" className="sh-link" onClick={() => copyFromFirst(i, "direccion")}>Copiar dirección del viajero 1</button>
                                                    <button type="button" className="sh-link" onClick={() => copyFromFirst(i, "contacto")}>Copiar contacto</button>
                                                </>
                                            )}
                                            {draft.personas.length > 1 && (
                                                <button type="button" className="sh-link sh-link--danger" onClick={() => removePersona(i)}>Quitar</button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sh-grid">
                                        <Field label="Nombre" error={k("nombre")}>
                                            <input value={p.nombre} maxLength={50} autoComplete="off" onChange={(ev) => setPersona(i, { nombre: ev.target.value })} />
                                        </Field>
                                        <Field label="Primer apellido" error={k("apellido1")}>
                                            <input value={p.apellido1} maxLength={50} autoComplete="off" onChange={(ev) => setPersona(i, { apellido1: ev.target.value })} />
                                        </Field>
                                        <Field label="Segundo apellido" error={k("apellido2")} hint={p.tipoDocumento === "NIF" ? "Obligatorio con DNI" : "Opcional"}>
                                            <input value={p.apellido2} maxLength={50} autoComplete="off" onChange={(ev) => setPersona(i, { apellido2: ev.target.value })} />
                                        </Field>
                                        <Field label="Fecha de nacimiento" error={k("fechaNacimiento")}
                                            hint={edad !== null ? `${edad} ${edad === 1 ? "año" : "años"} a la entrada` : undefined}>
                                            <input type="date" value={p.fechaNacimiento} max={today}
                                                onChange={(ev) => setPersona(i, { fechaNacimiento: ev.target.value })} />
                                        </Field>
                                        <Field label="Sexo" error={k("sexo")} hint="Opcional">
                                            <select value={p.sexo} onChange={(ev) => setPersona(i, { sexo: ev.target.value })}>
                                                <option value="">Sin indicar</option>
                                                {SEXOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Nacionalidad" error={k("nacionalidad")} hint="Opcional">
                                            <CountrySelect value={p.nacionalidad} onChange={(v) => setPersona(i, { nacionalidad: v })} />
                                        </Field>

                                        <Field label="Tipo de documento" error={k("tipoDocumento")} hint={menor ? "Opcional en menores" : undefined}>
                                            <select value={p.tipoDocumento}
                                                onChange={(ev) => setPersona(i, { tipoDocumento: ev.target.value, soporteDocumento: ["NIF", "NIE"].includes(ev.target.value) ? p.soporteDocumento : "" })}>
                                                <option value="">Sin documento</option>
                                                {TIPOS_DOCUMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Número de documento" error={k("numeroDocumento")}>
                                            <input value={p.numeroDocumento} maxLength={20} autoComplete="off" autoCapitalize="characters"
                                                onChange={(ev) => setPersona(i, { numeroDocumento: ev.target.value })} />
                                        </Field>
                                        {conSoporte && (
                                            <Field label="Número de soporte" error={k("soporteDocumento") || errorSoporte(p.tipoDocumento, p.soporteDocumento)}
                                                hint={p.tipoDocumento === "NIF"
                                                    ? <>3 letras y 6 números ({p.soporteDocumento.length}/9). En el DNI aparece como «IDESP» o «Nº soporte»</>
                                                    : <>9 caracteres ({p.soporteDocumento.length}/9). En la tarjeta del NIE o TIE</>}>
                                                <input value={p.soporteDocumento} maxLength={9} autoComplete="off" autoCapitalize="characters"
                                                    spellCheck={false} placeholder={p.tipoDocumento === "NIF" ? "AAA123456" : ""}
                                                    onChange={(ev) => setPersona(i, { soporteDocumento: limpiarSoporte(ev.target.value) })} />
                                            </Field>
                                        )}
                                    </div>

                                    <h4 className="sh-sub-title">Domicilio</h4>
                                    <div className="sh-grid">
                                        <Field label="Dirección" error={k("direccion.direccion")} wide>
                                            <input value={p.direccion.direccion} maxLength={100}
                                                onChange={(ev) => setDireccion(i, { direccion: ev.target.value })} />
                                        </Field>
                                        <Field label="Complemento" error={k("direccion.direccionComplementaria")} hint="Opcional: piso, puerta…">
                                            <input value={p.direccion.direccionComplementaria} maxLength={100}
                                                onChange={(ev) => setDireccion(i, { direccionComplementaria: ev.target.value })} />
                                        </Field>
                                        <Field label="País" error={k("direccion.pais")}>
                                            <CountrySelect value={p.direccion.pais} onChange={(v) => setDireccion(i, { pais: v })} />
                                        </Field>
                                        <Field label="Código postal" error={k("direccion.codigoPostal")}>
                                            <input value={p.direccion.codigoPostal} maxLength={20}
                                                onChange={(ev) => setDireccion(i, { codigoPostal: ev.target.value })} />
                                        </Field>
                                        {p.direccion.pais === "ESP" ? (
                                            <Field label="Código de municipio (INE)" error={k("direccion.codigoMunicipio")}
                                                hint={<>5 cifras. <a href="https://www.ine.es/daco/daco42/codmun/codmunmapa.htm" target="_blank" rel="noreferrer">Buscar en el INE</a></>}>
                                                <input value={p.direccion.codigoMunicipio} maxLength={5} inputMode="numeric"
                                                    onChange={(ev) => setDireccion(i, { codigoMunicipio: ev.target.value.replace(/\D/g, "") })} />
                                            </Field>
                                        ) : (
                                            <Field label="Municipio" error={k("direccion.nombreMunicipio")}>
                                                <input value={p.direccion.nombreMunicipio} maxLength={100}
                                                    onChange={(ev) => setDireccion(i, { nombreMunicipio: ev.target.value })} />
                                            </Field>
                                        )}
                                    </div>

                                    <h4 className="sh-sub-title">Contacto y parentesco</h4>
                                    <div className="sh-grid">
                                        <Field label="Teléfono" error={k("telefono")} hint="Teléfono o correo: al menos uno">
                                            <input type="tel" value={p.telefono} maxLength={20} onChange={(ev) => setPersona(i, { telefono: ev.target.value })} />
                                        </Field>
                                        <Field label="Correo" error={k("correo")}>
                                            <input type="email" value={p.correo} maxLength={50} onChange={(ev) => setPersona(i, { correo: ev.target.value })} />
                                        </Field>
                                        <Field label="Parentesco" error={k("parentesco")}
                                            hint={menor ? "Qué es el menor del adulto (p. ej. Hijo o hija)" : "Solo si viaja con menores: qué es del menor (p. ej. Padre o madre)"}>
                                            <select value={p.parentesco} onChange={(ev) => setPersona(i, { parentesco: ev.target.value })}>
                                                <option value="">Sin indicar</option>
                                                {PARENTESCOS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                </section>
                            );
                        })}

                        <button type="button" className="sh-add" onClick={addPersona}>+ Añadir viajero</button>

                        <div className="sh-editor-actions">
                            <button className="sh-btn sh-btn--ghost" onClick={() => save(false)} disabled={saving}>
                                Guardar borrador
                            </button>
                            <button className="sh-btn" onClick={() => save(true)} disabled={saving || !estadoSes?.configurado}>
                                {saving ? "Enviando…" : "Guardar y enviar al Ministerio"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ---------------- LISTAS ---------------- */}
                        <div className="sh-toolbar">
                            <nav className="sh-tabs" role="tablist">
                                <button role="tab" aria-selected={subTab === "reservas"}
                                    className={`sh-tab ${subTab === "reservas" ? "sh-tab--on" : ""}`} onClick={() => changeSubTab("reservas")}>
                                    Por comunicar
                                </button>
                                <button role="tab" aria-selected={subTab === "historial"}
                                    className={`sh-tab ${subTab === "historial" ? "sh-tab--on" : ""}`} onClick={() => changeSubTab("historial")}>
                                    Historial
                                </button>
                            </nav>
                            <div className="sh-toolbar-right">
                                {subTab === "reservas" && (
                                    <label className="sh-check">
                                        <input type="checkbox" checked={soloPendientes} onChange={(ev) => setSoloPendientes(ev.target.checked)} />
                                        <span>Ocultar las ya comunicadas</span>
                                    </label>
                                )}
                                <button className="sh-btn sh-btn--ghost sh-btn--small" onClick={newManual}>Parte sin reserva</button>
                            </div>
                        </div>

                        {loadError && <p className="sh-alert sh-alert--error" role="alert">{loadError}</p>}
                        {loading && <p className="sh-empty">Cargando…</p>}

                        {!loading && !loadError && subTab === "reservas" && (
                            reservasVisibles.length === 0 ? (
                                <p className="sh-empty">No hay reservas de la web, Airbnb o Booking pendientes de comunicar entre los últimos 30 días y los próximos 60.</p>
                            ) : (
                                <ul className="sh-list">
                                    {reservasVisibles.map((r) => {
                                        const due = plazo(r);
                                        const est = r.parte?.estado;
                                        const formAbierto = externo?.beds24Id === r.beds24Id;
                                        const puedeMarcar = !r.parte || est === "borrador" || est === "error";
                                        return (
                                            <li key={r.beds24Id} className={`sh-row ${formAbierto ? "sh-row--abierta" : ""}`}>
                                                <div className="sh-row-main">
                                                    <span className="sh-row-dates">{formatShort(r.arrival)} – {formatDate(r.departure)}</span>
                                                    <span className="sh-row-name">{guestName(r)}</span>
                                                    <span className="sh-row-meta">
                                                        <span className={`sh-source sh-source--${r.source}`}>{ORIGEN_LABEL[r.source]}</span>
                                                        {(r.numAdult || 0) + (r.numChild || 0)} {(r.numAdult || 0) + (r.numChild || 0) === 1 ? "viajero" : "viajeros"}
                                                    </span>
                                                </div>
                                                <div className="sh-row-side">
                                                    {est ? <span className={`sh-state sh-state--${est}`}>{ESTADO_LABEL[est]}</span>
                                                        : <span className="sh-state sh-state--none">Sin parte</span>}
                                                    {due && <span className={`sh-due ${due.cls}`}>{due.text}</span>}
                                                    {puedeMarcar && !formAbierto && (
                                                        <button className="sh-link" onClick={() => abrirExterno(r)}>Ya comunicado por fuera</button>
                                                    )}
                                                    <button className="sh-btn sh-btn--small" onClick={() => openFromReserva(r)}>
                                                        {!r.parte ? "Rellenar parte" : est === "borrador" || est === "error" ? "Continuar" : "Ver"}
                                                    </button>
                                                </div>

                                                {formAbierto && externo && (
                                                    <div className="sh-externo">
                                                        <p className="sh-externo-intro">
                                                            Para reservas que ya se dieron de alta en SES.Hospedajes por otra vía (portal con certificado
                                                            digital, gestoría…). No se envía nada al Ministerio: solo se deja constancia aquí.
                                                        </p>
                                                        <div className="sh-grid">
                                                            <Field label="Cómo se comunicó">
                                                                <select value={externo.via} onChange={(ev) => setExterno({ ...externo, via: ev.target.value as ViaExterno })}>
                                                                    <option value="portal">Portal de SES.Hospedajes</option>
                                                                    <option value="gestoria">Gestoría</option>
                                                                    <option value="otro">Otra vía</option>
                                                                </select>
                                                            </Field>
                                                            <Field label="Fecha de la comunicación" error={externoErrors.fecha} hint="Opcional">
                                                                <input type="date" value={externo.fecha} max={today}
                                                                    onChange={(ev) => setExterno({ ...externo, fecha: ev.target.value })} />
                                                            </Field>
                                                            <Field label="Código de comunicación" error={externoErrors.codigoComunicacion}
                                                                hint="Opcional, pero recomendable: es la prueba ante una inspección">
                                                                <input value={externo.codigoComunicacion} maxLength={60} autoComplete="off" autoCapitalize="characters"
                                                                    onChange={(ev) => setExterno({ ...externo, codigoComunicacion: ev.target.value })} />
                                                            </Field>
                                                            <Field label="Nota" error={externoErrors.nota} hint="Opcional" wide>
                                                                <input value={externo.nota} maxLength={300}
                                                                    onChange={(ev) => setExterno({ ...externo, nota: ev.target.value })} />
                                                            </Field>
                                                        </div>
                                                        <div className="sh-externo-actions">
                                                            <button className="sh-btn sh-btn--ghost sh-btn--small" onClick={() => setExterno(null)} disabled={guardandoExterno}>
                                                                Cancelar
                                                            </button>
                                                            <button className="sh-btn sh-btn--small" onClick={guardarExterno} disabled={guardandoExterno}>
                                                                {guardandoExterno ? "Guardando…" : "Marcar como comunicado"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )
                        )}

                        {!loading && !loadError && subTab === "historial" && (
                            listaPartes.length === 0 ? (
                                <p className="sh-empty">Todavía no hay partes.</p>
                            ) : (
                                <ul className="sh-list">
                                    {listaPartes.map((p) => {
                                        const last = p.envios?.[p.envios.length - 1];
                                        const titular = p.personas?.[0];
                                        const nombre = p.nombreReserva || [titular?.nombre, titular?.apellido1].filter(Boolean).join(" ") || "Sin nombre";
                                        const busy = busyId === p._id;
                                        return (
                                            <li key={p._id} className="sh-row sh-row--parte">
                                                <div className="sh-row-main">
                                                    <span className="sh-row-dates">
                                                        {formatShort(p.contrato?.fechaEntrada)} – {formatDate(p.contrato?.fechaSalida)}
                                                    </span>
                                                    <span className="sh-row-name">{nombre}</span>
                                                    <span className="sh-row-meta">
                                                        {p.origen && <span className={`sh-source sh-source--${p.origen}`}>{ORIGEN_LABEL[p.origen]}</span>}
                                                        {p.personas?.length || 0} {(p.personas?.length || 0) === 1 ? "viajero" : "viajeros"}
                                                        {p.contrato?.referencia && <> · Ref. {p.contrato.referencia}</>}
                                                    </span>
                                                    {p.estado === "externo" && (
                                                        <span className="sh-row-code">
                                                            Dado de alta fuera de la web de Quinta de Argos, {VIA_LABEL[p.externo?.via || "portal"]}
                                                            {p.externo?.fecha && <> el {formatDate(p.externo.fecha)}</>}
                                                            {p.externo?.marcadoPor && <> · marcado por {p.externo.marcadoPor}</>}
                                                        </span>
                                                    )}
                                                    {p.externo?.nota && <span className="sh-row-code">Nota: {p.externo.nota}</span>}
                                                    {p.codigoComunicacion && (
                                                        <span className="sh-row-code">Código de comunicación: <code>{p.codigoComunicacion}</code></span>
                                                    )}
                                                    {last?.fecha && (
                                                        <span className="sh-row-code">
                                                            {last.tipo === "anulacion" ? "Anulación enviada" : "Enviado"} el {formatDateTime(last.fecha)}
                                                            {last.entorno === "pruebas" && " (pruebas)"}
                                                            {last.lote && <> · Lote <code>{last.lote}</code></>}
                                                        </span>
                                                    )}
                                                    {p.ultimoError && <span className="sh-row-error">{p.ultimoError}</span>}
                                                </div>
                                                <div className="sh-row-side">
                                                    <span className={`sh-state sh-state--${p.estado}`}>{ESTADO_LABEL[p.estado]}</span>
                                                    <div className="sh-row-actions">
                                                        {(p.estado === "borrador" || p.estado === "error") && (
                                                            <>
                                                                <button className="sh-btn sh-btn--ghost sh-btn--small" onClick={() => openParte(p)} disabled={busy}>Editar</button>
                                                                <button className="sh-btn sh-btn--small" onClick={() => runAction(p, "enviar")}
                                                                    disabled={busy || !estadoSes?.configurado}>
                                                                    {busy ? "Enviando…" : "Enviar"}
                                                                </button>
                                                                <button className="sh-link sh-link--danger" onClick={() => runAction(p, "borrar")} disabled={busy}>Borrar</button>
                                                            </>
                                                        )}
                                                        {(p.estado === "enviado" || p.estado === "anulacion_enviada") && (
                                                            <button className="sh-btn sh-btn--ghost sh-btn--small" onClick={() => runAction(p, "consultar")} disabled={busy}>
                                                                {busy ? "Consultando…" : "Consultar ahora"}
                                                            </button>
                                                        )}
                                                        {p.estado === "externo" && (
                                                            <button className="sh-link sh-link--danger" onClick={() => runAction(p, "borrar")} disabled={busy}>
                                                                Quitar marca
                                                            </button>
                                                        )}
                                                        {p.estado === "comunicado" && (
                                                            <button className="sh-link sh-link--danger" onClick={() => runAction(p, "anular")}
                                                                disabled={busy || !estadoSes?.configurado}>
                                                                {busy ? "Anulando…" : "Anular"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )
                        )}

                        <p className="sh-footnote">
                            El parte se comunica en las 24 horas siguientes a la entrada. Solo cuenta como hecho cuando aparece
                            «Comunicado» con su código: ese código es la prueba ante una inspección. Los datos se conservan 3 años.
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}