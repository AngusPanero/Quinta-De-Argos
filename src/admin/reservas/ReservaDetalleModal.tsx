import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  API_BASE,
  API_CONFIG,
  COMUNICACION_ESTADO_LABEL,
  DOCUMENTO_LABEL,
  ESTADO_LABEL,
  type Aceptacion,
  type ReservaWeb,
  type ResultadoEnvio,
  formatEuros,
  formatFechaCalendario,
  formatMomento,
} from './reservasWebTypes';

interface ReservaDetalleModalProps {
  reserva: ReservaWeb;
  theme: 'light' | 'dark';
  onClose: () => void;
  onUpdated: (reserva: ReservaWeb) => void;
}

const PAIS_LABEL: Record<string, string> = {
  ES: 'España', FR: 'Francia', PT: 'Portugal', DE: 'Alemania', GB: 'Reino Unido', IT: 'Italia',
  NL: 'Países Bajos', BE: 'Bélgica', CH: 'Suiza', AR: 'Argentina', US: 'Estados Unidos',
};

function errorDeApi(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { mensaje?: string; detail?: string } | undefined;
    if (data?.mensaje) return data.mensaje;
    if (data?.detail) return data.detail;
    if (err.response?.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  }
  return fallback;
}

// Código de error de la clave de firma (CLAVE_INCORRECTA, CLAVE_BLOQUEADA…).
function codigoDeApi(err: unknown): string {
  if (axios.isAxiosError(err)) return (err.response?.data as { message?: string } | undefined)?.message ?? '';
  return '';
}

const TIPOS_FACTURA = 'application/pdf,image/jpeg,image/png';
const MAX_FACTURA_MB = 5;

const Dato: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="admin-reservas-web-dt">{label}</dt>
    <dd className="admin-reservas-web-dd">{children}</dd>
  </>
);

const FilaConsentimiento: React.FC<{ titulo: string; a?: Aceptacion }> = ({ titulo, a }) => (
  <tr>
    <th scope="row">{titulo}</th>
    <td>
      <span className={`admin-reservas-web-badge ${a?.aceptado ? 'is-pagada' : 'is-cancelada'}`}>
        {a?.aceptado ? 'Sí' : 'No'}
      </span>
    </td>
    <td>{a?.version ?? '—'}</td>
    <td>{formatMomento(a?.fecha)}</td>
    <td>{a?.ip || '—'}</td>
    <td className="admin-reservas-web-ua" title={a?.userAgent}>
      {a?.userAgent || '—'}
    </td>
  </tr>
);

