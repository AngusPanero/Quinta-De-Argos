import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./methodCorporate.css"
import { UseTheme } from "../contexts/ThemeContext"
 
const MethodCorporate = () => {
    const { theme } = UseTheme()
    const [active, setActive] = useState<number>(0)
 
    const steps = [
        {
            id: "01",
            title: "Primera Consulta",
            tag: "CONTACTO INICIAL",
            desc: "Todo comienza con una conversación. Escuchamos tus necesidades, entendemos tus objetivos y evaluamos tu situación particular sin compromiso. En esta etapa conocemos el perfil del cliente, el tipo de operación que busca y las condiciones del mercado que más le convienen.",
            detail: "Sin costo · Presencial o virtual · 30 minutos"
        },
        {
            id: "02",
            title: "Análisis y Tasación",
            tag: "EVALUACIÓN",
            desc: "Realizamos un análisis exhaustivo del inmueble y del mercado actual. Determinamos el valor real de la propiedad considerando ubicación, estado, metraje y comparables de la zona, asegurando una tasación justa y competitiva para todas las partes.",
            detail: "Informe escrito · Comparables de mercado · Precio sugerido"
        },
        {
            id: "03",
            title: "Estrategia Comercial",
            tag: "PLANIFICACIÓN",
            desc: "Diseñamos el plan de acción: canales de difusión, precio de salida, timing y perfil del comprador o locatario ideal. Preparamos la propiedad con fotografía profesional y material de presentación para maximizar el impacto desde el primer día.",
            detail: "Difusión digital · Fotografía · Precio estratégico"
        },
        {
            id: "04",
            title: "Gestión Activa",
            tag: "OPERACIÓN",
            desc: "Coordinamos visitas, filtramos interesados y mantenemos comunicación constante con el cliente. Negociamos en nombre del propietario o comprador con criterio profesional, buscando siempre las mejores condiciones para quien nos confía su operación.",
            detail: "Visitas coordinadas · Negociación · Reportes periódicos"
        },
        {
            id: "05",
            title: "Documentación Legal",
            tag: "SEGURIDAD JURÍDICA",
            desc: "Acompañamos todo el proceso documental: reservas, boleto de compraventa, contratos de locación y escrituración. Trabajamos en conjunto con escribanos y asesores para garantizar que cada paso cumpla con la normativa vigente y proteja a todas las partes.",
            detail: "Contratos · Boletos · Coordinación con escribano"
        },
        {
            id: "06",
            title: "Cierre y Postventa",
            tag: "FINALIZACIÓN",
            desc: "Acompañamos la entrega de llaves y el cierre definitivo de la operación. Nuestro compromiso no termina con la firma: brindamos asistencia postventa, seguimiento de trámites pendientes y asesoramiento continuo para que la transición sea completamente tranquila.",
            detail: "Entrega de llaves · Postventa · Asesoramiento continuo"
        },
    ]
 
    return (
        <main className={`method-root ${theme}`}>
 
            {/* ── HEADER ── */}
            <header className="method-header">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9 }}
                    className="method-header-inner"
                >
                    <span className="method-eyebrow">BOGGERO PROPIEDADES · METODOLOGÍA</span>
                    <h1 className="method-title">
                        Así trabajamos <br />
                        <span className="method-title-outline">paso a paso.</span>
                    </h1>
                    <p className="method-subtitle">
                        Un proceso claro, transparente y acompañado en cada etapa.
                        Desde la primera consulta hasta la entrega de llaves.
                    </p>
                </motion.div>
 
                {/* Indicador de paso activo */}
                <div className="method-step-indicator">
                    <span className="method-step-current">
                        {String(active + 1).padStart(2, "0")}
                    </span>
                    <div className="method-step-bar">
                        <motion.div
                            className="method-step-fill"
                            animate={{ width: `${((active + 1) / steps.length) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>
                    <span className="method-step-total">
                        {String(steps.length).padStart(2, "0")}
                    </span>
                </div>
            </header>
 
            {/* ── CUERPO ── */}
            <div className="method-body">
 
                {/* Lista de pasos */}
                <nav className="method-steps-list">
                    {steps.map((step, i) => (
                        <motion.button
                            key={step.id}
                            className={`method-step-btn ${active === i ? "is-active" : ""}`}
                            onClick={() => setActive(i)}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <span className="method-btn-id">{step.id}</span>
                            <span className="method-btn-title">{step.title}</span>
                            <span className="method-btn-arrow">→</span>
                        </motion.button>
                    ))}
                </nav>
 
                {/* Panel de detalle */}
                <div className="method-detail-panel">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active}
                            className="method-detail-inner"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                            <span className="method-detail-tag">
                                {steps[active].tag}
                            </span>
 
                            <h2 className="method-detail-title">
                                {steps[active].title}
                            </h2>
 
                            <p className="method-detail-desc">
                                {steps[active].desc}
                            </p>
 
                            <div className="method-detail-footer">
                                <span className="method-detail-id">{steps[active].id}</span>
                                <p className="method-detail-pills">
                                    {steps[active].detail.split(" · ").map((pill, i) => (
                                        <span key={i} className="method-pill">{pill}</span>
                                    ))}
                                </p>
                            </div>
 
                            {/* Navegación anterior / siguiente */}
                            <div className="method-nav-btns">
                                <button
                                    className="method-nav-btn"
                                    onClick={() => setActive(i => Math.max(i - 1, 0))}
                                    disabled={active === 0}
                                >
                                    ← ANTERIOR
                                </button>
                                <button
                                    className="method-nav-btn method-nav-btn--next"
                                    onClick={() => setActive(i => Math.min(i + 1, steps.length - 1))}
                                    disabled={active === steps.length - 1}
                                >
                                    SIGUIENTE →
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
 
            {/* ── CTA ── */}
            <footer className="method-cta">
                <a href="/contact" className="method-cta-link">
                    COMENZAR MI CONSULTA <span>→</span>
                </a>
            </footer>
        </main>
    )
}
 
export default MethodCorporate