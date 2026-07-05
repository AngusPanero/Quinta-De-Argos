import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./processOk.css";
import { UseTheme } from "../contexts/ThemeContext";

interface ProcessProps {
    processMessage: string;
}

const ProcessOk = ({ processMessage }: ProcessProps) => {
    const { theme } = UseTheme()
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate("/")
        }, 5000)
        return () => clearTimeout(timer)
    }, [navigate])

    return (
        <div className={`process-container ${theme}`}>
            <div className="process-content">

                <span className="process-eyebrow">BOGGERO PROPIEDADES</span>

                <div className="process-icon">✓</div>

                <h1 className="process-title">{processMessage}</h1>

                <div className="process-divider" />

                <p className="process-text">
                    Serás redirigido al inicio en 5 segundos
                </p>

                <div className="process-progress-wrap">
                    <div className="process-progress-bar" />
                </div>

            </div>
        </div>
    )
}

export default ProcessOk