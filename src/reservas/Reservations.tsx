import React, { useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  MotionValue,
} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './reservations.css';
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

// Mismo easing que la galería, para que todo el sitio respire igual.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

// ==========================================================
// Contenido del recorrido
// ==========================================================

interface StayScene {
  id: string;
  src: string;
  alt: string;
  name: string;
  description: string;
}

const STAY_SCENES: StayScene[] = [
  {
    id: 'piscina',
    src: imgPiscina,
    alt: 'Piscina infinity de Quinta de Argos',
    name: 'Piscina infinity',
    description:
      'Agua que se funde con el horizonte, un espacio sereno y elegante para disfrutar de amaneceres, atardeceres y momentos de contemplación.',
  },
  {
    id: 'buhardilla',
    src: imgBuhardilla,
    alt: 'Buhardilla con proyector de Quinta de Argos',
    name: 'Buhardilla',
    description:
      'Refugio versátil de ocio y descanso, con sofá, sillón y zona de juegos, donde la luz cálida y la madera aportan confort y estilo contemporáneo. Proyector y pantalla invitan a disfrutar de películas con total comodidad.',
  },
  {
    id: 'jardin',
    src: imgJardin,
    alt: 'Jardín de 7.000 metros cuadrados de Quinta de Argos',
    name: 'Jardín de 7.000 m²',
    description:
      'Una parcela que invita a pasear y respirar naturaleza, donde cada rincón transmite privacidad, belleza y la esencia elegante de Quinta de Argos.',
  },
];

const MANIFESTO =
  'No es ostentoso. No es una villa de catálogo. Es una finca serena, estética y emocional — un lugar donde el descanso se convierte en ritual y cada rincón transmite una sensación de calma sofisticada, íntima y acogedora.';

// ==========================================================
// Manifiesto: las palabras se encienden a medida que scrolleás
// ==========================================================

const LitWord: React.FC<{ word: string; progress: MotionValue<number>; range: [number, number] }> = ({
  word,
  progress,
  range,
}) => {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span className="reservas-corporate-lit-word" style={{ opacity }}>
      {word}
    </motion.span>
  );
};

const LitParagraph: React.FC<{ text: string; className: string }> = ({ text, className }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.5'] });
  const words = text.split(' ');

  if (reduceMotion) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <React.Fragment key={`${word}-${i}`}>
          <LitWord word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />{' '}
        </React.Fragment>
      ))}
    </p>
  );
};

// ==========================================================
// Recorrido fijado: cada espacio se abre desde un marco
// hasta ocupar toda la pantalla
// ==========================================================

const SceneLayer: React.FC<{
  scene: StayScene;
  index: number;
  total: number;
  progress: MotionValue<number>;
}> = ({ scene, index, total, progress }) => {
  const seg = 1 / total;
  const start = index * seg;
  const isLast = index === total - 1;

  const openEnd = start + seg * 0.55;
  const capIn: [number, number] = [start + seg * 0.35, start + seg * 0.6];
  const capOut: [number, number] = [start + seg * 0.88, start + seg * 1.02];
  const capRange = isLast ? capIn : [...capIn, ...capOut];

  const clipPath = useTransform(
    progress,
    [start, openEnd],
    ['inset(24% 30% 24% 30% round 6px)', 'inset(0% 0% 0% 0% round 0px)']
  );
  const imageScale = useTransform(progress, [start, start + seg], [1.28, 1.02]);
  const captionOpacity = useTransform(progress, capRange, isLast ? [0, 1] : [0, 1, 1, 0]);
  const captionY = useTransform(progress, capRange, isLast ? [48, 0] : [48, 0, 0, -32]);
  const titleY = useTransform(progress, capIn, ['105%', '0%']);

  return (
    <div className="reservas-corporate-scene" style={{ zIndex: index + 1 }}>
      <motion.div className="reservas-corporate-scene-frame" style={{ clipPath }}>
        <motion.img
          src={scene.src}
          alt={scene.alt}
          className="reservas-corporate-scene-image"
          style={{ scale: imageScale }}
          decoding="async"
        />
        <div className="reservas-corporate-scene-shade" />
      </motion.div>

      <motion.div className="reservas-corporate-scene-caption" style={{ opacity: captionOpacity, y: captionY }}>
        <h3 className="reservas-corporate-scene-name">
          <motion.span style={{ y: titleY }}>{scene.name}</motion.span>
        </h3>
        <p className="reservas-corporate-scene-description">{scene.description}</p>
      </motion.div>
    </div>
  );
};

