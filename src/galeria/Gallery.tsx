import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
 * Carrusel de avance automático (cada 5s) con efecto de página
 * que se dobla desde un extremo (perspective + rotateY, sin
 * librerías externas). Incluye:
 *  - Visualizador de miniaturas abajo (paginación) — clickear
 *    una salta directo a esa foto y pausa el auto-avance.
 *  - Botón para pausar / reanudar el avance automático.
 *  - Click en la imagen → pantalla completa real (Fullscreen
 *    API del navegador), con fallback a overlay CSS a pantalla
 *    completa en navegadores que no la soportan en elementos
 *    arbitrarios (ej. iOS Safari).
 */

interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  eyebrow: string;
  description: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'piscina',
    src: imgPiscina,
    alt: 'Piscina infinity de Quinta de Argos',
    eyebrow: 'Piscina',
    description:
      'Agua que se funde con el horizonte, un espacio sereno y elegante para disfrutar de amaneceres, atardeceres y momentos de contemplación.',
  },
  {
    id: 'jardin',
    src: imgJardin,
    alt: 'Jardín de 7.000 metros cuadrados de Quinta de Argos',
    eyebrow: 'Jardín',
    description:
      'Una parcela que invita a pasear y respirar naturaleza, donde cada rincón transmite privacidad, belleza y la esencia elegante de Quinta de Argos.',
  },
  {
    id: 'porche',
    src: imgPorche,
    alt: 'Porche de Quinta de Argos',
    eyebrow: 'Porche',
    description:
      'Espacio exterior abierto al paisaje, con mobiliario confortable y detalles acogedores, perfecto para desayunos, cenas, reuniones familiares y de amigos… o simplemente contemplar la naturaleza.',
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
    id: 'dormitorio1',
    src: imgPorche,
    alt: 'Habitacion Flora',
    eyebrow: 'Habitacion Flora',
    description:
      'Habitación de inspiración floral con cama doble de 150 cm, vestidor y baño.',
  },
  {
    id: 'dormitorio2',
    src: imgPorche,
    alt: 'Habitacion Fábula',
    eyebrow: 'Habitacion Fábula',
    description:
      'Habitación doble de atmósfera juvenil.',
  },
  {
    id: 'dormitorio3',
    src: imgPorche,
    alt: 'Habitacion Argos',
    eyebrow: 'Habitacion Argos',
    description:
      'Dormitorio doble y versátil, que puede ser usado con camas separadas o unidas formando un lecho de 180 cm.',
  },
  {
    id: 'buhardilla',
    src: imgBuhardilla,
    alt: 'Buhardilla con proyector de Quinta de Argos',
    eyebrow: 'Buhardilla',
    description:
      'Refugio versátil de ocio y descanso, con sofá, sillón, espacio audiovisual y zona de juegos, donde la luz cálida y la madera aportan confort y estilo contemporáneo.',
  },
  {
    id: 'barbacoa',
    src: imgBarbacoa,
    alt: 'Zona de barbacoa de Quinta de Argos',
    eyebrow: 'Barbacoa',
    description:
      'Espacio al aire libre diseñado para compartir aromas, sabores y conversaciones.',
  }
];

const AUTOPLAY_MS = 5000;

