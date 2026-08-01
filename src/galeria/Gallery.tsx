import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './gallery.css';
import { UseTheme } from '../contexts/ThemeContext';
import imgPiscina from '../assets/quinta4.jpg';
import imgJardin from '../assets/quinta5.jpg';
import imgPorche from '../assets/quinta6.jpg';
import imgSalon from '../assets/quinta2.jpg';
import imgBuhardilla from '../assets/quinta3.jpg';
import imgBarbacoa from '../assets/quinta.jpg';

/**
 * Gallery
 * ---------------------------------------------------------
 * Galería inmersiva: cada foto es una escena a pantalla
 * completa dentro de un contenedor con scroll propio y
 * scroll-snap. Sin Three.js/WebGL — la sensación 3D viene de
 * `perspective` + `rotateX` en la leyenda, más un Ken Burns
 * continuo en la imagen. Liviano y 100% táctil en mobile.
 */

interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  eyebrow: string;
  description: string;
}

// 🖼️ Datos de la galería: una foto, su nombre de espacio y su
// descripción. Agregar/quitar acá alcanza para modificar la galería.
const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'piscina',
    src: imgPiscina,
    alt: 'Piscina infinity de Quinta de Argos',
    eyebrow: 'Piscina infinity',
    description:
      'Agua que se funde con el horizonte, un espacio sereno y elegante para disfrutar de amaneceres, atardeceres y momentos de contemplación.',
  },
  {
    id: 'jardin',
    src: imgJardin,
    alt: 'Jardín de 7.000 metros cuadrados de Quinta de Argos',
    eyebrow: 'Jardín · 7.000 m²',
    description:
      'Una parcela que invita a pasear y respirar naturaleza, donde cada rincón transmite privacidad, belleza y la esencia elegante de Quinta de Argos.',
  },
  {
    id: 'porche',
    src: imgPorche,
    alt: 'Porche de Quinta de Argos',
    eyebrow: 'Porche',
    description:
      'Rincón abierto al paisaje, con mobiliario confortable y detalles acogedores, perfecto para desayunos, cenas o simplemente contemplar la naturaleza.',
  },
  {
    id: 'salon',
    src: imgSalon,
    alt: 'Salón principal de Quinta de Argos',
    eyebrow: 'Salón',
    description:
      'Un espacio cálido y luminoso donde la madera, la luz natural y los detalles artísticos crean un ambiente acogedor y elegante para compartir momentos inolvidables.',
  },
  {
    id: 'buhardilla',
    src: imgBuhardilla,
    alt: 'Buhardilla con proyector de Quinta de Argos',
    eyebrow: 'Buhardilla',
    description:
      'Refugio versátil de ocio y descanso, con sofá, sillón y zona de juegos, donde la luz cálida y la madera aportan confort y estilo contemporáneo.',
  },
  {
    id: 'barbacoa',
    src: imgBarbacoa,
    alt: 'Zona de barbacoa de Quinta de Argos',
    eyebrow: 'Barbacoa',
    description:
      'Espacio al aire libre diseñado para compartir aromas, sabores y conversaciones, donde piedra y madera se combinan con estilo y funcionalidad.',
  },
];

const captionVariants = {
  hidden: { opacity: 0, y: 60, rotateX: 14, scale: 0.96 },
  visible: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
};

