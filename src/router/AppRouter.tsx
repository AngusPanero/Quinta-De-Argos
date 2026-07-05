import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SessionProvider } from "../contexts/SessionContext";
import Footer from "../footer/Footer";
import NavBarCorporate from "../navbar/NavBarCorporate";
import PoliticaCookiesCorporate from "../cookies/PoliticaCookiesCorporate";
import CompanyInfoCorporate from "../company/CompanyInfoCorporate";
import ContactCorporate from "../contact/ContactCorporate";
import HomeCorporate from "../home/HomeCorporate";
import SpinnerCorporate from "../spinner/corporate/SpinerCorporate";
import CookiesCorporate from "../cookies/CookiesCorporate.tsx/CookiesCorporate";
import Error from "../processMessages/Error";
import PrivateRoute from "./PrivateRoute";
import AdminDashboard from "../pages/AdminDashboard";
import MethodCorporate from "../pages/MethodCorporate";
import HousesView from "../pages/HousesView";
import HouseIndividual from "../pages/HouseIndividual";
import Error404 from "../processMessages/Error404";
import ProcessOk from "../processMessages/ProcessOk";

const AppRouter = () => {
    return (
        <Router>
            <SessionProvider>
                <CookiesCorporate />
                <NavBarCorporate />
                <Routes>
                    <Route path="/" element={<HomeCorporate />} />
                    <Route path="/houses" element={<HousesView />} />
                    <Route path="/houses/:id" element={<HouseIndividual />} />
                    <Route path="/company" element={<CompanyInfoCorporate />} />
                    <Route path="/contact" element={<ContactCorporate />} />
                    <Route path="/method" element={<MethodCorporate />} />
                    <Route path="/policy-cookies" element={<PoliticaCookiesCorporate />} />
                    <Route path="/*" element={<Error404 />} />
                    <Route path="/loader" element={<SpinnerCorporate />} />
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

