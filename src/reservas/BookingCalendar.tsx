import React, { useMemo, useState } from 'react';
import './bookingCalendar.css';
import {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  addDays,
  isSameDay,
  getMonthGrid,
} from './BookingDates';

/**
 * BookingCalendar
 * ---------------------------------------------------------
 * Calendario de dos clicks (llegada → salida), 100% controlado
 * por props. No sabe nada de precio ni de adicionales — solo
 * fechas. Se usa tanto en Reservations.tsx como en Checkout.tsx
 * para que el comportamiento sea idéntico en las dos pantallas.
 */

interface BookingCalendarProps {
  checkin: Date | null;
  checkout: Date | null;
  onSelect: (checkin: Date | null, checkout: Date | null) => void;
  minDate: Date;
  maxDate: Date;
  maxNights: number;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  checkin,
  checkout,
  onSelect,
  minDate,
  maxDate,
  maxNights,
}) => {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date((checkin ?? minDate).getFullYear(), (checkin ?? minDate).getMonth(), 1)
  );

  const isDateDisabled = (date: Date): boolean => {
    if (date < minDate) return true;
    if (date > maxDate) return true;
    if (checkin && !checkout) {
      if (date <= checkin) return true;
      if (date > addDays(checkin, maxNights)) return true;
    }
    return false;
  };

  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    if (!checkin || (checkin && checkout)) {
      onSelect(date, null);
    } else if (date > checkin) {
      onSelect(checkin, date);
    } else {
      onSelect(date, null);
    }
  };

  const goToPrevMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setVisibleMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      return next > maxMonth ? prev : next;
    });
  };

  const isNextMonthDisabled =
    visibleMonth.getFullYear() === maxDate.getFullYear() &&
    visibleMonth.getMonth() === maxDate.getMonth();

  const monthGrid = useMemo(
    () => getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-nav">
        <button
          type="button"
          className="booking-calendar-nav-prev"
          onClick={goToPrevMonth}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="booking-calendar-month-label">
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

      <div className="booking-calendar-weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="booking-calendar-weekday">
            {w}
          </span>
        ))}
      </div>

      <div className="booking-calendar-grid">
        {monthGrid.map((date, i) => {
          if (!date) {
            return <span key={`empty-${i}`} className="booking-calendar-day-empty" />;
          }
          const disabled = isDateDisabled(date);
          const isCheckin = checkin && isSameDay(date, checkin);
          const isCheckout = checkout && isSameDay(date, checkout);
          const inRange = checkin && checkout && date > checkin && date < checkout;

          return (
            <button
              type="button"
              key={date.toISOString()}
              disabled={disabled}
              onClick={() => handleDayClick(date)}
              className={[
                'booking-calendar-day',
                disabled ? 'is-disabled' : '',
                isCheckin ? 'is-checkin' : '',
                isCheckout ? 'is-checkout' : '',
                inRange ? 'is-in-range' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookingCalendar;