import React, { useEffect, useRef, useState } from 'react';
import { motion, animate, useInView } from 'framer-motion';
import './homeCorporate.css';
import { UseTheme } from '../contexts/ThemeContext';
import videoHome from '../assets/5056237-hd_1920_1080_25fps.mp4';
import img1 from '../assets/quinta.jpg';
import img2 from '../assets/quinta2.jpg';
import img3 from '../assets/quinta3.jpg';
import img4 from '../assets/quinta4.jpg';
import img5 from '../assets/quinta5.jpg';
import img6 from '../assets/quinta6.jpg';
import img7 from '../assets/quinta7.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

// Línea de horizonte: cada instancia recibe su propia clase completa
// (no hay una clase base compartida) para que se puedan editar sin
// afectarse entre sí.
const HorizonLine: React.FC<{ className: string }> = ({ className }) => (
  <motion.div
    className={className}
    initial={{ scaleX: 0 }}
    whileInView={{ scaleX: 1 }}
    viewport={{ once: true, amount: 0.8 }}
    transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
  />
);

// Número que cuenta hacia arriba al entrar en pantalla, una sola vez
// (mismo patrón que en ContactCorporate).
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
      {display}
    </span>
  );
};

// Cada imagen de la galería tiene su propia clase de contenedor
// (figureClass), completamente independiente de las demás.
const galleryItems = [
  {
    src: img1,
    alt: 'Fachada de Quinta de Argos al atardecer',
    caption: 'Arquitectura nórdica, alma mediterránea',
    figureClass: 'home-corporate-gallery-item-fachada',
  },
  {
    src: img2,
    alt: 'Interior de madera clara de Quinta de Argos',
    caption: 'El salón',
    figureClass: 'home-corporate-gallery-item-interior',
  },
  {
    src: img3,
    alt: 'Bosque de pinos junto a la finca',
    caption: 'La buhardilla',
    figureClass: 'home-corporate-gallery-item-pinar',
  },
  {
    src: img4,
    alt: 'Piscina natural rodeada de piedra caliza',
    caption: 'La piscina infinity',
    figureClass: 'home-corporate-gallery-item-piscina',
  },
  {
    src: img5,
    alt: 'Cielo nocturno sin contaminación lumínica',
    caption: 'Noches sin luz artificial',
    figureClass: 'home-corporate-gallery-item-noche',
  },
  {
    src: img6,
    alt: 'Desayuno servido en la terraza',
    caption: 'El porche',
    figureClass: 'home-corporate-gallery-item-terraza',
  },
];

