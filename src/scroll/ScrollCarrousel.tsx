import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './scrollCarrousel.css';

import scroll1 from "/src/assets/scroll-5-.jpg"
import scroll2 from "/src/assets/scroll-3-.jpg"
import scroll3 from "/src/assets/scroll-2-.jpg"
import scroll5 from "/src/assets/scroll-1-.jpg"
import { UseTheme } from '../contexts/ThemeContext';
import LiveTypingText from '../ui/LiveTypingText';

// Definición de tipos para las features
interface Feature {
    id: number;
    title: string;
    description: string;
    img: string;
    side: string;
}

const features: Feature[] = [
    {
        id: 1,
        title: "Especialistas en Tránsito",
        description: "Brindamos asesoramiento integral en siniestros viales para garantizar la máxima indemnización por daños materiales y lesiones. Analizamos cada caso minuciosamente, desde la recolección de pruebas hasta la negociación con las aseguradoras.",
        img: scroll1,
        side: "left"
    },
    {
        id: 2,
        title: "Defensa en Riesgos del Trabajo",
        description: "Protegemos tus derechos ante accidentes laborales o enfermedades profesionales dentro del marco de la Ley de Riesgos del Trabajo. Gestionamos reclamos ante la ART y Comisiones Médicas.",
        img: scroll2,
        side: "right"
    },
    {
        id: 3,
        title: "Litigios de Alta Complejidad",
        description: "Contamos con un equipo de peritos accidentológicos y médicos forenses para sustentar cada demanda con evidencia técnica irrefutable. La combinación de ciencia y derecho nos permite abordar casos complejos.",
        img: scroll3,
        side: "left"
    },
    {
        id: 4,
        title: "Gestión Ética y Transparente",
        description: "Mantenemos una comunicación constante y honesta sobre el estado real de tu proceso judicial o extrajudicial. Creemos que la confianza es la base de toda relación jurídica exitosa.",
        img: scroll5,
        side: "right"
    },
];

// Sub-componente para manejar el estado de scroll de cada item individualmente
const FeatureItem = ({ feature }: { feature: Feature }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="scroll-trigger">
            <div className="sticky-wrapper">
                <motion.div 
                    className={`feature-item ${feature.side}`}
                    initial="initial"
                    whileInView="animate"
                    onViewportEnter={() => setIsVisible(true)}
                    onViewportLeave={() => setIsVisible(false)} // Opcional: para que se reinicie al subir/bajar
                    viewport={{ once: false, amount: 0.5 }}
                    variants={{
                        initial: { 
                            opacity: 0, 
                            rotateY: feature.side === 'left' ? -15 : 15,
                            scale: 0.95,
                            x: feature.side === 'left' ? -20 : 20,
                        },
                        animate: { 
                            opacity: 1, 
                            rotateY: 0, 
                            scale: 1, 
                            x: 0,
                            transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } 
                        }
                    }}
                >
                    <div className="text-content">
                        <h2 className="corp-title">{feature.title}</h2>
                        
                        <p className="corp-description">
                            {/* Solo renderiza el componente de tipeo si el item está en vista */}
                            {isVisible ? (
                                <LiveTypingText text={feature.description} />
                            ) : (
                                <span style={{ opacity: 0 }}>{feature.description}</span>
                            )}
                        </p>
                        
                        <motion.div 
                            className="corp-accent-line"
                            initial={{ width: 0 }}
                            whileInView={{ width: "100%" }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        />
                    </div>

                    <div className="visual-content">
                        <div className="book-frame">
                            <img src={feature.img} alt={feature.title} className="corp-img" />
                            <div className="frame-overlay"></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const ScrollCarrousel: React.FC = () => {
    const { theme } = UseTheme();

    return (
        <section className={`feature-scroll-corporate ${theme}`}>
            {features.map((feature) => (
                <FeatureItem key={feature.id} feature={feature} />
            ))}
        </section>
    );
};

export default ScrollCarrousel;