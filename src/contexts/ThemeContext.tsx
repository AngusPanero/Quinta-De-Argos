import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface ThemeContextType {
    handleTheme: (e: any) => void;
    theme: string
}

const ThemeContext = createContext<ThemeContextType | null>(null)

interface ProviderProps {
  children: ReactNode;
}

// Mismo mapeo de colores que usa main.tsx para pintar la franja
// superior de Safari/Chrome mobile (theme-color). Se repite acá
// porque este efecto corre en cada cambio de theme, no solo al
// bootear la app.
const THEME_COLOR_MAP: Record<string, string> = {
  dark: '#1c2519',
  light: '#f2ede1',
};

function applyThemeColorMeta(theme: string) {
  const color = THEME_COLOR_MAP[theme] ?? THEME_COLOR_MAP.dark;

  // Safari (iOS) a veces no repinta la franja superior si solo mutamos
  // el content de un <meta> que ya existía en el DOM. Sacándolo y
  // creando uno nuevo en el frame siguiente le da más chances de
  // que lo tome. No está 100% garantizado (es una limitación real
  // de WebKit), pero es la técnica que mejor resultado da.
  const existing = document.querySelector('meta[name="theme-color"]');
  if (existing) existing.remove();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', color);
      document.head.appendChild(meta);
    });
  });
}

export const ThemeProvider = ({ children }: ProviderProps) => {
    const [ theme, setTheme ] = useState(localStorage.getItem("theme") || "dark")
    
    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Reacciona a cada cambio de theme (el toggle del nav incluido)
    // y repinta la franja superior de Safari/Chrome mobile en vivo.
    useEffect(() => {
        applyThemeColorMeta(theme);
    }, [theme]);

    const handleTheme = (e: any) => {
        setTheme(e)
        localStorage.setItem("theme", theme)
        console.log("Theme: ", theme);
        
    }

    return(
        <ThemeContext.Provider value={{ theme, handleTheme }}>
            { children }
        </ThemeContext.Provider>
    )
}

export const UseTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme debe ser usado dentro de un ThemeProvider");
  }
  return context; 
};