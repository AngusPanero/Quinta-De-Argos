import React, { useEffect } from 'react';
import './politicasPrivacidad.css';
import { UseTheme } from '../contexts/ThemeContext';
import { FECHA_ACTUALIZACION, VERSION, esPendiente } from './legalInfo';

export interface LegalSection {
  id: string;
  titulo: string;
  contenido: React.ReactNode;
}

interface LegalPageProps {
  eyebrow: string;
  titulo: string;
  intro: React.ReactNode;
  secciones: LegalSection[];
}

/** Muestra un dato de legalInfo.ts; si sigue PENDIENTE, lo resalta para que no se publique así. */
export const Dato: React.FC<{ valor: string }> = ({ valor }) =>
  esPendiente(valor) ? <mark className="legal-pending">[{valor}]</mark> : <>{valor}</>;

const LegalPage: React.FC<LegalPageProps> = ({ eyebrow, titulo, intro, secciones }) => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  useEffect(() => {
    // Si se entra con un ancla (#cancelacion), respetamos ese punto; si no, arriba del todo.
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  return (
    <div className={`legal ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <header className="legal-hero">
        <span className="legal-eyebrow">{eyebrow}</span>
        <h1 className="legal-heading">{titulo}</h1>
        <div className="legal-intro">{intro}</div>
        <p className="legal-meta">
          Última actualización: {FECHA_ACTUALIZACION} · Versión {VERSION}
        </p>
      </header>

      <div className="legal-layout">
        <nav className="legal-toc" aria-label="Índice">
          <span className="legal-toc-title">Índice</span>
          <ol className="legal-toc-list">
            {secciones.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="legal-toc-link">
                  <span className="legal-toc-number">{String(i + 1).padStart(2, '0')}</span>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="legal-content">
          {secciones.map((s, i) => (
            <section key={s.id} id={s.id} className="legal-section" aria-labelledby={`${s.id}-titulo`}>
              <h2 id={`${s.id}-titulo`} className="legal-section-title">
                <span className="legal-section-number">{String(i + 1).padStart(2, '0')}</span>
                {s.titulo}
              </h2>
              {s.contenido}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
};

export default LegalPage;