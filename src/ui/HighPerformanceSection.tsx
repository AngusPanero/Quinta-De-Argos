import { motion } from "framer-motion";

const HighPerformanceSection = () => {
    return (
        <section className="k-warp-section">
            {/* Bloques de fondo que se expanden */}
            <div className="k-warp-container">
                {[...Array(10)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="k-warp-block"
                        initial={{ scaleX: 1 }}
                        whileInView={{ scaleX: 0 }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ 
                            duration: 0.4, 
                            delay: i * 0.1, 
                            ease: [0.85, 0, 0.15, 1] // Ease de aceleración extrema
                        }}
                    />
                ))}
            </div>

            {/* Contenido que queda al descubierto */}
            <div className="k-warp-content">
                <motion.div 
                    className="k-warp-text-box"
                    initial={{ opacity: 0, letterSpacing: "20px" }}
                    whileInView={{ opacity: 1, letterSpacing: "-2px" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    <span className="k-label">// SYSTEM_STATUS: OPTIMIZED</span>
                    <h2 className="k-warp-title">
                        ESTUDIO DE <br /> 
                        <span>ALTO RENDIMIENTO</span>
                    </h2>
                    <p className="k-warp-description">
                        Arquitectura digital de baja latencia. Construimos interfaces que no solo se ven 
                        bien, sino que responden a la velocidad del pensamiento. 
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default HighPerformanceSection;