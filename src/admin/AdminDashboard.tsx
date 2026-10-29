import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import axios from "axios";
import Loader from "../loader/Loader";
import Error from "../processMessages/Error";
import AdminReservas from "./reservas/AdminReservas";
import "./adminDashboard.css";
import ConfigQuinta from "./reservas/config/ConfigQuinta";
import { UseTheme } from "../contexts/ThemeContext";
import ReservasWebTab from "./reservas/ReservasWebTab";
import AdminSesHospedajes from "./reservas/AdminSesHospedajes";

// Secciones del panel. El orden del array es el orden de las pestañas,
// y la primera es la que se abre si no hay nada guardado.
// Para sumar una sección nueva, agregá un objeto acá y listo.
const SECTIONS = [
    { id: "reservas", label: "Reservas", render: () => <AdminReservas /> },
    { id: "historial", label: "Reservas Web", render: () => <ReservasWebTab /> },
    { id: "viajeros", label: "Registro de viajeros", render: () => <AdminSesHospedajes /> },
    { id: "configuracion", label: "Configuración", render: () => <ConfigQuinta /> },
] as const satisfies ReadonlyArray<{ id: string; label: string; render: () => ReactNode }>;

type SectionId = (typeof SECTIONS)[number]["id"];

const STORAGE_KEY = import.meta.env.VITE_STORAGE_KEY;
const DEFAULT_SECTION: SectionId = SECTIONS[0].id;

const isSectionId = (value: unknown): value is SectionId =>
    SECTIONS.some((s) => s.id === value);

// Lee la última sección usada. Si no existe, quedó una que ya no está
// o el navegador bloquea el storage (Safari privado), usa la primera.
function readStoredSection(): SectionId {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isSectionId(stored) ? stored : DEFAULT_SECTION;
    } catch {
        return DEFAULT_SECTION;
    }
}

// "checking" → esperando al servidor · "ok" → admin real
// "threat"   → el servidor detectó que NO es admin (incidente registrado + ban)
// "refresh"  → le acaban de dar admin y su sesión es vieja: tiene que reloguearse
// "denied"   → sin sesión válida o error de red: no se muestra nada
type AccessStatus = "checking" | "ok" | "threat" | "refresh" | "denied";

export default function AdminDashboard() {
    const { theme } = UseTheme();
    const [active, setActive] = useState<SectionId>(readStoredSection);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // ── Verificación de acceso contra el servidor ─────────────────────────────
    // El panel (reservas, viajeros, configuración) NO se renderiza ni pide datos
    // hasta que el servidor confirme con el token firmado que la cuenta es admin.
    // El user del contexto se puede falsear con un proxy (Burp).
    const [access, setAccess]         = useState<AccessStatus>("checking");
    const [incidentId, setIncidentId] = useState<string | null>(null);
    const verifyStartedRef            = useRef(false);

    useEffect(() => {
        // Evita el doble pedido de React StrictMode en desarrollo
        if (verifyStartedRef.current) return;
        verifyStartedRef.current = true;

        axios.post(
            `${import.meta.env.VITE_API_URL}/security/verify-admin-access`,
            { path: window.location.pathname, tab: readStoredSection() },
            { withCredentials: true, timeout: 60000 } // Render puede tardar en despertar
        )
            .then((res) => {
                setAccess(res.data?.ok === true ? "ok" : "denied");
            })
            .catch((err) => {
                const data = err.response?.data;
                if (data?.code === "SECURITY_THREAT") {
                    setIncidentId(data.incidentId ?? null);
                    setAccess("threat");
                    return;
                }
                if (data?.code === "SESSION_REFRESH_REQUIRED") {
                    setAccess("refresh");
                    return;
                }
                setAccess("denied");
            });
    }, []);

    const selectSection = (id: SectionId) => {
        setActive(id);
        try {
            localStorage.setItem(STORAGE_KEY, id);
        } catch {
            // Sin storage disponible: la sección cambia igual, solo no se recuerda
        }
    };

    // Flechas, Inicio y Fin para moverse entre pestañas con el teclado
    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = SECTIONS.length - 1;
        let next: number | null = null;
        if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
        if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = last;
        if (next === null) return;
        e.preventDefault();
        selectSection(SECTIONS[next].id);
        tabRefs.current[next]?.focus();
    };

    const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

    // ── Esperando confirmación del servidor: no se muestra nada del panel ─────
    if (access === "checking") return <Loader />;

    // ── Amenaza detectada: el servidor ya registró el incidente y baneó ───────
    if (access === "threat") return (
        <Error errorMessage={
            "Amenaza de seguridad detectada: intento de acceso no autorizado al panel de administración. " +
            "El incidente fue registrado con los datos de tu sesión y tu cuenta fue suspendida." +
            (incidentId ? ` Incidente: ${incidentId}` : "")
        } />
    );

    if (access === "refresh") return (
        <Error errorMessage={"Tu cuenta se actualizó. Cerrá sesión y volvé a ingresar para acceder al panel."} />
    );

    if (access !== "ok") return (
        <Error errorMessage={"No autorizado, por favor inicia sesión."} />
    );

    return (
        <div className={`ad-page ${theme === "dark" ? "theme-dark" : ""}`}>
            <div className="ad-bar">
                <div className="ad-bar-inner">
                    <p className="ad-brand">Quinta de Argos</p>

                    <nav className="ad-tabs" role="tablist" aria-label="Secciones del panel">
                        {SECTIONS.map((section, index) => {
                            const selected = section.id === active;
                            return (
                                <button
                                    key={section.id}
                                    ref={(el) => { tabRefs.current[index] = el; }}
                                    id={`ad-tab-${section.id}`}
                                    role="tab"
                                    type="button"
                                    aria-selected={selected}
                                    aria-controls={`ad-panel-${section.id}`}
                                    tabIndex={selected ? 0 : -1}
                                    className={`ad-tab ${selected ? "ad-tab--active" : ""}`}
                                    onClick={() => selectSection(section.id)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                >
                                    {section.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            <div
                className="ad-content"
                role="tabpanel"
                id={`ad-panel-${current.id}`}
                aria-labelledby={`ad-tab-${current.id}`}
            >
                {current.render()}
            </div>
        </div>
    );
}