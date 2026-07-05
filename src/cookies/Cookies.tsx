import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./cookies.css"
import { UseTheme } from "../contexts/ThemeContext";

const Cookies = () => {
    const [ visible, setVisible ] = useState(false);
    const { theme } = UseTheme()

    useEffect(() => {
        const accepted = localStorage.getItem("cookiesAccepted");
        if (!accepted) {
            const timer = setTimeout(() => setVisible(true), 4000);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("cookiesAccepted", "true");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={`cookie-wrapper ${theme}`}>
            <div className="cookie-banner">
                <div className="cookie-content">
                    <span className="cookie-icon">🍪</span>
                    <p>
                        Usamos cookies para que tu experiencia en <strong>Deep Dev</strong> sea de otro nivel. 
                        {" "}<Link to="/policy">Ver más</Link>
                    </p>
                </div>
                <button className="cookie-btn" onClick={acceptCookies}>
                    <span>Aceptar</span>
                </button>
            </div>
        </div>
    );
};

export default Cookies;