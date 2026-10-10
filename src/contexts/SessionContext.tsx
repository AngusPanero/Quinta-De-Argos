import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { auth } from "../firebase/firebase.ts"
import { sendPasswordResetEmail } from "firebase/auth";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SessionContext = createContext<SessionContextType | null>(null);

interface ProviderProps {
  children: ReactNode;
}

interface SessionContextType {
    handleRegister: (email: string, password: string, loginOpen: any, registerOpen: any) => Promise<void>;
    handleLogin: (email: string, password: string) => Promise<boolean | undefined>;
    handleLogout: () => Promise<void>;
    handleResetPassword: (email: string) => Promise<void>;
    error: string | boolean | null | number;
    setError: React.Dispatch<React.SetStateAction<string | boolean | null | number>>;
    loading: string | boolean | null | number;
    setLoading: React.Dispatch<React.SetStateAction<string | boolean | null | number>>;
    user: any;
    isAdmin: boolean | null;
    setUser: React.Dispatch<React.SetStateAction<any>>;
    handleUnbanUser: (uid: any) => Promise<void>
    handleBanUser: (email: any) => Promise<void>
    verifyIsAdmin: () => void
    // true si la comprobación de sesión tarda (servidor de Render despertando)
    slowServer: boolean
}

// Render (plan gratuito) duerme el servidor tras 15 min sin uso y tarda hasta ~50 s en despertar.
const CHECK_AUTH_TIMEOUT_MS = 60_000; // nunca más de 1 minuto "pensando"
const SLOW_SERVER_MS = 4_000;         // a partir de aquí se puede avisar al usuario

