import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe, type Appearance, type StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import './checkout.css';
import { UseTheme } from '../contexts/ThemeContext';
import BookingCalendar from '../reservas/BookingCalendar';
import { RESERVATION_STORAGE_KEY, type StoredReservation } from '../reservas/Reservations';
import { ADDONS, MAX_NIGHTS, MAX_GUESTS } from '../reservas/BookingConfig';
import { formatDateLong, formatPrice, fromISODate, toISODate } from '../reservas/BookingDates';
import { useAvailability, groupNightsByPrice } from '../reservas/useAvailability';
import { type DatosFacturacion, type DireccionFacturacion, DOCUMENTOS_POR_TIPO, FACTURACION_VACIA, PAISES, type TipoDocumento, type TipoFacturacion, errorFacturacion, esDocumentoValido, normalizarDocumento } from './datosFacturacion';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Quote {
  checkIn: string;
  checkOut: string;
  noches: number;
  guests: number;
  desglose: { fecha: string; precio: number }[];
  alojamiento: number;
  adicionales: { id: string; nombre: string; precio: number }[];
  totalAdicionales: number;
  total: number;
  totalCentimos: number;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { mensaje?: string } | undefined)?.mensaje;
    if (msg) return msg;
  }
  return fallback;
}

function loadInitialReservation(locationState: unknown): StoredReservation | null {
  const isValid = (value: unknown): value is StoredReservation =>
    Boolean(
      value &&
        typeof value === 'object' &&
        fromISODate((value as StoredReservation).checkIn) &&
        fromISODate((value as StoredReservation).checkOut)
    );

  if (isValid(locationState)) return locationState;
  try {
    const raw = sessionStorage.getItem(RESERVATION_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isValid(parsed)) return parsed;
  } catch {
    // sessionStorage no disponible o dato corrupto: seguimos sin reserva.
  }
  return null;
}

function stripeAppearance(theme: 'light' | 'dark'): Appearance {
  const dark = theme === 'dark';
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: dark ? '#d3a06c' : '#2a3626',
      colorBackground: dark ? '#262520' : '#ffffff',
      colorText: dark ? '#ece4d3' : '#2c2a24',
      colorTextSecondary: dark ? 'rgba(236, 228, 211, 0.6)' : 'rgba(44, 42, 36, 0.62)',
      colorDanger: dark ? '#e0a08c' : '#9a4a34',
      fontFamily: "'Jost', 'Helvetica Neue', Arial, sans-serif",
      fontSizeBase: '15px',
      borderRadius: '2px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: dark ? '1px solid rgba(242, 237, 225, 0.2)' : '1px solid rgba(42, 54, 38, 0.25)',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: dark ? '1px solid #d3a06c' : '1px solid #b8763e',
        boxShadow: 'none',
      },
      '.Tab': {
        border: dark ? '1px solid rgba(242, 237, 225, 0.2)' : '1px solid rgba(42, 54, 38, 0.2)',
        boxShadow: 'none',
      },
      '.Tab--selected': {
        border: dark ? '1px solid #d3a06c' : '1px solid #2a3626',
      },
      '.Label': {
        fontWeight: '500',
      },
    },
  };
}

// ==========================================================
// Pantallas de resultado
// ==========================================================

const SuccessMessage: React.FC<{ processing?: boolean; codigo?: string | null }> = ({ processing, codigo }) => (
  <div className="checkout-success">
    <span className="checkout-success-icon">✓</span>
    <h2 className="checkout-success-heading">{processing ? 'Pago en proceso' : 'Reserva confirmada'}</h2>
    {codigo && (
      <p className="checkout-success-code">
        Código de reserva <strong>{codigo}</strong>
      </p>
    )}
    <p className="checkout-success-paragraph">
      {processing
        ? 'Tu banco está procesando el pago. En cuanto se confirme, recibirás un correo electrónico con los detalles de tu estancia.'
        : 'Hemos recibido tu pago. Recibirás un correo electrónico con todos los detalles de tu estancia en Quinta de Argos, si no lo visualizas recuerda revisar tu carpeta de spam. ¡Nos vemos pronto!'}
    </p>
  </div>
);

// ==========================================================
// Formulario de pago (vive dentro de <Elements>)
// ==========================================================

