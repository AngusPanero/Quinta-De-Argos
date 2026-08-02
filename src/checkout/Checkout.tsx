import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import './checkout.css';
import { UseTheme } from '../contexts/ThemeContext';
import BookingCalendar from '../reservas/BookingCalendar';
import { RESERVATION_STORAGE_KEY } from '../reservas/Reservations';
import {
  ADDONS,
  PRICE_PER_NIGHT,
  MAX_NIGHTS,
  MAX_GUESTS,
  MAX_BOOKING_HORIZON_DAYS,
} from '../reservas/BookingConfig';
import { addDays, diffInDays, formatDateLong, formatPrice, startOfDay } from '../reservas/BookingDates';

/**
 * Checkout
 * ---------------------------------------------------------
 * Recibe la reserva armada en Reservations.tsx (por location.state
 * o, si el usuario refrescó la página, desde sessionStorage).
 * Permite editar fechas, huéspedes y adicionales acá mismo antes
 * de pagar. El pago se procesa con Stripe (CardElement).
 *
 * TODO (Angus):
 * 1) Reemplazar VITE_STRIPE_PUBLISHABLE_KEY por tu key real (test o live).
 * 2) Crear en tu backend el endpoint POST /api/create-payment-intent
 *    que reciba { amount, currency, metadata } y devuelva { clientSecret }.
 */

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const API_BASE = import.meta.env.VITE_API_URL || '';

interface StoredReservation {
  checkin: string;
  checkout: string;
  guests: number;
  selectedAddons: Record<string, boolean>;
}

function loadInitialReservation(locationState: unknown): StoredReservation | null {
  if (
    locationState &&
    typeof locationState === 'object' &&
    'checkin' in locationState &&
    'checkout' in locationState
  ) {
    return locationState as StoredReservation;
  }
  try {
    const raw = sessionStorage.getItem(RESERVATION_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredReservation;
  } catch {
    // sessionStorage no disponible o dato corrupto: seguimos sin reserva.
  }
  return null;
}

// ==========================================================
// Formulario de tarjeta (vive dentro de <Elements>)
// ==========================================================

interface CheckoutFormProps {
  checkin: Date;
  checkoutDate: Date;
  guests: number;
  selectedAddons: Record<string, boolean>;
  grandTotal: number;
  theme: 'light' | 'dark';
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  checkin,
  checkoutDate,
  guests,
  selectedAddons,
  grandTotal,
  theme,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [succeeded, setSucceeded] = useState(false);

  const cardElementOptions = {
    style: {
      base: {
        fontFamily: "'Jost', 'Helvetica Neue', Arial, sans-serif",
        fontSize: '16px',
        color: theme === 'dark' ? '#ece4d3' : '#2c2a24',
        '::placeholder': {
          color: theme === 'dark' ? 'rgba(236, 228, 211, 0.4)' : 'rgba(44, 42, 36, 0.4)',
        },
      },
      invalid: { color: '#9a4a34' },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMessage('');

    try {
      // Creamos el PaymentIntent recién acá, con el total ya actualizado,
      // por si el huésped editó fechas o adicionales antes de pagar.
      const { data } = await axios.post(
        `${API_BASE}/api/create-payment-intent`,
        {
          amount: Math.round(grandTotal * 100), // Stripe trabaja en centavos
          currency: 'eur',
          metadata: {
            checkin: checkin.toISOString(),
            checkout: checkoutDate.toISOString(),
            guests,
            adicionales: Object.keys(selectedAddons)
              .filter((id) => selectedAddons[id])
              .join(','),
          },
        },
        { withCredentials: true }
      );

      const clientSecret = data.clientSecret as string;
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('No se encontró el formulario de tarjeta.');

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: cardholderName },
        },
      });

      if (result.error) {
        setErrorMessage(result.error.message || 'No pudimos procesar el pago. Probá de nuevo.');
      } else if (result.paymentIntent?.status === 'succeeded') {
        setSucceeded(true);
      }
    } catch (err: any) {
      console.error('Error al procesar el pago:', err);
      setErrorMessage('Hubo un problema al procesar el pago. Probá de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="checkout-success">
        <span className="checkout-success-icon">✓</span>
        <h2 className="checkout-success-heading">Reserva confirmada</h2>
        <p className="checkout-success-paragraph">
          Te enviamos un email con todos los detalles de tu estancia en
          Quinta de Argos. Nos vemos pronto.
        </p>
      </div>
    );
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <div className="checkout-field-name">
        <label htmlFor="cardholder" className="checkout-field-name-label">
          Nombre en la tarjeta
        </label>
        <input
          id="cardholder"
          type="text"
          className="checkout-field-name-input"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Como figura en tu tarjeta"
          required
        />
      </div>

      <div className="checkout-field-card">
        <span className="checkout-field-card-label">Tarjeta</span>
        <div className="checkout-field-card-element">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {errorMessage && <p className="checkout-error-message">{errorMessage}</p>}

      <button type="submit" className="checkout-pay-button" disabled={!stripe || processing}>
        {processing ? 'Procesando...' : `Pagar ${formatPrice(grandTotal)}`}
      </button>

      <p className="checkout-secure-note">🔒 Pago seguro procesado por Stripe.</p>
    </form>
  );
};

// ==========================================================
// Página de checkout
// ==========================================================

