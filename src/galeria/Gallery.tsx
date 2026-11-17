import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useParams } from 'react-router-dom';
import './gallery.css';
import { UseTheme } from '../contexts/ThemeContext';

// Ruta base de la galería (la misma que ya tienes en el router).
// La vista de cada espacio vive en `${GALLERY_PATH}/:lugar`.
const GALLERY_PATH = '/gallery';

// Extensión de las fotos del fotógrafo en /public/fotos/...
const PHOTO_EXT = '.jpg';

interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  eyebrow: string;
  description: string;
  // Carpeta dentro de /public/fotos y cantidad de fotos.
  // Solo los espacios que tienen sesión del fotógrafo.
  folder?: string;
  photoCount?: number;
  // Prefijo del nombre de archivo cuando no coincide con la carpeta
  // (ej. /fotos/buhardilla/buardilla1.jpg).
  filePrefix?: string;
}

const photoPath = (folder: string, n: number, prefix: string = folder) =>
  `/fotos/${folder}/${prefix}${n}${PHOTO_EXT}`;

// Las fotos de /public no se importan: se referencian por ruta.
const imgPiscina = photoPath('piscina', 2);
const imgJardin = photoPath('jardin', 33);
const imgSalon = photoPath('salon', 15);

// Fotos de la galería automática: /public/fotos/galeriaMovil/galeria1..52
const CAROUSEL_COUNT = 52;
const CAROUSEL_PHOTOS = Array.from(
  { length: CAROUSEL_COUNT },
  (_, i) => `/fotos/galeriaMovil/galeria${i + 1}${PHOTO_EXT}`
);

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'piscina',
    src: imgPiscina,
    alt: 'Piscina infinity de Quinta de Argos',
    eyebrow: 'Piscina',
    description:
      'Agua que se funde con el horizonte, un espacio sereno y elegante para disfrutar de amaneceres, atardeceres y momentos de contemplación.',
    folder: 'piscina',
    photoCount: 35,
  },
  {
    id: 'jardin',
    src: imgJardin,
    alt: 'Jardín y exteriores de 7.000 metros cuadrados de Quinta de Argos',
    eyebrow: 'Jardín y Exteriores',
    description:
      'Una parcela que invita a pasear y respirar naturaleza, donde cada rincón transmite privacidad, belleza y la esencia elegante de Quinta de Argos.',
    folder: 'jardin',
    photoCount: 46,
  },
  {
    id: 'salon',
    src: imgSalon,
    alt: 'Salón principal de Quinta de Argos',
    eyebrow: 'Salón',
    description:
      'Un espacio cálido y luminoso donde la madera, la luz natural y los detalles artísticos crean un ambiente acogedor y elegante para compartir momentos inolvidables.',
    folder: 'salon',
    photoCount: 36,
  },
  {
    id: 'dormitorio1',
    src: photoPath('flora', 1),
    alt: 'Habitación Flora',
    eyebrow: 'Habitación Flora',
    description:
      'Habitación de inspiración floral con cama doble de 150 cm, vestidor y baño.',
    folder: 'flora',
    photoCount: 12,
  },
  {
    id: 'dormitorio2',
    src: photoPath('fabula', 1),
    alt: 'Habitación Fábula',
    eyebrow: 'Habitación Fábula',
    description:
      'Habitación doble de atmósfera juvenil.',
    folder: 'fabula',
    photoCount: 9,
  },
  {
    id: 'dormitorio3',
    src: photoPath('argos', 1),
    alt: 'Habitación Argos',
    eyebrow: 'Habitación Argos',
    description:
      'Dormitorio doble y versátil, que puede ser usado con camas separadas o unidas formando un lecho de 180 cm.',
    folder: 'argos',
    photoCount: 9,
  },
  {
    id: 'buhardilla',
    src: photoPath('buhardilla', 4, 'buhardilla'),
    alt: 'Buhardilla con proyector de Quinta de Argos',
    eyebrow: 'Buhardilla',
    description:
      'Refugio versátil de ocio y descanso, con sofá, sillón, espacio audiovisual y zona de juegos, donde la luz cálida y la madera aportan confort y estilo contemporáneo.',
    folder: 'buhardilla',
    filePrefix: 'buhardilla',
    photoCount: 17,
  },
];