const StayStage: React.FC = () => {
  const stageRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const total = STAY_SCENES.length;
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(total - 1, Math.max(0, Math.floor(v * total)));
    setActive((prev) => (prev === next ? prev : next));
  });

  const scrollToScene = (i: number) => {
    const el = stageRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((i + 0.62) / total), behavior: 'smooth' });
  };

  // Sin animaciones: los espacios se muestran uno debajo del otro.
  if (reduceMotion) {
    return (
      <section ref={stageRef} className="reservas-corporate-stage-static" aria-label="Espacios de la finca">
        {STAY_SCENES.map((scene) => (
          <figure key={scene.id} className="reservas-corporate-stage-static-item">
            <img src={scene.src} alt={scene.alt} loading="lazy" />
            <figcaption>
              <h3 className="reservas-corporate-scene-name">{scene.name}</h3>
              <p className="reservas-corporate-scene-description">{scene.description}</p>
            </figcaption>
          </figure>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={stageRef}
      className="reservas-corporate-stage"
      style={{ '--qa-scenes': total } as React.CSSProperties}
      aria-label="Espacios de la finca"
    >
      <div className="reservas-corporate-stage-sticky">
        {STAY_SCENES.map((scene, index) => (
          <SceneLayer key={scene.id} scene={scene} index={index} total={total} progress={scrollYProgress} />
        ))}

        <nav className="reservas-corporate-stage-nav" aria-label="Ir a un espacio">
          {STAY_SCENES.map((scene, i) => (
            <button
              key={scene.id}
              type="button"
              className={`reservas-corporate-stage-nav-item${i === active ? ' is-active' : ''}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => scrollToScene(i)}
            >
              {scene.name}
            </button>
          ))}
        </nav>

        <div className="reservas-corporate-stage-progress" aria-hidden="true">
          <motion.span style={{ scaleY: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
};

// ==========================================================
// Página
// ==========================================================

const Reservations: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';
  const navigate = useNavigate();
  const wizardRef = useRef<HTMLDivElement>(null);

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

  // Etiquetas del indicador (solo presentación, no toca la lógica de pasos).
  const stepLabels = useMemo(
    () => ['Fechas y huéspedes', ...ADDONS.map((a) => a.nombre), 'Resumen'],
    []
  );

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

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasDates = nights > 0;

  return (
    <div className={`reservas-corporate ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ RESERVA (arriba de todo) ============ */}
      <section className="reservas-corporate-booking">
        <motion.div
          className="reservas-corporate-booking-intro"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.span className="reservas-corporate-kicker" variants={fadeUp} transition={{ duration: 0.8, ease: EASE }}>
            Reservas
          </motion.span>
          <motion.h1 className="reservas-corporate-heading-hero" variants={fadeUp} transition={{ duration: 0.9, ease: EASE }}>
            Diseña tu estancia perfecta
          </motion.h1>
          <motion.p className="reservas-corporate-paragraph-hero" variants={fadeUp} transition={{ duration: 0.9, ease: EASE }}>
            Quinta de Argos recibe a muy pocos huéspedes por vez — hasta seis personas en cada estancia. Elige tus
            fechas y diseña tu reserva a tu manera, con los adicionales que quieras sumar.
          </motion.p>

          {/* ---------- Ticket en vivo ---------- */}
          <motion.div
            className="reservas-corporate-ticket"
            variants={fadeUp}
            transition={{ duration: 0.9, ease: EASE }}
            aria-live="polite"
          >
            <div className="reservas-corporate-ticket-head">
              <span className="reservas-corporate-ticket-label">Total estimado</span>
              <span className="reservas-corporate-ticket-meta">
                {hasDates
                  ? `${nights} ${nights === 1 ? 'noche' : 'noches'}, ${guests} ${guests === 1 ? 'huésped' : 'huéspedes'}`
                  : 'Aún sin fechas'}
              </span>
            </div>
            <div className="reservas-corporate-ticket-total">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={hasDates ? grandTotal : 'empty'}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  {hasDates ? formatPrice(grandTotal) : '—'}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.blockquote className="reservas-corporate-quote-hero" variants={fadeUp} transition={{ duration: 1, ease: EASE }}>
            "Quinta de Argos no solo se habita: se siente."
          </motion.blockquote>
        </motion.div>

        {/* ============ WIZARD ============ */}
        <motion.div
          ref={wizardRef}
          className="reservas-corporate-wizard"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.25 }}
        >
          {/* ---------- Indicador de pasos ---------- */}
          <div className="reservas-corporate-steps">
            <div className="reservas-corporate-steps-text">
              <span className="reservas-corporate-steps-count">
                Paso {step + 1} de {stepLabels.length}
              </span>
              <span className="reservas-corporate-steps-label">{stepLabels[step]}</span>
            </div>
            <div className="reservas-corporate-steps-bar" aria-hidden="true">
              {stepLabels.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className={`reservas-corporate-steps-segment${step >= i ? ' is-done' : ''}${
                    step === i ? ' is-current' : ''
                  }`}
                />
              ))}
            </div>
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
                  transition={{ duration: 0.45, ease: EASE }}
                  className="reservas-corporate-step-dates"
                >
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
                    <div className="reservas-corporate-dates-cell">
                      <span className="reservas-corporate-dates-label">Llegada</span>
                      <span className="reservas-corporate-dates-value">
                        {checkin ? formatDateLong(checkin) : 'Elige una fecha'}
                      </span>
                    </div>
                    <div className="reservas-corporate-dates-cell">
                      <span className="reservas-corporate-dates-label">Salida</span>
                      <span className="reservas-corporate-dates-value">
                        {checkout ? formatDateLong(checkout) : 'Elige una fecha'}
                      </span>
                    </div>
                  </div>

                  <div className="reservas-corporate-guests-selector">
                    <div className="reservas-corporate-guests-text">
                      <span className="reservas-corporate-guests-label">Huéspedes</span>
                      <span className="reservas-corporate-guests-max-note">Máximo {MAX_GUESTS}</span>
                    </div>
                    <div className="reservas-corporate-guests-controls">
                      <button
                        type="button"
                        className="reservas-corporate-guests-button"
                        onClick={() => setGuests((g) => Math.max(1, g - 1))}
                        disabled={guests <= 1}
                        aria-label="Restar huésped"
                      >
                        −
                      </button>
                      <span className="reservas-corporate-guests-count">{guests}</span>
                      <button
                        type="button"
                        className="reservas-corporate-guests-button"
                        onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
                        disabled={guests >= MAX_GUESTS}
                        aria-label="Sumar huésped"
                      >
                        +
                      </button>
                    </div>
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
                  transition={{ duration: 0.45, ease: EASE }}
                  className="reservas-corporate-step-addon"
                >
                  <span className="reservas-corporate-addon-note">Adicional opcional</span>
                  <h2 className="reservas-corporate-addon-name">{currentAddon.nombre}</h2>
                  <p className="reservas-corporate-addon-description">{currentAddon.descripcion}</p>

                  <div className="reservas-corporate-addon-footer">
                    <span className="reservas-corporate-addon-price">{formatPrice(currentAddon.precio)}</span>
                    <button
                      type="button"
                      className={`reservas-corporate-addon-toggle ${selectedAddons[currentAddon.id] ? 'is-added' : ''}`}
                      onClick={() => toggleAddon(currentAddon.id)}
                      aria-pressed={Boolean(selectedAddons[currentAddon.id])}
                    >
                      {selectedAddons[currentAddon.id] ? 'Agregado ✓ — Quitar' : 'Sumar a mi reserva'}
                    </button>
                  </div>
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
                  transition={{ duration: 0.45, ease: EASE }}
                  className="reservas-corporate-step-summary"
                >
                  <div className="reservas-corporate-summary-row">
                    <span className="reservas-corporate-summary-label">Fechas</span>
                    <span className="reservas-corporate-summary-value">
                      {checkin && checkout ? `${formatDateLong(checkin)} → ${formatDateLong(checkout)}` : '—'}
                    </span>
                  </div>

                  <div className="reservas-corporate-summary-row">
                    <span className="reservas-corporate-summary-label">Huéspedes</span>
                    <span className="reservas-corporate-summary-value">{guests}</span>
                  </div>

                  <div className="reservas-corporate-summary-row">
                    <span className="reservas-corporate-summary-label">
                      {nights} {nights === 1 ? 'noche' : 'noches'} × {formatPrice(PRICE_PER_NIGHT)}
                    </span>
                    <span className="reservas-corporate-summary-value">{formatPrice(subtotal)}</span>
                  </div>

                  {hasAddons &&
                    ADDONS.filter((a) => selectedAddons[a.id]).map((addon) => (
                      <div key={addon.id} className="reservas-corporate-summary-row">
                        <span className="reservas-corporate-summary-label">{addon.nombre}</span>
                        <span className="reservas-corporate-summary-value">{formatPrice(addon.precio)}</span>
                      </div>
                    ))}

                  <div className="reservas-corporate-summary-total">
                    <span className="reservas-corporate-summary-total-label">Total</span>
                    <span className="reservas-corporate-summary-total-value">{formatPrice(grandTotal)}</span>
                  </div>

                  <button type="button" className="reservas-corporate-pay-button" onClick={handleGoToCheckout}>
                    Continuar al pago
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ---------- Navegación entre pasos ---------- */}
          <div className="reservas-corporate-wizard-nav">
            <button type="button" className="reservas-corporate-wizard-nav-back" onClick={goBack} disabled={step === 0}>
              Anterior
            </button>
            {step !== summaryStepIndex && (
              <button
                type="button"
                className="reservas-corporate-wizard-nav-next"
                onClick={goNext}
                disabled={step === 0 && !canAdvanceFromDates}
              >
                Siguiente
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* ============ MANIFIESTO ============ */}
      <section className="reservas-corporate-manifesto">
        <div className="reservas-corporate-manifesto-inner">
          <h2 className="reservas-corporate-manifesto-heading">Un refugio pensado para desconectar</h2>

          <LitParagraph text={MANIFESTO} className="reservas-corporate-manifesto-statement" />

          <div className="reservas-corporate-manifesto-columns">
            <p>
              Quinta de Argos es mucho más que una casa rural: es un espacio pensado para desconectar, descansar y
              disfrutar del entorno con tranquilidad. La vivienda combina materiales naturales, madera y tonos suaves
              para crear una atmósfera acogedora y elegante, donde cada detalle está cuidado para transmitir calma y
              bienestar.
            </p>
            <p>
              En línea con esta filosofía, el salón principal no dispone de televisión, favoreciendo una experiencia
              más relajada y conectada con la naturaleza. Para quienes deseen disfrutar de contenido audiovisual, la
              buhardilla cuenta con una zona independiente equipada para el ocio, sin interferir en la tranquilidad
              del resto de los espacios.
            </p>
          </div>
        </div>
      </section>

      {/* ============ RECORRIDO INMERSIVO ============ */}
      <StayStage />

      {/* ============ CIERRE ============ */}
      <section className="reservas-corporate-outro">
        <motion.div
          className="reservas-corporate-outro-inner"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.h2 className="reservas-corporate-outro-heading" variants={fadeUp} transition={{ duration: 0.9, ease: EASE }}>
            {hasDates ? 'Tu estancia ya tiene fechas' : 'La finca te espera'}
          </motion.h2>
          <motion.button
            type="button"
            className="reservas-corporate-outro-button"
            onClick={scrollToWizard}
            variants={fadeUp}
            transition={{ duration: 0.9, ease: EASE }}
          >
            {hasDates ? 'Continuar con mi reserva' : 'Elegir mis fechas'}
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default Reservations;