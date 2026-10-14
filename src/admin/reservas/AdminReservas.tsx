import { useEffect, useState } from "react";
import axios from "axios";
import ReservasList from "./ReservasList";
import ReservasCalendar from "./ReservasCalendar";
import ReservasFacturacion from "./ReservasFacturacion";
import type { SyncState } from "./reservasTypes";
import { relativeTime } from "./reservasUtils";
import "./adminReservas.css";
import { UseTheme } from "../../contexts/ThemeContext";

const API = import.meta.env.VITE_API_URL;

type Tab = "calendario" | "listado" | "facturacion";

const TABS: { id: Tab; label: string }[] = [
    { id: "calendario", label: "Calendario" },
    { id: "listado", label: "Listado" },
    { id: "facturacion", label: "Facturación" },
];

export default function AdminReservas() {
    const { theme } = UseTheme();

    const [tab, setTab] = useState<Tab>("calendario");
    const [lastSync, setLastSync] = useState<SyncState | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [, setTick] = useState(0);

    // Refresca el "hace X min" sin volver a pedir datos
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        setSyncError(null);
        try {
            const { data } = await axios.post(`${API}/api/admin/reservas/sync`, {}, { withCredentials: true });
            setLastSync(data.lastSync);
            setRefreshKey((k) => k + 1);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setSyncError(err.response?.data?.message || "No se pudo sincronizar con Beds24");
                if (err.response?.data?.lastSync) setLastSync(err.response.data.lastSync);
            } else {
                setSyncError("No se pudo sincronizar con Beds24");
            }
        } finally {
            setSyncing(false);
        }
    };

    return (
        <section className={`ar-page ${theme === "dark" ? "theme-dark" : ""}`}>
          <div className="ar-inner">
            <header className="ar-header">
                <div className="ar-heading">
                    <h1 className="ar-title">Reservas</h1>
                    <p className="ar-subtitle">Web, Airbnb y Booking en un solo lugar</p>
                </div>

                <div className="ar-sync">
                    <p className={`ar-sync-status ${lastSync?.ok === false ? "ar-sync-status--error" : ""}`}>
                        {lastSync?.ok === false
                            ? `La última sincronización falló (${relativeTime(lastSync.at)})`
                            : `Sincronizado ${relativeTime(lastSync?.at ?? null)}`}
                    </p>
                    <button className="ar-sync-btn" onClick={handleSync} disabled={syncing}>
                        {syncing ? "Sincronizando…" : "Sincronizar ahora"}
                    </button>
                </div>
            </header>

            {syncError && <p className="ar-alert" role="alert">{syncError}</p>}

            <nav className="ar-tabs" role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`ar-tab ${tab === t.id ? "ar-tab--active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <div className="ar-content">
                {tab === "calendario" && <ReservasCalendar refreshKey={refreshKey} onSyncInfo={setLastSync} />}
                {tab === "listado" && <ReservasList refreshKey={refreshKey} onSyncInfo={setLastSync} />}
                {tab === "facturacion" && <ReservasFacturacion refreshKey={refreshKey} onSyncInfo={setLastSync} />}
            </div>
          </div>
        </section>
    );
}