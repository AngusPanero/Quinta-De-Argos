import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import { UseTheme } from "../contexts/ThemeContext"
import "./houseIndividual.css"
 
interface House {
    _id: string
    title: string
    direction: string
    operation: string
    ubication: string
    price: string
    typeOfHouse: string
    description: string
    condition: string
    ambients: string
    bathrooms: string
    years: string
    taxes: string
    covered: string
    uncovered: string
    area: string
    imageUrl: string[]
    maps: string
    createdAt: string
    amenities?: string[] | string
}
 
const operationColor: Record<string, string> = {
    "Venta":    "hi-tag--venta",
    "Alquiler": "hi-tag--alquiler",
    "Temporal": "hi-tag--temporal",
}
 
const HouseIndividual = () => {
    const { id } = useParams<{ id: string }>()
    const { theme } = UseTheme()
    const navigate = useNavigate()
 
    const [house, setHouse]       = useState<House | null>(null)
    const [loading, setLoading]   = useState(false)
    const [error, setError]       = useState(false)
    const [activeImg, setActiveImg] = useState(0)
    const [lightbox, setLightbox] = useState(false)
 
    const getHouse = async () => {
        try {
            setError(false)
            setLoading(true)
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/house/${id}`)
            setHouse(response.data)
        } catch (err: any) {
            setError(true)
            console.error("Error al traer propiedad", err)
        } finally {
            setLoading(false)
        }
    }
 
    useEffect(() => {
        getHouse()
        window.scrollTo(0, 0)
    }, [id])
 
    const nextImg = () => {
        if (!house) return
        setActiveImg(i => (i + 1) % house.imageUrl.length)
    }
 
    const prevImg = () => {
        if (!house) return
        setActiveImg(i => (i - 1 + house.imageUrl.length) % house.imageUrl.length)
    }
 
    // Whatsapp — reemplazá con el número real
    const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP
    const whatsappMsg = house
        ? encodeURIComponent(`Hola Elizabeth, me interesa la propiedad: *${house.title}* (${house.direction}). ¿Podemos hablar?`)
        : ""
    const whatsappUrl = `${WHATSAPP_NUMBER}?text=${whatsappMsg}`
 
    /* ── ESTADOS ── */
    if (loading) return (
        <div className={`hi-root ${theme}`}>
            <div className="hi-state-wrap">
                <div className="hi-spinner" />
                <p className="hi-state-text">Cargando propiedad...</p>
            </div>
        </div>
    )
 
    if (error || !house) return (
        <div className={`hi-root ${theme}`}>
            <div className="hi-state-wrap">
                <p className="hi-state-text hi-state-error">No pudimos encontrar esta propiedad.</p>
                <button className="hi-back-btn" onClick={() => navigate("/houses")}>
                    ← Volver al listado
                </button>
            </div>
        </div>
    )
 
    return (
        <div className={`hi-root ${theme}`}>
 
            {/* ── BACK ── */}
            <motion.button
                className="hi-back"
                onClick={() => navigate("/houses")}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                ← VOLVER AL LISTADO
            </motion.button>
 
            {/* ══════════════════════════════════════════════
                GALERÍA PRINCIPAL
            ══════════════════════════════════════════════ */}
            <section className="hi-gallery">
 
                {/* Imagen principal */}
                <div className="hi-gallery-main" onClick={() => setLightbox(true)}>
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={activeImg}
                            src={house.imageUrl[activeImg]}
                            alt={house.title}
                            className="hi-gallery-main-img"
                            initial={{ opacity: 0, scale: 1.03 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                        />
                    </AnimatePresence>
                    <div className="hi-gallery-overlay" />
 
                    {/* Tags sobre imagen */}
                    <span className={`hi-tag ${operationColor[house.operation] ?? "hi-tag--venta"}`}>
                        {house.operation}
                    </span>
                    <span className="hi-tag-type">{house.typeOfHouse}</span>
 
                    {/* Flechas */}
                    {house.imageUrl.length > 1 && (
                        <>
                            <button className="hi-nav hi-nav--prev" onClick={e => { e.stopPropagation(); prevImg() }}>‹</button>
                            <button className="hi-nav hi-nav--next" onClick={e => { e.stopPropagation(); nextImg() }}>›</button>
                        </>
                    )}
 
                    <span className="hi-gallery-hint">🔍 Click para ampliar</span>
                </div>
 
                {/* Thumbnails */}
                {house.imageUrl.length > 1 && (
                    <div className="hi-thumbnails">
                        {house.imageUrl.map((url, i) => (
                            <button
                                key={i}
                                className={`hi-thumb ${i === activeImg ? "is-active" : ""}`}
                                onClick={() => setActiveImg(i)}
                            >
                                <img src={url} alt={`foto ${i + 1}`} />
                            </button>
                        ))}
                    </div>
                )}
            </section>
 
            {/* ══════════════════════════════════════════════
                CONTENIDO PRINCIPAL
            ══════════════════════════════════════════════ */}
            <div className="hi-content">
 
                {/* ── COLUMNA IZQUIERDA ── */}
                <main className="hi-main">
 
                    {/* Precio y título */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                    >
                        <div className="hi-price-row">
                            <span className="hi-price">{house.operation === "Venta" ? "U$S " : "$ "}{Number(house.price.replace(/[^0-9]/g, "")).toLocaleString("es-AR")}</span>
                            <span className="hi-condition">{house.condition}</span>
                        </div>
 
                        <h1 className="hi-title">{house.title}</h1>
 
                        <p className="hi-direction">
                            <span>📍</span> {house.direction} · {house.ubication}
                        </p>
                    </motion.div>
 
                    <div className="hi-divider" />
 
                    {/* Amenities */}
                    {house.amenities && house.amenities.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.25 }}
                        >
                            <h2 className="hi-section-label">AMENITIES</h2>
                            <div className="hi-amenities">
                                {Array.isArray(house.amenities) ? (
                                    house.amenities.map((a: string | string[], i: number | string) => (
                                        <span key={i} className="hi-amenity">{a}</span>
                                    ))
                                ) : (
                                    <span className="hi-amenity">{house.amenities}</span>
                                )}
                            </div>
                        </motion.div>
                    )}

                    <div className="hi-divider" />

                    {/* Stats grid */}
                    <motion.div
                        className="hi-stats"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        {[
                            { val: house.ambients,       lbl: "Ambientes"      },
                            { val: house.bathrooms,      lbl: "Baños"          },
                            { val: `${house.covered}m²`, lbl: "Cubiertos"      },
                            { val: `${house.uncovered}m²`,lbl: "Descubiertos"  },
                            { val: `${house.area}m²`,    lbl: "Superficie total"},
                            { val: `${house.years} años`,lbl: "Antigüedad"     },
                        ].map((s, i) => (
                            <div key={i} className="hi-stat">
                                <span className="hi-stat-val">{s.val}</span>
                                <span className="hi-stat-lbl">{s.lbl}</span>
                            </div>
                        ))}
                    </motion.div>
 
                    <div className="hi-divider" />
 
                    {/* Descripción */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                    >
                        <h2 className="hi-section-label">DESCRIPCIÓN</h2>
                        <p className="hi-description">{house.description}</p>
                    </motion.div>
 
                    <div className="hi-divider" />
 
                    {/* Mapa */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                    >
                        <h2 className="hi-section-label">UBICACIÓN</h2>
                        <div className="hi-map-wrap">
                            <iframe
                                src={house.maps}
                                className="hi-map"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </motion.div>
                </main>
 
                {/* ── COLUMNA DERECHA — SIDEBAR ── */}
                <aside className="hi-sidebar">
                    <motion.div
                        className="hi-sidebar-inner"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                    >
                        {/* Precio */}
                        <div className="hi-sidebar-price">
                            <span className="hi-sidebar-price-label">PRECIO</span>
                            <span className="hi-sidebar-price-val">{house.operation === "Venta" ? "U$S " : "$ "}{Number(house.price.replace(/[^0-9]/g, "")).toLocaleString("es-AR")}</span>
                        </div>
 
                        {/* Info rápida */}
                        <div className="hi-sidebar-info">
                            <div className="hi-sidebar-row">
                                <span className="hi-sidebar-key">Operación</span>
                                <span className="hi-sidebar-val">{house.operation}</span>
                            </div>
                            <div className="hi-sidebar-row">
                                <span className="hi-sidebar-key">Tipo</span>
                                <span className="hi-sidebar-val">{house.typeOfHouse}</span>
                            </div>
                            <div className="hi-sidebar-row">
                                <span className="hi-sidebar-key">Condición</span>
                                <span className="hi-sidebar-val">{house.condition}</span>
                            </div>
                            <div className="hi-sidebar-row">
                                <span className="hi-sidebar-key">Expensas</span>
                                <span className="hi-sidebar-val">{house.taxes}</span>
                            </div>
                            <div className="hi-sidebar-row">
                                <span className="hi-sidebar-key">Antigüedad</span>
                                <span className="hi-sidebar-val">{house.years} años</span>
                            </div>
                        </div>
 
                        <div className="hi-sidebar-divider" />
 
                        {/* CTAs */}
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hi-cta-whatsapp"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            CONSULTAR POR WHATSAPP
                        </a>
 
                        <a href="/contact" className="hi-cta-contact">
                            FORMULARIO DE CONTACTO →
                        </a>
 
                    </motion.div>
                </aside>
            </div>
 
            {/* ══════════════════════════════════════════════
                LIGHTBOX
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        className="hi-lightbox"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(false)}
                    >
                        <motion.img
                            key={activeImg}
                            src={house.imageUrl[activeImg]}
                            alt={house.title}
                            className="hi-lightbox-img"
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={e => e.stopPropagation()}
                        />
                        <button className="hi-lightbox-close" onClick={() => setLightbox(false)}>✕</button>
                        {house.imageUrl.length > 1 && (
                            <>
                                <button className="hi-lightbox-nav hi-lightbox-nav--prev" onClick={e => { e.stopPropagation(); prevImg() }}>‹</button>
                                <button className="hi-lightbox-nav hi-lightbox-nav--next" onClick={e => { e.stopPropagation(); nextImg() }}>›</button>
                            </>
                        )}
                        <span className="hi-lightbox-counter">{activeImg + 1} / {house.imageUrl.length}</span>
                    </motion.div>
                )}
            </AnimatePresence>
 
        </div>
    )
}
 
export default HouseIndividual