const Checkout: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const initial = useMemo(() => loadInitialReservation(location.state), []); // eslint-disable-line react-hooks/exhaustive-deps

  const today = useMemo(() => startOfDay(new Date()), []);
  const maxBookableDate = useMemo(() => addDays(today, MAX_BOOKING_HORIZON_DAYS), [today]);

  const [checkin, setCheckin] = useState<Date | null>(initial ? new Date(initial.checkin) : null);
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(
    initial ? new Date(initial.checkout) : null
  );
  const [guests, setGuests] = useState<number>(initial?.guests ?? 2);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>(
    initial?.selectedAddons ?? {}
  );
  const [editingDates, setEditingDates] = useState(false);

  // Si entraron directo a /checkout sin pasar por Reservas, no hay nada que cobrar.
  useEffect(() => {
    if (!initial) {
      navigate('/reservas');
    }
  }, [initial, navigate]);

  // Persistimos cualquier edición para sobrevivir un refresh de la página.
  useEffect(() => {
    if (checkin && checkoutDate) {
      sessionStorage.setItem(
        RESERVATION_STORAGE_KEY,
        JSON.stringify({
          checkin: checkin.toISOString(),
          checkout: checkoutDate.toISOString(),
          guests,
          selectedAddons,
        })
      );
    }
  }, [checkin, checkoutDate, guests, selectedAddons]);

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const nights = checkin && checkoutDate ? diffInDays(checkoutDate, checkin) : 0;
  const subtotal = nights * PRICE_PER_NIGHT;
  const addonsTotal = ADDONS.reduce(
    (sum, addon) => sum + (selectedAddons[addon.id] ? addon.precio : 0),
    0
  );
  const grandTotal = subtotal + addonsTotal;

  // Antes este guard chequeaba `!checkin || !checkoutDate` en cada render.
  // El problema: al editar fechas, el calendario pasa por un estado
  // intermedio donde checkoutDate es null (elegiste la nueva llegada,
  // todavía no la salida) — y ese guard tiraba `return null`, borrando
  // toda la página. Ahora depende de `initial`, que es estable durante
  // toda la sesión de edición.
  if (!initial) return null;

  return (
    <div className={`checkout ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <section className="checkout-hero">
        <span className="checkout-eyebrow-hero">Checkout</span>
        <h1 className="checkout-heading-hero">Confirmá tu reserva</h1>
        <p className="checkout-paragraph-hero">
          Revisá los detalles de tu estancia antes de pagar. Podés modificar
          las fechas, los huéspedes o los adicionales en cualquier momento.
        </p>
      </section>

      <section className="checkout-content">
        {/* ---------- Columna: resumen editable ---------- */}
        <div className="checkout-summary">
          <div className="checkout-summary-dates-block">
            <div className="checkout-summary-dates-header">
              <span className="checkout-summary-dates-title">Fechas</span>
              <button
                type="button"
                className="checkout-summary-edit-dates-button"
                onClick={() => setEditingDates((v) => !v)}
              >
                {editingDates ? 'Listo' : 'Editar'}
              </button>
            </div>

            {!editingDates ? (
              <div className="checkout-summary-dates-display">
                <span className="checkout-summary-dates-range">
                  {checkin && checkoutDate
                    ? `${formatDateLong(checkin)} → ${formatDateLong(checkoutDate)}`
                    : 'Seleccioná llegada y salida'}
                </span>
                <span className="checkout-summary-dates-nights">
                  {nights ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : '—'}
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
                minDate={today}
                maxDate={maxBookableDate}
                maxNights={MAX_NIGHTS}
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
                aria-label="Restar huésped"
              >
                −
              </button>
              <span className="checkout-summary-guests-count">{guests}</span>
              <button
                type="button"
                className="checkout-summary-guests-increase"
                onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
                aria-label="Sumar huésped"
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
                    />
                    <span className="checkout-summary-addon-name">{addon.nombre}</span>
                    <span className="checkout-summary-addon-price">{formatPrice(addon.precio)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="checkout-summary-breakdown-row">
            <span className="checkout-summary-breakdown-label">
              {nights} {nights === 1 ? 'noche' : 'noches'} × {formatPrice(PRICE_PER_NIGHT)}
            </span>
            <span className="checkout-summary-breakdown-value">{formatPrice(subtotal)}</span>
          </div>

          {addonsTotal > 0 && (
            <div className="checkout-summary-breakdown-row">
              <span className="checkout-summary-breakdown-label">Adicionales</span>
              <span className="checkout-summary-breakdown-value">{formatPrice(addonsTotal)}</span>
            </div>
          )}

          <div className="checkout-summary-total-row">
            <span className="checkout-summary-total-label">Total</span>
            <span className="checkout-summary-total-value">{formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* ---------- Columna: pago ---------- */}
        <div className="checkout-payment">
          {checkin && checkoutDate ? (
            <Elements stripe={stripePromise}>
              <CheckoutForm
                checkin={checkin}
                checkoutDate={checkoutDate}
                guests={guests}
                selectedAddons={selectedAddons}
                grandTotal={grandTotal}
                theme={theme as 'light' | 'dark'}
              />
            </Elements>
          ) : (
            <p className="checkout-payment-pending-note">
              Completá la fecha de salida para continuar con el pago.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Checkout;