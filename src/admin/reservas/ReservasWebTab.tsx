import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './reservasWebTab.css';
import ReservaDetalleModal from './ReservaDetalleModal';
import { UseTheme } from '../../contexts/ThemeContext';
import {
  API_BASE,
  API_CONFIG,
  ESTADO_LABEL,
  type EstadoReserva,
  type ReservaWeb,
  formatEuros,
  formatFechaCalendario,
  formatMomento,
  normalizarBusqueda,
} from './reservasWebTypes';

/**
 * ReservasWebTab
 * ---------------------------------------------------------
 * Pestaña del panel con todas las reservas hechas desde la web.
 * El backend devuelve todas; el filtrado y la paginación (10 por
 * página) se hacen aquí, en el front.
 *
 * Uso en el dashboard:
 *   <ReservasWebTab />
 * El tema (claro/oscuro) se lee de UseTheme, como en el resto de la web.
 *
 * Las peticiones usan API_CONFIG (reservasWebTypes.ts).
 */

const POR_PAGINA = 10;

type CampoFecha = 'llegada' | 'creada';

interface Filtros {
  nombre: string;
  email: string;
  campoFecha: CampoFecha;
  desde: string;
  hasta: string;
  precioMin: string;
  precioMax: string;
  estado: '' | EstadoReserva;
}

const FILTROS_VACIOS: Filtros = {
  nombre: '',
  email: '',
  campoFecha: 'llegada',
  desde: '',
  hasta: '',
  precioMin: '',
  precioMax: '',
  estado: '',
};