// Espacios con sesión completa del fotógrafo, en el orden en que se listan.
const PHOTO_GROUP_ORDER = [ 'jardin', 'piscina', 'salon', 'buhardilla', 'dormitorio1', 'dormitorio2', 'dormitorio3'];
const PHOTO_GROUPS = PHOTO_GROUP_ORDER
  .map((id) => GALLERY_ITEMS.find((item) => item.id === id))
  .filter((item): item is GalleryItem => !!item && !!item.folder && !!item.photoCount);

const buildPhotos = (item: GalleryItem): string[] =>
  item.folder && item.photoCount
    ? Array.from({ length: item.photoCount }, (_, i) =>
        photoPath(item.folder as string, i + 1, item.filePrefix ?? item.folder)
      )
    : [];

const pad = (n: number) => String(n).padStart(2, '0');

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

// Visor ampliado de la vista por espacio: desliza en la dirección de avance.
const lightboxVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -60 : 60 }),
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

  const { lugar } = useParams<{ lugar?: string }>();
  const placeItem = lugar ? PHOTO_GROUPS.find((item) => item.folder === lugar) : undefined;
  const placePhotos = placeItem ? buildPhotos(placeItem) : [];

  const stageRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  // Punto donde empezó el toque, para detectar el deslizamiento en móvil.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Visor de la vista por espacio
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxDirection, setLightboxDirection] = useState(1);

  const total = CAROUSEL_PHOTOS.length;
  const currentSrc = CAROUSEL_PHOTOS[activeIndex];

  useEffect(() => {
    window.scrollTo(0, 0);
    setLightboxIndex(null);
  }, [lugar]);

  // ---------- Auto-avance cada 5s (solo en la galería principal) ----------
  useEffect(() => {
    if (!isPlaying || lugar) return;
    const id = setInterval(() => {
      setDirection(1);
      setActiveIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isPlaying, total, lugar]);

  // Precarga la foto siguiente del carrusel para que el "doblado"
  // no muestre la página en negro mientras baja la imagen.
  useEffect(() => {
    if (lugar) return;
    const img = new Image();
    img.src = CAROUSEL_PHOTOS[(activeIndex + 1) % total];
  }, [activeIndex, total, lugar]);

  // Mantiene la miniatura activa a la vista dentro de la tira
  // (desplaza solo la tira, nunca la página).
  useEffect(() => {
    const strip = paginationRef.current;
    if (!strip) return;
    const thumb = strip.children[activeIndex] as HTMLElement | undefined;
    if (!thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [activeIndex]);

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

  // Con la galería abierta: flechas ← → para pasar de foto y Escape
  // para cerrar (Escape también cierra el fallback CSS, por si la
  // Fullscreen API nativa no se activó y no dispara "fullscreenchange").
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFullscreen();
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ---------- Deslizar en móvil con la galería abierta ----------
  const SWIPE_THRESHOLD = 50;

  const handleStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isFullscreen) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!isFullscreen || !start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Solo cuenta si el gesto es claramente horizontal.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    // Evita que el toque se convierta además en un clic sobre la foto.
    e.preventDefault();
    if (dx < 0) goNext();
    else goPrev();
  };

  // ---------- Visor de la vista por espacio ----------
  const photoTotal = placePhotos.length;

  const openLightbox = (index: number) => {
    setLightboxDirection(1);
    setLightboxIndex(index);
  };

  const closeLightbox = () => setLightboxIndex(null);

  const lightboxNext = () => {
    if (!photoTotal) return;
    setLightboxDirection(1);
    setLightboxIndex((i) => (i === null ? 0 : (i + 1) % photoTotal));
  };

  const lightboxPrev = () => {
    if (!photoTotal) return;
    setLightboxDirection(-1);
    setLightboxIndex((i) => (i === null ? 0 : (i - 1 + photoTotal) % photoTotal));
  };

  // Teclado + bloqueo del scroll de fondo mientras el visor está abierto.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'ArrowLeft') lightboxPrev();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex === null, photoTotal]);

  // Precarga solo la foto siguiente y la anterior a la que se está viendo.
  useEffect(() => {
    if (lightboxIndex === null || !photoTotal) return;
    [lightboxIndex + 1, lightboxIndex - 1 + photoTotal].forEach((i) => {
      const img = new Image();
      img.src = placePhotos[i % photoTotal];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, lugar]);

  // ============================================================
  //  VISTA POR ESPACIO  ( /gallery/:lugar )
  // ============================================================
  if (lugar) {
    if (!placeItem) return <Navigate to={GALLERY_PATH} replace />;

    const groupIndex = PHOTO_GROUPS.findIndex((item) => item.id === placeItem.id);
    const prevGroup = PHOTO_GROUPS[(groupIndex - 1 + PHOTO_GROUPS.length) % PHOTO_GROUPS.length];
    const nextGroup = PHOTO_GROUPS[(groupIndex + 1) % PHOTO_GROUPS.length];

    return (
      <div className={`gallery-carousel gallery-carousel-place ${theme === 'dark' ? 'theme-dark' : ''}`}>
        <section className="gallery-carousel-place-head">
          <Link to={GALLERY_PATH} className="gallery-carousel-place-back">
            <span className="gallery-carousel-place-back-line" />
            Volver a la galería
          </Link>

          <motion.div
            key={placeItem.id}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="gallery-carousel-place-head-inner"
          >
            <motion.span className="gallery-carousel-eyebrow-cover" variants={fadeUp} transition={{ duration: 0.6 }}>
              {pad(groupIndex + 1)} / {pad(PHOTO_GROUPS.length)} · {photoTotal} fotografías
            </motion.span>
            <motion.h1 className="gallery-carousel-heading-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
              {placeItem.eyebrow}
            </motion.h1>
            <motion.p className="gallery-carousel-paragraph-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
              {placeItem.description}
            </motion.p>
          </motion.div>
        </section>

        <section className="gallery-carousel-place-grid">
          {placePhotos.map((src, i) => (
            <button
              key={src}
              type="button"
              className="gallery-carousel-place-tile"
              onClick={() => openLightbox(i)}
              aria-label={`Ampliar fotografía ${i + 1} de ${placeItem.eyebrow}`}
            >
              <img
                src={src}
                alt={`${placeItem.eyebrow} — fotografía ${i + 1}`}
                loading={i < 3 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
              />
              <span className="gallery-carousel-place-tile-index">{pad(i + 1)}</span>
            </button>
          ))}
        </section>

        <nav className="gallery-carousel-place-nav" aria-label="Otros espacios">
          <Link to={`${GALLERY_PATH}/${prevGroup.folder}`} className="gallery-carousel-place-nav-link is-prev">
            <span className="gallery-carousel-place-nav-label">Anterior</span>
            <span className="gallery-carousel-place-nav-name">{prevGroup.eyebrow}</span>
          </Link>
          <Link to={`${GALLERY_PATH}/${nextGroup.folder}`} className="gallery-carousel-place-nav-link is-next">
            <span className="gallery-carousel-place-nav-label">Siguiente</span>
            <span className="gallery-carousel-place-nav-name">{nextGroup.eyebrow}</span>
          </Link>
        </nav>

        {/* ---------- Visor ampliado ---------- */}
        <AnimatePresence>
          {lightboxIndex !== null && (
            <motion.div
              className="gallery-carousel-lightbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={closeLightbox}
              role="dialog"
              aria-modal="true"
              aria-label={`${placeItem.eyebrow}, fotografía ${lightboxIndex + 1} de ${photoTotal}`}
            >
              <span className="gallery-carousel-lightbox-counter">
                {placeItem.eyebrow} — {pad(lightboxIndex + 1)} / {pad(photoTotal)}
              </span>

              <AnimatePresence custom={lightboxDirection} initial={false} mode="popLayout">
                <motion.img
                  key={placePhotos[lightboxIndex]}
                  src={placePhotos[lightboxIndex]}
                  alt={`${placeItem.eyebrow} — fotografía ${lightboxIndex + 1}`}
                  className="gallery-carousel-lightbox-img"
                  custom={lightboxDirection}
                  variants={lightboxVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.45, ease: [0.45, 0, 0.2, 1] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70) lightboxNext();
                    else if (info.offset.x > 70) lightboxPrev();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </AnimatePresence>

              <button
                type="button"
                className="gallery-carousel-fs-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeLightbox();
                }}
                aria-label="Cerrar"
              >
                <span />
                <span />
              </button>

              <button
                type="button"
                className="gallery-carousel-fs-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxPrev();
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
                  lightboxNext();
                }}
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  //  GALERÍA PRINCIPAL ( /gallery )
  // ============================================================
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
          <motion.img
            src="/logos/Logo_Completo_sin_Fondo.png"
            alt="Quinta de Argos"
            className="gallery-carousel-hero-logo"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          />
          <motion.span className="gallery-carousel-eyebrow-cover" variants={fadeUp} transition={{ duration: 0.6 }}>
            Galería
          </motion.span>
          <motion.h1 className="gallery-carousel-heading-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
            Un recorrido por Quinta de Argos
          </motion.h1>
          <motion.p className="gallery-carousel-paragraph-cover" variants={fadeUp} transition={{ duration: 0.7 }}>
            Un paseo por la casa, foto a foto — se van sucediendo solas. Toca
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
          onTouchStart={handleStageTouchStart}
          onTouchEnd={handleStageTouchEnd}
        >
          <div className="gallery-carousel-flip-wrap">
            <AnimatePresence custom={direction} initial={false} mode="sync">
              <motion.button
                key={currentSrc}
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
                aria-label={`Ver la fotografía ${activeIndex + 1} en pantalla completa`}
              >
                <img src={currentSrc} alt={`Quinta de Argos — fotografía ${activeIndex + 1}`} />
                <div className="gallery-carousel-page-overlay" />
                <div className="gallery-carousel-page-caption">
                  <span className="gallery-carousel-page-index">
                    {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </span>
                  <span className="gallery-carousel-page-eyebrow">Quinta de Argos</span>
                  <p className="gallery-carousel-page-description">Cehegín, Murcia</p>
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
        <div className="gallery-carousel-pagination" ref={paginationRef}>
          {CAROUSEL_PHOTOS.map((src, index) => (
            <button
              key={src}
              type="button"
              className={`gallery-carousel-thumb ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => handleThumbClick(index)}
              aria-label={`Ver fotografía ${index + 1}`}
            >
              <img src={src} alt="" loading="lazy" decoding="async" />
              <span className="gallery-carousel-thumb-label">{pad(index + 1)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ ÍNDICE POR ESPACIOS ============ */}
      <section className="gallery-carousel-index">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="gallery-carousel-index-inner"
        >
          <div className="gallery-carousel-index-head">
            <motion.span className="gallery-carousel-eyebrow-cover" variants={fadeUp} transition={{ duration: 0.6 }}>
              Sesión completa
            </motion.span>
            <motion.h2 className="gallery-carousel-index-heading" variants={fadeUp} transition={{ duration: 0.7 }}>
              Todas las fotografías, espacio a espacio
            </motion.h2>
          </div>

          <ol className="gallery-carousel-index-list">
            {PHOTO_GROUPS.map((item, i) => (
              <motion.li
                key={item.id}
                className="gallery-carousel-index-item"
                variants={fadeUp}
                transition={{ duration: 0.7 }}
              >
                <Link to={`${GALLERY_PATH}/${item.folder}`} className="gallery-carousel-index-card">
                  {/* Misma imagen que ya usa el carrusel: no suma descargas. */}
                  <span className="gallery-carousel-index-media">
                    <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
                    <span className="gallery-carousel-index-cta">
                      Ver las {item.photoCount} fotos
                    </span>
                  </span>
                  <span className="gallery-carousel-index-meta">
                    <span className="gallery-carousel-index-num">{pad(i + 1)}</span>
                    <span className="gallery-carousel-index-rule" aria-hidden="true">
                      <span />
                    </span>
                    <span className="gallery-carousel-index-count">{item.photoCount} fotos</span>
                  </span>
                  <span className="gallery-carousel-index-name">{item.eyebrow}</span>
                </Link>
              </motion.li>
            ))}
          </ol>
        </motion.div>
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
            ¿Te imaginas aquí?
          </motion.span>
          <motion.h2 className="gallery-carousel-heading-outro" variants={fadeUp} transition={{ duration: 0.7 }}>
            Ven a conocerla en persona
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