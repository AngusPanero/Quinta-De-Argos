import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import "./productsCorporate.css";
import { UseTheme } from "../contexts/ThemeContext";

import img1 from "../assets/products-cor.p-11.jpg"
import img2 from "../assets/products-cor.p-22.jpg"
import img3 from "../assets/products-cor.p-55.jpg"
import img4 from "../assets/products-cor.p-33.jpg"
import img5 from "../assets/products-cor.p-44.jpg"
import LiveTypingText from "../ui/LiveTypingText";

const ProductSection = ({ product, index }: any) => {
    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false); // Estado para disparar el tipeo
    const isEven = index % 2 === 0;

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "start start"]
    });
    
    const opacity = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

    return (
        <section 
            ref={sectionRef} 
            className="product-sticky-step"
            style={{ zIndex: index + 10 }}
        >
            <AnimatePresence mode="wait">
                <motion.div 
                    key={product.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    onViewportEnter={() => setIsVisible(true)} // Se activa al entrar en vista
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ opacity }} 
                    className={`product-content-wrapper ${isEven ? 'right-layout' : 'left-layout'}`}
                >
                    <div className="image-side">
                        <img src={product.img} alt={product.title} className="full-bg-image" />
                        <div className="image-overlay" />
                    </div>

                    <div className="text-side">
                        <div className="text-wrapper">
                            <span className="index-indicator">0{index + 1} — ÁREA LEGAL</span>
                            <h2>{product.title}</h2>
                            
                            {/* INTEGRACIÓN DEL LIVE TYPING */}
                            <p>
                                {isVisible ? (
                                    <LiveTypingText text={product.desc} />
                                ) : (
                                    <span style={{ opacity: 0 }}>{product.desc}</span>
                                )}
                            </p>
                            
                            <small className="matricula-tag" style={{ 
                                display: 'block', 
                                marginTop: '1.5rem', 
                                fontWeight: 'bold', 
                                color: 'var(--blue-accent)',
                                opacity: isVisible ? 1 : 0,
                                transition: 'opacity 1s ease 1s' // Aparece después del texto
                            }}>
                                {product.matricula}
                            </small>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </section>
    );
};

const ProductsCorporate = () => {
    const { theme } = UseTheme();

 
    const abogados = [
        { 
            id: "socio-1", 
            title: "Dr. Esteban Petracca", 
            desc: "Socio Fundador con más de 35 años de trayectoria ininterrumpida en el fuero civil y comercial. Especialista en Litigios de Alta Complejidad, Daños y Perjuicios, y Estrategia Procesal. Su amplia visión técnica y jurídica ha liderado los fallos más trascendentes del estudio, marcando precedentes judiciales en la resolución de conflictos contra grandes corporaciones y aseguradoras de primera línea.",
            matricula: "CPACF T° 42 F° 115",
            img: img1 
        },
        { 
            id: "socio-2", 
            title: "Dra. Silvina Barbato", 
            desc: "Socia Especialista en Derecho del Trabajo y experta en el Régimen de Riesgos del Trabajo (ART). Con una sólida formación en negociación colectiva y determinación técnica de incapacidades, se dedica a garantizar la máxima protección legal y resarcimiento para el trabajador accidentado. Su gestión se destaca por una defensa integral que abarca desde la etapa administrativa en Comisiones Médicas hasta la instancia judicial jerárquica.",
            matricula: "CPACF T° 58 F° 229",
            img: img2 
        },
        { 
            id: "asociado-1", 
            title: "Dr. Julián M. Gómez", 
            desc: "Abogado Senior integrante de la División de Siniestros Viales y Responsabilidad Civil. Especialista en la reconstrucción pericial de accidentes de tránsito y en la gestión estratégica de reclamos ante compañías aseguradoras. Su enfoque combina la celeridad administrativa con una rigurosa eficacia resolutiva, asegurando que cada cliente reciba una compensación justa y proporcional por los daños materiales y lesiones sufridas en la vía pública.",
            matricula: "CASI T° 102 F° 45",
            img: img3 
        },
        { 
            id: "asociado-2", 
            title: "Dra. Lucía Fernández", 
            desc: "Coordinadora del Departamento de Comisiones Médicas y Enfermedades Profesionales. Se dedica exclusivamente al seguimiento pormenorizado de expedientes médicos ante la Superintendencia de Riesgos del Trabajo, garantizando el estricto cumplimiento de las prestaciones en especie y dinerarias. Su labor es fundamental para revertir rechazos de siniestros y asegurar que las dolencias crónicas sean correctamente baremadas y resarcidas.",
            matricula: "CPACF T° 95 F° 312",
            img: img4 
        },
        { 
            id: "perito", 
            title: "Dr. Roberto Rossi", 
            desc: "Consultor Técnico y Perito Accidentológico del estudio. Profesional encargado del análisis físico-mecánico y la cinemática de los siniestros de gran escala, aportando la evidencia científica y técnica fundamental para el éxito de nuestras demandas judiciales. Su intervención permite sustentar cada presentación con informes periciales irrefutables que determinan con precisión la mecánica de los hechos y la responsabilidad de las partes.",
            matricula: "Mat. Prof. 12.844",
            img: img5 
        },
    ];

    return (
        <div className={`stacked-main-container ${theme}`}>
            {abogados.map((abogado, i) => (
                <ProductSection 
                    key={abogado.id} 
                    product={{
                        title: abogado.title,
                        desc: `${abogado.desc} | Matricula: ${abogado.matricula}`,
                        img: abogado.img
                    }} 
                    index={i} 
                    theme={theme} 
                />
            ))}   
        </div>
    );
};

export default ProductsCorporate;