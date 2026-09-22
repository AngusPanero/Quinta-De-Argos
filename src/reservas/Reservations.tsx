import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import "./reservations.css";
import { UseTheme } from '../contexts/ThemeContext';
import BookingCalendar from './BookingCalendar';
import imgPiscina from '../assets/quinta4.jpg';
import imgBuhardilla from '../assets/quinta3.jpg';
import imgJardin from '../assets/quinta5.jpg';
import { ADDONS, PRICE_PER_NIGHT, MAX_NIGHTS, MAX_GUESTS, MAX_BOOKING_HORIZON_DAYS } from './BookingConfig';
import { addDays, diffInDays, formatDateLong, formatPrice, startOfDay } from './BookingDates';

// Clave de sessionStorage compartida con Checkout.tsx: si el usuario
// refresca /checkout, la reserva sobrevive.
export const RESERVATION_STORAGE_KEY = import.meta.env.VITE_RESERVATION_STORAGE_KEY;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const stepVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -40 : 40 }),
};

const Reservations: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';
  const navigate = useNavigate();

  // ---------- Fechas ----------
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxBookableDate = useMemo(() => addDays(today, MAX_BOOKING_HORIZON_DAYS), [today]);

  const [checkin, setCheckin] = useState<Date | null>(null);
  const [checkout, setCheckout] = useState<Date | null>(null);
  const [guests, setGuests] = useState<number>(2);

  const nights = checkin && checkout ? diffInDays(checkout, checkin) : 0;

  // ---------- Adicionales ----------
  const hasAddons = ADDONS.length > 0;
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addonsTotal = ADDONS.reduce(
    (sum, addon) => sum + (selectedAddons[addon.id] ? addon.precio : 0),
    0
  );

  // ---------- Wizard de pasos ----------
  const summaryStepIndex = hasAddons ? ADDONS.length + 1 : 1;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const canAdvanceFromDates = Boolean(checkin && checkout && guests >= 1);

  const goNext = () => {
    if (step === 0 && !canAdvanceFromDates) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, summaryStepIndex));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const subtotal = nights * PRICE_PER_NIGHT;
  const grandTotal = subtotal + addonsTotal;

  const currentAddon = hasAddons && step >= 1 && step <= ADDONS.length ? ADDONS[step - 1] : null;

  // ---------- Ir a checkout con todo lo capturado ----------
  const handleGoToCheckout = () => {
    if (!checkin || !checkout) return;

    const reservationData = {
      checkin: checkin.toISOString(),
      checkout: checkout.toISOString(),
      guests,
      selectedAddons,
    };

    // Guardamos en sessionStorage además de mandarlo por location.state,
    // así si el usuario refresca /checkout no pierde la reserva.
    sessionStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(reservationData));
    navigate('/checkout', { state: reservationData });
  };

  return (
    <div className={`reservas-corporate ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ HERO ============ */}
      <section className="reservas-corporate-hero">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.span className="reservas-corporate-eyebrow-hero" variants={fadeUp} transition={{ duration: 0.6 }}>
            Reservas
          </motion.span>
          <motion.h1 className="reservas-corporate-heading-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            Diseña tu estancia perfecta
          </motion.h1>
          <motion.p className="reservas-corporate-paragraph-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            Quinta de Argos recibe a muy pocos huéspedes por vez — hasta seis
            personas en cada estancia. Elige tus fechas y armá tu reserva a tu
            manera, con los adicionales que quieras sumar.
          </motion.p>
          <motion.blockquote className="reservas-corporate-quote-hero" variants={fadeUp} transition={{ duration: 0.8 }}>
            "Quinta de Argos no solo se habita: se siente."
          </motion.blockquote>
        </motion.div>
      </section>

      {/* ============ SILENCIO Y CALMA ============ */}
      <section className="reservas-corporate-calm">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
          className="reservas-corporate-calm-inner"
        >
          <motion.span className="reservas-corporate-calm-eyebrow" variants={fadeUp} transition={{ duration: 0.6 }}>
            Quiet luxury rural
          </motion.span>
          <motion.h2 className="reservas-corporate-calm-heading" variants={fadeUp} transition={{ duration: 0.7 }}>
            Un refugio pensado para desconectar
          </motion.h2>
          <motion.p className="reservas-corporate-calm-paragraph-one" variants={fadeUp} transition={{ duration: 0.7 }}>
            Quinta de Argos es mucho más que una casa rural: es un espacio
            pensado para desconectar, descansar y disfrutar del entorno con
            tranquilidad. La vivienda combina materiales naturales, madera y
            tonos suaves para crear una atmósfera acogedora y elegante, donde
            cada detalle está cuidado para transmitir calma y bienestar.
          </motion.p>
          <motion.p className="reservas-corporate-calm-paragraph-two" variants={fadeUp} transition={{ duration: 0.7 }}>
            En línea con esta filosofía, el salón principal no dispone de
            televisión, favoreciendo una experiencia más relajada y conectada
            con la naturaleza. Para quienes deseen disfrutar de contenido
            audiovisual, la buhardilla cuenta con una zona independiente
            equipada para el ocio, sin interferir en la tranquilidad del resto
            de los espacios.
          </motion.p>
          <motion.p className="reservas-corporate-calm-paragraph-three" variants={fadeUp} transition={{ duration: 0.7 }}>
            No es ostentoso. No es una villa de catálogo. Es una finca serena,
            estética y emocional — un lugar donde el descanso se convierte en
            ritual y cada rincón transmite una sensación de calma sofisticada,
            íntima y acogedora.
          </motion.p>
          <span className="reservas-corporate-calm-horizon" />
        </motion.div>
      </section>

      {/* ============ PANELES EDITORIALES ============ */}
      <section className="reservas-corporate-editorial">
        <motion.div
          className="reservas-corporate-editorial-piscina"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.9 }}
        >
          <div className="reservas-corporate-editorial-piscina-image">
            <img src={imgPiscina} alt="Piscina infinity de Quinta de Argos" />
          </div>
          <div className="reservas-corporate-editorial-piscina-text">
            <span className="reservas-corporate-editorial-piscina-eyebrow">Piscina infinity</span>
            <p className="reservas-corporate-editorial-piscina-paragraph">
              Agua que se funde con el horizonte, un espacio sereno y elegante
              para disfrutar de amaneceres, atardeceres y momentos de
              contemplación.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="reservas-corporate-editorial-buhardilla"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.9 }}
        >
          <div className="reservas-corporate-editorial-buhardilla-text">
            <span className="reservas-corporate-editorial-buhardilla-eyebrow">Buhardilla</span>
            <p className="reservas-corporate-editorial-buhardilla-paragraph">
              Refugio versátil de ocio y descanso, con sofá, sillón y zona de
              juegos, donde la luz cálida y la madera aportan confort y estilo
              contemporáneo. Proyector y pantalla invitan a disfrutar de
              películas o momentos de entretenimiento con total comodidad.
            </p>
          </div>
          <div className="reservas-corporate-editorial-buhardilla-image">
            <img src={imgBuhardilla} alt="Buhardilla con proyector de Quinta de Argos" />
          </div>
        </motion.div>

        <motion.div
          className="reservas-corporate-editorial-jardin"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.9 }}
        >
          <div className="reservas-corporate-editorial-jardin-image">
            <img src={imgJardin} alt="Jardín de 7.000 metros cuadrados de Quinta de Argos" />
          </div>
          <div className="reservas-corporate-editorial-jardin-text">
            <span className="reservas-corporate-editorial-jardin-eyebrow">Jardín · 7.000 m²</span>
            <p className="reservas-corporate-editorial-jardin-paragraph">
              Una parcela que invita a pasear y respirar naturaleza, donde
              cada rincón transmite privacidad, belleza y la esencia elegante
              de Quinta de Argos.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ============ WIZARD ============ */}
      <section className="reservas-corporate-wizard">
        {/* ---------- Indicador de pasos ---------- */}
        <div className="reservas-corporate-steps-indicator">
          <div className={`reservas-corporate-step-dot ${step >= 0 ? 'is-done' : ''} ${step === 0 ? 'is-current' : ''}`} />
          {hasAddons &&
            ADDONS.map((addon, i) => (
              <div
                key={addon.id}
                className={`reservas-corporate-step-dot ${step >= i + 1 ? 'is-done' : ''} ${step === i + 1 ? 'is-current' : ''}`}
              />
            ))}
          <div
            className={`reservas-corporate-step-dot ${step >= summaryStepIndex ? 'is-done' : ''} ${
              step === summaryStepIndex ? 'is-current' : ''
            }`}
          />
        </div>

        <div className="reservas-corporate-step-viewport">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ---------- PASO 0: Fechas y huéspedes ---------- */}
            {step === 0 && (
              <motion.div
                key="step-dates"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
                className="reservas-corporate-step-dates"
              >
                <h2 className="reservas-corporate-step-heading-dates">Elegí tus fechas</h2>

                <BookingCalendar
                  checkin={checkin}
                  checkout={checkout}
                  onSelect={(newCheckin, newCheckout) => {
                    setCheckin(newCheckin);
                    setCheckout(newCheckout);
                  }}
                  minDate={today}
                  maxDate={maxBookableDate}
                  maxNights={MAX_NIGHTS}
                />

                <div className="reservas-corporate-dates-summary">
                  <div className="reservas-corporate-dates-summary-checkin">
                    <span className="reservas-corporate-dates-summary-label-checkin">Llegada</span>
                    <span className="reservas-corporate-dates-summary-value-checkin">
                      {checkin ? formatDateLong(checkin) : 'Elegí una fecha'}
                    </span>
                  </div>
                  <div className="reservas-corporate-dates-summary-checkout">
                    <span className="reservas-corporate-dates-summary-label-checkout">Salida</span>
                    <span className="reservas-corporate-dates-summary-value-checkout">
                      {checkout ? formatDateLong(checkout) : 'Elegí una fecha'}
                    </span>
                  </div>
                  <div className="reservas-corporate-dates-summary-nights">
                    <span className="reservas-corporate-dates-summary-label-nights">Noches</span>
                    <span className="reservas-corporate-dates-summary-value-nights">{nights || '—'}</span>
                  </div>
                </div>

                <div className="reservas-corporate-guests-selector">
                  <span className="reservas-corporate-guests-label">Huéspedes</span>
                  <div className="reservas-corporate-guests-controls">
                    <button
                      type="button"
                      className="reservas-corporate-guests-decrease"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      aria-label="Restar huésped"
                    >
                      −
                    </button>
                    <span className="reservas-corporate-guests-count">{guests}</span>
                    <button
                      type="button"
                      className="reservas-corporate-guests-increase"
                      onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
                      aria-label="Sumar huésped"
                    >
                      +
                    </button>
                  </div>
                  <span className="reservas-corporate-guests-max-note">Máximo {MAX_GUESTS} huéspedes</span>
                </div>
              </motion.div>
            )}

            {/* ---------- PASOS 1..N: Adicionales ---------- */}
            {currentAddon && (
              <motion.div
                key={`step-addon-${currentAddon.id}`}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
                className="reservas-corporate-step-addon"
              >
                <span className="reservas-corporate-addon-eyebrow">
                  Adicional {step} de {ADDONS.length}
                </span>
                <h2 className="reservas-corporate-addon-name">{currentAddon.nombre}</h2>
                <p className="reservas-corporate-addon-description">{currentAddon.descripcion}</p>
                <span className="reservas-corporate-addon-price">{formatPrice(currentAddon.precio)}</span>

                <button
                  type="button"
                  className={`reservas-corporate-addon-toggle ${
                    selectedAddons[currentAddon.id] ? 'is-added' : ''
                  }`}
                  onClick={() => toggleAddon(currentAddon.id)}
                >
                  {selectedAddons[currentAddon.id] ? 'Agregado ✓ — Quitar' : 'Sumar a mi reserva'}
                </button>

                <span className="reservas-corporate-addon-running-total">
                  Total hasta ahora: {formatPrice(subtotal + addonsTotal)}
                </span>
              </motion.div>
            )}

            {/* ---------- PASO FINAL: Resumen ---------- */}
            {step === summaryStepIndex && (
              <motion.div
                key="step-summary"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
                className="reservas-corporate-step-summary"
              >
                <h2 className="reservas-corporate-summary-heading">Resumen de tu reserva</h2>

                <div className="reservas-corporate-summary-row-dates">
                  <span className="reservas-corporate-summary-row-dates-label">Fechas</span>
                  <span className="reservas-corporate-summary-row-dates-value">
                    {checkin && checkout
                      ? `${formatDateLong(checkin)} → ${formatDateLong(checkout)}`
                      : '—'}
                  </span>
                </div>

                <div className="reservas-corporate-summary-row-guests">
                  <span className="reservas-corporate-summary-row-guests-label">Huéspedes</span>
                  <span className="reservas-corporate-summary-row-guests-value">{guests}</span>
                </div>

                <div className="reservas-corporate-summary-row-nights">
                  <span className="reservas-corporate-summary-row-nights-label">
                    {nights} {nights === 1 ? 'noche' : 'noches'} × {formatPrice(PRICE_PER_NIGHT)}
                  </span>
                  <span className="reservas-corporate-summary-row-nights-value">{formatPrice(subtotal)}</span>
                </div>

                {hasAddons &&
                  ADDONS.filter((a) => selectedAddons[a.id]).map((addon) => (
                    <div key={addon.id} className="reservas-corporate-summary-row-addon">
                      <span className="reservas-corporate-summary-row-addon-label">{addon.nombre}</span>
                      <span className="reservas-corporate-summary-row-addon-value">
                        {formatPrice(addon.precio)}
                      </span>
                    </div>
                  ))}

                <div className="reservas-corporate-summary-row-total">
                  <span className="reservas-corporate-summary-row-total-label">Total</span>
                  <span className="reservas-corporate-summary-row-total-value">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  className="reservas-corporate-pay-button"
                  onClick={handleGoToCheckout}
                >
                  Continuar al pago
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------- Navegación entre pasos ---------- */}
        {step !== summaryStepIndex && (
          <div className="reservas-corporate-wizard-nav">
            <button
              type="button"
              className="reservas-corporate-wizard-nav-back"
              onClick={goBack}
              disabled={step === 0}
            >
              Anterior
            </button>
            <button
              type="button"
              className="reservas-corporate-wizard-nav-next"
              onClick={goNext}
              disabled={step === 0 && !canAdvanceFromDates}
            >
              Siguiente
            </button>
          </div>
        )}

        {step === summaryStepIndex && (
          <div className="reservas-corporate-wizard-nav">
            <button type="button" className="reservas-corporate-wizard-nav-back" onClick={goBack}>
              Anterior
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Reservations;