// Fecha de creación en hora de España como "YYYY-MM-DD", para comparar con los inputs de fecha.
function fechaCreacionISO(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function cumpleFiltros(r: ReservaWeb, f: Filtros): boolean {
  if (f.estado && r.estado !== f.estado) return false;

  if (f.nombre) {
    const q = normalizarBusqueda(f.nombre);
    const enContacto = normalizarBusqueda(r.contacto.nombre).includes(q);
    const enFactura = normalizarBusqueda(r.facturacion.nombre).includes(q);
    const enCodigo = normalizarBusqueda(r.codigo).includes(q);
    if (!enContacto && !enFactura && !enCodigo) return false;
  }

  if (f.email && !r.contacto.email.toLowerCase().includes(f.email.trim().toLowerCase())) return false;

  const fecha = f.campoFecha === 'llegada' ? r.estancia.checkIn : fechaCreacionISO(r.createdAt);
  if (f.desde && fecha < f.desde) return false;
  if (f.hasta && fecha > f.hasta) return false;

  const min = f.precioMin === '' ? null : Number(f.precioMin);
  const max = f.precioMax === '' ? null : Number(f.precioMax);
  if (min !== null && !Number.isNaN(min) && r.importes.total < min) return false;
  if (max !== null && !Number.isNaN(max) && r.importes.total > max) return false;

  return true;
}

const ReservasWebTab: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  const [reservas, setReservas] = useState<ReservaWeb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get<{ reservas: ReservaWeb[] }>(`${API_BASE}/api/admin/reservas-web`, API_CONFIG);
      setReservas(data.reservas);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { mensaje?: string })?.mensaje : undefined;
      setError(msg || 'No se han podido cargar las reservas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtradas = useMemo(() => reservas.filter((r) => cumpleFiltros(r, filtros)), [reservas, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const desde = filtradas.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
  const hasta = Math.min(paginaActual * POR_PAGINA, filtradas.length);

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS);

  const setFiltro = <K extends keyof Filtros>(campo: K, valor: Filtros[K]) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPagina(1);
  };

  const seleccionada = reservas.find((r) => r._id === seleccionadaId) ?? null;

  const actualizarReserva = (actualizada: ReservaWeb) => {
    setReservas((prev) => prev.map((r) => (r._id === actualizada._id ? actualizada : r)));
  };

  return (
    <section className={`admin-reservas-web${theme === 'dark' ? ' theme-dark' : ''}`}>
      <header className="admin-reservas-web-header">
        <div>
          <h2 className="admin-reservas-web-title">Reservas web</h2>
          <p className="admin-reservas-web-subtitle">
            Reservas hechas desde quintadeargos.com, con todos los datos del huésped, la facturación y el pago.
          </p>
        </div>
        <button type="button" className="admin-reservas-web-button-ghost" onClick={cargar} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </header>

      {/* ---------- Filtros ---------- */}
      <div className="admin-reservas-web-filters">
        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Nombre o código</span>
          <input
            type="search"
            className="admin-reservas-web-input"
            value={filtros.nombre}
            onChange={(e) => setFiltro('nombre', e.target.value)}
            placeholder="Ana López, QA-…"
          />
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Email</span>
          <input
            type="search"
            className="admin-reservas-web-input"
            value={filtros.email}
            onChange={(e) => setFiltro('email', e.target.value)}
            placeholder="correo@…"
          />
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Fecha de</span>
          <select
            className="admin-reservas-web-input"
            value={filtros.campoFecha}
            onChange={(e) => setFiltro('campoFecha', e.target.value as CampoFecha)}
          >
            <option value="llegada">Llegada</option>
            <option value="creada">Creación de la reserva</option>
          </select>
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Desde</span>
          <input
            type="date"
            className="admin-reservas-web-input"
            value={filtros.desde}
            onChange={(e) => setFiltro('desde', e.target.value)}
          />
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Hasta</span>
          <input
            type="date"
            className="admin-reservas-web-input"
            value={filtros.hasta}
            onChange={(e) => setFiltro('hasta', e.target.value)}
          />
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Precio mín. (€)</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            className="admin-reservas-web-input"
            value={filtros.precioMin}
            onChange={(e) => setFiltro('precioMin', e.target.value)}
          />
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Precio máx. (€)</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            className="admin-reservas-web-input"
            value={filtros.precioMax}
            onChange={(e) => setFiltro('precioMax', e.target.value)}
          />
        </label>

        <label className="admin-reservas-web-field">
          <span className="admin-reservas-web-label">Estado</span>
          <select
            className="admin-reservas-web-input"
            value={filtros.estado}
            onChange={(e) => setFiltro('estado', e.target.value as Filtros['estado'])}
          >
            <option value="">Todos</option>
            {(Object.keys(ESTADO_LABEL) as EstadoReserva[]).map((estado) => (
              <option key={estado} value={estado}>
                {ESTADO_LABEL[estado]}
              </option>
            ))}
          </select>
        </label>

        {hayFiltros && (
          <button
            type="button"
            className="admin-reservas-web-button-link"
            onClick={() => {
              setFiltros(FILTROS_VACIOS);
              setPagina(1);
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ---------- Tabla ---------- */}
      {error ? (
        <div className="admin-reservas-web-empty is-error" role="alert">
          {error}{' '}
          <button type="button" className="admin-reservas-web-button-link" onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : loading && reservas.length === 0 ? (
        <div className="admin-reservas-web-empty">Cargando reservas…</div>
      ) : filtradas.length === 0 ? (
        <div className="admin-reservas-web-empty">
          {reservas.length === 0 ? 'Todavía no hay reservas desde la web.' : 'Ninguna reserva coincide con los filtros.'}
        </div>
      ) : (
        <>
          <div className="admin-reservas-web-table-wrap">
            <table className="admin-reservas-web-table">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Estancia</th>
                  <th scope="col">Huésped</th>
                  <th scope="col" className="is-number">
                    Total
                  </th>
                  <th scope="col">Estado</th>
                  <th scope="col">Creada</th>
                  <th scope="col">
                    <span className="admin-reservas-web-sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r._id}>
                    <td className="admin-reservas-web-code">{r.codigo}</td>
                    <td>
                      <span className="admin-reservas-web-cell-main">
                        {formatFechaCalendario(r.estancia.checkIn)} → {formatFechaCalendario(r.estancia.checkOut)}
                      </span>
                      <span className="admin-reservas-web-cell-sub">
                        {r.estancia.noches} {r.estancia.noches === 1 ? 'noche' : 'noches'} · {r.estancia.huespedes}{' '}
                        {r.estancia.huespedes === 1 ? 'huésped' : 'huéspedes'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-reservas-web-cell-main">{r.contacto.nombre}</span>
                      <span className="admin-reservas-web-cell-sub">{r.contacto.email}</span>
                    </td>
                    <td className="is-number">{formatEuros(r.importes.total)}</td>
                    <td>
                      <span className={`admin-reservas-web-badge is-${r.estado}`}>{ESTADO_LABEL[r.estado]}</span>
                    </td>
                    <td className="admin-reservas-web-cell-sub">{formatMomento(r.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-reservas-web-button-ghost"
                        onClick={() => setSeleccionadaId(r._id)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- Paginación ---------- */}
          <nav className="admin-reservas-web-pagination" aria-label="Paginación de reservas">
            <span className="admin-reservas-web-pagination-info">
              {desde}–{hasta} de {filtradas.length}
            </span>
            <div className="admin-reservas-web-pagination-controls">
              <button
                type="button"
                className="admin-reservas-web-button-ghost"
                onClick={() => setPagina(paginaActual - 1)}
                disabled={paginaActual <= 1}
              >
                Anterior
              </button>
              <span className="admin-reservas-web-pagination-page">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                type="button"
                className="admin-reservas-web-button-ghost"
                onClick={() => setPagina(paginaActual + 1)}
                disabled={paginaActual >= totalPaginas}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}

      {seleccionada && (
        <ReservaDetalleModal
          reserva={seleccionada}
          theme={theme}
          onClose={() => setSeleccionadaId(null)}
          onUpdated={actualizarReserva}
        />
      )}
    </section>
  );
};

export default ReservasWebTab;