const ReservaDetalleModal: React.FC<ReservaDetalleModalProps> = ({ reserva: r, theme, onClose, onUpdated }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ---------- Factura (la genera el propietario; aquí solo se adjunta y se envía) ----------
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [archivoFactura, setArchivoFactura] = useState<File | null>(null);
  const [numeroFactura, setNumeroFactura] = useState(r.factura?.numero ?? '');
  const [notaFactura, setNotaFactura] = useState('');
  const [pin, setPin] = useState('');
  const [errorFirma, setErrorFirma] = useState('');
  const [firmaBloqueada, setFirmaBloqueada] = useState(false);
  const [enviandoFactura, setEnviandoFactura] = useState(false);

  // ---------- Mensaje ----------
  const [mostrarMensaje, setMostrarMensaje] = useState(false);
  const [asunto, setAsunto] = useState('Tu estancia en Quinta de Argos');
  const [mensaje, setMensaje] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'info' | 'error'; texto: string } | null>(null);

  // Escape para cerrar, foco inicial y bloqueo del scroll de fondo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const facturaNumero = r.factura?.numero ?? null;
  const facturaEnviada = Boolean(r.factura?.ultimoEnvio);
  const puedeFacturar = r.estado !== 'pendiente_pago' && r.estado !== 'pago_fallido';

  const avisoEnvio = (envio: ResultadoEnvio, que: string) => {
    if (envio.enviado) setAviso({ tipo: 'ok', texto: `${que} enviado a ${r.contacto.email}.` });
    else if (envio.error) setAviso({ tipo: 'error', texto: `${que}: no se ha podido enviar (${envio.error}).` });
    else
      setAviso({
        tipo: 'info',
        texto: `${que} preparado. El envío por email aún no está configurado: ha quedado registrado como pendiente.`,
      });
  };

  const elegirArchivo = (file: File | null) => {
    setAviso(null);
    if (!file) return setArchivoFactura(null);
    if (!TIPOS_FACTURA.split(',').includes(file.type)) {
      setArchivoFactura(null);
      setAviso({ tipo: 'error', texto: 'La factura tiene que ser un PDF, JPG o PNG.' });
      return;
    }
    if (file.size > MAX_FACTURA_MB * 1024 * 1024) {
      setArchivoFactura(null);
      setAviso({ tipo: 'error', texto: `El archivo pesa demasiado (máximo ${MAX_FACTURA_MB} MB).` });
      return;
    }
    setArchivoFactura(file);
  };

  const enviarFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoFactura || !pin) return;
    setEnviandoFactura(true);
    setErrorFirma('');
    setAviso(null);
    try {
      const datos = new FormData();
      datos.append('factura', archivoFactura);
      datos.append('numero', numeroFactura.trim());
      datos.append('nota', notaFactura.trim());
      datos.append('pin', pin);

      const { data } = await axios.post<{ reserva: ReservaWeb; envio: ResultadoEnvio; factura: { numero: string | null } }>(
        `${API_BASE}/api/admin/reservas-web/${r._id}/factura-adjunta`,
        datos,
        API_CONFIG
      );
      onUpdated(data.reserva);
      avisoEnvio(data.envio, data.factura.numero ? `Factura ${data.factura.numero}` : 'Factura');
      if (data.envio.enviado) {
        setMostrarFactura(false);
        setArchivoFactura(null);
        setNotaFactura('');
      }
    } catch (err) {
      const codigo = codigoDeApi(err);
      if (codigo === 'CLAVE_INCORRECTA' || codigo === 'CLAVE_BLOQUEADA') {
        setErrorFirma(errorDeApi(err, 'Clave incorrecta.'));
        setFirmaBloqueada(codigo === 'CLAVE_BLOQUEADA');
      } else {
        setAviso({ tipo: 'error', texto: errorDeApi(err, 'No se ha podido enviar la factura.') });
      }
    } finally {
      setPin('');
      setEnviandoFactura(false);
    }
  };

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoMensaje(true);
    setAviso(null);
    try {
      const { data } = await axios.post<{ reserva: ReservaWeb; envio: ResultadoEnvio }>(
        `${API_BASE}/api/admin/reservas-web/${r._id}/mensaje`,
        { asunto, mensaje },
        API_CONFIG
      );
      onUpdated(data.reserva);
      avisoEnvio(data.envio, 'Mensaje');
      setMensaje('');
      setMostrarMensaje(false);
    } catch (err) {
      setAviso({ tipo: 'error', texto: errorDeApi(err, 'No se ha podido preparar el mensaje.') });
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // Noches agrupadas por precio.
  const grupos = new Map<number, number>();
  r.importes.desglose.forEach((n) => grupos.set(n.precio, (grupos.get(n.precio) ?? 0) + 1));

  const d = r.facturacion.direccion;
  const comunicaciones = [...(r.comunicaciones ?? [])].reverse();

  return (
    <div
      className={`admin-reservas-web-overlay${theme === 'dark' ? ' theme-dark' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="admin-reservas-web-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reservas-web-modal-title"
        tabIndex={-1}
      >
        {/* ---------- Cabecera ---------- */}
        <header className="admin-reservas-web-modal-header">
          <div>
            <span className="admin-reservas-web-label">Reserva</span>
            <h3 id="admin-reservas-web-modal-title" className="admin-reservas-web-modal-title">
              {r.codigo}
            </h3>
          </div>
          <span className={`admin-reservas-web-badge is-${r.estado}`}>{ESTADO_LABEL[r.estado]}</span>
          <button type="button" className="admin-reservas-web-modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="admin-reservas-web-modal-body">
          {/* ---------- Estancia ---------- */}
          <section className="admin-reservas-web-section">
            <h4 className="admin-reservas-web-section-title">Estancia</h4>
            <dl className="admin-reservas-web-dl">
              <Dato label="Llegada">{formatFechaCalendario(r.estancia.checkIn)}</Dato>
              <Dato label="Salida">{formatFechaCalendario(r.estancia.checkOut)}</Dato>
              <Dato label="Noches">{r.estancia.noches}</Dato>
              <Dato label="Huéspedes">{r.estancia.huespedes}</Dato>
              <Dato label="Creada">{formatMomento(r.createdAt)}</Dato>
              <Dato label="Origen">{r.origen === 'web' ? 'Web' : r.origen}</Dato>
            </dl>
          </section>

          {/* ---------- Importes ---------- */}
          <section className="admin-reservas-web-section">
            <h4 className="admin-reservas-web-section-title">Importes</h4>
            <div className="admin-reservas-web-lines">
              {[...grupos.entries()].map(([precio, noches]) => (
                <div key={precio} className="admin-reservas-web-line">
                  <span>
                    {noches} {noches === 1 ? 'noche' : 'noches'} × {formatEuros(precio)}
                  </span>
                  <span>{formatEuros(noches * precio)}</span>
                </div>
              ))}
              {r.importes.adicionales.map((a) => (
                <div key={a.id} className="admin-reservas-web-line">
                  <span>{a.nombre}</span>
                  <span>{formatEuros(a.precio)}</span>
                </div>
              ))}
              <div className="admin-reservas-web-line is-total">
                <span>Total (IVA incluido)</span>
                <span>{formatEuros(r.importes.total)}</span>
              </div>
            </div>
          </section>

          {/* ---------- Contacto ---------- */}
          <section className="admin-reservas-web-section">
            <h4 className="admin-reservas-web-section-title">Contacto</h4>
            <dl className="admin-reservas-web-dl">
              <Dato label="Nombre">{r.contacto.nombre}</Dato>
              <Dato label="Email">
                <a href={`mailto:${r.contacto.email}`}>{r.contacto.email}</a>
              </Dato>
              <Dato label="Teléfono">
                <a href={`tel:${r.contacto.telefono.replace(/\s/g, '')}`}>{r.contacto.telefono}</a>
              </Dato>
            </dl>
          </section>

          {/* ---------- Facturación ---------- */}
          <section className="admin-reservas-web-section">
            <h4 className="admin-reservas-web-section-title">Facturación</h4>
            <dl className="admin-reservas-web-dl">
              <Dato label="Tipo">{r.facturacion.tipo === 'empresa' ? 'Empresa' : 'Particular'}</Dato>
              <Dato label={r.facturacion.tipo === 'empresa' ? 'Razón social' : 'Titular'}>{r.facturacion.nombre}</Dato>
              <Dato label={DOCUMENTO_LABEL[r.facturacion.tipoDocumento] ?? r.facturacion.tipoDocumento}>
                {r.facturacion.documento}
              </Dato>
              <Dato label="Dirección">
                {d.linea1}
                {d.linea2 ? `, ${d.linea2}` : ''}
                <br />
                {d.codigoPostal} {d.ciudad}
                {d.provincia ? ` (${d.provincia})` : ''} · {PAIS_LABEL[d.pais] ?? d.pais}
              </Dato>
              <Dato label="Factura">
                {facturaEnviada
                  ? `${facturaNumero ? `${facturaNumero} · ` : ''}enviada ${formatMomento(r.factura?.ultimoEnvio)}`
                  : 'Sin enviar'}
              </Dato>
            </dl>
          </section>

          {/* ---------- Pago ---------- */}
          <section className="admin-reservas-web-section">
            <h4 className="admin-reservas-web-section-title">Pago</h4>
            <dl className="admin-reservas-web-dl">
              <Dato label="Proveedor">{r.pago.proveedor === 'stripe' ? 'Stripe' : r.pago.proveedor}</Dato>
              <Dato label="Referencia">
                <span className="admin-reservas-web-mono">{r.pago.paymentIntentId ?? '—'}</span>
              </Dato>
              <Dato label="Estado en Stripe">{r.pago.estadoProveedor ?? '—'}</Dato>
              <Dato label="Pagado el">{formatMomento(r.pago.pagadoEn)}</Dato>
              {r.pago.errorMensaje && <Dato label="Error">{r.pago.errorMensaje}</Dato>}
              <Dato label="Beds24">
                {r.beds24.bookingId ? `Reserva ${r.beds24.bookingId}` : r.beds24.error || 'Sin sincronizar'}
              </Dato>
            </dl>
          </section>

          {/* ---------- Consentimientos ---------- */}
          <section className="admin-reservas-web-section is-wide">
            <h4 className="admin-reservas-web-section-title">Consentimientos</h4>
            <div className="admin-reservas-web-table-wrap">
              <table className="admin-reservas-web-table is-compact">
                <thead>
                  <tr>
                    <th scope="col">Texto</th>
                    <th scope="col">Aceptado</th>
                    <th scope="col">Versión</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">IP</th>
                    <th scope="col">Navegador</th>
                  </tr>
                </thead>
                <tbody>
                  <FilaConsentimiento titulo="Política de privacidad" a={r.consentimientos.politicaPrivacidad} />
                  <FilaConsentimiento titulo="Condiciones de reserva" a={r.consentimientos.condicionesReserva} />
                  <FilaConsentimiento
                    titulo="Comunicaciones comerciales"
                    a={r.consentimientos.comunicacionesComerciales}
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* ---------- Comunicaciones ---------- */}
          <section className="admin-reservas-web-section is-wide">
            <h4 className="admin-reservas-web-section-title">Comunicaciones</h4>
            {comunicaciones.length === 0 ? (
              <p className="admin-reservas-web-muted">Todavía no se ha enviado nada a este huésped.</p>
            ) : (
              <ul className="admin-reservas-web-timeline">
                {comunicaciones.map((c) => (
                  <li key={c._id} className="admin-reservas-web-timeline-item">
                    <div className="admin-reservas-web-timeline-head">
                      <strong>{c.tipo === 'factura' ? 'Factura' : 'Mensaje'}</strong> · {c.asunto}
                      <span className={`admin-reservas-web-badge is-envio-${c.estado}`}>
                        {COMUNICACION_ESTADO_LABEL[c.estado]}
                      </span>
                    </div>
                    <span className="admin-reservas-web-cell-sub">
                      {formatMomento(c.fecha)} · para {c.destinatario} · por {c.creadoPor}
                    </span>
                    {c.mensaje && <p className="admin-reservas-web-timeline-text">{c.mensaje}</p>}
                    {c.error && <p className="admin-reservas-web-timeline-text is-error">{c.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- Historial ---------- */}
          <section className="admin-reservas-web-section is-wide">
            <h4 className="admin-reservas-web-section-title">Historial de estados</h4>
            <ul className="admin-reservas-web-timeline">
              {[...r.historialEstados].reverse().map((h, i) => (
                <li key={`${h.fecha}-${i}`} className="admin-reservas-web-timeline-item">
                  <div className="admin-reservas-web-timeline-head">
                    <span className={`admin-reservas-web-badge is-${h.estado}`}>{ESTADO_LABEL[h.estado]}</span>
                    <span className="admin-reservas-web-cell-sub">{formatMomento(h.fecha)}</span>
                  </div>
                  {h.motivo && <p className="admin-reservas-web-timeline-text">{h.motivo}</p>}
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- Formulario de mensaje ---------- */}
          {mostrarMensaje && (
            <form className="admin-reservas-web-section is-wide admin-reservas-web-message" onSubmit={enviarMensaje}>
              <h4 className="admin-reservas-web-section-title">Mensaje para {r.contacto.nombre}</h4>
              <label className="admin-reservas-web-field">
                <span className="admin-reservas-web-label">Asunto</span>
                <input
                  className="admin-reservas-web-input"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  maxLength={200}
                  required
                />
              </label>
              <label className="admin-reservas-web-field">
                <span className="admin-reservas-web-label">Mensaje</span>
                <textarea
                  className="admin-reservas-web-input admin-reservas-web-textarea"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  maxLength={5000}
                  rows={6}
                  placeholder="Por ejemplo: indicaciones para llegar, horario de entrada o una bienvenida personal."
                  required
                />
              </label>
              <div className="admin-reservas-web-actions">
                <button
                  type="button"
                  className="admin-reservas-web-button-ghost"
                  onClick={() => setMostrarMensaje(false)}
                  disabled={enviandoMensaje}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-reservas-web-button"
                  disabled={enviandoMensaje || asunto.trim().length < 2 || mensaje.trim().length < 2}
                >
                  {enviandoMensaje ? 'Enviando…' : 'Enviar mensaje'}
                </button>
              </div>
            </form>
          )}

          {/* ---------- Formulario de factura ---------- */}
          {mostrarFactura && (
            <form className="admin-reservas-web-section is-wide admin-reservas-web-message" onSubmit={enviarFactura}>
              <h4 className="admin-reservas-web-section-title">Enviar factura a {r.contacto.nombre}</h4>
              <p className="admin-reservas-web-muted">
                Adjunta la factura que has generado (PDF, JPG o PNG, máximo {MAX_FACTURA_MB} MB). Se enviará a{' '}
                <strong>{r.contacto.email}</strong> con un correo de presentación de Quinta de Argos.
              </p>

              <label className="admin-reservas-web-field">
                <span className="admin-reservas-web-label">Archivo de la factura</span>
                <input
                  type="file"
                  accept={TIPOS_FACTURA}
                  className="admin-reservas-web-input"
                  onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              {archivoFactura && (
                <p className="admin-reservas-web-muted">
                  {archivoFactura.name} · {(archivoFactura.size / 1024).toFixed(0)} KB
                </p>
              )}

              <label className="admin-reservas-web-field">
                <span className="admin-reservas-web-label">Nº de factura (opcional)</span>
                <input
                  className="admin-reservas-web-input"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  maxLength={40}
                  placeholder="Ej. 2026-015"
                />
              </label>

              <label className="admin-reservas-web-field">
                <span className="admin-reservas-web-label">Nota para el huésped (opcional)</span>
                <textarea
                  className="admin-reservas-web-input admin-reservas-web-textarea"
                  value={notaFactura}
                  onChange={(e) => setNotaFactura(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Por ejemplo: gracias por tu estancia, esperamos verte pronto."
                />
              </label>

              <label className="admin-reservas-web-field">
                <span className="admin-reservas-web-label">Clave de firma</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  className="admin-reservas-web-input"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setErrorFirma('');
                  }}
                  maxLength={8}
                  disabled={firmaBloqueada}
                  aria-invalid={Boolean(errorFirma)}
                  required
                />
              </label>
              {errorFirma && (
                <p className="admin-reservas-web-notice is-error" role="alert">
                  {errorFirma}
                </p>
              )}

              <div className="admin-reservas-web-actions">
                <button
                  type="button"
                  className="admin-reservas-web-button-ghost"
                  onClick={() => setMostrarFactura(false)}
                  disabled={enviandoFactura}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-reservas-web-button"
                  disabled={enviandoFactura || !archivoFactura || !pin || firmaBloqueada}
                >
                  {enviandoFactura ? 'Enviando…' : 'Firmar y enviar'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ---------- Acciones ---------- */}
        <footer className="admin-reservas-web-modal-footer">
          {aviso && (
            <p className={`admin-reservas-web-notice is-${aviso.tipo}`} role="status">
              {aviso.texto}
            </p>
          )}

          <div className="admin-reservas-web-actions">
            <button
              type="button"
              className="admin-reservas-web-button-ghost"
              onClick={() => setMostrarMensaje((v) => !v)}
              disabled={enviandoMensaje}
            >
              {mostrarMensaje ? 'Ocultar mensaje' : 'Enviar mensaje al huésped'}
            </button>
            <button
              type="button"
              className="admin-reservas-web-button"
              onClick={() => setMostrarFactura((v) => !v)}
              disabled={!puedeFacturar || enviandoFactura}
              title={puedeFacturar ? undefined : 'Esta reserva no llegó a cobrarse'}
            >
              {mostrarFactura ? 'Ocultar factura' : facturaEnviada ? 'Reenviar factura' : 'Enviar factura por email'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ReservaDetalleModal;