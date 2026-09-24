import "./footer.css";
import { UseTheme } from "../contexts/ThemeContext";

/**
 * Footer
 * ---------------------------------------------------------
 * Componente único y autocontenido: solo maneja el footer.
 * Misma lógica funcional que el footer de Boggero Propiedades
 * (UseTheme, grid de secciones, mapa embebido, bottom bar),
 * rediseñada con el sistema visual de Quinta de Argos.
 */

const Footer = () => {
    const { theme } = UseTheme();

    return (
        <footer className={`footer-corporate ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
            <div className="footer-corporate-grid">

                {/* BRAND */}
                <div className="footer-corporate-brand">
                    <h2 className="footer-corporate-logo">Quinta de Argos</h2>
                    <p className="footer-corporate-tagline">CEHEGÍN · REGIÓN DE MURCIA</p>
                    <p className="footer-corporate-description">
                        Una casa de campo de arquitectura nórdica, en la comarca del
                        Noroeste de la Región de Murcia. Un refugio pensado para muy
                        pocos huéspedes por vez.
                    </p>
                    <span className="footer-corporate-horizon" />
                </div>

                {/* NAVEGACIÓN */}
                <div className="footer-corporate-section">
                    <h4 className="footer-corporate-title">Navegación</h4>
                    <ul className="footer-corporate-list">
                        <li><a href="/">Inicio</a></li>
                        {/* <li><a href="/la-finca">La Finca</a></li> */}
                        <li><a href="/experiences">Experiencias</a></li>
                        <li><a href="/gallery">Galería</a></li>
                        <li><a href="/reservations">Reservas</a></li>
                        <li><a href="/contact">Contacto</a></li>
                    </ul>
                </div>

                {/* EL ENTORNO */}
                <div className="footer-corporate-section">
                    <h4 className="footer-corporate-title">El Entorno</h4>
                    <ul className="footer-corporate-list">
                        <li>Comarca del Noroeste de Murcia</li>
                        <li>Municipio de Cehegín</li>
                        <li>A 7 km de Caravaca de la Cruz</li>
                        <li>Ciudad Santa · Basílica de la Vera Cruz</li>
                    </ul>
                </div>

                {/* CONTACTO */}
                <div className="footer-corporate-section">
                    <h4 className="footer-corporate-title">Comunicación Directa</h4>
                    <ul className="footer-corporate-list">
                        <li>
                            {/* TODO (Angus): reemplazar por el email real */}
                            <a href="mailto:quintadeargos@gmail.com" className="footer-corporate-link-highlight">
                                quintadeargos@gmail.com
                            </a>
                        </li>
                        <li style={{ marginTop: "15px" }} className="footer-corporate-location">
                            <strong>UBICACIÓN</strong><br />
                            Cehegín, Región de Murcia<br />
                            España
                        </li>
                        <li className="footer-corporate-location">
                            {/* TODO (Angus): reemplazar por el WhatsApp real */}
                            <strong>WHATSAPP:</strong> +34 633 49 18 25
                        </li>
                    </ul>
                </div>
            </div>

            {/* MAPA */}
            <div className="footer-corporate-map-container">
                <iframe
                    src="https://www.google.com/maps?q=Cehegín,+Región+de+Murcia,+España&output=embed"
                    className="footer-corporate-iframe"
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>

            <div className="footer-corporate-bottom">
                <span>
                    © {new Date().getFullYear()} Quinta de Argos · Cehegín, Región de Murcia
                    {" · "}Desarrollado por{" "}
                    <a
                        href="https://www.deepdev.com.ar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-corporate-dev-link"
                        >
                        DeepDev Studio
                    </a>
                </span>
                <div className="footer-corporate-legal">
                    <a href="/policy">Política de Cookies</a>
                    {/* <a href="/terminos">Términos y Condiciones</a> */}
                </div>
            </div>
        </footer>
    );
};

export default Footer;