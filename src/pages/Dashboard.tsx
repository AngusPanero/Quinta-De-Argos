/* import { useEffect } from "react"; */
import { UseSession } from "../contexts/SessionContext";
import { UseTheme } from "../contexts/ThemeContext";
import "./dashboard.css"

const Dashboard = () => {
    const { user, /* loading  */} = UseSession()
    /* const { purchased, getPurchased } = UseShopping() */
    const { theme } = UseTheme(); 

/*     useEffect(() => {
        if (user && user.email) {
            getPurchased(user.email);
        }
    }, [user?.email, user]) */

    return(
        <div className={`dd-dashboard ${theme}`}>
            <div className="dd-grid-overlay"></div> {/* Efecto de malla de fondo */}
            
            <section className="dd-content">
                <header className="dd-header">
                    <div className="dd-user-badge">SYSTEM_USER: {user?.email?.split('@')[0].toUpperCase()}</div>
                    <h1 className="dd-title">DASHBOARD_<span>PRIVADO:</span></h1>
                </header>
            </section>
        </div>
    )
}

export default Dashboard;