export const SessionProvider = ({ children }: ProviderProps) => {
    const navigate = useNavigate()
    const timeRef = useRef<any>(null);

    const [ error, setError ] = useState<string | boolean | null | number>(false)
    const [ loading, setLoading ] = useState<string | boolean | null | number>(false)
    const [ user, setUser ] = useState<unknown>(null)
    const [ isAdmin, setIsAdmin ] = useState<boolean | null>(null)
    const [ slowServer, setSlowServer ] = useState(false)
    // Sube con cada login/logout: así una comprobación de sesión que llega tarde no pisa el estado nuevo
    const sessionVersion = useRef(0)

    // Auto Logout
    useEffect(() => {
        if (!user) return;

        const timeout = 15 * 60 * 1000; // 15 minutos

        const resetTimer = () => {
            if (timeRef.current) clearTimeout(timeRef.current);
            timeRef.current = setTimeout(async () => {
                handleLogout()
                setUser(null);
                navigate("/");
            }, timeout);
        };
        resetTimer();

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
        events.forEach((event) => window.addEventListener(event, resetTimer));

        return () => {
            events.forEach((event) => window.removeEventListener(event, resetTimer));
            if (timeRef.current) clearTimeout(timeRef.current);
        };
    }, [user, navigate]);

    // Register
    const handleRegister = async (email: string, password: string, loginOpen: React.Dispatch<React.SetStateAction<boolean>>, registerOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
        try {
            setError(null)
            setLoading(true)
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/register`, { email, password })
            if(response.status === 201){
                /* console.log(`User created successfully! 🟢`); */
                
                registerOpen(false)
                loginOpen(true)
            }
        } catch (error: any) {
            if(error.response?.status === 409){
                setError(true)
                return
            }
            setError(true)
            /* console.error("Internal error creating user! 🔴", error) */
        } finally {
            setLoading(false)
        }
    }

    // Login
    const handleLogin = async (email: string, password: string) => {
    try {
        sessionVersion.current += 1; // desde aquí manda el login, no la comprobación inicial
        setLoading(true);
        setError(null);

        // 1. Llamada única al backend
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, { email, password }, { withCredentials: true });

        if (response.status === 200) {
            const { user, isAdmin } = response.data;

            setUser(user);
            setLoading(false);

            if (isAdmin) {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }
            return true;
        }

    } catch (error: any) {
        const serverCode = error.response?.data?.code;

        // 4. Respetar tu lógica de intentos fallidos
        if (serverCode === "auth/invalid-credential" || error.response?.status === 401) {
            try {
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/login-failed`, { email });
                
                if (data.banned) {
                    setError("Tu cuenta fue bloqueada por demasiados intentos fallidos.");
                } else if (data.attempts < 5) {
                    setError(`Credenciales inválidas. Te quedan ${5 - data.attempts} intento(s).`);
                } else {
                    setError("Credenciales inválidas.");
                }
            } catch (error) {
                setError("Credenciales inválidas.");
                console.error("Login error:", error);
            }
            return;
        }

        if (serverCode === "auth/user-not-found" || error.response?.status === 404) {
                setError("No existe ninguna cuenta registrada con ese email.");
                return;
            }
        if (serverCode === "auth/user-banned") {
            setError("Usuario baneado. Contactate con Boggero Propiedades.");
            return;
        }

        console.error("Login error:", error);
        setError("Error al iniciar sesión. Intentá más tarde.");
    } finally {
        setLoading(false);
    }
};
    // Logout
    const handleLogout = async () => {
        try {
            sessionVersion.current += 1;
            setError(false)
            setLoading(true);
            const idToken = await auth.currentUser?.getIdToken();

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/logout`, { idToken }, { withCredentials: true });

            if (response.status === 200) {
                await auth.signOut()
                setUser(null)
                navigate("/");
            }
        } catch (error: any) {
            setError("Error al cerrar sesión."); // Error al cerrar
            console.error("Error logging out session 🔴", error);
        } finally {
            setLoading(false)
        }
    }

    // Reset Password
    const handleResetPassword = async (email: string) => {
        try {
            if(!email){
                alert("Por favor, ingresa tu email para restablecer la contraseña."); // Ingresá mail
                return;
            } else {
                await sendPasswordResetEmail(auth, email);
                alert("Email de restablecimiento enviado."); // Mail enviado
            }
            
        } catch (error: any) {
            console.error("Error al enviar el email:", error.code);

            switch (error.code) {
                case "auth/user-not-found":
                    alert("No existe cuenta vinculada a este correo."); // No Existe usuario
                    break;
                case "auth/invalid-email":
                    alert("Formato de email inválido."); // Formato mail invalido
                    break;
                case "auth/too-many-requests":
                    alert("Demasiados intentos. Intentá más tarde."); // Demasiados Intentos
                    break;
                default:
                    alert("Default Error.");
            }
        }
    }

    const handleBanUser = async (email: string) => {
        const confirmUnban = confirm("¿Estás seguro de que quieres bannear este usuario?");
            if(confirmUnban){
                try {
                setError(false)
                setLoading(true)

                const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/ban-user`, { email }, { withCredentials: true })
                if(response.status === 200){
                    navigate("/admin")
                }
            } catch (error: any) {
                setError(true)
                console.error("Error al bannear usuario! 🔴", error)
            } finally{
                setLoading(false)
            }
        }
    }

     const handleUnbanUser = async (uid: any) => {
        const confirmUnban = confirm("¿Estás seguro de que quieres desbannear este usuario?");
        if(confirmUnban){
            try {
            setError(false)
            setLoading(true)

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/unban-user`, { uid }, { withCredentials: true })
            if(response.status === 200){
                navigate("/admin")
            }
        } catch (error: any) {
            setError(true)
            console.error("Error al desbannear usuario! 🔴", error)
        } finally{
            setLoading(false)
        }
        }
    }

    // Para el renderizado del ul li del nav
    const verifyIsAdmin = async () => {
        const customClaims = await auth.currentUser?.getIdTokenResult();
        {/* Doble negación forza a undefined y null a ser falsos, para solo trabajar con booleanos */}
        const isAdmin = !!customClaims?.claims.admin; // Esto es TRUE como si no tuviera los signos de exclamación

        if(isAdmin){
            setIsAdmin(true)
        } else {
            setIsAdmin(false)
        }
    }

   // Refresh
    // Comprueba la cookie al abrir la web y al volver a una pestaña restaurada.
    // - Tiene tiempo máximo: si el servidor no contesta, el loading NO se queda pensando para siempre.
    // - Si mientras tanto el usuario inicia o cierra sesión, la respuesta vieja se descarta
    //   (antes podía llegar tarde y borrar la sesión recién iniciada).
    useEffect(() => {
        let controller: AbortController | null = null;

        const checkSession = async () => {
            controller?.abort();
            controller = new AbortController();
            const version = sessionVersion.current;
            const slowTimer = setTimeout(() => setSlowServer(true), SLOW_SERVER_MS);

            try {
                setLoading(true);

                // Llamamos a nuestro backend para ver si la cookie es válida
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/check-auth`, {
                    withCredentials: true,
                    timeout: CHECK_AUTH_TIMEOUT_MS,
                    signal: controller.signal,
                });

                if (version !== sessionVersion.current) return; // ya hubo login/logout: no pisamos nada
                setUser(data.authenticated ? data.user : null);
            } catch (error) {
                if (axios.isCancel(error)) return;
                if (version !== sessionVersion.current) return;
                setUser(null);
                console.error("Error checking session on refresh 🔴", error);
            } finally {
                clearTimeout(slowTimer);
                setSlowServer(false);
                if (version === sessionVersion.current) setLoading(false);
            }
        };

        checkSession();

        // Safari/Chrome pueden "congelar" la pestaña y restaurarla tal cual (con una
        // petición a medias). En ese caso volvemos a comprobar la sesión.
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) checkSession();
        };
        window.addEventListener("pageshow", onPageShow);

        return () => {
            window.removeEventListener("pageshow", onPageShow);
            controller?.abort();
        };
    }, []);

    return(
        <SessionContext.Provider value={{ handleRegister , handleLogin, handleLogout, handleResetPassword, error, setError, loading, setLoading, user, setUser, handleUnbanUser, verifyIsAdmin, isAdmin, handleBanUser, slowServer }}>
            { children }
        </SessionContext.Provider>
    )
}

export const UseSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession debe ser usado dentro de un SessionProvider");
  }
  return context; 
};