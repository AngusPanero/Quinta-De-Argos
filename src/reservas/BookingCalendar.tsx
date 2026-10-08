import React, { useMemo, useState } from 'react';
import './bookingCalendar.css';
import {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  addDaysISO,
  fromISODate,
  getMonthGrid,
  toISODate,
  formatDayMonth,
  formatPrice,
} from './BookingDates';
import { type Availability, type DayStatus, checkDeparture, minNightsFor } from './useAvailability';
import { MIN_NOTICE_HOURS } from './BookingConfig';

/**
 * BookingCalendar
 * ---------------------------------------------------------
 * Calendario de dos clics (llegada → salida), 100 % controlado
 * por props. Pinta el estado de cada noche según la disponibilidad
 * que devuelve el backend (Beds24 + tarifas + antelación de 72 h).
 * Se usa tanto en Reservations.tsx como en Checkout.tsx para que
 * el comportamiento sea idéntico en las dos pantallas.
 *
 * Reglas:
 * - Llegada: solo noches libres.
 * - Salida: todas las noches intermedias libres, respetando la
 *   estancia mínima del día de llegada y el máximo de noches.
 *   El día de salida puede estar ocupado (esa noche ya no es tuya).
 */

interface BookingCalendarProps {
  checkin: Date | null;
  checkout: Date | null;
  onSelect: (checkin: Date | null, checkout: Date | null) => void;
  availability: Availability | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  maxNights: number;
}

const STATUS_CLASS: Record<DayStatus, string> = {
  libre: 'is-available',
  ocupado: 'is-booked',
  sin_tarifa: 'is-no-rate',
  antelacion: 'is-notice',
};

const STATUS_LABEL: Record<Exclude<DayStatus, 'libre'>, string> = {
  ocupado: 'Ocupado',
  sin_tarifa: 'No disponible para reservas online',
  antelacion: `Requiere ${MIN_NOTICE_HOURS} horas de antelación`,
};

