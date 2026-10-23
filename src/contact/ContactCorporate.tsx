import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  motion,
  animate,
  useInView,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import axios from 'axios';
import './contactCorporate.css';
import { UseTheme } from '../contexts/ThemeContext';
import imgPiscina from '../assets/quinta4.jpg';

/**
 * ContactCorporate — Quinta de Argos
 * ---------------------------------------------------------
 * Sección de contacto: hero con la piscina, tarjeta de info
 * en verde pino y formulario de consulta en tres pasos.
 * Envía a `${API_BASE}/contact` con el mismo shape de datos
 * que antes (nombre, email, telefono, checkin, checkout,
 * huespedes, mensaje).
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

const EASE = [0.65, 0, 0.35, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const GUEST_OPTIONS = ['1', '2', '3', '4', '5', '6'];

// ---------- Utilidades ----------

const pad = (n: number) => String(n).padStart(2, '0');

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nightsBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
  );

// ---------- Número animado ----------

const AnimatedStat: React.FC<{
  value: number;
  decimals?: number;
  className?: string;
}> = ({ value, decimals = 0, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (latest) => setDisplay(latest.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [isInView, value, decimals]);

  // 7000 → 7.000 · 9.9 → 9,9
  const formatted = decimals
    ? display.replace('.', ',')
    : Number(display).toLocaleString('es-ES');

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
};

// ---------- Iconos ----------

const IconPin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="m3.5 6 8.5 7 8.5-7" />
  </svg>
);

const IconChat = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
    <path d="M9 10.5c.5 2 2 3.5 4 4" />
  </svg>
);

const IconArrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

// ---------- Tipos ----------

interface ContactFormData {
  nombre: string;
  email: string;
  telefono: string;
  checkin: string;
  checkout: string;
  huespedes: string;
  mensaje: string;
}

const initialFormData: ContactFormData = {
  nombre: '',
  email: '',
  telefono: '',
  checkin: '',
  checkout: '',
  huespedes: '',
  mensaje: '',
};

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

// ---------- Componente ----------

const ContactCorporate: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [sentName, setSentName] = useState('');

  // Parallax suave de la foto del hero
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroImageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroImageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);

  const minCheckin = todayISO();

  const nights = useMemo(() => {
    if (!formData.checkin || !formData.checkout) return null;
    return nightsBetween(formData.checkin, formData.checkout);
  }, [formData.checkin, formData.checkout]);

  const invalidDates = nights !== null && nights <= 0;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status === 'error') setStatus('idle');
  };

  const chooseGuests = (value: string) =>
    setFormData((prev) => ({
      ...prev,
      huespedes: prev.huespedes === value ? '' : value,
    }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invalidDates) return;
    setStatus('loading');

    try {
      await axios.post(`${API_BASE}/contact`, formData, {
        withCredentials: true,
      });
      setSentName(formData.nombre.trim().split(' ')[0] || '');
      setStatus('success');
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error al enviar el formulario de contacto:', error);
      setStatus('error');
    }
  };

  return (
    <div className={`cc ${theme === 'dark' ? 'cc--dark' : ''}`}>
      {/* ============ HERO ============ */}
      <section className="cc-hero" ref={heroRef}>
        <motion.div
          className="cc-hero-media"
          style={{ y: heroImageY, scale: heroImageScale }}
        >
          <img src={imgPiscina} alt="Piscina infinity de Quinta de Argos al atardecer" />
        </motion.div>
        <div className="cc-hero-veil" aria-hidden="true" />

        <motion.div
          className="cc-hero-inner"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.span className="cc-hero-eyebrow" variants={fadeUp}>
            <span className="cc-hero-eyebrow-line" aria-hidden="true" />
            Contacto
          </motion.span>

          <motion.h1 className="cc-hero-title" variants={fadeUp}>
            Hablemos de <span className="cc-hero-title-accent">tu estancia</span>
          </motion.h1>

          <motion.p className="cc-hero-text" variants={fadeUp}>
            Cuéntanos qué buscas y te responderemos en menos de 24 horas con la
            disponibilidad, las tarifas y todo lo que necesites saber antes de reservar.
          </motion.p>

          <motion.div className="cc-hero-meta" variants={fadeUp}>
            <span>38°05′ N · 1°48′ O</span>
            <span className="cc-hero-meta-dot" aria-hidden="true" />
            <span>Cehegín, Murcia</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ============ CUERPO ============ */}
      <section className="cc-body">
        {/* ---------- Tarjeta de info ---------- */}
        <motion.aside
          className="cc-info"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <svg className="cc-info-arch" viewBox="0 0 200 260" aria-hidden="true">
            <path d="M20 260V100a80 80 0 0 1 160 0v160" />
            <path d="M44 260V104a56 56 0 0 1 112 0v156" />
          </svg>

          <span className="cc-info-eyebrow">Encuéntranos</span>
          <h2 className="cc-info-title">Cehegín, Región de Murcia</h2>
          <p className="cc-info-text">
            Comarca del Noroeste de Murcia, a 7 km de Caravaca de la Cruz.
            En pleno campo, pero a minutos del casco histórico.
          </p>

          <div className="cc-stats">
            <div className="cc-stat">
              <span className="cc-stat-value">
                <AnimatedStat value={7000} />
                <span className="cc-stat-unit">m²</span>
              </span>
              <span className="cc-stat-label">Jardín privado</span>
            </div>
            <div className="cc-stat">
              <span className="cc-stat-value">
                <span className="cc-stat-unit cc-stat-unit--before">hasta</span>
                <AnimatedStat value={6} />
              </span>
              <span className="cc-stat-label">Huéspedes</span>
            </div>
            <div className="cc-stat">
              <span className="cc-stat-value">
                <AnimatedStat value={9.9} decimals={1} />
                <span className="cc-stat-unit">/10</span>
              </span>
              <span className="cc-stat-label">Booking y Airbnb</span>
            </div>
          </div>

          <ul className="cc-channels">
            <li>
              <a className="cc-channel" href="mailto:quintadeargos@gmail.com">
                <span className="cc-channel-icon"><IconMail /></span>
                <span className="cc-channel-body">
                  <span className="cc-channel-label">Email</span>
                  <span className="cc-channel-value">quintadeargos@gmail.com</span>
                </span>
                <span className="cc-channel-arrow"><IconArrow /></span>
              </a>
            </li>
            <li>
              <a
                className="cc-channel"
                href="https://wa.me/34633491825"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="cc-channel-icon"><IconChat /></span>
                <span className="cc-channel-body">
                  <span className="cc-channel-label">WhatsApp</span>
                  <span className="cc-channel-value">+34 633 49 18 25</span>
                </span>
                <span className="cc-channel-arrow"><IconArrow /></span>
              </a>
            </li>
            <li>
              <div className="cc-channel cc-channel--static">
                <span className="cc-channel-icon"><IconPin /></span>
                <span className="cc-channel-body">
                  <span className="cc-channel-label">Ubicación</span>
                  <span className="cc-channel-value">7 km de Caravaca de la Cruz</span>
                </span>
              </div>
            </li>
          </ul>

          <p className="cc-info-note">
            <span className="cc-info-note-pulse" aria-hidden="true" />
            Solemos responder en menos de 24 horas
          </p>
        </motion.aside>

        {/* ---------- Formulario ---------- */}
        <motion.div
          className="cc-panel"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
        >
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                className="cc-success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: EASE }}
                role="status"
              >
                <svg className="cc-success-icon" viewBox="0 0 80 80" aria-hidden="true">
                  <motion.circle
                    cx="40" cy="40" r="36"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: EASE }}
                  />
                  <motion.path
                    d="M25 41l10 10 20-22"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
                  />
                </svg>
                <span className="cc-panel-eyebrow">Consulta enviada</span>
                <h2 className="cc-success-title">
                  {sentName ? `Gracias, ${sentName}` : 'Gracias'}
                </h2>
                <p className="cc-success-text">
                  Hemos recibido tu consulta. Te escribiremos en menos de 24 horas
                  con la disponibilidad y las tarifas para tus fechas.
                </p>
                <button
                  type="button"
                  className="cc-success-again"
                  onClick={() => setStatus('idle')}
                >
                  Enviar otra consulta
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className="cc-form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                noValidate={false}
              >
                <header className="cc-form-head">
                  <span className="cc-panel-eyebrow">Consulta de disponibilidad</span>
                  <h2 className="cc-form-title">Cuéntanos tu plan</h2>
                </header>

                {/* 01 — Tus datos */}
                <fieldset className="cc-step">
                  <legend className="cc-step-legend">
                    <span className="cc-step-num">01</span>
                    Tus datos
                  </legend>

                  <div className="cc-grid cc-grid--2">
                    <div className="cc-field">
                      <label htmlFor="nombre" className="cc-label">Nombre completo</label>
                      <input
                        id="nombre"
                        name="nombre"
                        type="text"
                        autoComplete="name"
                        className="cc-input"
                        value={formData.nombre}
                        onChange={handleChange}
                        placeholder="Tu nombre"
                        required
                      />
                    </div>
                    <div className="cc-field">
                      <label htmlFor="email" className="cc-label">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className="cc-input"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="cc-field">
                    <label htmlFor="telefono" className="cc-label">Teléfono / WhatsApp</label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      autoComplete="tel"
                      className="cc-input"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="+34 000 00 00 00"
                      required
                    />
                  </div>
                </fieldset>

                {/* 02 — Tu estancia */}
                <fieldset className="cc-step">
                  <legend className="cc-step-legend">
                    <span className="cc-step-num">02</span>
                    Tu estancia
                  </legend>

                  <div className="cc-dates">
                    <div className="cc-field">
                      <label htmlFor="checkin" className="cc-label">Llegada</label>
                      <input
                        id="checkin"
                        name="checkin"
                        type="date"
                        className="cc-input cc-input--date"
                        value={formData.checkin}
                        min={minCheckin}
                        onChange={handleChange}
                      />
                    </div>

                    <div
                      className={`cc-nights ${nights !== null && !invalidDates ? 'cc-nights--on' : ''} ${invalidDates ? 'cc-nights--error' : ''}`}
                      aria-live="polite"
                    >
                      <span className="cc-nights-value">
                        {nights !== null && !invalidDates ? nights : '—'}
                      </span>
                      <span className="cc-nights-label">
                        {nights === 1 ? 'noche' : 'noches'}
                      </span>
                    </div>

                    <div className="cc-field">
                      <label htmlFor="checkout" className="cc-label">Salida</label>
                      <input
                        id="checkout"
                        name="checkout"
                        type="date"
                        className="cc-input cc-input--date"
                        value={formData.checkout}
                        min={formData.checkin || minCheckin}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {invalidDates && (
                    <p className="cc-hint cc-hint--error" role="alert">
                      La salida tiene que ser posterior a la llegada.
                    </p>
                  )}

                  <div className="cc-field">
                    <span className="cc-label" id="huespedes-label">Huéspedes</span>
                    <div className="cc-guests" role="radiogroup" aria-labelledby="huespedes-label">
                      {GUEST_OPTIONS.map((n) => {
                        const active = formData.huespedes === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`cc-guest ${active ? 'cc-guest--on' : ''}`}
                            onClick={() => chooseGuests(n)}
                          >
                            {active && (
                              <motion.span
                                layoutId="cc-guest-bg"
                                className="cc-guest-bg"
                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                              />
                            )}
                            <span className="cc-guest-num">{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </fieldset>

                {/* 03 — Mensaje */}
                <fieldset className="cc-step">
                  <legend className="cc-step-legend">
                    <span className="cc-step-num">03</span>
                    Tu mensaje
                  </legend>

                  <div className="cc-field">
                    <label htmlFor="mensaje" className="cc-label cc-label--sr">Mensaje</label>
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      className="cc-input cc-textarea"
                      value={formData.mensaje}
                      onChange={handleChange}
                      placeholder="Fechas, ocasión, si venís con niños o mascotas, cualquier duda…"
                      rows={5}
                    />
                  </div>
                </fieldset>

                <footer className="cc-form-foot">
                  <button
                    type="submit"
                    className="cc-submit"
                    disabled={status === 'loading' || invalidDates}
                  >
                    <span>{status === 'loading' ? 'Enviando…' : 'Enviar consulta'}</span>
                    <span className="cc-submit-icon">
                      {status === 'loading' ? <span className="cc-spinner" /> : <IconArrow />}
                    </span>
                  </button>
                  <p className="cc-form-privacy">
                    Solo usamos tus datos para responder a esta consulta.
                  </p>
                </footer>

                <AnimatePresence>
                  {status === 'error' && (
                    <motion.p
                      className="cc-error"
                      role="alert"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      Hubo un problema al enviar tu consulta. Inténtalo de nuevo o
                      escríbenos directamente por{' '}
                      <a href="https://wa.me/34633491825" target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
};

export default ContactCorporate;