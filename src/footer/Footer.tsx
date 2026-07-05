import "./footer.css";
import { UseTheme } from "../contexts/ThemeContext";
 
const Footer = () => {
    const { theme } = UseTheme();
 
    return (
        <footer className={`footer ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
            <div className="footer-grid">
 
                {/* BRAND */}
                <div className="footer-brand">
                    <h2 className="footer-logo">Boggero Propiedades</h2>
                    <p className="footer-tagline">EST. 2014 · MÁS DE 10 AÑOS DE TRAYECTORIA</p>
                    <p className="footer-description">
                        Asesoramiento inmobiliario profesional, claro y personalizado.
                        Compra, venta y alquiler de propiedades con el respaldo de
                        Elizabeth Boggero, Martillera y Corredora Pública Mat. 1049.
                    </p>
                </div>
 
                {/* NAVEGACIÓN */}
                <div className="footer-section">
                    <h4 className="footer-title">Navegación</h4>
                    <ul className="footer-list">
                        <li><a href="/">Inicio</a></li>
                        <li><a href="/nosotros">Nosotros</a></li>
                        <li><a href="/propiedades">Propiedades</a></li>
                        <li><a href="/servicios">Servicios</a></li>
                        <li><a href="/contacto">Contacto</a></li>
                    </ul>
                </div>
 
                {/* SERVICIOS */}
                <div className="footer-section">
                    <h4 className="footer-title">Servicios</h4>
                    <ul className="footer-list">
                        <li>Compra y Venta</li>
                        <li>Alquileres</li>
                        <li>Tasaciones</li>
                        <li>Asesoramiento Legal</li>
                        <li>Gestión de Contratos</li>
                    </ul>
                </div>
 
                {/* CONTACTO */}
                <div className="footer-section">
                    <h4 className="footer-title">Comunicación Directa</h4>
                    <ul className="footer-list">
                        <li>
                            <a href="mailto:[email]" className="footer-link-highlight">
                                boggeropropiedades@gmail.com
                            </a>
                        </li>
                        <li style={{ marginTop: "15px" }} className="footer-location">
                            <strong>OFICINA</strong><br />
                            Ramos Mejía - Centro<br />
                            Buenos Aires, Argentina
                        </li>
                        <li className="footer-location">
                            <strong>WHATSAPP:</strong> +54 9 11-2742-2947
                        </li>
                    </ul>
                </div>
            </div>
 
            {/* MAPA */}
            <div className="footer-map-container">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26256.26964046805!2d-58.57874894532144!3d-34.65385171533168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc7d93bab75a3%3A0xaafe140bc9dea3db!2sB1704%20Ramos%20Mej%C3%ADa%2C%20Provincia%20de%20Buenos%20Aires!5e0!3m2!1ses-419!2sar!4v1776796816294!5m2!1ses-419!2sar"
                    className="footer-iframe"
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
 
            <div className="footer-bottom">
                <span>
                    © {new Date().getFullYear()} Boggero Propiedades · Elizabeth Boggero Mat. 1049
                    {" · "}Desarrollado por{" "}
                    <a
                        href="https://www.deepdev.com.ar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-dev-link"
                        >
                        DeepDev Studios
                    </a>
                </span>
                <div className="footer-legal">
                    <a href="/privacidad">Política de Privacidad</a>
                    <a href="/terminos">Términos y Condiciones</a>
                </div>
            </div>
        </footer>
    );
};
 
export default Footer;

