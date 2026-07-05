import { forwardRef } from "react";
import moon from "/logos/moon2.svg"
import sun from "/logos/sun.svg"
import { UseSession } from "../contexts/SessionContext";

interface NavBarMobileProps {
    closeMenu: () => void;
    texts: any;
    language: string;
    theme: string;
    toggleThemeWithAnimation: (e: React.MouseEvent<HTMLButtonElement>) => void;
    handleLanguage: (e: string) => void;
    openLogin: () => void;
}

const NavBarCorporateMobile = forwardRef(({ closeMenu, texts, language, theme, toggleThemeWithAnimation, openLogin }: NavBarMobileProps, ref: any) => {
    const { user, handleLogout } = UseSession()

    return (
        <div className={`mobile-menu-container ${theme} corporate-mobile-panel`} ref={ref}>
            <div className="mobile-panel-header">
                <span className="panel-title">Menú de Navegación</span>
                <button className="close-panel-btn" onClick={closeMenu}>✕</button>
            </div>

            <nav className="mobile-nav-links">
                <a href="/" onClick={closeMenu}>
                    <span className="link-number">01</span> Inicio
                </a>
                <a href="/houses" onClick={closeMenu}>
                    <span className="link-number">02</span> Propiedades
                </a>

                <a href="/company" onClick={closeMenu}>
                    <span className="link-number">03</span> Compañía
                </a>
  
                <a href="/contact" onClick={closeMenu}>
                    <span className="link-number">04</span> Contacto
                </a>

                <a href="/method" onClick={closeMenu}>
                    <span className="link-number">05</span> Método
                </a>
                
                {user && user.admin === true && (
                    <a href="/admin" onClick={closeMenu} className="mobile-dash-link">
                        <span className="link-number">06</span> Administrador
                    </a>
                )}
            </nav>

            <div className="mobile-extra-actions">
                <div className="action-label">Preferencia de sistema</div>
                
                <div className="mobile-selectors">
                    <div className="select-wrapper-mobile">
                    </div>
                    
                    <button className="theme-toggle-mobile" onClick={toggleThemeWithAnimation}>
                        <img src={theme === "dark" ? sun : moon} alt="theme-icon" width={20} />
                        <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
                    </button>
                </div>

                {user ? (
                    <button onClick={() => { handleLogout(); closeMenu(); }} className="corporate-auth-btn logout">
                        Finalizar Sesión
                    </button>
                ) : (
                    <button onClick={() => { openLogin(); closeMenu(); }} className="corporate-auth-btn login">
                        {texts[language].nav.login}
                    </button>
                )}
            </div>
        </div>
    );
});

export default NavBarCorporateMobile;