const imageVariants = {
  hidden: { scale: 1.22 },
  visible: { scale: 1 },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const Gallery: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  const storyRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Detección de escena activa + reencuadre post-scroll: si un swipe
  // rápido dejó la vista a mitad de camino entre dos fotos (pasa con
  // gestos veloces, sobre todo en mobile), apenas el usuario deja de
  // scrollear la reencuadramos a la foto más cercana.
  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;

    let ticking = false;
    let settleTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const index = Math.round(el.scrollTop / el.clientHeight);
          setActiveIndex(Math.min(GALLERY_ITEMS.length - 1, Math.max(0, index)));
          ticking = false;
        });
      }

      clearTimeout(settleTimeout);
      settleTimeout = setTimeout(() => {
        const nearest = Math.round(el.scrollTop / el.clientHeight);
        const target = nearest * el.clientHeight;
        if (Math.abs(el.scrollTop - target) > 2) {
          el.scrollTo({ top: target, behavior: 'smooth' });
        }
      }, 120);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(settleTimeout);
    };
  }, []);

  // Al llegar a la última foto, si el usuario sigue intentando bajar
  // (rueda del mouse o swipe), soltamos el scroll hacia la sección de
  // cierre en vez de retenerlo adentro del contenedor.
  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;

    const isAtBottom = () => el.scrollTop >= el.scrollHeight - el.clientHeight - 2;

    const handleWheel = (e: WheelEvent) => {
      if (isAtBottom() && e.deltaY > 0) {
        e.preventDefault();
        outroRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = touchStartY - e.touches[0].clientY; // positivo = dedo sube = querés bajar
      if (isAtBottom() && deltaY > 30) {
        e.preventDefault();
        outroRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const scrollToIndex = (index: number) => {
    const el = storyRef.current;
    if (!el) return;
    el.scrollTo({ top: index * el.clientHeight, behavior: 'smooth' });
  };

  return (
    <div className={`gallery-corporate ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ PORTADA ============ */}
      <section className="gallery-corporate-cover">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.span className="gallery-corporate-eyebrow-cover" variants={fadeUp} transition={{ duration: 0.6 }}>
            Galería
          </motion.span>
          <motion.h1 className="gallery-corporate-heading-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
            Un recorrido por Quinta de Argos
          </motion.h1>
          <motion.p className="gallery-corporate-paragraph-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
            Seis espacios, seis atmósferas. Desplazate para sumergirte en cada
            rincón de la finca, tal como se sienten en persona.
          </motion.p>
        </motion.div>

        <motion.div
          className="gallery-corporate-scroll-cue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <span>Desplazate para sumergirte</span>
          <span className="gallery-corporate-scroll-cue-line" />
        </motion.div>
      </section>

      {/* ============ EXPERIENCIA INMERSIVA ============ */}
      <div className="gallery-corporate-story" ref={storyRef}>
        {GALLERY_ITEMS.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <section key={item.id} className="gallery-corporate-scene">
              <motion.div
                className="gallery-corporate-scene-image"
                variants={imageVariants}
                initial="hidden"
                animate={isActive ? 'visible' : 'hidden'}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <img src={item.src} alt={item.alt} loading="lazy" />
              </motion.div>

              <div className="gallery-corporate-scene-overlay" />

              <div className="gallery-corporate-scene-caption-wrapper">
                <motion.div
                  className="gallery-corporate-scene-caption"
                  variants={captionVariants}
                  initial="hidden"
                  animate={isActive ? 'visible' : 'hidden'}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="gallery-corporate-scene-index">
                    {String(index + 1).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}
                  </span>
                  <span className="gallery-corporate-scene-eyebrow">{item.eyebrow}</span>
                  <p className="gallery-corporate-scene-description">{item.description}</p>
                </motion.div>
              </div>
            </section>
          );
        })}

        {/* ---------- Indicador de progreso ---------- */}
        <div className="gallery-corporate-progress">
          {GALLERY_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`gallery-corporate-progress-dot ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => scrollToIndex(index)}
              aria-label={`Ir a ${item.eyebrow}`}
            />
          ))}
        </div>
      </div>

      {/* ============ CIERRE ============ */}
      <section className="gallery-corporate-outro" ref={outroRef}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
          className="gallery-corporate-outro-inner"
        >
          <motion.span className="gallery-corporate-eyebrow-outro" variants={fadeUp} transition={{ duration: 0.6 }}>
            ¿Te imaginás acá?
          </motion.span>
          <motion.h2 className="gallery-corporate-heading-outro" variants={fadeUp} transition={{ duration: 0.7 }}>
            Vení a conocerla en persona
          </motion.h2>
          <motion.a
            href="/reservations"
            className="gallery-corporate-cta-outro"
            variants={fadeUp}
            transition={{ duration: 0.7 }}
          >
            Reservar mi estancia
          </motion.a>
        </motion.div>
      </section>
    </div>
  );
};

export default Gallery;