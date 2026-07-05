import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import videoSrc from "./code.mp4";
import "./titleScroll.css"

// Registrar el plugin de GSAP
gsap.registerPlugin(ScrollTrigger);

const TittleScroll = () => {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    // Creamos un contexto de GSAP para manejar mejor la limpieza useLayoutEffect: Es como useEffect, pero se ejecuta justo antes de que el usuario vea la página. Es ideal para animaciones porque evita que el elemento "parpadee" antes de empezar a animarse.
    const ctx = gsap.context(() => {
      {/* ScrollTrigger: Es un plugin de GSAP que permite que la animación progrese según cuánto bajas con el ratón. */}
      gsap.to(textRef.current, {
        scale: 300,
        ease: "none",
        
        scrollTrigger: { 
          trigger: containerRef.current,
          start: "top top",
          end: "+=1000",
          scrub: 1,
          pin: true,
          // markers: true, // Descomenta esto para ver los puntos de inicio/fin
        },
      });

    }, containerRef); // El alcance es el contenedor

    return () => ctx.revert(); // Limpieza automática al desmontar
  }, []);

  return (
      <div className="mask-page">
        {/* Espacio superior opcional para probar el scroll */}
      
        <div className="container" ref={containerRef}>
          <video autoPlay loop muted playsInline preload="auto">
            <source src={videoSrc} type="video/mp4"/>
          </video>

          <div className="mask">
            <h2 ref={textRef}>Hidden Security.</h2>
          </div>
        </div>
        
        {/* Espacio inferior para permitir el scroll final */}
      </div>
  );
};

export default TittleScroll;