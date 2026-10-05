import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import AdminReservas from "./reservas/AdminReservas";
import "./adminDashboard.css";
import ConfigQuinta from "./reservas/config/ConfigQuinta";
import { UseTheme } from "../contexts/ThemeContext";

// Secciones del panel. El orden del array es el orden de las pestañas,
// y la primera es la que se abre si no hay nada guardado.
// Para sumar una sección nueva, agregá un objeto acá y listo.
const SECTIONS = [
    { id: "reservas", label: "Reservas", render: () => <AdminReservas /> },
    { id: "configuracion", label: "Configuración", render: () => <ConfigQuinta /> },
] as const satisfies ReadonlyArray<{ id: string; label: string; render: () => ReactNode }>;

type SectionId = (typeof SECTIONS)[number]["id"];

const STORAGE_KEY = "qa_admin_section";
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

export default function AdminDashboard() {
    const { theme } = UseTheme();
    const [active, setActive] = useState<SectionId>(readStoredSection);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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