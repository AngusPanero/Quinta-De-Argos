import { useEffect, useRef, useState } from "react";
import "./loginCorporate.css";
import { UseLanguage } from "../contexts/LanguageContext";
import { UseTheme } from "../contexts/ThemeContext";
import eyeClose from "/logos/eye-close.svg"
import eyeOpen from "/logos/eye-open.svg"
import { UseSession } from "../contexts/SessionContext";
import Loader from "../loader/Loader";

interface LoginProps {
  closeLogin: () => void
}

const LoginCorporate = ({ closeLogin }: LoginProps) => {
    const { language, texts } = UseLanguage()  
    const { theme } = UseTheme()
    const { handleLogin, loading, error } = UseSession()
    const loginRef = useRef<HTMLDivElement>(null);

    const [ exit, setExit ] = useState(false);
    const [ email, setEmail ] = useState("");
    const [ password, setPassword ] = useState("");
    const [ visiblePassword, setVisiblePassword ] = useState<boolean>(false)

    const handleClose = () => {
        setExit(true);
        setTimeout(() => {
            closeLogin(); 
        }, 500);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const response = await handleLogin(email, password); 
        if (response) {
            closeLogin();
        }
    }

    if (loading) return <Loader />

    return (
        <div className={`log-corp-overlay ${exit ? "log-corp-fade-out" : ""}`}>
            <div 
                ref={loginRef} 
                className={`log-corp-panel ${theme === 'light' ? 'light' : 'dark'} ${exit ? "log-corp-exit" : ""}`}
            >
                {/* ── HEADER ── */}
                <div className="log-corp-header">
                    <span className="log-corp-panel-title">Checking Auth Conection...</span>
                    <button className="log-corp-close-btn" onClick={handleClose}>✕</button>
                </div>

                {/* ── CONTENT ── */}
                <div className="log-corp-content">

                    {/* Badge de acceso restringido */}
                    <div className="log-corp-badge">
                        <span className="log-corp-badge-dot" />
                        ACCESO RESTRINGIDO
                    </div>

                    <h2 className="log-title">Panel Administrativo</h2>

                    <p className="log-corp-desc">
                        Este acceso está reservado exclusivamente para administradores 
                        habilitados de Boggero Propiedades. Las credenciales están 
                        cifradas y protegidas mediante autenticación segura.
                        Si no sos parte del equipo, por favor cerrá esta ventana.
                    </p>

                    <div className="log-corp-divider" />
                    
                    <form className="log-corp-form" onSubmit={loginSubmit}>
                        
                        {/* PASO 01: Email */}
                        <div className="log-corp-input-wrapper">
                            <span className="log-corp-number">01</span>
                            <div className="log-corp-group">
                                <label htmlFor="email">{texts[language].login.email}</label>
                                <input 
                                    id="email" 
                                    type="email" 
                                    placeholder="ejemplo@gmail.com.ar"
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        {/* PASO 02: Password */}
                        <div className="log-corp-input-wrapper">
                            <span className="log-corp-number">02</span>
                            <div className="log-corp-group">
                                <label htmlFor="password">{texts[language].login.password}</label>
                                <div className="log-corp-pass-field">
                                    <input 
                                        id="password" 
                                        type={visiblePassword ? "text" : "password"} 
                                        placeholder="••••••••"
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                    />
                                    <img 
                                        className="log-corp-eye" 
                                        src={visiblePassword ? eyeClose : eyeOpen} 
                                        alt="toggle" 
                                        onClick={() => setVisiblePassword(!visiblePassword)}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <p className="log-corp-error-msg">{error}</p>
                        )}

                        <button type="submit" className="log-corp-submit-btn">
                            {texts[language].login.button}
                        </button>

                    </form>

                    {/* Info de seguridad */}
                    <div className="log-corp-security-note">
                        <span className="log-corp-security-icon">🔒 </span>
                        <span className="log-corp-security">Conexión cifrada · Acceso auditado 🔒</span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LoginCorporate;