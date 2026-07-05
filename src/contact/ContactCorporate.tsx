import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import axios from "axios"
import "./contactCorporate.css"
import { UseTheme } from "../contexts/ThemeContext"
import Error from "../processMessages/Error"
import Loader from "../loader/Loader"
 
const ContactCorporate = () => {
    const { theme } = UseTheme()
    const navigate = useNavigate()
 
    const [formData, setFormData] = useState({
        name: "",
        lastName: "",
        phone: "",
        type: "Información",
        email: "",
        comment: "",
    })
 
    const [error, setError]     = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
 
    const handleSetValues = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }
 
    // ── Nodemailer ───────────────────────────────────────────
    const handleSubmitNodemailer = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/sendemail`, formData)
            if (res.status !== 200) console.error("Error al enviar el correo.")
        } catch (err: any) {
            setError(true)
            console.error(`Error al enviar el correo: ${err.message}`)
            throw err
        }
    }
 
    // ── DB ───────────────────────────────────────────────────
    const handleSubmit = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/contact`, formData)
            if (res.status === 201) navigate("/gracias")
        } catch (err: any) {
            setError(true)
            console.error(`Error al guardar los datos: ${err.message}`)
            throw err
        }
    }
 
    // ── Ambas ────────────────────────────────────────────────
    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(false)
        setLoading(true)
        try {
            await handleSubmitNodemailer()
            await handleSubmit()
        } catch (err: any) {
            setError(true)
            console.error(`Error al procesar el formulario: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }
 
    if (loading) return <Loader />
    if (error)   return <Error errorMessage="Error en el envío. Por favor, intentá nuevamente." />
 
    return (
        <main className={`contact-page ${theme}`}>
            <div className="contact-grid">
 
                {/* ── PANEL IZQUIERDO ── */}
                <motion.section
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="contact-info-panel"
                >
                    <span className="contact-badge">CONSULTA SIN COMPROMISO</span>
 
                    <h1 className="contact-title">
                        Tu próxima<br />
                        <span className="text-rose">propiedad,<br />empieza acá.</span>
                    </h1>
 
                    <p className="contact-subtitle">
                        Más de 10 años asesorando en compra, venta y alquiler de propiedades.
                        Completá el formulario y Elizabeth te responderá a la brevedad con
                        atención personalizada.
                    </p>
 
                    <div className="contact-details">
                        <div className="detail-item">
                            <small>OFICINA</small>
                            <p>Ramos Mejía Buenos Aires</p>
                        </div>
                        <div className="detail-item">
                            <small>EMAIL</small>
                            <p>boggeropropiedades@gmail.com</p>
                        </div>
                        <div className="detail-item">
                            <small>WHATSAPP</small>
                            <p>+54 9 11-2742-2947</p>
                        </div>
                    </div>
                </motion.section>
 
                {/* ── FORMULARIO ── */}
                <motion.section
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="contact-form-panel"
                >
                    <form className="contact-form-corp" onSubmit={handleSubmitForm}>
 
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Nombre</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={e => handleSetValues("name", e.target.value)}
                                    placeholder="Tu nombre"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Apellido</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={e => handleSetValues("lastName", e.target.value)}
                                    placeholder="Tu apellido"
                                    required
                                />
                            </div>
                        </div>
 
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phone">Teléfono</label>
                                <input
                                    type="text"
                                    id="phone"
                                    value={formData.phone}
                                    onChange={e => handleSetValues("phone", e.target.value)}
                                    placeholder="Ej: 11-0000-0000"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={e => handleSetValues("email", e.target.value)}
                                    placeholder="tuemail@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>
 
                        <div className="form-group full-width">
                            <label htmlFor="type">Tipo de Consulta</label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={e => handleSetValues("type", e.target.value)}
                                required
                            >
                                <option value="Información">Información general</option>
                                <option value="Alquiler">Alquiler</option>
                                <option value="Compra">Compra</option>
                                <option value="Venta">Venta</option>
                                <option value="Tasación">Tasación</option>
                            </select>
                        </div>
 
                        <div className="form-group full-width">
                            <label htmlFor="comment">Comentario</label>
                            <textarea
                                id="comment"
                                value={formData.comment}
                                onChange={e => handleSetValues("comment", e.target.value)}
                                placeholder="Contanos más sobre tu consulta..."
                                required
                            />
                        </div>
 
                        <div className="btn-container">
                            <button type="submit" className="corp-send-btn">
                                ENVIAR CONSULTA
                            </button>
                        </div>
 
                    </form>
                </motion.section>
 
            </div>
        </main>
    )
}
 
export default ContactCorporate