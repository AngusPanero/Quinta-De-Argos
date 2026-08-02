import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SessionProvider } from "../contexts/SessionContext";
import Footer from "../footer/Footer";
import NavBarCorporate from "../navbar/NavBarCorporate";
import PoliticaCookiesCorporate from "../cookies/PoliticaCookiesCorporate";
import ContactCorporate from "../contact/ContactCorporate";
import HomeCorporate from "../home/HomeCorporate";
import Error from "../processMessages/Error";
import PrivateRoute from "./PrivateRoute";
import AdminDashboard from "../pages/AdminDashboard";
import Error404 from "../processMessages/Error404";
import ProcessOk from "../processMessages/ProcessOk";
import Checkout from "../checkout/Checkout";
import Reservations from "../reservas/Reservations";
import Gallery from "../galeria/Gallery";
import Experiences from "../experiencias/Experiences";
import Cookies from "../cookies/Cookies";
import Loader from "../loader/Loader";

const AppRouter = () => {
    return (
        <Router>
            <SessionProvider>
                <Cookies />
                <NavBarCorporate />
                <Routes>
                    <Route path="/" element={<HomeCorporate />} />
                    <Route path="/experiences" element={<Experiences />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/contact" element={<ContactCorporate />} />
                    <Route path="/reservations" element={<Reservations />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/policy" element={<PoliticaCookiesCorporate />} />
                    <Route path="/*" element={<Error404 />} />
                    <Route path="/loader" element={<Loader />} />
                    <Route path="/error" element={<Error errorMessage="Error 404: Página no encontrada" />} />
                    <Route path="/ok" element={<ProcessOk processMessage="Proceso completado con éxito" />} />
                    {/* Tiene Acceso solo el admin con la prop pasada */}
                    <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
                    {/* <Route path="/admin" element={<AdminDashboard />} /> */}
                </Routes>
                <Footer />
            </SessionProvider>
        </Router>
    );  
}

export default AppRouter;   

