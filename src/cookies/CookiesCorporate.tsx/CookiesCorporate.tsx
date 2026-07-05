import React, { useState, useEffect } from 'react';
import { UseTheme } from '../../contexts/ThemeContext';
import './cookiesCorporate.css';

const CookieBanner: React.FC = () => {
  const { theme } = UseTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    /* localStorage.clear() */
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={`cookie-wrapper ${theme}`}>
      <div className="cookie-banner">
        <div className="cookie-header">
          <span className="cookie-label">Privacidad de Datos</span>
          <div className="cookie-line"></div>
        </div>
        
        <div className="cookie-body">
          <p>
            Utilizamos tecnologías de seguimiento para optimizar su experiencia técnica en nuestra plataforma. 
            Al continuar, acepta nuestra <a href="/policy-cookies">Política de Privacidad</a>.
          </p>
          <button onClick={acceptCookies} className="cookie-btn">
            <span className="btn-text">ACEPTAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;