// TODO (Angus): poner aquí el titular real (nombre o razón social y NIF)
// cuando tengamos la política de privacidad definitiva.
const RESPONSABLE_TRATAMIENTO = 'el titular de Quinta de Argos';
const URL_POLITICA_PRIVACIDAD = '/policy-privacy';
const URL_CONDICIONES_RESERVA = '/policy-terms';

interface CheckoutFormProps {
  reservation: StoredReservation;
  quote: Quote;
  onQuoteChanged: (quote: Quote) => void;
  onPaid: (processing: boolean, codigo: string | null) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ reservation, quote, onQuoteChanged, onPaid }) => {
  const stripe = useStripe();
  const elements = useElements();

  // ---------- Contacto ----------
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  // ---------- Facturación ----------
  const [facturacion, setFacturacion] = useState<DatosFacturacion>(FACTURACION_VACIA);
  // Particular: por defecto la factura va a nombre de quien reserva.
  const [facturaAMiNombre, setFacturaAMiNombre] = useState(true);

  // ---------- Consentimientos ----------
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);
  const [aceptaComunicaciones, setAceptaComunicaciones] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Si el presupuesto cambia (otras fechas, huéspedes o adicionales),
  // actualizamos el importe que muestra el Payment Element.
  useEffect(() => {
    elements?.update({ amount: quote.totalCentimos });
  }, [elements, quote.totalCentimos]);

  const setTipoFacturacion = (tipo: TipoFacturacion) => {
    setFacturacion((prev) => ({
      ...prev,
      tipo,
      nombre: '',
      tipoDocumento: DOCUMENTOS_POR_TIPO[tipo][0].value,
      documento: '',
    }));
  };

  const setDireccion = (campo: keyof DireccionFacturacion, valor: string) => {
    setFacturacion((prev) => ({ ...prev, direccion: { ...prev.direccion, [campo]: valor } }));
  };

  const usaNombreContacto = facturacion.tipo === 'particular' && facturaAMiNombre;
  const facturacionFinal: DatosFacturacion = {
    ...facturacion,
    nombre: usaNombreContacto ? nombre : facturacion.nombre,
    documento: normalizarDocumento(facturacion.documento),
  };

  const documentoEscrito = facturacion.documento.trim().length > 0;
  const documentoInvalido = documentoEscrito && !esDocumentoValido(facturacion.tipoDocumento, facturacion.documento);
  const puedePagar = aceptaPrivacidad && aceptaCondiciones;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setErrorMessage('');

    const errorDatos = errorFacturacion(facturacionFinal);
    if (errorDatos) {
      setErrorMessage(errorDatos);
      return;
    }
    if (!puedePagar) {
      setErrorMessage('Para continuar debes aceptar la política de privacidad y las condiciones de reserva.');
      return;
    }

    setProcessing(true);

    try {
      // 1) Validamos los datos de pago antes de pedir nada al servidor.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || 'Revisa los datos de pago.');
        return;
      }

      // 2) El backend valida todo, guarda la reserva con los consentimientos
      //    (antes de cobrar), recalcula el precio y crea el pago.
      const { data } = await axios.post<{ clientSecret: string; codigo: string; presupuesto: Quote }>(
        `${API_BASE}/intent`,
        {
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          guests: reservation.guests,
          adicionales: Object.keys(reservation.selectedAddons).filter((id) => reservation.selectedAddons[id]),
          contacto: { nombre, email, telefono },
          facturacion: facturacionFinal,
          consentimientos: {
            politicaPrivacidad: aceptaPrivacidad,
            condicionesReserva: aceptaCondiciones,
            comunicacionesComerciales: aceptaComunicaciones,
          },
        }
      );

      // Si el precio cambió entre que lo viste y ahora, no cobramos: lo mostramos primero.
      if (data.presupuesto.totalCentimos !== quote.totalCentimos) {
        onQuoteChanged(data.presupuesto);
        setErrorMessage(
          `El precio se ha actualizado a ${formatPrice(data.presupuesto.total)}. Revísalo y vuelve a pulsar «Pagar».`
        );
        return;
      }

      // 3) Confirmamos el pago. Los métodos con redirección vuelven a /checkout.
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout`,
          payment_method_data: {
            billing_details: {
              name: facturacionFinal.nombre,
              email,
              phone: telefono,
              address: {
                line1: facturacionFinal.direccion.linea1,
                line2: facturacionFinal.direccion.linea2 || '',
                postal_code: facturacionFinal.direccion.codigoPostal,
                city: facturacionFinal.direccion.ciudad,
                state: facturacionFinal.direccion.provincia || '',
                country: facturacionFinal.direccion.pais,
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setErrorMessage(result.error.message || 'No hemos podido procesar el pago. Inténtalo de nuevo.');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onPaid(false, data.codigo);
      } else if (result.paymentIntent?.status === 'processing') {
        onPaid(true, data.codigo);
      }
    } catch (err) {
      console.error('Error al procesar el pago:', err);
      setErrorMessage(apiErrorMessage(err, 'Ha habido un problema al procesar el pago. Inténtalo de nuevo.'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="checkout-form" onSubmit={handleSubmit} noValidate>
      {/* ---------- Contacto ---------- */}
      <fieldset className="checkout-fieldset">
        <legend className="checkout-section-title">Datos de contacto</legend>

        <div className="checkout-field-name">
          <label htmlFor="checkout-nombre" className="checkout-field-name-label">
            Nombre y apellidos
          </label>
          <input
            id="checkout-nombre"
            type="text"
            className="checkout-field-name-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="checkout-field-row">
          <div className="checkout-field-name">
            <label htmlFor="checkout-email" className="checkout-field-name-label">
              Correo electrónico
            </label>
            <input
              id="checkout-email"
              type="email"
              className="checkout-field-name-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="checkout-field-name">
            <label htmlFor="checkout-telefono" className="checkout-field-name-label">
              Teléfono
            </label>
            <input
              id="checkout-telefono"
              type="tel"
              className="checkout-field-name-input"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoComplete="tel"
              placeholder="+34 600 000 000"
              required
            />
          </div>
        </div>
      </fieldset>

      {/* ---------- Facturación ---------- */}
      <fieldset className="checkout-fieldset">
        <legend className="checkout-section-title">Datos de facturación</legend>

        <div className="checkout-billing-toggle" role="radiogroup" aria-label="Tipo de factura">
          {(['particular', 'empresa'] as TipoFacturacion[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              role="radio"
              aria-checked={facturacion.tipo === tipo}
              className={`checkout-billing-toggle-option${facturacion.tipo === tipo ? ' is-active' : ''}`}
              onClick={() => setTipoFacturacion(tipo)}
            >
              {tipo === 'particular' ? 'Particular' : 'Empresa'}
            </button>
          ))}
        </div>

        {facturacion.tipo === 'particular' && (
          <label className="checkout-consent">
            <input
              type="checkbox"
              className="checkout-consent-checkbox"
              checked={facturaAMiNombre}
              onChange={(e) => setFacturaAMiNombre(e.target.checked)}
            />
            <span className="checkout-consent-text">La factura va a nombre de la persona de contacto</span>
          </label>
        )}

        {!usaNombreContacto && (
          <div className="checkout-field-name">
            <label htmlFor="checkout-fact-nombre" className="checkout-field-name-label">
              {facturacion.tipo === 'empresa' ? 'Razón social' : 'Nombre y apellidos del titular'}
            </label>
            <input
              id="checkout-fact-nombre"
              type="text"
              className="checkout-field-name-input"
              value={facturacion.nombre}
              onChange={(e) => setFacturacion((prev) => ({ ...prev, nombre: e.target.value }))}
              autoComplete={facturacion.tipo === 'empresa' ? 'organization' : 'name'}
              required
            />
          </div>
        )}

        <div className="checkout-field-row">
          <div className="checkout-field-name">
            <label htmlFor="checkout-tipo-doc" className="checkout-field-name-label">
              Documento
            </label>
            <select
              id="checkout-tipo-doc"
              className="checkout-field-name-input checkout-field-select"
              value={facturacion.tipoDocumento}
              onChange={(e) =>
                setFacturacion((prev) => ({ ...prev, tipoDocumento: e.target.value as TipoDocumento }))
              }
            >
              {DOCUMENTOS_POR_TIPO[facturacion.tipo].map((doc) => (
                <option key={doc.value} value={doc.value}>
                  {doc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="checkout-field-name">
            <label htmlFor="checkout-documento" className="checkout-field-name-label">
              Número
            </label>
            <input
              id="checkout-documento"
              type="text"
              className={`checkout-field-name-input${documentoInvalido ? ' is-invalid' : ''}`}
              value={facturacion.documento}
              onChange={(e) => setFacturacion((prev) => ({ ...prev, documento: e.target.value }))}
              autoCapitalize="characters"
              aria-invalid={documentoInvalido}
              required
            />
          </div>
        </div>

        {documentoInvalido && (
          <p className="checkout-field-hint is-error">
            {facturacion.tipoDocumento === 'CIF'
              ? 'Revisa el CIF: el dígito de control no coincide.'
              : facturacion.tipoDocumento === 'NIF' || facturacion.tipoDocumento === 'NIE'
                ? 'Revisa el número: la letra no coincide.'
                : 'Usa solo letras y números (entre 5 y 20).'}
          </p>
        )}

        <div className="checkout-field-name">
          <label htmlFor="checkout-direccion" className="checkout-field-name-label">
            Dirección
          </label>
          <input
            id="checkout-direccion"
            type="text"
            className="checkout-field-name-input"
            value={facturacion.direccion.linea1}
            onChange={(e) => setDireccion('linea1', e.target.value)}
            autoComplete="address-line1"
            placeholder="Calle, número, piso"
            required
          />
        </div>

        <div className="checkout-field-row">
          <div className="checkout-field-name">
            <label htmlFor="checkout-cp" className="checkout-field-name-label">
              Código postal
            </label>
            <input
              id="checkout-cp"
              type="text"
              className="checkout-field-name-input"
              value={facturacion.direccion.codigoPostal}
              onChange={(e) => setDireccion('codigoPostal', e.target.value)}
              autoComplete="postal-code"
              inputMode={facturacion.direccion.pais === 'ES' ? 'numeric' : 'text'}
              required
            />
          </div>

          <div className="checkout-field-name">
            <label htmlFor="checkout-ciudad" className="checkout-field-name-label">
              Localidad
            </label>
            <input
              id="checkout-ciudad"
              type="text"
              className="checkout-field-name-input"
              value={facturacion.direccion.ciudad}
              onChange={(e) => setDireccion('ciudad', e.target.value)}
              autoComplete="address-level2"
              required
            />
          </div>
        </div>

        <div className="checkout-field-row">
          <div className="checkout-field-name">
            <label htmlFor="checkout-provincia" className="checkout-field-name-label">
              Provincia{facturacion.direccion.pais === 'ES' ? '' : ' (opcional)'}
            </label>
            <input
              id="checkout-provincia"
              type="text"
              className="checkout-field-name-input"
              value={facturacion.direccion.provincia}
              onChange={(e) => setDireccion('provincia', e.target.value)}
              autoComplete="address-level1"
            />
          </div>

          <div className="checkout-field-name">
            <label htmlFor="checkout-pais" className="checkout-field-name-label">
              País
            </label>
            <select
              id="checkout-pais"
              className="checkout-field-name-input checkout-field-select"
              value={facturacion.direccion.pais}
              onChange={(e) => setDireccion('pais', e.target.value)}
              autoComplete="country"
            >
              {PAISES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* ---------- Pago ---------- */}
      <fieldset className="checkout-fieldset">
        <legend className="checkout-section-title">Pago</legend>
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } },
          }}
        />
      </fieldset>

      {/* ---------- Consentimientos (se guardan con la reserva antes de cobrar) ---------- */}
      <div className="checkout-consents">
        <label className="checkout-consent">
          <input
            type="checkbox"
            className="checkout-consent-checkbox"
            checked={aceptaPrivacidad}
            onChange={(e) => setAceptaPrivacidad(e.target.checked)}
            required
          />
          <span className="checkout-consent-text">
            He leído y acepto la{' '}
            <a href={URL_POLITICA_PRIVACIDAD} target="_blank" rel="noopener noreferrer">
              política de privacidad
            </a>
            . <span className="checkout-consent-required">(obligatorio)</span>
          </span>
        </label>

        <label className="checkout-consent">
          <input
            type="checkbox"
            className="checkout-consent-checkbox"
            checked={aceptaCondiciones}
            onChange={(e) => setAceptaCondiciones(e.target.checked)}
            required
          />
          <span className="checkout-consent-text">
            Acepto las{' '}
            <a href={URL_CONDICIONES_RESERVA} target="_blank" rel="noopener noreferrer">
              condiciones de reserva y cancelación
            </a>
            . <span className="checkout-consent-required">(obligatorio)</span>
          </span>
        </label>

        <label className="checkout-consent">
          <input
            type="checkbox"
            className="checkout-consent-checkbox"
            checked={aceptaComunicaciones}
            onChange={(e) => setAceptaComunicaciones(e.target.checked)}
          />
          <span className="checkout-consent-text">
            Quiero recibir por correo electrónico ofertas y novedades de Quinta de Argos. Puedo darme de baja en
            cualquier momento. <span className="checkout-consent-required">(opcional)</span>
          </span>
        </label>

        <details className="checkout-legal-info">
          <summary>Información básica sobre protección de datos</summary>
          <dl>
            <dt>Responsable</dt>
            <dd>{RESPONSABLE_TRATAMIENTO}.</dd>
            <dt>Finalidad</dt>
            <dd>Gestionar tu reserva, el cobro y la factura. Si lo marcas, enviarte comunicaciones comerciales.</dd>
            <dt>Legitimación</dt>
            <dd>
              Ejecución del contrato de reserva y cumplimiento de obligaciones legales (fiscales y de registro de
              viajeros). Las comunicaciones comerciales, solo con tu consentimiento.
            </dd>
            <dt>Destinatarios</dt>
            <dd>
              Proveedores necesarios para prestar el servicio (pago con Stripe, gestión de reservas con Beds24) y
              administraciones públicas cuando la ley lo exija.
            </dd>
            <dt>Derechos</dt>
            <dd>
              Acceso, rectificación, supresión, oposición, limitación y portabilidad, y presentar una reclamación ante
              la Agencia Española de Protección de Datos. Más información en la{' '}
              <a href={URL_POLITICA_PRIVACIDAD} target="_blank" rel="noopener noreferrer">
                política de privacidad
              </a>
              .
            </dd>
          </dl>
        </details>
      </div>

      {errorMessage && (
        <p className="checkout-error-message" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className="checkout-pay-button"
        disabled={!stripe || !elements || processing || !puedePagar}
      >
        {processing ? 'Procesando…' : `Pagar ${formatPrice(quote.total)}`}
      </button>

      <p className="checkout-secure-note">🔒 Pago seguro procesado por Stripe.</p>
    </form>
  );
};

// ==========================================================
// Página de checkout
// ==========================================================

type PaymentResult = 'none' | 'succeeded' | 'processing' | 'failed';

const Checkout: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ¿Volvemos de un método de pago con redirección (p. ej. Klarna)?
  const returnParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returningPaymentIntent = returnParams.get('payment_intent');
  const [paymentResult, setPaymentResult] = useState<PaymentResult>('none');
  const [codigoReserva, setCodigoReserva] = useState<string | null>(null);

  useEffect(() => {
    if (!returningPaymentIntent) return;
    axios
      .get<{ status: string; codigo: string | null }>(`${API_BASE}/status/${returningPaymentIntent}`)
      .then(({ data }) => {
        setCodigoReserva(data.codigo);
        if (data.status === 'succeeded' || data.status === 'processing') {
          sessionStorage.removeItem(RESERVATION_STORAGE_KEY);
          setPaymentResult(data.status);
        } else {
          setPaymentResult('failed');
        }
      })
      .catch(() => setPaymentResult('failed'));
  }, [returningPaymentIntent]);

  const initial = useMemo(() => loadInitialReservation(location.state), []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: availability, loading: availabilityLoading, error: availabilityError, reload } = useAvailability();
  const maxGuests = availability?.reglas.maxHuespedes ?? MAX_GUESTS;
  const maxNights = availability?.reglas.maxNoches ?? MAX_NIGHTS;

  const [checkin, setCheckin] = useState<Date | null>(fromISODate(initial?.checkIn));
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(fromISODate(initial?.checkOut));
  const [guests, setGuests] = useState<number>(initial?.guests ?? 2);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>(initial?.selectedAddons ?? {});
  const [editingDates, setEditingDates] = useState(false);

  const checkInISO = checkin ? toISODate(checkin) : null;
  const checkOutISO = checkoutDate ? toISODate(checkoutDate) : null;

  // Si entraron directo a /checkout sin pasar por Reservas, no hay nada que cobrar.
  useEffect(() => {
    if (!initial && !returningPaymentIntent) {
      navigate('/reservas');
    }
  }, [initial, returningPaymentIntent, navigate]);

  // Persistimos cualquier edición para sobrevivir a un refresco de la página.
  useEffect(() => {
    if (checkInISO && checkOutISO) {
      const data: StoredReservation = { checkIn: checkInISO, checkOut: checkOutISO, guests, selectedAddons };
      sessionStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(data));
    }
  }, [checkInISO, checkOutISO, guests, selectedAddons]);

  // ---------- Presupuesto calculado por el backend ----------
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const addonIds = useMemo(
    () => Object.keys(selectedAddons).filter((id) => selectedAddons[id]).sort(),
    [selectedAddons]
  );
  const addonKey = addonIds.join(',');

  useEffect(() => {
    if (!checkInISO || !checkOutISO) {
      setQuote(null);
      setQuoteError('');
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await axios.post<Quote>(`${API_BASE}/api/reservas/presupuesto`, {
          checkIn: checkInISO,
          checkOut: checkOutISO,
          guests,
          adicionales: addonKey ? addonKey.split(',') : [],
        });
        if (!cancelled) {
          setQuote(data);
          setQuoteError('');
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(apiErrorMessage(err, 'No hemos podido calcular el precio. Inténtalo de nuevo.'));
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [checkInISO, checkOutISO, guests, addonKey]);

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePaid = (processing: boolean, codigo: string | null) => {
    sessionStorage.removeItem(RESERVATION_STORAGE_KEY);
    setCodigoReserva(codigo);
    setPaymentResult(processing ? 'processing' : 'succeeded');
  };

  const elementsOptions: StripeElementsOptions | null = quote
    ? {
        mode: 'payment',
        amount: quote.totalCentimos,
        currency: 'eur',
        locale: 'es',
        appearance: stripeAppearance(theme),
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap' }],
      }
    : null;

  const nightGroups = quote ? groupNightsByPrice(quote.desglose.map((n) => n.precio)) : [];

  // Vuelta de un pago con redirección: mostramos solo el resultado.
  if (returningPaymentIntent && !initial) {
    return (
      <div className={`checkout ${theme === 'dark' ? 'theme-dark' : ''}`}>
        <section className="checkout-content checkout-content-single">
          <div className="checkout-payment">
            {paymentResult === 'none' && <p className="checkout-payment-pending-note">Comprobando el pago…</p>}
            {paymentResult === 'succeeded' && <SuccessMessage codigo={codigoReserva} />}
            {paymentResult === 'processing' && <SuccessMessage processing codigo={codigoReserva} />}
            {paymentResult === 'failed' && (
              <p className="checkout-payment-pending-note">
                El pago no se ha completado. Puedes volver a <a href="/reservas">elegir tus fechas</a> e intentarlo
                de nuevo.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Antes este guard comprobaba `!checkin || !checkoutDate` en cada render.
  // El problema: al editar fechas, el calendario pasa por un estado
  // intermedio donde checkoutDate es null (elegiste la nueva llegada,
  // todavía no la salida) — y ese guard devolvía `null`, borrando
  // toda la página. Ahora depende de `initial`, que es estable durante
  // toda la sesión de edición.
  if (!initial) return null;

  const paid = paymentResult === 'succeeded' || paymentResult === 'processing';

  return (
    <div className={`checkout ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <section className="checkout-hero">
        <span className="checkout-eyebrow-hero">Checkout</span>
        <h1 className="checkout-heading-hero">Confirma tu reserva</h1>
        <p className="checkout-paragraph-hero">
          Revisa los detalles de tu estancia antes de pagar. Puedes modificar las fechas, los huéspedes o los
          adicionales en cualquier momento.
        </p>
      </section>

      <section className="checkout-content">
        {/* ---------- Columna: resumen editable ---------- */}
        <div className="checkout-summary">
          <div className="checkout-summary-dates-block">
            <div className="checkout-summary-dates-header">
              <span className="checkout-summary-dates-title">Fechas</span>
              {!paid && (
                <button
                  type="button"
                  className="checkout-summary-edit-dates-button"
                  onClick={() => setEditingDates((v) => !v)}
                >
                  {editingDates ? 'Listo' : 'Editar'}
                </button>
              )}
            </div>

            {!editingDates ? (
              <div className="checkout-summary-dates-display">
                <span className="checkout-summary-dates-range">
                  {checkin && checkoutDate
                    ? `${formatDateLong(checkin)} → ${formatDateLong(checkoutDate)}`
                    : 'Selecciona la llegada y la salida'}
                </span>
                <span className="checkout-summary-dates-nights">
                  {quote ? `${quote.noches} ${quote.noches === 1 ? 'noche' : 'noches'}` : '—'}
                </span>
              </div>
            ) : (
              <BookingCalendar
                checkin={checkin}
                checkout={checkoutDate}
                onSelect={(newCheckin, newCheckout) => {
                  setCheckin(newCheckin);
                  setCheckoutDate(newCheckout);
                }}
                availability={availability}
                loading={availabilityLoading}
                error={availabilityError}
                onRetry={reload}
                maxNights={maxNights}
              />
            )}
          </div>

          <div className="checkout-summary-guests-block">
            <span className="checkout-summary-guests-title">Huéspedes</span>
            <div className="checkout-summary-guests-controls">
              <button
                type="button"
                className="checkout-summary-guests-decrease"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={paid || guests <= 1}
                aria-label="Quitar huésped"
              >
                −
              </button>
              <span className="checkout-summary-guests-count">{guests}</span>
              <button
                type="button"
                className="checkout-summary-guests-increase"
                onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                disabled={paid || guests >= maxGuests}
                aria-label="Añadir huésped"
              >
                +
              </button>
            </div>
          </div>

          {ADDONS.length > 0 && (
            <div className="checkout-summary-addons-block">
              <span className="checkout-summary-addons-title">Adicionales</span>
              <div className="checkout-summary-addons-list">
                {ADDONS.map((addon) => (
                  <label key={addon.id} className="checkout-summary-addon-row">
                    <input
                      type="checkbox"
                      className="checkout-summary-addon-checkbox"
                      checked={Boolean(selectedAddons[addon.id])}
                      onChange={() => toggleAddon(addon.id)}
                      disabled={paid}
                    />
                    <span className="checkout-summary-addon-name">{addon.nombre}</span>
                    <span className="checkout-summary-addon-price">{formatPrice(addon.precio)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {quoteError && (
            <p className="checkout-summary-status is-error" role="alert">
              {quoteError}
            </p>
          )}

          {quote && (
            <div className={quoteLoading ? 'checkout-summary-breakdown is-updating' : 'checkout-summary-breakdown'}>
              {nightGroups.map((group) => (
                <div key={group.price} className="checkout-summary-breakdown-row">
                  <span className="checkout-summary-breakdown-label">
                    {group.count} {group.count === 1 ? 'noche' : 'noches'} × {formatPrice(group.price)}
                  </span>
                  <span className="checkout-summary-breakdown-value">{formatPrice(group.count * group.price)}</span>
                </div>
              ))}

              {quote.adicionales.map((addon) => (
                <div key={addon.id} className="checkout-summary-breakdown-row">
                  <span className="checkout-summary-breakdown-label">{addon.nombre}</span>
                  <span className="checkout-summary-breakdown-value">{formatPrice(addon.precio)}</span>
                </div>
              ))}

              <div className="checkout-summary-total-row">
                <span className="checkout-summary-total-label">Total</span>
                <span className="checkout-summary-total-value">{formatPrice(quote.total)}</span>
              </div>
            </div>
          )}

          {!quote && quoteLoading && <p className="checkout-summary-status">Calculando el precio…</p>}
        </div>

        {/* ---------- Columna: pago ---------- */}
        <div className="checkout-payment">
          {paymentResult === 'succeeded' && <SuccessMessage codigo={codigoReserva} />}
          {paymentResult === 'processing' && <SuccessMessage processing codigo={codigoReserva} />}

          {!paid && (
            <>
              {paymentResult === 'failed' && (
                <p className="checkout-error-message" role="alert">
                  El pago anterior no se ha completado. Puedes intentarlo de nuevo.
                </p>
              )}

              {quote && elementsOptions ? (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <CheckoutForm
                    reservation={{ checkIn: quote.checkIn, checkOut: quote.checkOut, guests, selectedAddons }}
                    quote={quote}
                    onQuoteChanged={setQuote}
                    onPaid={handlePaid}
                  />
                </Elements>
              ) : (
                <p className="checkout-payment-pending-note">
                  {!checkoutDate
                    ? 'Elige la fecha de salida para continuar con el pago.'
                    : quoteError
                      ? 'Modifica la reserva para poder continuar con el pago.'
                      : 'Calculando el precio de tu estancia…'}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Checkout;