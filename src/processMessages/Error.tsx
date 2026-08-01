import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./error.css";
import { UseTheme } from "../contexts/ThemeContext";
import { UseSession } from "../contexts/SessionContext";

interface ErrorProps {
    errorMessage: string
}

const Error = ({ errorMessage }: ErrorProps) => {
    const { theme } = UseTheme()
    const { setError } = UseSession()
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setTimeout(() => {
            setError(null)
            navigate("/")
        }, 5000)
        return () => clearTimeout(timer)
    }, [navigate, setError])

    const handleGoHome = () => {
        setError(null)
        navigate("/")
    }

    return (
        <div className={`error-container ${theme}`}>
            <div className="error-content">

                <span className="error-eyebrow">Error del sistema</span>

                <h1 className="error-title">{errorMessage}</h1>

                <div className="error-divider" />

                <p className="error-text small">
                    Serás redirigido al inicio en 5 segundos
                </p>

                <div className="error-progress-wrap">
                    <div className="error-progress-bar" />
                </div>

                {/* Respaldo por si la redirección automática no dispara */}
                <button
                    type="button"
                    className="error-home-button"
                    onClick={handleGoHome}
                >
                    Volver al inicio
                </button>

            </div>
        </div>
    )
}

export default Error