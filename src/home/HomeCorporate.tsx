import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { UseTheme } from "../contexts/ThemeContext"
import "./homeCorporate.css"
/* import heroVideo from "../assets/video-boggero-nosotros.mp4" */
import img1 from "../assets/foto-boggero-1.jpg"
import img2 from "../assets/foto-boggero-2.jpg"
import img3 from "../assets/foto-boggero-3.jpg"
import img4 from "../assets/foto-boggero-4.jpg"
 
const HomeCorporate = () => {
    const { theme } = UseTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll()
    const titleY = useTransform(scrollYProgress, [0, 0.15], [0, -80])
    const titleOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0])
 
    /* ── DATA ─────────────────────────────────────────────── */
    const services = [
        { id: "01", title: "Compra", desc: "Te acompañamos en cada paso para que encontrés la propiedad ideal al mejor precio del mercado." },
        { id: "02", title: "Venta",  desc: "Maximizamos el valor de tu propiedad con estrategia comercial, difusión y negociación profesional." },
        { id: "03", title: "Alquiler", desc: "Gestionamos contratos, garantías y seguimiento para que tu inversión esté siempre protegida." },
        { id: "04", title: "Tasación", desc: "Valuaciones precisas basadas en datos reales del mercado para decisiones informadas y seguras." },
    ]
 
    const reasons = [
        { num: "+10", label: "Años en el mercado" },
        { num: "+500", label: "Operaciones cerradas" },
        { num: "100%", label: "Atención personalizada" },
        { num: "1", label: "Matrícula 1049 · Mat. habilitada" },
    ]
 
    const testimonials = [
        {
            quote: "Elizabeth nos guió en la compra de nuestro primer departamento con una claridad y paciencia increíbles. Sentimos que teníamos una aliada, no solo una intermediaria.",
            author: "Martina R.", role: "Compradora · 2023"
        },
        {
            quote: "Vendimos nuestra casa en menos de 45 días al precio que pedíamos. La estrategia de difusión y la negociación fueron impecables. No podríamos estar más conformes.",
            author: "Gustavo y Ana P.", role: "Vendedores · 2024"
        },
        {
            quote: "Llevo tres años con Boggero Propiedades gestionando mi departamento en alquiler. Cero preocupaciones, cero inconvenientes. Profesionalismo de otro nivel.",
            author: "Federico L.", role: "Propietario · 2022–2025"
        },
    ]
 
    /* ── ANIMACIONES ──────────────────────────────────────── */
    const fadeUp: any = {
        hidden: { opacity: 0, y: 60 },
        visible: (i: number) => ({
            opacity: 1, y: 0,
            transition: { duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }
        })
    }
 
    const staggerContainer = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } }
    }
 
    return (
        <div className={`home-root ${theme}`} ref={containerRef}>
 
            {/* ══════════════════════════════════════════════
                HERO — VIDEO + MASSIVE TITLE
            ══════════════════════════════════════════════ */}
            <section className="home-hero">
 
                {/* Video slot */}
                <div className="home-hero-video-wrap">
                    {/* DESCOMENTA CUANDO TENGAS EL VIDEO */}
                    <video autoPlay muted loop playsInline className="home-hero-video">
                        <source src="https://res.cloudinary.com/dhqzn8gwi/video/upload/v1778182145/xjlcxxnr6blzexbivtfq.mp4" type="video/mp4" />
                    </video>
                    <div className="home-hero-video-placeholder" />
                    <div className="home-hero-overlay" />
                </div>
 
                {/* Título masivo con parallax */}
                <motion.div
                    className="home-hero-content"
                    style={{ y: titleY, opacity: titleOpacity }}
                >
                    <motion.span
                        className="home-hero-eyebrow"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                    >
                        EST. 2014 · BOGGERO PROPIEDADES
                    </motion.span>
 
                    <h1 className="home-hero-title">
                        {"BOGGERO PROPIEDADES".split("").map((char, i) => (
                            <motion.span
                                key={`a-${i}`}
                                className="home-hero-char"
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.5 + i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {char === " " ? "\u00A0" : char}
                            </motion.span>
                        ))}
                        <br />
                        {"TU PRÓXIMO HOGAR".split("").map((char, i) => (
                            <motion.span
                                key={`b-${i}`}
                                className="home-hero-char home-hero-char--rose"
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.9 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {char === " " ? "\u00A0" : char}
                            </motion.span>
                        ))}
                    </h1>
 
                    <motion.p
                        className="home-hero-sub"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.6 }}
                    >
                        Compra · Venta · Alquiler · Tasación
                    </motion.p>
                </motion.div>
 
                {/* Scroll cue */}
                <motion.div
                    className="home-scroll-cue"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.2, duration: 1 }}
                >
                    <span>SCROLL</span>
                    <motion.div
                        className="home-scroll-line"
                        animate={{ scaleY: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    />
                </motion.div>
            </section>
 
            {/* ══════════════════════════════════════════════
                MARQUEE — BANDA ANIMADA
            ══════════════════════════════════════════════ */}
            <div className="home-marquee-wrap">
                <motion.div
                    className="home-marquee-track"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
                >
                    {[...Array(2)].map((_, rep) => (
                        <span key={rep} className="home-marquee-content">
                            COMPRA &nbsp;·&nbsp; VENTA &nbsp;·&nbsp; ALQUILER &nbsp;·&nbsp;
                            TASACIÓN &nbsp;·&nbsp; Elizabeth BOGGERO &nbsp;·&nbsp; MAT. 1049 &nbsp;·&nbsp;
                            +10 AÑOS &nbsp;·&nbsp; CONFIANZA &nbsp;·&nbsp;
                        </span>
                    ))}
                </motion.div>
            </div>
 
            {/* ══════════════════════════════════════════════
                SERVICIOS
            ══════════════════════════════════════════════ */}
            <section className="home-section home-services">
                <motion.div
                    className="home-section-header"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeUp}
                    custom={0}
                >
                    <span className="home-label">SERVICIOS</span>
                    <h2 className="home-section-title">
                        Todo lo que<br />
                        <span className="home-outline">necesitás.</span>
                    </h2>
                </motion.div>
 
                <motion.div
                    className="home-services-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerContainer}
                >
                    {services.map((s, i) => (
                        <motion.div
                            key={s.id}
                            className="home-service-card"
                            variants={fadeUp}
                            custom={i}
                            whileHover={{ y: -6 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <span className="home-service-id">{s.id}</span>
                            <h3 className="home-service-title">{s.title}</h3>
                            <p className="home-service-desc">{s.desc}</p>
                            <span className="home-service-arrow">→</span>
                        </motion.div>
                    ))}
                </motion.div>
            </section>
 
            {/* ══════════════════════════════════════════════
                POR QUÉ ELEGIRNOS — STATS
            ══════════════════════════════════════════════ */}
            <section className="home-section home-why">
                <motion.div
                    className="home-why-header"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeUp}
                    custom={0}
                >
                    <span className="home-label">POR QUÉ ELEGIRNOS</span>
                    <h2 className="home-section-title home-section-title--light">
                        Experiencia que<br />
                        <span className="home-outline--rose">respalda.</span>
                    </h2>
                    <p className="home-why-sub">
                        Más de una década acompañando familias, inversores y empresas
                        en las decisiones inmobiliarias más importantes de su vida.
                        Cada operación, abordada con el mismo nivel de compromiso.
                    </p>
                </motion.div>
 
                <motion.div
                    className="home-why-stats"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerContainer}
                >
                    {reasons.map((r, i) => (
                        <motion.div
                            key={i}
                            className="home-stat-item"
                            variants={fadeUp}
                            custom={i}
                        >
                            <span className="home-stat-num">{r.num}</span>
                            <span className="home-stat-label">{r.label}</span>
                        </motion.div>
                    ))}
                </motion.div>
 
                <motion.div
                    className="home-why-pillars"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerContainer}
                >
                    {["Transparencia", "Compromiso", "Seguridad jurídica", "Trato personalizado"].map((p, i) => (
                        <motion.span key={i} className="home-pillar" variants={fadeUp} custom={i}>
                            {p}
                        </motion.span>
                    ))}
                </motion.div>
            </section>

            <div className="footer-gallery">
                <img src={img1} alt="Propiedad destacada" className="footer-gallery-img" />
                <img src={img2} alt="Interior moderno" className="footer-gallery-img" />
                <img src={img3} alt="Fachada" className="footer-gallery-img" />
                <img src={img4} alt="Living comedor" className="footer-gallery-img" />
            </div>
 
            {/* ══════════════════════════════════════════════
                TESTIMONIOS
            ══════════════════════════════════════════════ */}
            <section className="home-section home-testimonials">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                    custom={0}
                >
                    <span className="home-label">TESTIMONIOS</span>
                    <h2 className="home-section-title">
                        Lo que dicen<br />
                        <span className="home-outline">nuestros clientes.</span>
                    </h2>
                </motion.div>
 
                <motion.div
                    className="home-testimonials-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={staggerContainer}
                >
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            className="home-testimonial-card"
                            variants={fadeUp}
                            custom={i}
                        >
                            <span className="home-testimonial-quote">"</span>
                            <p className="home-testimonial-text">{t.quote}</p>
                            <div className="home-testimonial-author">
                                <span className="home-testimonial-name">{t.author}</span>
                                <span className="home-testimonial-role">{t.role}</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </section>
 
            {/* ══════════════════════════════════════════════
                CTA FINAL
            ══════════════════════════════════════════════ */}
            <section className="home-cta-section">
                <motion.div
                    className="home-cta-inner"
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                    <span className="home-label home-label--dark">EMPEZÁ HOY</span>
                    <h2 className="home-cta-title">
                        Hablemos de<br />tu propiedad.
                    </h2>
                    <p className="home-cta-sub">
                        Sin compromiso. Primera consulta gratuita.
                    </p>
                    <a href="/contact" className="home-cta-btn">
                        CONSULTAR AHORA <span>→</span>
                    </a>
                </motion.div>
            </section>
 
        </div>
    )
}
 
export default HomeCorporate