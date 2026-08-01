import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UseTheme } from '../contexts/ThemeContext';
import { UseSession } from '../contexts/SessionContext';
// TODO (Angus): confirmá el path real de tu modal de login/registro.
import LoginCorporate from './LoginCorporate';
import './navBarCorporate.css';

/**
 * NavBarCorporate
 * ---------------------------------------------------------
 * Componente único y autocontenido: solo maneja la navegación
 * (desktop + mobile). No conoce nada de HomeCorporate ni del
 * Footer — se monta por fuera, en el layout de la página:
 * <NavBarCorporate /> <HomeCorporate /> <Footer />
 */

const NAV_LINKS = [
  /* { label: 'Inicio', to: '/' }, */
  /* { label: 'La Finca', to: '/la-finca' }, */
  { label: 'Experiencias', to: '/experiences' },
  { label: 'Galería', to: '/gallery' },
  { label: 'Reservas', to: '/reservations' },
  { label: 'Contacto', to: '/contact' },
];

const NavBarCorporate: React.FC = () => {
  const { theme, handleTheme } = UseTheme();
  const { user, handleLogout } = UseSession();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Round-morph con view-transition, igual que en el resto de tus proyectos:
  // el círculo nace desde el punto exacto donde se hizo click.
  const toggleThemeWithAnimation = (e: React.MouseEvent<HTMLButtonElement>) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);

    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    if (!document.startViewTransition) {
      handleTheme(nextTheme);
      return;
    }

    document.startViewTransition(() => handleTheme(nextTheme));
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > -10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Bloquea el scroll del body mientras el menú mobile está abierto.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header
        className={[
          'nav-corporate',
          scrolled ? 'is-scrolled' : '',
          mobileOpen ? 'is-menu-open' : '',
          theme === 'dark' ? 'theme-dark' : 'theme-light',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <nav className="nav-corporate-bar">
          <NavLink to="/" className="nav-corporate-logo" onClick={closeMobile}>
            Quinta de Argos
          </NavLink>

          {/* ---------- Links desktop ---------- */}
          <ul className="nav-corporate-links">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `nav-corporate-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  {link.label}
                  <span className="nav-corporate-link-underline" />
                </NavLink>
              </li>
            ))}

            {user && user.admin === true && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `nav-corporate-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  Administrador
                  <span className="nav-corporate-link-underline" />
                </NavLink>
              </li>
            )}
          </ul>

          <button
            type="button"
            className="nav-corporate-theme-toggle"
            onClick={toggleThemeWithAnimation}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" className="nav-corporate-theme-icon">
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="nav-corporate-theme-icon">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
                />
              </svg>
            )}
          </button>

          {user ? (
            <button type="button" className="nav-corporate-cta" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          ) : (
            <button type="button" className="nav-corporate-cta" onClick={() => setLoginOpen(true)}>
              Administrador
            </button>
          )}

          {/* ---------- Botón hamburguesa (mobile, solo abre) ---------- */}
          <button
            type="button"
            className="nav-corporate-burger"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>

        {/* ---------- Overlay mobile ---------- */}
        <div className="nav-corporate-mobile-overlay" aria-hidden={!mobileOpen}>
          <button
            type="button"
            className="nav-corporate-mobile-close"
            aria-label="Cerrar menú"
            onClick={closeMobile}
          >
            <span />
            <span />
          </button>

          {/* El logo actúa como título del menú, alineado a la izquierda */}
          <NavLink to="/" className="nav-corporate-mobile-logo" onClick={closeMobile}>
            Quinta de Argos
          </NavLink>

          <ul className="nav-corporate-mobile-links">
            {NAV_LINKS.map((link, index) => (
              <li
                key={link.to}
                className="nav-corporate-mobile-item"
                style={{ transitionDelay: mobileOpen ? `${index * 60}ms` : '0ms' }}
              >
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `nav-corporate-mobile-link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}

            {user && user.admin === true && (
              <li
                className="nav-corporate-mobile-item"
                style={{ transitionDelay: mobileOpen ? `${NAV_LINKS.length * 60}ms` : '0ms' }}
              >
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `nav-corporate-mobile-link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  Administrador
                </NavLink>
              </li>
            )}
          </ul>

          <button
            type="button"
            className="nav-corporate-theme-toggle nav-corporate-theme-toggle--mobile"
            onClick={toggleThemeWithAnimation}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" className="nav-corporate-theme-icon">
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="nav-corporate-theme-icon">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
                />
              </svg>
            )}
            <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>

          {user ? (
            <button
              type="button"
              className="nav-corporate-mobile-link is-cta"
              onClick={() => {
                handleLogout();
                closeMobile();
              }}
            >
              Cerrar Sesión
            </button>
          ) : (
            <button
              type="button"
              className="nav-corporate-mobile-link is-cta"
              onClick={() => {
                setLoginOpen(true);
                closeMobile();
              }}
            >
              Administrador
            </button>
          )}
        </div>
      </header>

      {loginOpen && <LoginCorporate closeLogin={() => setLoginOpen(false)} />}
    </>
  );
};

export default NavBarCorporate;