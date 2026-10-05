import { useCallback, useEffect, useState } from "react";
import { UseTheme } from "../../../contexts/ThemeContext";
import ConfigCalendario from "./ConfigCalendario";
import ConfigForm from "./ConfigForm";
import ConfigVista, { type ViewMonth } from "./ConfigVista";
import ConfigCanales from "./ConfigCanales";
import { fetchConfig, toApiError } from "./configApi";
import type { ConfigResponse, DateRange } from "./configTypes";
import "./configQuinta.css";

const TABS = [
    { id: "vista", label: "Calendario" },
    { id: "calendario", label: "Cambiar precios y fechas" },
    { id: "reglas", label: "Reglas de la casa" },
    { id: "propiedad", label: "Datos y políticas" },
    { id: "canales", label: "Canales" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STORAGE_KEY = "qa_config_tab";
const isTabId = (v: unknown): v is TabId => TABS.some((t) => t.id === v);

function readStoredTab(): TabId {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isTabId(stored) ? stored : TABS[0].id;
    } catch {
        return TABS[0].id;
    }
}

export default function ConfigQuinta() {
    const { theme } = UseTheme();
    const [tab, setTab] = useState<TabId>(readStoredTab);
    const [config, setConfig] = useState<ConfigResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // Mes que se ve en el calendario: se mantiene al cambiar de pestaña
    const [viewMonth, setViewMonth] = useState<ViewMonth>(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    // Fechas que llegan desde "Cambiar este día"; el nonce reinicia el formulario
    const [prefill, setPrefill] = useState<{ range: DateRange; nonce: number } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setConfig(await fetchConfig());
        } catch (err) {
            setError(toApiError(err).detail);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const selectTab = (id: TabId) => {
        setTab(id);
        try {
            localStorage.setItem(STORAGE_KEY, id);
        } catch {
            // Sin storage: cambia igual, solo no se recuerda
        }
    };

    const editRange = (range: DateRange) => {
        setPrefill({ range, nonce: Date.now() });
        selectTab("calendario");
    };

    return (
        <section className={`cq-page ${theme === "dark" ? "theme-dark" : ""}`}>
            <div className="cq-inner">
                <header className="cq-header">
                    <h1 className="cq-title">Configuración</h1>
                    <p className="cq-subtitle">
                        Precios, fechas y reglas de la casa. Cada cambio se firma con tu clave y se envía a Beds24, que lo pasa a Booking y Airbnb.
                    </p>
                </header>

                <nav className="cq-tabs" role="tablist" aria-label="Secciones de configuración">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.id}
                            className={`cq-tab ${tab === t.id ? "cq-tab--active" : ""}`}
                            onClick={() => selectTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>

                {loading && !config && <p className="cq-state">Cargando la configuración desde Beds24…</p>}

                {error && !config && (
                    <div className="cq-state">
                        <p className="cq-message cq-message--error" role="alert">{error}</p>
                        <button type="button" className="cq-btn cq-btn--ghost" onClick={load}>Reintentar</button>
                    </div>
                )}

                {config && (
                    <div role="tabpanel">
                        {tab === "vista" && (
                            <ConfigVista
                                today={config.calendario.today}
                                defaults={{
                                    minStay: typeof config.reglas.values.minStay === "number" ? config.reglas.values.minStay : null,
                                    maxStay: typeof config.reglas.values.maxStay === "number" ? config.reglas.values.maxStay : null,
                                }}
                                month={viewMonth}
                                onMonthChange={setViewMonth}
                                onEdit={editRange}
                            />
                        )}
                        {tab === "calendario" && (
                            <ConfigCalendario
                                key={prefill?.nonce ?? "base"}
                                options={config.calendario}
                                initialRange={prefill?.range ?? null}
                            />
                        )}
                        {tab === "reglas" && (
                            <ConfigForm
                                section="reglas"
                                intro="Valores que se aplican a toda la casa. Las fechas con valores propios en el calendario no cambian."
                                fields={config.reglas.fields}
                                values={config.reglas.values}
                                onApplied={setConfig}
                            />
                        )}
                        {tab === "canales" && <ConfigCanales />}
                        {tab === "propiedad" && (
                            <ConfigForm
                                section="propiedad"
                                intro="Datos de contacto, horarios y textos que Beds24 muestra a los huéspedes."
                                fields={config.propiedad.fields}
                                values={config.propiedad.values}
                                onApplied={setConfig}
                            />
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}