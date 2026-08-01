import React, { useRef } from 'react';
import { motion, useScroll } from 'framer-motion';
import './experiences.css';
import { UseTheme } from '../contexts/ThemeContext';
import basilica from "../../public/experiencias/basilica.jpg";
import begastri from "../../public/experiencias/begastri.jpg";
import cañon from "../../public/experiencias/cañon.jpg";
import comidas from "../../public/experiencias/comidas.jpg";
import vino from "../../public/experiencias/ruta-del-vino.jpg";
import usero from "../../public/experiencias/salto-del-usero.webp";
import viaVerde from "../../public/experiencias//via-verde.jpg";

/**
 * Experiences
 * ---------------------------------------------------------
 * Timeline vertical animado con actividades reales de la
 * Comarca del Noroeste de Murcia, cada una con categoría,
 * distancia y tiempo estimado desde la finca.
 *
 * TODO (Angus): las distancias/tiempos son estimaciones desde
 * el centro de Cehegín (no tengo la coordenada exacta de la
 * finca) — ajustalas si hace falta. También faltan las fotos
 * reales de cada lugar: dejé los src apuntando a
 * /images/experiencias/<slug>.jpg (carpeta public), agregalas
 * o cambiá por Cloudinary.
 */

type Category = 'Gastronomía' | 'Naturaleza' | 'Cultura' | 'Vino';

interface Experience {
  id: string;
  category: Category;
  title: string;
  description: string;
  image: string;
  distanceKm: number;
  timeMinutes: number;
  mode: string;
}

