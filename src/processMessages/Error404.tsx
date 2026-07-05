import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./error404.css";
import { UseTheme } from "../contexts/ThemeContext";
import { UseSession } from "../contexts/SessionContext";

const Error404 = () => {
    const { theme } = UseTheme()
    const { setError } = UseSession()
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setTimeout(() => {
            setError(null)
            navigate("/")
        }, 5000)
        return () => clearTimeout(timer)
    }, [navigate])

    return (
        <div className={`error-container ${theme}`}>
            <div className="error-content error-content--404">

                <span className="error-eyebrow">BOGGERO PROPIEDADES</span>

                <p className="error-404-code">404</p>

                <h1 className="error-title">Página no encontrada</h1>

                <div className="error-divider" />

                <p className="error-text small">
                    Serás redirigido al inicio en 5 segundos
                </p>

                <div className="error-progress-wrap">
                    <div className="error-progress-bar" />
                </div>

            </div>
        </div>
    )
}

export default Error404