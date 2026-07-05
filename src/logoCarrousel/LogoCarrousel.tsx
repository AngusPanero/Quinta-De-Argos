import { useEffect, useRef } from "react";
import "./logoCarrousel.css"
import { UseLanguage } from "../contexts/LanguageContext";
import { UseTheme } from "../contexts/ThemeContext";

const LogoCarrousel = () => {
    const { language, texts } = UseLanguage()
    const { theme } = UseTheme()

    const logos = [
        "/logos/aftereffects.svg",
        "/logos/android.svg",
        "/logos/aws.svg",
        "/logos/azure.svg",
        "/logos/react.svg",
        "/logos/css.svg",
        "/logos/html.svg",
        "/logos/illustrator.svg",
        "/logos/ios.svg",
        "/logos/microsoft.svg",
        "/logos/mongo.svg",
        "/logos/photoshop.svg",
        "/logos/postman.svg",
        "/logos/premiere.svg",
        "/logos/python.svg",
        "/logos/typescript.svg",
    ]

    const trackRef = useRef<HTMLDivElement>(null);

    const posX = useRef(0);
    const velocity = useRef(1); // velocidad base
    const isDragging = useRef(false);
    const lastX = useRef(0);
    const rafId = useRef<number | null>(null);

    // 🔁 Movimiento automático
    const animate = () => {
        if (!trackRef.current) return;

        if (!isDragging.current) {
        posX.current -= velocity.current;
        }

        const width = trackRef.current.scrollWidth / 2;

        if (Math.abs(posX.current) >= width) {
        posX.current = 0;
        }

        trackRef.current.style.transform = `translateX(${posX.current}px)`;
        rafId.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        rafId.current = requestAnimationFrame(animate);
        return () => {
        if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, []);

    // 🖱️ Drag
    const onPointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        lastX.current = e.clientX;
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const delta = e.clientX - lastX.current;
        posX.current += delta;
        lastX.current = e.clientX;
    };

    const onPointerUp = () => {
        isDragging.current = false;
    };

    return (
        <div className={`logo-carousel ${theme === "light" ? "theme-light" : "theme-dark"}`}>

            <h1 className="h1-boost" style={{ color: theme === "dark" ? "white" : "#3b82f6" }}>
                {texts[language].home.boost}
            </h1>

            <div className="logo-track" ref={trackRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                {[...logos, ...logos].map((logo, i) => (
                <div className="logo-item" key={i}>
                    <img src={logo} alt="logo" />
                </div>
                ))}
            </div>
        </div>
    );
}

export default LogoCarrousel;
