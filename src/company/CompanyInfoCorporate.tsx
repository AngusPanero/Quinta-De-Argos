import { motion } from 'framer-motion';
import "./companyInfoCorporate.css"
import { UseTheme } from '../contexts/ThemeContext';
import betina from "../assets/betina-2.jpg";
/* import videoBoggero from "../assets/video-boggero-nosotros.mp4"; */

const CompanyInfoCorporate: React.FC = () => {
    const { theme } = UseTheme();
 
    const milestones = [
        {
            year: "2014",
            title: "FUNDACIÓN",
            desc: "Nace Boggero Propiedades con la visión de transformar la experiencia inmobiliaria en algo cercano, claro y confiable. Desde el primer día, el compromiso fue ofrecer un servicio profesional y personalizado, acompañando a cada cliente con honestidad y dedicación en cada etapa del proceso."
        },
        {
            year: "2017",
            title: "CRECIMIENTO Y CONFIANZA",
            desc: "Tras los primeros años de trabajo sostenido, Boggero Propiedades consolida su presencia en el mercado local. Una cartera creciente de clientes elige la seriedad, el trato directo y la transparencia como diferenciales. Cada operación cerrada con éxito se convierte en la base de una relación duradera."
        },
        {
            year: "2021",
            title: "EXPANSIÓN DIGITAL",
            desc: "Con el objetivo de acompañar los cambios del mercado y las nuevas formas de buscar propiedades, se incorporan herramientas digitales para agilizar consultas, visitas y gestión de operaciones de manera remota. La tecnología al servicio de un trato siempre humano y personalizado."
        },
        {
            year: "2024",
            title: "+10 AÑOS DE TRAYECTORIA",
            desc: "Una década de trabajo ininterrumpido, operaciones exitosas y relaciones que perduran en el tiempo. Diez años avalan la seriedad y el compromiso de Boggero Propiedades, una inmobiliaria que creció gracias a la confianza de sus clientes y al valor de hacer bien cada trabajo, sin excepciones."
        }
    ];
 
    const values = [
        { label: "AÑOS EN EL MERCADO", value: "+10" },
        { label: "OPERACIONES CONCRETADAS", value: "+500" },
        { label: "ATENCIÓN PERSONALIZADA", value: "100%" },
    ];
 
    return (
        <main className={`bg-corp ${theme}`}>
 
            {/* ── HERO CON VIDEO ── */}
            <section className="bg-hero">
                <div className="bg-video-wrapper">
                    {/* DESCOMENTA CUANDO TENGAS EL VIDEO */}
                    <video autoPlay muted loop playsInline className="bg-hero-video">
                        <source src="https://res.cloudinary.com/dhqzn8gwi/video/upload/v1778182136/tflb4sfvlddxrdcak93n.mp4" type="video/mp4" />
                    </video>
 
                    {/* PLACEHOLDER mientras no hay video */}
                    <div className="bg-video-placeholder" />
 
                    <div className="bg-video-overlay" />
                </div>
 
                <div className="bg-hero-content">
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="bg-eyebrow"
                    >
                        Est. 2014 / Boggero Propiedades
                    </motion.p>
 
                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="bg-hero-title"
                    >
                        MÁS DE UNA DÉCADA
                        <br />
                        <span className="bg-rose-text">CONSTRUYENDO CONFIANZA</span>
                    </motion.h1>
                </div>
            </section>
 
            {/* ── MISIÓN ── */}
            <section className="bg-mission">
                <h2 className="bg-section-label">NUESTRA ESENCIA</h2>
                <div className="bg-mission-inner">
                    <motion.p
                        initial={{ opacity: 0, filter: "blur(10px)" }}
                        whileInView={{ opacity: 1, filter: "blur(0px)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2 }}
                        className="bg-mission-headline"
                    >
                        Tu propiedad, <span className="bg-rose-text">nuestra responsabilidad.</span>
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 0.7, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="bg-mission-sub"
                    >
                        En Boggero Propiedades cada operación es abordada de manera individual.
                        Actuamos con seriedad, transparencia y compromiso, priorizando siempre
                        la seguridad jurídica y el acompañamiento personalizado desde la primera
                        consulta hasta el cierre.
                    </motion.p>
                </div>
            </section>
 
            {/* ── MÉTRICAS ── */}
            <section className="bg-metrics">
                {values.map((item, i) => (
                    <motion.div
                        key={i}
                        className="bg-metric-row"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                    >
                        <span className="bg-metric-label">{item.label}</span>
                        <span className="bg-metric-value">{item.value}</span>
                    </motion.div>
                ))}
            </section>
 
            {/* ── PERFIL BETINA ── */}
            <section className="bg-profile">
                <h2 className="bg-section-label">EL ESTUDIO</h2>
                <div className="bg-profile-grid">
                    <motion.div
                        className="bg-profile-image-col"
                        initial={{ opacity: 0, y: 60 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9 }}
                    >
                        <div className="bg-image-frame">
                            <div className="bg-image-accent" />
                            <img src={betina} alt="Elizabeth Boggero" className="bg-profile-photo" />
                        </div>
                        <div className="bg-profile-caption">
                            <h3>Elizabeth Boggero</h3>
                            <span>Martillera y Corredora Pública · Mat. 1049</span>
                        </div>
                    </motion.div>
 
                    <motion.div
                        className="bg-profile-text-col"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.2 }}
                    >
                        <p className="bg-profile-lead">
                            <strong>Boggero Propiedades</strong> es una empresa dedicada a la intermediación
                            y al asesoramiento inmobiliario, orientada a brindar un servicio profesional,
                            claro y responsable en operaciones de compra, venta y alquiler de propiedades.
                        </p>
                        <p className="bg-profile-body">
                            Elizabeth es la titular y responsable del estudio, con sólida experiencia en el
                            mercado inmobiliario. Su forma de trabajo se caracteriza por la atención
                            personalizada, la claridad en cada etapa del proceso y el cumplimiento estricto
                            de las normas que regulan la actividad.
                        </p>
                        <p className="bg-profile-body">
                            A lo largo de su trayectoria, <strong>Boggero Propiedades</strong> ha construido
                            relaciones de confianza basadas en la honestidad, el trato directo y la correcta
                            gestión de cada operación.
                        </p>
 
                        <div className="bg-credential">
                            <span className="bg-credential-dot" />
                            <span>Martillera y Corredora Pública — Matrícula Nro. 1049</span>
                        </div>
                        <div className="bg-credential">
                            <span className="bg-credential-dot" />
                            <span>Colegio de Martilleros y Corredores Públicos — [Colegio / Provincia]</span>
                        </div>
                    </motion.div>
                </div>
            </section>
 
            {/* ── TIMELINE ── */}
            <section className="bg-timeline-section">
                <h2 className="bg-section-label">NUESTRA HISTORIA</h2>
                <div className="bg-timeline-canvas">
                    {milestones.map((item, index) => (
                        <motion.div
                            key={index}
                            className={`bg-canvas-item ${index % 2 === 0 ? 'left' : 'right'}`}
                            initial={{ opacity: 0, y: 100 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
                        >
                            <div className="bg-canvas-year-bg">{item.year}</div>
                            <div className="bg-canvas-content">
                                <span className="bg-canvas-tag">Hito {index + 1}</span>
                                <h4>{item.title}</h4>
                                <p>{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                    <div className="bg-canvas-line" />
                </div>
            </section>
 {/* 
            <section className="bg-contact">
                <div className="bg-contact-header">
                    <h2 className="bg-section-label">CONTACTO</h2>
                </div>
                <div className="bg-contact-grid">
                    <div className="bg-contact-item">
                        <span className="bg-contact-city">OFICINA 🏡</span>
                        <p>
                            [Dirección]<br />
                            [Localidad, Provincia]<br />
                            [Código Postal]
                        </p>
                    </div>
                    <div className="bg-contact-item">
                        <span className="bg-contact-city">COMUNICACIÓN DIRECTA</span>
                        <p>
                            Tel: [Teléfono]<br />
                            WhatsApp: [WhatsApp]<br />
                            Email: boggeropropiedades@gmail.com
                        </p>
                    </div>
                </div>
            </section> */}
 
            {/* ── CTA ── */}
            <footer className="bg-cta">
                <a href="/contacto" className="bg-big-link">
                    CONSULTÁ SIN COMPROMISO <span>→</span>
                </a>
            </footer>
        </main>
    );
};

export default CompanyInfoCorporate;