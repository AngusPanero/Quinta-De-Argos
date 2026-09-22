import React, { useState, useRef, useEffect } from 'react';
import { motion, animate, useInView } from 'framer-motion';
import axios from 'axios';
import './contactCorporate.css';
import { UseTheme } from '../contexts/ThemeContext';
import imgPiscina from '../assets/quinta4.jpg';

/**
 * ContactCorporate
 * ---------------------------------------------------------
 * Componente único y autocontenido: sección de contacto con
 * info de la finca + formulario de consulta conectado al
 * backend. No conoce Nav/Home/Footer.
 *
 * TODO (Angus): ajustá API_BASE a como manejás la URL del
 * backend en este proyecto (env var, axios instance, etc).
 * Por ahora pega a `${API_BASE}/contact` con axios directo.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// Número que cuenta hacia arriba al entrar en pantalla, una sola vez.
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
      duration: 1.4,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (latest) => setDisplay(latest.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [isInView, value, decimals]);

  return (
    <span ref={ref} className={className}>
      {display.replace('.', ',')}
    </span>
  );
};

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

const ContactCorporate: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);  

  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    try {
      await axios.post(`${API_BASE}/contact`, formData, {
        withCredentials: true,
      });
      setStatus('success');
      setFormData(initialFormData);
    } catch (error: any) {
        console.error('Error al enviar el formulario de contacto:', error);
      setStatus('error');
    }
  };

  return (
    <div className={`contact-corporate ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ INTRO ============ */}
      <section className="contact-corporate-hero">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.span className="contact-corporate-eyebrow-hero" variants={fadeUp} transition={{ duration: 0.6 }}>
            Contacto
          </motion.span>
          <motion.h1 className="contact-corporate-heading-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            Hablemos de tu estancia
          </motion.h1>
          <motion.p className="contact-corporate-paragraph-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            Contanos qué estás buscando y te respondemos en menos de 24 horas
            con disponibilidad, tarifas y todo lo que necesites saber antes de
            reservar.
          </motion.p>
        </motion.div>
      </section>

      {/* ============ CONTENIDO ============ */}
      <section className="contact-corporate-content">
        {/* ---------- Info ---------- */}
        <motion.div
          className="contact-corporate-info"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <span className="contact-corporate-eyebrow-info">Encontranos</span>
          <h2 className="contact-corporate-info-heading">Cehegín, Región de Murcia</h2>

          <motion.div
            className="contact-corporate-info-image"
            initial={{ opacity: 0, scale: 1.04 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          >
            <img src={imgPiscina} alt="Piscina infinity de Quinta de Argos" />
          </motion.div>

          <div className="contact-corporate-stats">
            <div className="contact-corporate-stat-block-jardin">
              <AnimatedStat value={7000} className="contact-corporate-stat-number-jardin" />
              <span className="contact-corporate-stat-suffix-jardin">m²</span>
              <span className="contact-corporate-stat-label-jardin">Jardín privado</span>
            </div>
            <div className="contact-corporate-stat-block-huespedes">
              <AnimatedStat value={6} className="contact-corporate-stat-number-huespedes" />
              <span className="contact-corporate-stat-suffix-jardin">Hasta</span>
              <span className="contact-corporate-stat-label-huespedes">Huéspedes</span>
            </div>
            <div className="contact-corporate-stat-block-valoracion">
              <AnimatedStat
                value={9.9}
                decimals={1}
                className="contact-corporate-stat-number-valoracion"
              />
              <span className="contact-corporate-stat-suffix-valoracion">/10 Calificaciones</span>
              <span className="contact-corporate-stat-label-valoracion">en Booking y Airbnb</span>
            </div>
          </div>

          <div className="contact-corporate-info-location-block">
            <span className="contact-corporate-info-location-label">Ubicación</span>
            <p className="contact-corporate-info-location-text">
              Comarca del Noroeste de Murcia, a 7 km de Caravaca de la Cruz.
              En pleno campo, pero a minutos del casco histórico.
            </p>
          </div>

          <div className="contact-corporate-info-email-block">
            <span className="contact-corporate-info-email-label">Email</span>
            <a href="mailto:reservas@quintadeargos.com" className="contact-corporate-info-email-link">
              reservas@quintadeargos.com
            </a>
          </div>

          <div className="contact-corporate-info-whatsapp-block">
            <span className="contact-corporate-info-whatsapp-label">WhatsApp</span>
            <a href="https://wa.me/34000000000" className="contact-corporate-info-whatsapp-link">
              +34 000 00 00 00
            </a>
          </div>

          <p className="contact-corporate-info-response-note">
            Solemos responder en menos de 24 horas.
          </p>

          <span className="contact-corporate-info-horizon" />
        </motion.div>

        {/* ---------- Formulario ---------- */}
        <motion.form
          className="contact-corporate-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <div className="contact-corporate-field-row-contact">
            <div className="contact-corporate-field-name">
              <label htmlFor="nombre" className="contact-corporate-field-name-label">
                Nombre completo
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                className="contact-corporate-field-name-input"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
              />
            </div>

            <div className="contact-corporate-field-email">
              <label htmlFor="email" className="contact-corporate-field-email-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="contact-corporate-field-email-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="contact-corporate-field-phone">
            <label htmlFor="telefono" className="contact-corporate-field-phone-label">
              Teléfono / WhatsApp
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              className="contact-corporate-field-phone-input"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+34 000 00 00 00"
              required
            />
          </div>

          <div className="contact-corporate-field-row-dates">
            <div className="contact-corporate-field-checkin">
              <label htmlFor="checkin" className="contact-corporate-field-checkin-label">
                Llegada
              </label>
              <input
                id="checkin"
                name="checkin"
                type="date"
                className="contact-corporate-field-checkin-input"
                value={formData.checkin}
                onChange={handleChange}
              />
            </div>

            <div className="contact-corporate-field-checkout">
              <label htmlFor="checkout" className="contact-corporate-field-checkout-label">
                Salida
              </label>
              <input
                id="checkout"
                name="checkout"
                type="date"
                className="contact-corporate-field-checkout-input"
                value={formData.checkout}
                onChange={handleChange}
              />
            </div>

            <div className="contact-corporate-field-guests">
              <label htmlFor="huespedes" className="contact-corporate-field-guests-label">
                Huéspedes
              </label>
              <select
                id="huespedes"
                name="huespedes"
                className="contact-corporate-field-guests-input"
                value={formData.huespedes}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
          </div>

          <div className="contact-corporate-field-message">
            <label htmlFor="mensaje" className="contact-corporate-field-message-label">
              Mensaje
            </label>
            <textarea
              id="mensaje"
              name="mensaje"
              className="contact-corporate-field-message-textarea"
              value={formData.mensaje}
              onChange={handleChange}
              placeholder="Contanos qué estás buscando: fechas, ocasión, cualquier duda..."
              rows={5}
            />
          </div>

          <button
            type="submit"
            className="contact-corporate-submit-button"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Enviando...' : 'Enviar consulta'}
          </button>

          {status === 'success' && (
            <p className="contact-corporate-status-success">
              Gracias — recibimos tu consulta y te respondemos a la brevedad.
            </p>
          )}

          {status === 'error' && (
            <p className="contact-corporate-status-error">
              Hubo un problema al enviar tu consulta. Probá de nuevo o
              escribinos directamente por WhatsApp.
            </p>
          )}
        </motion.form>
      </section>
    </div>
  );
};

export default ContactCorporate;