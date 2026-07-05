import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import InmersiveCarrousel from './InmersiveCarrousel';
import { UseTheme } from "../contexts/ThemeContext"; 
import './workSection.css';

gsap.registerPlugin(ScrollTrigger);

const WorkSection: React.FC = () => {
  const { theme } = UseTheme();
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const works = [
    { 
      caption: "NEXUS PLATFORM", 
      category: "WEB DEVELOPMENT", 
      description: "Infraestructura escalable de alto rendimiento para ecosistemas fintech.",
      src: "https://vjs.zencdn.net/v/oceans.mp4" 
    },
    { 
      caption: "ALPHA BRANDING", 
      category: "IDENTITY", 
      description: "Desarrollo de identidad visual minimalista centrada en la experiencia digital.",
      src: "https://vjs.zencdn.net/v/oceans.mp4" 
    },
    { 
      caption: "QUANTUM APP", 
      category: "UI/UX DESIGN", 
      description: "Diseño de interfaces inmersivas con micro-interacciones fluidas.",
      src: "https://vjs.zencdn.net/v/oceans.mp4" 
    },
    { 
      caption: "CORE SYSTEMS", 
      category: "SOFTWARE", 
      description: "Soluciones personalizadas para la gestión de datos complejos.",
      src: "https://vjs.zencdn.net/v/oceans.mp4" 
    },
  ];

  useEffect(() => {
    if (!sectionRef.current || !containerRef.current) return;

    const cards = gsap.utils.toArray('.js-card');
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=500%", 
        pin: true,
        scrub: 1,
      }
    });

    cards.forEach((card: any, i: number) => {
      // Estado Inicial
      gsap.set(card, { x: "150%", z: -500, opacity: 0 });

      tl.to(card, {
        x: "-150%", 
        ease: "none", // Usamos none para que el scrub sea lineal con el scroll
        duration: 2,
        onUpdate: function() {
          const progress = this.progress();
          let currentOpacity = 0;

          // Lógica de Opacidad Nítida en el medio:
          if (progress < 0.2) {
            // Entrada: de 0 a 1 en el primer 20%
            currentOpacity = progress * 5;
          } else if (progress >= 0.2 && progress <= 0.8) {
            // Centro: 100% nitidez entre el 20% y el 80% del recorrido
            currentOpacity = 1;
          } else {
            // Salida: de 1 a 0 en el último 20%
            currentOpacity = (1 - progress) * 5;
          }

          gsap.set(card, { opacity: currentOpacity });
        }
      }, i * 1.2); 
    });

    tl.to(".work-bg-title", {
      scale: 1.1,
      opacity: 0.04,
      duration: 4,
      ease: "none"
    }, 0);

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className={`work-section ${theme}`}>
      <div className="work-bg-container">
        <h2 className="work-bg-title">SELECTED WORKS</h2>
        <div className="work-grid-dots"></div>
      </div>

      <div ref={containerRef} className="work-scene-3d">
        {works.map((w, i) => (
          <InmersiveCarrousel key={i} index={i} {...w} />
        ))}
      </div>

      <div className="work-ui-indicator">
        <span className="line"></span>
        <span className="text">SCROLL TO EXPLORE</span>
      </div>
    </section>
  );
};

export default WorkSection;