// 📍 Datos de cada experiencia. Agregar/quitar acá alcanza para
// modificar el timeline completo.
const EXPERIENCES: Experience[] = [
  {
    id: 'gastronomia-cehegin',
    category: 'Gastronomía',
    title: 'Sabores de Cehegín',
    description:
      'A un paseo de la finca, el casco antiguo de Cehegín reúne asadores y bodegones con generaciones de tradición — desde el bienmesabe hasta los guisos de caza de siempre.',
    image: comidas,
    distanceKm: 0.5,
    timeMinutes: 3,
    mode: 'En coche',
  },
  {
    id: 'begastri',
    category: 'Cultura',
    title: 'Begastri, ciudad visigoda',
    description:
      'Las ruinas de una antigua sede episcopal visigoda, junto al cauce del Quípar, con más de dos mil años de historia superpuesta entre íberos, romanos y musulmanes.',
    image: begastri,
    distanceKm: 3,
    timeMinutes: 6,
    mode: 'En coche',
  },
  {
    id: 'via-verde',
    category: 'Naturaleza',
    title: 'Vía Verde del Noroeste',
    description:
      'Un antiguo trazado ferroviario reconvertido en sendero de casi 80 km entre pinares, viñedos y viaductos — perfecto para caminar o pedalear sin prisa, con acceso directo en Cehegín.',
    image: viaVerde,
    distanceKm: 1,
    timeMinutes: 5,
    mode: 'A pie o en bici',
  },
  {
    id: 'caravaca',
    category: 'Cultura',
    title: 'Basílica de la Vera Cruz',
    description:
      'El corazón de la Ciudad Santa de Caravaca: un santuario del siglo XVII levantado sobre un castillo templario, y a sus pies, las Fuentes del Marqués entre álamos centenarios.',
    image: basilica,
    distanceKm: 7,
    timeMinutes: 10,
    mode: 'En coche',
  },
  {
    id: 'salto-usero',
    category: 'Naturaleza',
    title: 'Salto del Usero',
    description:
      'Una cascada de aguas turquesas formada por travertinos, escondida en la ladera del Cerro del Castellar — sendero fácil y una poza natural donde refrescarse en verano.',
    image: usero,
    distanceKm: 18,
    timeMinutes: 18,
    mode: 'En coche',
  },
  {
    id: 'ruta-vino-bullas',
    category: 'Vino',
    title: 'Ruta del Vino D.O. Bullas',
    description:
      'Bodegas familiares entre viñedos de Monastrell en vaso, con catas guiadas por el propio enólogo y maridajes con productos locales — una de las D.O. más jóvenes de España.',
    image: vino,
    distanceKm: 20,
    timeMinutes: 20,
    mode: 'En coche',
  },
  {
    id: 'canon-almadenes',
    category: 'Naturaleza',
    title: 'Cañón de Almadenes',
    description:
      'Un desfiladero de 11 km tallado por el río Segura, con paredes de hasta 120 metros. La ruta circular de 10 km es la escapada de día completo para los más aventureros.',
    image: cañon,
    distanceKm: 45,
    timeMinutes: 45,
    mode: 'En coche',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariantsLeft = {
  hidden: { opacity: 0, x: -50, rotateY: 20, scale: 0.94 },
  visible: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
};

const cardVariantsRight = {
  hidden: { opacity: 0, x: 50, rotateY: -20, scale: 0.94 },
  visible: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
};

const Experiences: React.FC = () => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start center', 'end center'],
  });

  return (
    <div className={`experiences-corporate ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ============ PORTADA ============ */}
      <section className="experiences-corporate-hero">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.span className="experiences-corporate-eyebrow-hero" variants={fadeUp} transition={{ duration: 0.6 }}>
            Experiencias
          </motion.span>
          <motion.h1 className="experiences-corporate-heading-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            Más allá de la finca
          </motion.h1>
          <motion.p className="experiences-corporate-paragraph-hero" variants={fadeUp} transition={{ duration: 0.7 }}>
            La Comarca del Noroeste murciano tiene mucho más que silencio.
            Gastronomía, naturaleza, historia y vino — todo a menos de una
            hora de la puerta de Quinta de Argos.
          </motion.p>
        </motion.div>
      </section>

      {/* ============ TIMELINE ============ */}
      <section className="experiences-corporate-timeline" ref={timelineRef}>
        <div className="experiences-corporate-timeline-track">
          <div className="experiences-corporate-timeline-track-base" />
          <motion.div
            className="experiences-corporate-timeline-track-fill"
            style={{ scaleY: scrollYProgress }}
          />
        </div>

        <div className="experiences-corporate-timeline-list">
          {EXPERIENCES.map((item, index) => {
            const isLeft = index % 2 === 0;

            return (
              <div
                key={item.id}
                className={`experiences-corporate-timeline-row ${
                  isLeft ? 'is-left' : 'is-right'
                }`}
              >
                <div className="experiences-corporate-timeline-node" />

                <motion.article
                  className="experiences-corporate-card"
                  variants={isLeft ? cardVariantsLeft : cardVariantsRight}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="experiences-corporate-card-image">
                    <img src={item.image} alt={item.title} loading="lazy" />
                  </div>

                  <div className="experiences-corporate-card-body">
                    <span className="experiences-corporate-card-category">{item.category}</span>
                    <h2 className="experiences-corporate-card-title">{item.title}</h2>
                    <p className="experiences-corporate-card-description">{item.description}</p>
                    <div className="experiences-corporate-card-distance">
                      <span className="experiences-corporate-card-distance-km">
                        {item.distanceKm} km
                      </span>
                      <span className="experiences-corporate-card-distance-sep">·</span>
                      <span className="experiences-corporate-card-distance-time">
                        {item.timeMinutes} min
                      </span>
                      <span className="experiences-corporate-card-distance-mode">{item.mode}</span>
                    </div>
                  </div>
                </motion.article>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ CIERRE ============ */}
      <section className="experiences-corporate-outro">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
          className="experiences-corporate-outro-inner"
        >
          <motion.p className="experiences-corporate-outro-paragraph" variants={fadeUp} transition={{ duration: 0.7 }}>
            Y después de cada excursión, siempre queda el mismo camino de
            vuelta: al silencio, al jardín, a la piscina infinity.
          </motion.p>
          <motion.a
            href="/reservas"
            className="experiences-corporate-cta-outro"
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

export default Experiences;