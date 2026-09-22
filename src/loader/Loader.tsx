import React from 'react';
import { createPortal } from 'react-dom';
import './loader.css';
import { UseTheme } from '../contexts/ThemeContext';

interface LoaderProps {
  /** Texto debajo del spinner. */
  message?: string;
  /** Si es false, se muestra inline en vez de pantalla completa. */
  fullScreen?: boolean;
}

/**
 * Loader
 * ---------------------------------------------------------
 * Cuando fullScreen=true (default), se renderiza vía createPortal
 * directo en document.body. Esto es a propósito: si el Loader se
 * llama desde dentro de un contenedor que tenga `transform`,
 * `filter` o `will-change` en algún ancestro (una animación de
 * Framer Motion, un modal, etc.), ese ancestro se convierte en el
 * "containing block" de cualquier hijo con position:fixed — y el
 * loader queda atrapado dentro de esa caja en vez de cubrir toda
 * la pantalla. El portal lo saca de ese árbol por completo y lo
 * cuelga directo del <body>, así siempre es 100vw x 100vh de
 * verdad, sin importar desde dónde se lo llame.
 */
const Loader: React.FC<LoaderProps> = ({ message = 'Cargando', fullScreen = true }) => {
  const themeContext = UseTheme() as { theme?: 'light' | 'dark' } | undefined;
  const theme = themeContext?.theme ?? 'light';

  const content = (
    <div
      className={[
        'qa-loader',
        fullScreen ? 'qa-loader--fullscreen' : 'qa-loader--inline',
        theme === 'dark' ? 'dark' : 'light',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="qa-loader-spinner" />

      {message && (
        <span className="qa-loader-message">
          {message}
          <span className="qa-loader-dot">.</span>
          <span className="qa-loader-dot">.</span>
          <span className="qa-loader-dot">.</span>
        </span>
      )}

      {/* <span className="qa-loader-horizon" /> */}
    </div>
  );

  if (!fullScreen) return content;

  return createPortal(content, document.body);
};

export default Loader;