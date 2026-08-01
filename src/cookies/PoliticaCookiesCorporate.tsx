import { UseTheme } from "../contexts/ThemeContext";
import "./politicaCookieCorporate.css";

const SECTIONS = [
  {
    title: "¿Qué son las cookies?",
    content: `Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo cuando los visitás. Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo, para que no tengas que volver a configurarlas cada vez que lo visitás.`,
  },
  {
    title: "Marco legal en España",
    content: `El uso de cookies en España está regulado principalmente por el artículo 22.2 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), que exige informar al usuario de forma clara y obtener su consentimiento antes de instalar cookies no esenciales. A esto se suma el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), que regulan el tratamiento de los datos personales que las cookies puedan recopilar. La Agencia Española de Protección de Datos (AEPD) es el organismo de control competente, y ha publicado una Guía sobre el uso de las cookies con criterios de aplicación práctica para los sitios web.`,
  },
  {
    title: "¿Qué cookies utilizamos?",
    content: null,
    list: [
      {
        name: "Cookies esenciales",
        desc: "Necesarias para el funcionamiento básico del sitio. Sin ellas, servicios como el inicio de sesión no estarían disponibles. Conforme al artículo 22.2 de la LSSI-CE, no requieren consentimiento previo.",
      },
      {
        name: "Cookies de rendimiento",
        desc: "Recopilan información anónima sobre cómo los usuarios navegan el sitio. Nos ayudan a identificar qué páginas son más visitadas y detectar errores de carga.",
      },
      {
        name: "Cookies de funcionalidad",
        desc: "Recuerdan tus preferencias como el tema visual (oscuro o claro). Mejoran tu experiencia sin compartir datos con terceros.",
      },
      {
        name: "Cookies de análisis",
        desc: "Utilizamos herramientas de analítica web con IP anonimizada para entender el comportamiento de los visitantes de forma agregada y mejorar nuestros servicios.",
      },
    ],
  },
  {
    title: "¿Cómo gestionarlas?",
    content: `Podés configurar tu navegador para que rechace todas las cookies o te avise cuando se envíe una. Ten en cuenta que al deshabilitar ciertas cookies algunas funciones del sitio pueden no estar disponibles. La mayoría de los navegadores modernos (Chrome, Firefox, Safari, Edge) ofrecen configuraciones granulares desde su menú de privacidad.`,
  },
  {
    title: "Consentimiento",
    content: `Al continuar navegando este sitio, o al hacer clic en "Aceptar" en nuestro aviso de cookies, aceptás el uso de cookies no esenciales conforme a la presente política y a lo exigido por el artículo 22.2 de la LSSI-CE. Podés retirar tu consentimiento en cualquier momento eliminando las cookies desde la configuración de tu navegador o volviendo a configurar tus preferencias.`,
  },
  {
    title: "Derechos del titular",
    content: `Como titular de los datos, tenés derecho a acceder, rectificar, suprimir, limitar el tratamiento, oponerte y solicitar la portabilidad de tu información personal, conforme a los artículos 15 a 22 del RGPD y a la LOPDGDD. Para ejercer estos derechos podés contactarnos a través de la sección Contacto de este sitio. Si considerás que no hemos atendido correctamente tu solicitud, tenés derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).`,
  },
  {
    title: "Cambios en esta política",
    content: `Nos reservamos el derecho de actualizar esta política en cualquier momento. Las modificaciones serán publicadas en esta página con la fecha de última actualización. Te recomendamos revisarla periódicamente.`,
  },
];

const PoliticaCookiesCorporate = () => {
  const { theme } = UseTheme();

  return (
    <section className={`pc-wrapper ${theme}`}>
      <div className="pc-container">

        {/* ── HEADER ── */}
        <div className="pc-header">
          <span className="pc-eyebrow">Política de Privacidad</span>
          <h1 className="pc-title">
            Política de<br />
            <span className="pc-title-accent">Cookies</span>
          </h1>
          <p className="pc-intro">
            En <strong>Quinta de Argos</strong> nos comprometemos a ser transparentes
            sobre cómo usamos la información que recopilamos cuando navegás nuestro sitio.
            Esta política explica qué son las cookies, cuáles utilizamos y cómo podés
            gestionarlas, en cumplimiento de la legislación española y europea vigente
            en materia de cookies y protección de datos.
          </p>
          <div className="pc-meta">
            <span>
              Última actualización:{" "}
              {new Date().toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="pc-meta-dot">·</span>
            <span>RGPD · LSSI-CE</span>
          </div>
        </div>

        {/* ── SECCIONES ── */}
        <div className="pc-body">
          {SECTIONS.map((sec, i) => (
            <div key={i} className="pc-section">
              <h2 className="pc-section-title">
                <span className="pc-section-bar" />
                {sec.title}
              </h2>

              {sec.content && (
                <p className="pc-section-text">{sec.content}</p>
              )}

              {sec.list && (
                <ul className="pc-list">
                  {sec.list.map((item, j) => (
                    <li key={j} className="pc-list-item">
                      <span className="pc-list-name">{item.name}</span>
                      <span className="pc-list-desc">{item.desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* ── CONTACTO ── */}
        <div className="pc-contact">
          <p>
            ¿Tenés dudas sobre esta política?{" "}
            <a href="/contacto" className="pc-contact-link">Contactanos</a>.
          </p>
        </div>

      </div>
    </section>
  );
};

export default PoliticaCookiesCorporate;