// Variantes del "doblado de página": la que sale gira hacia un
// extremo y se desvanece: la que entra gira desde el extremo
// opuesto hacia el centro.
const pageVariants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? 78 : -78,
    opacity: 0,
    zIndex: 1,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    zIndex: 2,
  },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? -78 : 78,
    opacity: 0,
    zIndex: 3,
  }),
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])

  const stageRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const total = GALLERY_ITEMS.length;
  const current = GALLERY_ITEMS[activeIndex];

  // ---------- Auto-avance cada 5s ----------
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setDirection(1);
      setActiveIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isPlaying, total]);

  const goTo = (index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const goNext = () => {
    setDirection(1);
    setActiveIndex((i) => (i + 1) % total);
  };

  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((i) => (i - 1 + total) % total);
  };

  const handleThumbClick = (index: number) => {
    setIsPlaying(false);
    goTo(index);
  };

  // ---------- Fullscreen ----------
  const enterFullscreen = async () => {
    setIsFullscreen(true);
    try {
      if (stageRef.current && stageRef.current.requestFullscreen) {
        await stageRef.current.requestFullscreen();
      }
    } catch {
      // Navegadores sin soporte de Fullscreen API en el elemento
      // (ej. iOS Safari): igual queda el overlay CSS a pantalla completa.
    }
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // noop
      }
    }
  };

  // Sincroniza el estado si el usuario sale con Escape (nativo del navegador).
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Escape también cierra el fallback CSS (por si la Fullscreen API
  // nativa no se activó y por lo tanto no dispara "fullscreenchange").
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={`gallery-carousel ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ PORTADA ============ */}
      <section className="gallery-carousel-cover">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.span className="gallery-carousel-eyebrow-cover" variants={fadeUp} transition={{ duration: 0.6 }}>
            Galería
          </motion.span>
          <motion.h1 className="gallery-carousel-heading-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
            Un recorrido por Quinta de Argos
          </motion.h1>
          <motion.p className="gallery-carousel-paragraph-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
            Seis espacios, seis atmósferas — se van sucediendo solas. Toca
            cualquiera para verla en pantalla completa.
          </motion.p>
          {window.innerWidth < 768 && (
            <motion.p  variants={fadeUp} transition={{ duration: 0.7 }}>
              En dispositivos móviles recomendamos ver las fotos en pantalla horizontal.
            </motion.p>
          )}
        </motion.div>
      </section>

      {/* ============ CARRUSEL ============ */}
      <section className="gallery-carousel-stage-section">
        <div
          ref={stageRef}
          className={`gallery-carousel-stage ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
          <div className="gallery-carousel-flip-wrap">
            <AnimatePresence custom={direction} initial={false} mode="sync">
              <motion.button
                key={current.id}
                type="button"
                className="gallery-carousel-page"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.9, ease: [0.45, 0, 0.2, 1] }}
                style={{
                  transformOrigin: direction > 0 ? 'left center' : 'right center',
                }}
                onClick={enterFullscreen}
                aria-label={`Ver ${current.eyebrow} en pantalla completa`}
              >
                <img src={current.src} alt={current.alt} />
                <div className="gallery-carousel-page-overlay" />
                <div className="gallery-carousel-page-caption">
                  <span className="gallery-carousel-page-index">
                    {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </span>
                  <span className="gallery-carousel-page-eyebrow">{current.eyebrow}</span>
                  <p className="gallery-carousel-page-description">{current.description}</p>
                </div>
              </motion.button>
            </AnimatePresence>
          </div>

          {isFullscreen && (
            <>
              <button
                type="button"
                className="gallery-carousel-fs-close"
                onClick={(e) => {
                  e.stopPropagation();
                  exitFullscreen();
                }}
                aria-label="Cerrar pantalla completa"
              >
                <span />
                <span />
              </button>

              <button
                type="button"
                className="gallery-carousel-fs-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Foto anterior"
              >
                ‹
              </button>

              <button
                type="button"
                className="gallery-carousel-fs-next"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* ---------- Controles de auto-avance ---------- */}
        <div className="gallery-carousel-controls">
          <button
            type="button"
            className="gallery-carousel-play-toggle"
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? 'Pausar' : 'Reanudar avance automático'}
          </button>

          <button
            type="button"
            className="gallery-carousel-fullscreen-toggle"
            onClick={enterFullscreen}
          >
            Pantalla completa
          </button>
        </div>

        {/* ---------- Visualizador / paginación con miniaturas ---------- */}
        <div className="gallery-carousel-pagination">
          {GALLERY_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`gallery-carousel-thumb ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => handleThumbClick(index)}
            >
              <img src={item.src} alt={item.eyebrow} loading="lazy" />
              <span className="gallery-carousel-thumb-label">{item.eyebrow}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ CIERRE ============ */}
      <section className="gallery-carousel-outro">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
          className="gallery-carousel-outro-inner"
        >
          <motion.span className="gallery-carousel-eyebrow-outro" variants={fadeUp} transition={{ duration: 0.6 }}>
            ¿Te imaginás acá?
          </motion.span>
          <motion.h2 className="gallery-carousel-heading-outro" variants={fadeUp} transition={{ duration: 0.7 }}>
            Vení a conocerla en persona
          </motion.h2>
          <motion.a
            href="/reservations"
            className="gallery-carousel-cta-outro"
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