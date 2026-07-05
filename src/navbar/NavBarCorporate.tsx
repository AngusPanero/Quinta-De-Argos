import { useState, useEffect, useRef } from "react";
import "./navBarCorporate.css"
import LoginCorporate from "./LoginCorporate";
import moon from "/logos/moon2.svg"
import sun from "/logos/sun.svg"
import { UseLanguage } from "../contexts/LanguageContext";
import { UseTheme } from "../contexts/ThemeContext";
import { UseSession } from "../contexts/SessionContext";
import NavBarCorporateMobile from "./NavBarCorporateMobile";
import LiveTypingText from "../ui/LiveTypingText";

const NavBarCorporate = () => {
    const [ loginOpen, setLoginOpen ] = useState(false);    
    const [ showPromo, setShowPromo ] = useState(true);
    const [ menuOpen, setMenuOpen ] = useState(false);

    const lastScrollY = useRef(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, handleLogout } = UseSession()

    const { language, handleLanguage, texts } = UseLanguage()
    const { theme, handleTheme } = UseTheme()

     // --- LÓGICA ROUND MORPH PROPIA DE ESCRITORIO ---
    const toggleThemeWithAnimation = (e: React.MouseEvent<HTMLButtonElement>) => {
        const x = e.clientX;
        const y = e.clientY;
        
        // Seteamos las variables en el documento para que el CSS las tome
        document.documentElement.style.setProperty('--x', `${x}px`);
        document.documentElement.style.setProperty('--y', `${y}px`);

        if (!document.startViewTransition) {
            handleTheme(theme === "dark" ? "light" : "dark");
            return;
        }

        document.startViewTransition(() => {
            handleTheme(theme === "dark" ? "light" : "dark");
        });
    };

    useEffect(() => {
        const handleClickOutside = (e: any) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target) && !e.target.closest('.hamburger-btn')) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScroll = window.scrollY;
            if( currentScroll > lastScrollY.current && currentScroll > 20){
                setShowPromo(false);
            } else {
                setShowPromo(true); 
            }
            lastScrollY.current = currentScroll
        }
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [language]);

    return (
        <>
        <section className={`nav-wrapper corporate-edition ${theme === "light" ? "theme-light" : "theme-dark"}`}>
            {/* BARRA DE ANUNCIOS (PROMO) */}
            <div className={`nav-promo ${showPromo ? "open" : "closed"}`}>
                <p className="text-promo"><LiveTypingText text="Bienvenido a Boggero Propiedades" /></p>
            </div>

            <header className="hero-header">
                <div className="left-actions">
                    <a href="/"><h4 className="logo-title">Boggero Propiedades</h4></a>
                </div>

                {/* NAVEGACIÓN DESKTOP */}
                <nav className="nav-desktop">
                    <ul>
                        <li><a href="/houses">Propiedades</a></li>
                        <li><a href="/company">Compañía</a></li>
                        <li><a href="/contact">Contacto</a></li>
                        <li><a href="/method">Método</a></li>
                        {user && user.admin === true && <li><a href="/admin" className="dashboard-link">Administrador</a></li>}
                    </ul>   
                </nav>

                <div className="right-actions">
                    <div className="actions-desktop-group">
                        <button className="nav-buttons theme-btn" onClick={toggleThemeWithAnimation}>
                            <img src={theme === "dark" ? sun : moon} alt="theme-icon" width={18} />
                        </button>

                        {user ? 
                            <button onClick={() => handleLogout()} className="nav-buttons logout-btn">Cerrar Sesión</button>
                            :
                            <button onClick={() => setLoginOpen(true)} className="nav-buttons login-btn">Administrador</button>
                        }
                    </div>

                    {/* MENÚ HAMBURGUESA MOBILE */}
                    <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
                        <span className={`bar ${menuOpen ? "open" : ""}`}></span>
                        <span className={`bar ${menuOpen ? "open" : ""}`}></span>
                        <span className={`bar ${menuOpen ? "open" : ""}`}></span>
                    </button>
                </div>
            </header>

            {/* MENÚ MOBILE DESPLEGABLE */}
            {menuOpen && (
                <NavBarCorporateMobile
                    ref={menuRef}
                    closeMenu={() => setMenuOpen(false)}
                    texts={texts}
                    language={language}
                    theme={theme}
                    toggleThemeWithAnimation={toggleThemeWithAnimation}
                    handleLanguage={handleLanguage}
                    openLogin={() => setLoginOpen(true)}
                />
            )}
        </section>

        { loginOpen && <LoginCorporate closeLogin={() => setLoginOpen(false)} /> }
        </>
    );
}

export default NavBarCorporate;