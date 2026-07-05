import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./housesView.css"
import { UseTheme } from "../contexts/ThemeContext"
import axios from "axios"

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
    amenities?: string[]
    createdAt: string
}

interface Filters {
    operation:   string
    typeOfHouse: string
    ambients:    string
    ubication:   string
    minPrice:    string
    maxPrice:    string
    minArea:     string
    maxArea:     string
}

const EMPTY_FILTERS: Filters = {
    operation: "", typeOfHouse: "", ambients: "",
    ubication: "", minPrice: "", maxPrice: "",
    minArea: "", maxArea: ""
}

const operationColor: Record<string, string> = {
    "Venta":    "hv-tag--venta",
    "Alquiler": "hv-tag--alquiler",
    "Temporal": "hv-tag--temporal",
}

const ITEMS_PER_PAGE = 6

const parsePrice = (p: string) => parseFloat(p.replace(/[^0-9.]/g, "")) || 0
const parseArea  = (a: string) => parseFloat(a.replace(/[^0-9.]/g, "")) || 0

const HousesView = () => {
    const { theme } = UseTheme()
    const [houses, setHouses]           = useState<House[]>([])
    const [loading, setLoading]         = useState(false)
    const [error, setError]             = useState(false)
    const [imgIndex, setImgIndex]       = useState<Record<string, number>>({})
    const [page, setPage]               = useState<number>(1)
    const [filters, setFilters]         = useState<Filters>(EMPTY_FILTERS)
    const [showFilters, setShowFilters] = useState(false)

    const getHouses = async () => {
        try {
            setError(false)
            setLoading(true)
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/houses`)
            setHouses(response.data)
        } catch (error: any) {
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { getHouses() }, [])
    useEffect(() => { setPage(1) }, [filters])

    /* ── Filtrado en memoria ── */
    const filtered = useMemo(() => {
        return houses.filter(h => {
            if (filters.operation   && h.operation   !== filters.operation)   return false
            if (filters.typeOfHouse && h.typeOfHouse !== filters.typeOfHouse) return false
            if (filters.ambients) {
                const amb = parseInt(h.ambients)
                if (filters.ambients === "4+") { if (amb < 4) return false }
                else if (amb !== parseInt(filters.ambients)) return false
            }
            if (filters.ubication) {
                const q = filters.ubication.toLowerCase()
                if (!h.ubication.toLowerCase().includes(q) && !h.direction.toLowerCase().includes(q)) return false
            }
            if (filters.minPrice && parsePrice(h.price) < parsePrice(filters.minPrice)) return false
            if (filters.maxPrice && parsePrice(h.price) > parsePrice(filters.maxPrice)) return false
            if (filters.minArea  && parseArea(h.area)   < parseArea(filters.minArea))   return false
            if (filters.maxArea  && parseArea(h.area)   > parseArea(filters.maxArea))   return false
            return true
        })
    }, [houses, filters])

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
    const activeFiltersCount = Object.values(filters).filter(v => v !== "").length

    const setFilter = (key: keyof Filters, val: string) =>
        setFilters(prev => ({ ...prev, [key]: prev[key] === val ? "" : val }))
    const setFilterDirect = (key: keyof Filters, val: string) =>
        setFilters(prev => ({ ...prev, [key]: val }))
    const clearFilters = () => setFilters(EMPTY_FILTERS)

    const nextImg = (e: React.MouseEvent, id: string, total: number) => {
        e.preventDefault()
        setImgIndex(prev => ({ ...prev, [id]: ((prev[id] ?? 0) + 1) % total }))
    }
    const prevImg = (e: React.MouseEvent, id: string, total: number) => {
        e.preventDefault()
        setImgIndex(prev => ({ ...prev, [id]: ((prev[id] ?? 0) - 1 + total) % total }))
    }
    const handlePage = (n: number) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }) }

    /* ── ESTADOS ── */
    if (loading) return (
        <div className={`hv-root ${theme}`}>
            <div className="hv-state-wrap">
                <div className="hv-spinner" />
                <p className="hv-state-text">Cargando propiedades...</p>
            </div>
        </div>
    )

    if (error) return (
        <div className={`hv-root ${theme}`}>
            <div className="hv-state-wrap">
                <p className="hv-state-text hv-state-error">Error al cargar las propiedades.</p>
                <button className="hv-retry-btn" onClick={getHouses}>Reintentar</button>
            </div>
        </div>
    )

    if (!loading && houses.length === 0) return (
        <div className={`hv-root ${theme}`}>
            <div className="hv-state-wrap">
                <p className="hv-state-text">No hay propiedades disponibles por el momento.</p>
            </div>
        </div>
    )

    return (
        <div className={`hv-root ${theme}`}>

            {/* ── HEADER ── */}
            <header className="hv-header">
                <div className="hv-header-inner">
                    <span className="hv-eyebrow">BOGGERO PROPIEDADES</span>
                    <h1 className="hv-title">
                        Propiedades<br />
                        <span className="hv-title-outline">disponibles.</span>
                    </h1>
                    <p className="hv-subtitle">
                        {filtered.length} propiedad{filtered.length !== 1 ? "es" : ""} encontradas
                        {activeFiltersCount > 0 && ` · ${activeFiltersCount} filtro${activeFiltersCount > 1 ? "s" : ""} activo${activeFiltersCount > 1 ? "s" : ""}`}
                    </p>
                </div>

                <button
                    className={`hv-filter-toggle ${showFilters ? "is-open" : ""} ${activeFiltersCount > 0 ? "has-active" : ""}`}
                    onClick={() => setShowFilters(v => !v)}
                >
                    {activeFiltersCount > 0 && <span className="hv-filter-badge">{activeFiltersCount}</span>}
                    {showFilters ? "CERRAR FILTROS" : "FILTRAR BÚSQUEDA"}
                </button>
            </header>

            {/* ── PANEL DE FILTROS ── */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        className="hv-filters-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: "hidden" }}
                    >
                        <div className="hv-filters-inner">

                            {/* Operación */}
                            <div className="hv-filter-group">
                                <span className="hv-filter-label">OPERACIÓN</span>
                                <div className="hv-filter-chips">
                                    {["Venta", "Alquiler", "Temporal"].map(op => (
                                        <button key={op}
                                            className={`hv-chip ${filters.operation === op ? "is-active" : ""}`}
                                            onClick={() => setFilter("operation", op)}
                                        >{op}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Tipo */}
                            <div className="hv-filter-group">
                                <span className="hv-filter-label">TIPO DE PROPIEDAD</span>
                                <div className="hv-filter-chips">
                                    {["Casa", "Departamento", "PH", "Duplex", "Triplex", "Local Comercial", "Oficina", "Cochera", "Terreno", "Lote", "Quinta", "Campo", "Galpón", "Edificio", "Consultorio"].map(t => (
                                        <button key={t} className={`hv-chip ${filters.typeOfHouse === t ? "is-active" : ""}`} onClick={() => setFilter("typeOfHouse", t)}>{t}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Ambientes */}
                            <div className="hv-filter-group">
                                <span className="hv-filter-label">AMBIENTES</span>
                                <div className="hv-filter-chips">
                                    {["1", "2", "3", "4+"].map(a => (
                                        <button key={a}
                                            className={`hv-chip hv-chip--sm ${filters.ambients === a ? "is-active" : ""}`}
                                            onClick={() => setFilter("ambients", a)}
                                        >{a}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div className="hv-filter-group">
                                <span className="hv-filter-label">UBICACIÓN</span>
                                <div className="hv-filter-chips">
                                    {Array.from(new Set(houses.map(h => h.ubication).filter(Boolean))).sort().map(u => (
                                        <button key={u}
                                            className={`hv-chip ${filters.ubication === u ? "is-active" : ""}`}
                                            onClick={() => setFilter("ubication", u)}
                                        >{u}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Precio */}
                            <div className="hv-filter-group">
                                <span className="hv-filter-label">PRECIO</span>
                                <div className="hv-filter-range">
                                    <input
                                        className="hv-filter-input"
                                        type="number"
                                        placeholder="Mínimo"
                                        value={filters.minPrice}
                                        onChange={e => setFilterDirect("minPrice", e.target.value)}
                                    />
                                    <span className="hv-range-sep">—</span>
                                    <input
                                        className="hv-filter-input"
                                        type="number"
                                        placeholder="Máximo"
                                        value={filters.maxPrice}
                                        onChange={e => setFilterDirect("maxPrice", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Superficie */}
                            <div className="hv-filter-group">
                                <span className="hv-filter-label">SUPERFICIE TOTAL (m²)</span>
                                <div className="hv-filter-range">
                                    <input
                                        className="hv-filter-input"
                                        type="number"
                                        placeholder="Mínimo"
                                        value={filters.minArea}
                                        onChange={e => setFilterDirect("minArea", e.target.value)}
                                    />
                                    <span className="hv-range-sep">—</span>
                                    <input
                                        className="hv-filter-input"
                                        type="number"
                                        placeholder="Máximo"
                                        value={filters.maxArea}
                                        onChange={e => setFilterDirect("maxArea", e.target.value)}
                                    />
                                </div>
                            </div>

                        </div>

                        <div className="hv-filters-footer">
                            <span className="hv-filters-result">
                                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                            </span>
                            {activeFiltersCount > 0 && (
                                <button className="hv-clear-btn" onClick={clearFilters}>
                                    LIMPIAR FILTROS ✕
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── SIN RESULTADOS ── */}
            {filtered.length === 0 ? (
                <div className="hv-state-wrap" style={{ minHeight: "40vh" }}>
                    <p className="hv-state-text">No hay propiedades que coincidan con tu búsqueda.</p>
                    <button className="hv-retry-btn" onClick={clearFilters}>Limpiar filtros</button>
                </div>
            ) : (

            /* ── GRID ── */
            <section className="hv-grid">
                {paginated.map((house, i) => {
                    const currentImg  = imgIndex[house._id] ?? 0
                    const hasMultiple = house.imageUrl.length > 1

                    return (
                        <motion.a
                            key={house._id}
                            href={`/houses/${house._id}`}
                            className="hv-card"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.15 }}
                            transition={{ duration: 0.6, delay: (i % 2) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="hv-card-img-wrap">
                                <img src={house.imageUrl[currentImg]} alt={house.title} className="hv-card-img" />
                                <div className="hv-card-img-overlay" />
                                <span className={`hv-tag ${operationColor[house.operation] ?? "hv-tag--venta"}`}>{house.operation}</span>
                                <span className="hv-tag-type">{house.typeOfHouse}</span>
                                {hasMultiple && (
                                    <>
                                        <button className="hv-img-nav hv-img-nav--prev" onClick={e => prevImg(e, house._id, house.imageUrl.length)}>‹</button>
                                        <button className="hv-img-nav hv-img-nav--next" onClick={e => nextImg(e, house._id, house.imageUrl.length)}>›</button>
                                        <div className="hv-img-dots">
                                            {house.imageUrl.map((_, di) => (
                                                <span key={di} className={`hv-img-dot ${di === currentImg ? "is-active" : ""}`} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="hv-card-body">
                                <div className="hv-card-price-row">
                                    <span className="hv-card-price">{house.operation === "Venta" ? "U$S " : "$ "}{Number(house.price.replace(/[^0-9]/g, "")).toLocaleString("es-AR")}</span>
                                    <span className="hv-card-condition">{house.condition}</span>
                                </div>
                                <h2 className="hv-card-title">{house.title}</h2>
                                <p className="hv-card-direction">
                                    <span className="hv-card-direction-icon">📍</span>
                                    {house.direction}
                                </p>
                                <div className="hv-card-divider" />
                                <div className="hv-card-stats">
                                    <div className="hv-stat"><span className="hv-stat-val">{house.ambients}</span><span className="hv-stat-lbl">Amb.</span></div>
                                    <div className="hv-stat"><span className="hv-stat-val">{house.bathrooms}</span><span className="hv-stat-lbl">Baños</span></div>
                                    <div className="hv-stat"><span className="hv-stat-val">{house.covered}m²</span><span className="hv-stat-lbl">Cubiertos</span></div>
                                    <div className="hv-stat"><span className="hv-stat-val">{house.area}m²</span><span className="hv-stat-lbl">Total</span></div>
                                </div>
                            </div>
                        </motion.a>
                    )
                })}
            </section>
            )}

            {/* ── PAGINACIÓN ── */}
            {totalPages > 1 && (
                <div className="hv-pagination">
                    <button className="hv-page-btn hv-page-btn--arrow" onClick={() => handlePage(page - 1)} disabled={page === 1}>←</button>
                    <div className="hv-page-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
                            const show = n === 1 || n === totalPages || Math.abs(n - page) <= 1
                            const isEllipsis = !show && (n === 2 || n === totalPages - 1)
                            if (isEllipsis) return <span key={n} className="hv-page-ellipsis">···</span>
                            if (!show) return null
                            return <button key={n} className={`hv-page-btn ${page === n ? "is-active" : ""}`} onClick={() => handlePage(n)}>{n}</button>
                        })}
                    </div>
                    <button className="hv-page-btn hv-page-btn--arrow" onClick={() => handlePage(page + 1)} disabled={page === totalPages}>→</button>
                    <span className="hv-page-info">{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}</span>
                </div>
            )}
        </div>
    )
}

export default HousesView