const HomeCorporate: React.FC = () => {
  // Fallback defensivo por si el hook real devuelve una forma distinta.
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])

  return (
    <div className={`home-corporate ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ HERO DE VIDEO ============ */}
      <section className="home-corporate-hero">
        <video
          ref={videoRef}
          className="home-corporate-hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/quinta-de-argos-poster.jpg"
        >
          <source src={videoHome} type="video/mp4" />
        </video>

        <div className="home-corporate-hero-overlay" />

        <motion.div
          className="home-corporate-hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.span className="home-corporate-eyebrow-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            Cehegín, Murcia
          </motion.span>
          <motion.h1 className="home-corporate-hero-title" variants={fadeUp} transition={{ duration: 0.8 }}>
            Quinta de Argos
          </motion.h1>
          <motion.p className="home-corporate-hero-subtitle" variants={fadeUp} transition={{ duration: 0.8 }}>
            El refugio de tus sueños, en plena naturaleza.
          </motion.p>
          <motion.div variants={fadeUp} transition={{ duration: 0.8 }}>
            <HorizonLine className="home-corporate-horizon-hero" />
          </motion.div>
        </motion.div>

        <motion.div
          className="home-corporate-scroll-cue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <span>Descubrí la historia</span>
          <span className="home-corporate-scroll-cue-line" />
        </motion.div>
      </section>

      {/* ============ HISTORIA ============ */}
      <section className="home-corporate-story">
        <motion.div
          className="home-corporate-story-text"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
        >
          <motion.span className="home-corporate-eyebrow-story" variants={fadeUp} transition={{ duration: 0.6 }}>
            La historia
          </motion.span>
          <motion.h2 className="home-corporate-story-heading" variants={fadeUp} transition={{ duration: 0.7 }}>
            Luz, madera y silencio en clave mediterránea
          </motion.h2>
          <motion.p className="home-corporate-story-paragraph-one" variants={fadeUp} transition={{ duration: 0.7 }}>
            Quinta de Argos es una casa de autor en plena naturaleza, concebida
            como una experiencia estética y sensorial. Rodeada de 7.000 m² de
            jardín y abierta al paisaje a través de porches y una piscina
            infinity que se funde con el horizonte, la propiedad invita a
            desconectar del ruido y reconectar con la belleza.
          </motion.p>
          <motion.p className="home-corporate-story-paragraph-two" variants={fadeUp} transition={{ duration: 0.7 }}>
            Cada espacio ha sido diseñado con intención: madera noble, luz
            cuidadosamente modulada, piezas artísticas con carácter y una
            arquitectura que respira amplitud y calma. Aquí, el campo no es
            rústico, es elegante; el descanso no es casual, es ritual; y cada
            estancia cuenta una historia propia dentro de un conjunto
            coherente y exclusivo.
          </motion.p>
        </motion.div>

        <motion.div
          className="home-corporate-story-image"
          initial={{ opacity: 0, scale: 1.04 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
        >
          <img
            src={img7}
            alt="Detalle arquitectónico de Quinta de Argos"
          />
        </motion.div>
      </section>

      {/* ============ CIFRAS ============ */}
      <motion.section
        className="home-corporate-stats"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={staggerContainer}
      >
        <motion.div className="home-corporate-stat-block-jardin" variants={fadeUp} transition={{ duration: 0.6 }}>
          <span>
            <AnimatedStat value={7000} className="home-corporate-stat-number-jardin" />
            <span className="home-corporate-stat-suffix-jardin">m²</span>
          </span>
          <span className="home-corporate-stat-label-jardin">Jardín privado</span>
        </motion.div>

        <motion.div className="home-corporate-stat-block-huespedes" variants={fadeUp} transition={{ duration: 0.6 }}>
          <AnimatedStat value={6} className="home-corporate-stat-number-huespedes" />
          <span className="home-corporate-stat-label-huespedes">Huéspedes máximo</span>
        </motion.div>

        <motion.div className="home-corporate-stat-block-caravaca" variants={fadeUp} transition={{ duration: 0.6 }}>
          <span>
            <AnimatedStat value={7} className="home-corporate-stat-number-caravaca" />
            <span className="home-corporate-stat-suffix-caravaca">km</span>
          </span>
          <span className="home-corporate-stat-label-caravaca">A Caravaca de la Cruz</span>
        </motion.div>
      </motion.section>

      <HorizonLine className="home-corporate-horizon-divider" />

      {/* ============ GALERÍA ============ */}
      <section className="home-corporate-gallery">
        <motion.span
          className="home-corporate-eyebrow-gallery"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          La finca
        </motion.span>

        <motion.div
          className="home-corporate-gallery-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          {galleryItems.map((item) => (
            <motion.figure
              key={item.caption}
              className={item.figureClass}
              variants={fadeUp}
              transition={{ duration: 0.7 }}
            >
              <img src={item.src} alt={item.alt} loading="lazy" />
              <figcaption>{item.caption}</figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </section>

      {/* ============ CIERRE ============ */}
      <section className="home-corporate-closing">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
          className="home-corporate-closing-inner"
        >
          <motion.span className="home-corporate-eyebrow-closing" variants={fadeUp} transition={{ duration: 0.6 }}>
            La reserva
          </motion.span>
          <motion.h2 className="home-corporate-closing-heading" variants={fadeUp} transition={{ duration: 0.7 }}>
            El refugio de tus sueños
          </motion.h2>
          <motion.p className="home-corporate-closing-paragraph" variants={fadeUp} transition={{ duration: 0.7 }}>
            Diseñada para un máximo de seis huéspedes, Quinta de Argos
            mantiene el silencio, la privacidad y esa sensación boutique que
            la distingue de cualquier otra propiedad rural.
          </motion.p>
          <motion.a
            href="/reservations"
            className="home-corporate-cta"
            variants={fadeUp}
            transition={{ duration: 0.7 }}
          >
            Consultar disponibilidad
          </motion.a>
        </motion.div>
      </section>
    </div>
  );
};

export default HomeCorporate;