const nightsLabel = (n: number) => `${n} ${n === 1 ? 'noche' : 'noches'}`;

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  checkin,
  checkout,
  onSelect,
  availability,
  loading,
  error,
  onRetry,
  maxNights,
}) => {
  const today = useMemo(() => new Date(), []);
  const firstMonth = useMemo(() => {
    const base = fromISODate(availability?.hoy) ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [availability?.hoy, today]);
  const lastMonth = useMemo(() => {
    // La última fecha seleccionable es la salida tras la última noche reservable.
    const last = availability ? fromISODate(addDaysISO(availability.ultimaNoche, 1)) : null;
    const base = last ?? new Date(today.getFullYear() + 1, today.getMonth(), 1);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [availability, today]);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = checkin ?? fromISODate(availability?.primeraLlegada) ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const checkinISO = checkin ? toISODate(checkin) : null;
  const checkoutISO = checkout ? toISODate(checkout) : null;
  const selectingDeparture = Boolean(checkinISO && !checkoutISO);
  const ready = Boolean(availability) && !loading;

  const describeDay = (iso: string) => {
    const info = availability?.dias[iso];
    let enabled = false;
    let label = 'Fuera del periodo reservable';
    let departureOnly = false;
    let unreachable = false;

    if (info?.estado === 'libre') {
      label = `${formatPrice(info.precio ?? 0)} por noche · estancia mínima ${nightsLabel(info.minNoches ?? 1)}`;
    } else if (info) {
      label = STATUS_LABEL[info.estado];
    }

    if (!ready) return { info, enabled, label, departureOnly, unreachable };

    if (selectingDeparture && checkinISO) {
      if (iso === checkinISO) {
        enabled = true;
        label = 'Llegada elegida · pulsa de nuevo para deshacer';
      } else if (iso > checkinISO) {
        const check = checkDeparture(availability, checkinISO, iso, maxNights);
        if (check.ok) {
          enabled = true;
          if (info?.estado !== 'libre') {
            departureOnly = true;
            label = 'Disponible solo como día de salida';
          }
        } else if (check.reason !== 'antes') {
          unreachable = true;
          if (check.reason === 'minimo') {
            label = `Estancia mínima desde tu llegada: ${nightsLabel(minNightsFor(availability, checkinISO))}`;
          } else if (check.reason === 'maximo') {
            label = `La estancia máxima es de ${nightsLabel(maxNights)}`;
          } else {
            label = 'Hay noches no disponibles entre tu llegada y este día';
          }
        }
      } else {
        enabled = info?.estado === 'libre';
      }
    } else {
      enabled = info?.estado === 'libre';
    }

    return { info, enabled, label, departureOnly, unreachable };
  };

  const handleDayClick = (date: Date, enabled: boolean) => {
    if (!enabled) return;
    const iso = toISODate(date);
    if (selectingDeparture && checkinISO) {
      if (iso === checkinISO) onSelect(null, null);
      else if (iso > checkinISO) onSelect(checkin, date);
      else onSelect(date, null);
      return;
    }
    onSelect(date, null);
  };

  const goToPrevMonth = () => {
    setVisibleMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return next < firstMonth ? prev : next;
    });
  };

  const goToNextMonth = () => {
    setVisibleMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next > lastMonth ? prev : next;
    });
  };

  const isPrevMonthDisabled = visibleMonth <= firstMonth;
  const isNextMonthDisabled = visibleMonth >= lastMonth;

  const monthGrid = useMemo(
    () => getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );

  let hint = 'Elige el día de llegada.';
  if (selectingDeparture && checkinISO) {
    hint = `Ahora elige el día de salida. Estancia mínima: ${nightsLabel(minNightsFor(availability, checkinISO))}.`;
  } else if (checkinISO && checkoutISO && checkin && checkout) {
    const n = Math.round((checkout.getTime() - checkin.getTime()) / 86_400_000);
    hint = `${nightsLabel(n)} seleccionadas. Pulsa otro día para empezar de nuevo.`;
  }

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-nav">
        <button
          type="button"
          className="booking-calendar-nav-prev"
          onClick={goToPrevMonth}
          disabled={isPrevMonthDisabled}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="booking-calendar-month-label" aria-live="polite">
          {MONTH_LABELS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </span>
        <button
          type="button"
          className="booking-calendar-nav-next"
          onClick={goToNextMonth}
          disabled={isNextMonthDisabled}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="booking-calendar-weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="booking-calendar-weekday">
            {w}
          </span>
        ))}
      </div>

      <div className={`booking-calendar-grid${loading ? ' is-loading' : ''}`}>
        {monthGrid.map((date, i) => {
          if (!date) {
            return <span key={`empty-${i}`} className="booking-calendar-day-empty" />;
          }
          const iso = toISODate(date);
          const { info, enabled, label, departureOnly, unreachable } = describeDay(iso);
          const isCheckin = iso === checkinISO;
          const isCheckout = iso === checkoutISO;
          const inRange = Boolean(checkinISO && checkoutISO && iso > checkinISO && iso < checkoutISO);
          const showPrice = info?.estado === 'libre' && !unreachable && !isCheckout;

          return (
            <button
              type="button"
              key={iso}
              aria-disabled={!enabled}
              aria-pressed={isCheckin || isCheckout}
              aria-label={`${formatDayMonth(date)}: ${label}`}
              title={label}
              onClick={() => handleDayClick(date, enabled)}
              className={[
                'booking-calendar-day',
                info ? STATUS_CLASS[info.estado] : 'is-out',
                enabled ? '' : 'is-disabled',
                departureOnly ? 'is-departure-only' : '',
                unreachable ? 'is-unreachable' : '',
                isCheckin ? 'is-checkin' : '',
                isCheckout ? 'is-checkout' : '',
                inRange ? 'is-in-range' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="booking-calendar-day-number">{date.getDate()}</span>
              {showPrice && <span className="booking-calendar-day-price">{info?.precio}€</span>}
            </button>
          );
        })}

        {loading && (
          <div className="booking-calendar-status" role="status">
            Consultando disponibilidad…
          </div>
        )}
      </div>

      {error && !loading ? (
        <div className="booking-calendar-error" role="alert">
          <span>{error}</span>
          <button type="button" className="booking-calendar-error-retry" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : (
        <p className="booking-calendar-hint" aria-live="polite">
          {hint}
        </p>
      )}

      <ul className="booking-calendar-legend">
        <li className="booking-calendar-legend-item">
          <span className="booking-calendar-legend-swatch is-available" aria-hidden="true" />
          Disponible
        </li>
        <li className="booking-calendar-legend-item">
          <span className="booking-calendar-legend-swatch is-booked" aria-hidden="true" />
          Ocupado
        </li>
        <li className="booking-calendar-legend-item">
          <span className="booking-calendar-legend-swatch is-no-rate" aria-hidden="true" />
          No disponible
        </li>
      </ul>

      <p className="booking-calendar-notice">
        Las reservas requieren un mínimo de {MIN_NOTICE_HOURS} horas de antelación. Para fechas más
        próximas, consúltanos directamente.
      </p>
    </div>
  );
};

export default BookingCalendar;