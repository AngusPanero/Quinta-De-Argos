import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import "./adminDashboard.css"
import { UseTheme } from "../contexts/ThemeContext"

/* ══════════════════════════════════════════════════════════
   TIPOS
══════════════════════════════════════════════════════════ */
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
    amenities: string[]
    createdAt: string
}

type FormData = Omit<House, "_id" | "createdAt"> & {
    imageUrl: (File | string)[] | any
}

const EMPTY_FORM: FormData = {
    title: "", direction: "", operation: "Venta", ubication: "",
    price: "", typeOfHouse: "Casa", description: "", condition: "Excelente",
    ambients: "", bathrooms: "", years: "", taxes: "",
    covered: "", uncovered: "", area: "", maps: "",
    imageUrl: [], amenities: []
}

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`

/* ══════════════════════════════════════════════════════════
   AMENITIES — constantes
══════════════════════════════════════════════════════════ */
const AMENITIES_BASE = [
    "Pileta", "Cochera", "Jardín", "Parrilla", "Terraza",
    "Balcón", "Quincho", "Lavadero", "Seguridad 24hs", "Portero",
    "Ascensor", "Aire acondicionado", "Calefacción central",
    "Gimnasio", "SUM", "Baulera", "Gas natural", "Luminoso",
    "Vista al frente", "Agua caliente central"
]

const STORAGE_KEY = "boggero_amenities_historial"

/* ══════════════════════════════════════════════════════════
   SUBCOMPONENTE: AmenitiesInput
══════════════════════════════════════════════════════════ */
const AmenitiesInput = ({
    value,
    onChange
}: {
    value: string[]
    onChange: (amenities: string[]) => void
}) => {
    const [inputText, setInputText] = useState("")
    const [historial, setHistorial] = useState<string[]>([])

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        const extra: string[] = stored ? JSON.parse(stored) : []
        setHistorial([...new Set([...AMENITIES_BASE, ...extra])])
    }, [])

    const saveToHistorial = (amenity: string) => {
        const stored = localStorage.getItem(STORAGE_KEY)
        const extra: string[] = stored ? JSON.parse(stored) : []
        if (!extra.includes(amenity) && !AMENITIES_BASE.includes(amenity)) {
            const updated = [...extra, amenity]
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            setHistorial(prev => [...new Set([...prev, amenity])])
        }
    }

    const toggleAmenity = (amenity: string) => {
        if (value.includes(amenity)) {
            onChange(value.filter(a => a !== amenity))
        } else {
            onChange([...value, amenity])
        }
    }

    const addCustom = () => {
        const trimmed = inputText.trim()
        if (!trimmed) return
        const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
        if (!value.includes(formatted)) onChange([...value, formatted])
        saveToHistorial(formatted)
        setInputText("")
    }

    const removeAmenity = (amenity: string) => onChange(value.filter(a => a !== amenity))

    return (
        <div className="ami-wrapper">
            {value.length > 0 && (
                <div className="ami-selected">
                    <span className="ami-label">SELECCIONADAS ({value.length})</span>
                    <div className="ami-chips-row">
                        {value.map((a, i) => (
                            <span key={i} className="ami-chip ami-chip--active">
                                {a}
                                <button type="button" className="ami-chip-remove" onClick={() => removeAmenity(a)}>✕</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="ami-input-row">
                <input
                    className="adm-input"
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom() } }}
                    placeholder="Escribí una amenity personalizada y presioná Enter..."
                />
                <button type="button" className="ami-add-btn" onClick={addCustom}>
                    + AGREGAR
                </button>
            </div>

            <div className="ami-historial">
                <span className="ami-label">SUGERENCIAS</span>
                <div className="ami-chips-row ami-chips-suggestions">
                    {historial.map((a, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`ami-chip ${value.includes(a) ? "ami-chip--active" : ""}`}
                            onClick={() => toggleAmenity(a)}
                        >
                            {value.includes(a) ? "✓ " : ""}{a}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   SUBCOMPONENTES FORM
══════════════════════════════════════════════════════════ */
const Field = ({ label, name, value, onChange, required }: {
    label: string; name: string; value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean
}) => (
    <div className="adm-form-group">
        <label className="adm-label">{label}</label>
        <input className="adm-input" type="text" name={name} value={value} onChange={onChange} required={required} />
    </div>
)

const SelectField = ({ label, name, value, onChange, options, required }: {
    label: string; name: string; value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    options: string[]; required?: boolean
}) => (
    <div className="adm-form-group">
        <label className="adm-label">{label}</label>
        <select className="adm-select" name={name} value={value} onChange={onChange} required={required}>
            <option value="">Seleccioná</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
)

const HouseFormFields = ({
    data, onChange, onAmenitiesChange
}: {
    data: FormData
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onAmenitiesChange: (amenities: string[]) => void
}) => (
    <div className="adm-fields">

        <div className="adm-form-section-label">INFORMACIÓN PRINCIPAL</div>
        <div className="adm-fields-grid">
            <Field label="Título"          name="title"       value={data.title}       onChange={onChange} required />
            <Field label="Dirección"       name="direction"   value={data.direction}   onChange={onChange} required />
            <Field label="Ubicación"       name="ubication"   value={data.ubication}   onChange={onChange} required />
            <Field label="Precio"          name="price"       value={data.price}       onChange={onChange} required />
            <SelectField label="Operación" name="operation"   value={data.operation}   onChange={onChange} required
                options={["Venta", "Alquiler", "Temporal"]} />
            <SelectField label="Tipo"      name="typeOfHouse" value={data.typeOfHouse} onChange={onChange} required
                options={["Casa", "Departamento", "PH", "Duplex", "Triplex", "Local Comercial", "Oficina", "Cochera", "Terreno", "Lote", "Quinta", "Campo", "Galpón", "Edificio", "Hotel", "Consultorio"]} />
        </div>

        <div className="adm-form-section-label" style={{ marginTop: "1.5rem" }}>CARACTERÍSTICAS</div>
        <div className="adm-fields-grid">
            <SelectField label="Condición"      name="condition"  value={data.condition}  onChange={onChange} required
                options={["Excelente", "Muy bueno", "Bueno", "Regular", "A reciclar"]} />
            <Field label="Ambientes"            name="ambients"   value={data.ambients}   onChange={onChange} required />
            <Field label="Baños"                name="bathrooms"  value={data.bathrooms}  onChange={onChange} required />
            <Field label="Antigüedad (años)"    name="years"      value={data.years}      onChange={onChange} required />
            <Field label="Expensas"             name="taxes"      value={data.taxes}      onChange={onChange} required />
            <Field label="M² cubiertos"         name="covered"    value={data.covered}    onChange={onChange} required />
            <Field label="M² descubiertos"      name="uncovered"  value={data.uncovered}  onChange={onChange} required />
            <Field label="M² totales"           name="area"       value={data.area}       onChange={onChange} required />
        </div>

        <div className="adm-form-section-label" style={{ marginTop: "1.5rem" }}>DESCRIPCIÓN Y MAPA</div>
        <div className="adm-fields-grid">
            <div className="adm-form-group adm-span-2">
                <label className="adm-label">Descripción</label>
                <textarea className="adm-textarea" name="description" value={data.description} onChange={onChange} required rows={4} />
            </div>
            <div className="adm-form-group adm-span-2">
                <label className="adm-label">URL Embed Google Maps</label>
                <input className="adm-input" type="text" name="maps" value={data.maps} onChange={onChange} required
                    placeholder="https://www.google.com/maps/embed?..." />
            </div>
        </div>

        <div className="adm-form-section-label" style={{ marginTop: "1.5rem" }}>AMENITIES</div>
        <AmenitiesInput
            value={data.amenities ?? []}
            onChange={onAmenitiesChange}
        />
    </div>
)

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
    const { theme } = UseTheme()

    const [houses, setHouses]           = useState<House[]>([])
    const [loadingList, setLoadingList] = useState(false)

    const [showCreate, setShowCreate]       = useState(false)
    const [formData, setFormData]           = useState<FormData>(EMPTY_FORM)
    const [coverIndex, setCoverIndex]       = useState(0)
    const [loadingCreate, setLoadingCreate] = useState(false)
    const [errorCreate, setErrorCreate]     = useState<string | null>(null)
    const [dragOver, setDragOver]           = useState(false)
    const [dragSrcCreate, setDragSrcCreate]   = useState<number | null>(null)
    const [dragOverCreate, setDragOverCreate] = useState<number | null>(null)

    const [editHouse, setEditHouse]         = useState<House | null>(null)
    const [editForm, setEditForm]           = useState<FormData>(EMPTY_FORM)
    const [editCover, setEditCover]         = useState(0)
    const [newEditImages, setNewEditImages] = useState<File[]>([])
    const [loadingEdit, setLoadingEdit]     = useState(false)
    const [errorEdit, setErrorEdit]         = useState<string | null>(null)
    const [dragOverEdit, setDragOverEdit]   = useState(false)
    const [dragSrcEditEx, setDragSrcEditEx]   = useState<number | null>(null)
    const [dragOverEditEx, setDragOverEditEx] = useState<number | null>(null)
    const [dragSrcEditNew, setDragSrcEditNew]   = useState<number | null>(null)
    const [dragOverEditNew, setDragOverEditNew] = useState<number | null>(null)

    const [deleteId, setDeleteId]     = useState<string | null>(null)
    const [loadingDel, setLoadingDel] = useState(false)

    /* ── GET ── */
    const getHouses = async () => {
        try {
            setLoadingList(true)
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/houses`, { withCredentials: true })
            setHouses(res.data)
        } catch (e) {
            console.error("Error cargando propiedades", e)
        } finally {
            setLoadingList(false)
        }
    }

    useEffect(() => { getHouses() }, [])

    /* ── CLOUDINARY ── */
    const uploadToCloudinary = async (files: File[]): Promise<string[]> => {
        const urls: string[] = []
        for (const file of files) {
            const fd = new FormData()
            fd.append("file", file)
            fd.append("upload_preset", "Boggero")
            const res = await axios.post(CLOUDINARY_URL, fd)
            if (!res?.data?.secure_url) throw new Error("CLOUDINARY_ERROR")
            urls.push(res.data.secure_url)
        }
        return urls
    }

    /* ══════════════════════════════════════════════════════
       CREAR
    ══════════════════════════════════════════════════════ */
    const handleSetCreate = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const addImages = (files: FileList | File[]) => {
        const arr = Array.from(files)
        if (formData.imageUrl.length + arr.length > 25) { alert("Máximo 25 imágenes"); return }
        setFormData((prev: any) => ({ ...prev, imageUrl: [...prev.imageUrl, ...arr] }))
    }

    const removeCreateImage = (index: number) => {
        setFormData(prev => ({ ...prev, imageUrl: prev.imageUrl.filter((_: any, i: any) => i !== index) }))
        if (coverIndex === index) setCoverIndex(0)
        else if (coverIndex > index) setCoverIndex(c => c - 1)
    }

    const moveCreateImage = (from: number, to: number) => {
        if (from === to) return
        const imgs = [...formData.imageUrl]
        const [moved] = imgs.splice(from, 1)
        imgs.splice(to, 0, moved)
        setFormData(prev => ({ ...prev, imageUrl: imgs }))
        if (coverIndex === from) setCoverIndex(to)
        else if (from < to && coverIndex > from && coverIndex <= to) setCoverIndex(c => c - 1)
        else if (from > to && coverIndex >= to && coverIndex < from) setCoverIndex(c => c + 1)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoadingCreate(true)
        setErrorCreate(null)
        try {
            const files = formData.imageUrl.filter((f: any) => f instanceof File) as File[]
            const ordered = [...files]
            if (coverIndex !== 0 && coverIndex < ordered.length) {
                const [cover] = ordered.splice(coverIndex, 1)
                ordered.unshift(cover)
            }
            const urls = await uploadToCloudinary(ordered)
            const finalData = { ...formData, imageUrl: urls }
            await axios.post(`${import.meta.env.VITE_API_URL}/createhouse`, finalData, { withCredentials: true })
            setShowCreate(false)
            setFormData(EMPTY_FORM)
            setCoverIndex(0)
            await getHouses()
        } catch (err: any) {
            setErrorCreate(err.message === "CLOUDINARY_ERROR" ? "cloudinary" : "general")
        } finally {
            setLoadingCreate(false)
        }
    }

    /* ══════════════════════════════════════════════════════
       EDITAR
    ══════════════════════════════════════════════════════ */
    const openEdit = (house: House) => {
        setEditHouse(house)
        setEditForm({ ...house, amenities: house.amenities ?? [] })
        setEditCover(0)
        setNewEditImages([])
        setErrorEdit(null)
    }

    const handleSetEdit = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setEditForm(prev => ({ ...prev, [name]: value }))
    }

    const addEditImages = (files: FileList | File[]) => {
        const arr = Array.from(files)
        const total = (editForm.imageUrl?.length ?? 0) + newEditImages.length + arr.length
        if (total > 25) { alert("Máximo 25 imágenes"); return }
        setNewEditImages(prev => [...prev, ...arr])
    }

    const removeEditExistingImage = (index: number) => {
        setEditForm(prev => ({ ...prev, imageUrl: (prev.imageUrl as string[]).filter((_, i) => i !== index) }))
        if (editCover === index) setEditCover(0)
        else if (editCover > index) setEditCover(c => c - 1)
    }

    const removeEditNewImage = (index: number) => {
        setNewEditImages(prev => prev.filter((_, i) => i !== index))
    }

    const moveEditExistingImage = (from: number, to: number) => {
        if (from === to) return
        const imgs = [...(editForm.imageUrl as string[])]
        const [moved] = imgs.splice(from, 1)
        imgs.splice(to, 0, moved)
        setEditForm(prev => ({ ...prev, imageUrl: imgs }))
        if (editCover === from) setEditCover(to)
        else if (from < to && editCover > from && editCover <= to) setEditCover(c => c - 1)
        else if (from > to && editCover >= to && editCover < from) setEditCover(c => c + 1)
    }

    const moveEditNewImage = (from: number, to: number) => {
        if (from === to) return
        const imgs = [...newEditImages]
        const [moved] = imgs.splice(from, 1)
        imgs.splice(to, 0, moved)
        setNewEditImages(imgs)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editHouse) return
        setLoadingEdit(true)
        setErrorEdit(null)
        try {
            let newUrls: string[] = []
            if (newEditImages.length > 0) newUrls = await uploadToCloudinary(newEditImages)
            const allUrls = [...(editForm.imageUrl as string[]), ...newUrls]
            if (editCover !== 0 && editCover < allUrls.length) {
                const [cover] = allUrls.splice(editCover, 1)
                allUrls.unshift(cover)
            }
            const { imageUrl: _, ...rest } = editForm
            const finalData = { ...rest, imageUrl: allUrls }
            await axios.put(`${import.meta.env.VITE_API_URL}/update/${editHouse._id}`, finalData, { withCredentials: true })
            setEditHouse(null)
            await getHouses()
        } catch (err: any) {
            setErrorEdit(err.message === "CLOUDINARY_ERROR" ? "cloudinary" : "general")
        } finally {
            setLoadingEdit(false)
        }
    }

    /* ══════════════════════════════════════════════════════
       ELIMINAR
    ══════════════════════════════════════════════════════ */
    const handleDelete = async () => {
        if (!deleteId) return
        setLoadingDel(true)
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/delete/${deleteId}`, { withCredentials: true })
            setDeleteId(null)
            setEditHouse(null)
            await getHouses()
        } catch (err) {
            console.error("Error eliminando", err)
        } finally {
            setLoadingDel(false)
        }
    }

    const previewUrl = (img: File | string) => img instanceof File ? URL.createObjectURL(img) : img

    /* ══════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════ */
    return (
        <div className={`adm-root ${theme}`}>

            {/* ── HEADER ── */}
            <header className="adm-header">
                <div>
                    <span className="adm-eyebrow">PANEL ADMINISTRATIVO</span>
                    <h1 className="adm-title">
                        Gestión de<br />
                        <span className="adm-title-rose">Propiedades</span>
                    </h1>
                </div>
                <button className="adm-create-btn" onClick={() => { setShowCreate(true); setFormData(EMPTY_FORM); setCoverIndex(0) }}>
                    + NUEVA PROPIEDAD
                </button>
            </header>

            {/* ── LISTA — click en la fila abre el modal de edición ── */}
            <section className="adm-list">
                {loadingList ? (
                    <div className="adm-state"><div className="adm-spinner" /><p>Cargando propiedades...</p></div>
                ) : houses.length === 0 ? (
                    <div className="adm-state"><p className="adm-state-empty">No hay propiedades cargadas.</p></div>
                ) : houses.map((house, i) => (
                    <motion.div
                        key={house._id}
                        className="adm-row"
                        onClick={() => openEdit(house)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                    >
                        <div className="adm-row-img">
                            <img src={house.imageUrl[0]} alt={house.title} />
                        </div>
                        <div className="adm-row-info">
                            <span className={`adm-op-tag adm-op-${house.operation.toLowerCase()}`}>{house.operation}</span>
                            <p className="adm-row-title">{house.title}</p>
                            <p className="adm-row-dir">{house.direction}</p>
                            {house.amenities && house.amenities.length > 0 && (
                                <div className="adm-row-amenities">
                                    {house.amenities.slice(0, 3).map((a, idx) => (
                                        <span key={idx} className="adm-row-amenity">{a}</span>
                                    ))}
                                    {house.amenities.length > 3 && (
                                        <span className="adm-row-amenity adm-row-amenity--more">+{house.amenities.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="adm-row-meta">
                            <span className="adm-row-price">{house.price}</span>
                            <span className="adm-row-type">{house.typeOfHouse}</span>
                        </div>
                        <div className="adm-row-arrow">›</div>
                    </motion.div>
                ))}
            </section>

            {/* ══════════════════════════════════════════════
                MODAL CREAR
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div className="adm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={`adm-modal ${theme}`}
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="adm-modal-header">
                                <span className="adm-modal-title">NUEVA PROPIEDAD</span>
                                <button className="adm-modal-close" onClick={() => setShowCreate(false)}>✕</button>
                            </div>

                            <form className="adm-form" onSubmit={handleCreate}>
                                <HouseFormFields
                                    data={formData}
                                    onChange={handleSetCreate}
                                    onAmenitiesChange={amenities => setFormData(prev => ({ ...prev, amenities }))}
                                />

                                <div className="adm-form-section-label">
                                    IMÁGENES ({formData.imageUrl.length}/25) — arrastrá para reordenar · ★ portada
                                </div>

                                <div className={`adm-dropzone ${dragOver ? "is-over" : ""}`}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={e => { e.preventDefault(); setDragOver(false); addImages(e.dataTransfer.files) }}
                                    onClick={() => document.getElementById("create-file-input")?.click()}
                                >
                                    <span>📁 Arrastrá imágenes o hacé click para seleccionar</span>
                                    <small>Máximo 25 · JPG, PNG, WEBP</small>
                                    <input id="create-file-input" type="file" multiple accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={e => e.target.files && addImages(e.target.files)}
                                    />
                                </div>

                                {formData.imageUrl.length > 0 && (
                                    <div className="adm-img-preview-grid">
                                        {formData.imageUrl.map((img: string | File, i: number) => (
                                            <div
                                                key={i}
                                                className={`adm-img-thumb ${coverIndex === i ? "is-cover" : ""} ${dragSrcCreate === i ? "is-dragging" : ""} ${dragOverCreate === i && dragSrcCreate !== i ? "is-drag-over" : ""}`}
                                                draggable
                                                onDragStart={e => { setDragSrcCreate(i); e.dataTransfer.effectAllowed = "move" }}
                                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCreate(i) }}
                                                onDragLeave={() => setDragOverCreate(null)}
                                                onDrop={e => {
                                                    e.preventDefault()
                                                    if (dragSrcCreate !== null && dragSrcCreate !== i) moveCreateImage(dragSrcCreate, i)
                                                    setDragSrcCreate(null); setDragOverCreate(null)
                                                }}
                                                onDragEnd={() => { setDragSrcCreate(null); setDragOverCreate(null) }}
                                            >
                                                <img src={previewUrl(img)} alt={`img-${i}`} />
                                                <div className="adm-img-thumb-actions">
                                                    <button type="button" className="adm-thumb-cover" title="Marcar como portada" onClick={() => setCoverIndex(i)}>
                                                        {coverIndex === i ? "★" : "☆"}
                                                    </button>
                                                    <button type="button" className="adm-thumb-del" onClick={() => removeCreateImage(i)}>✕</button>
                                                </div>
                                                {coverIndex === i && <span className="adm-cover-label">PORTADA</span>}
                                                <span className="adm-drag-handle" title="Arrastrá para reordenar">⠿</span>
                                                <span className="adm-img-index">{i + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {errorCreate === "cloudinary" && <p className="adm-error">Error al subir imágenes. Verificá tu conexión.</p>}
                                {errorCreate === "general"   && <p className="adm-error">Error al crear la propiedad. Intentá nuevamente.</p>}

                                <div className="adm-form-footer">
                                    <button type="button" className="adm-cancel-btn" onClick={() => setShowCreate(false)}>CANCELAR</button>
                                    <button type="submit" className="adm-submit-btn" disabled={loadingCreate}>
                                        {loadingCreate ? "CREANDO..." : "CREAR PROPIEDAD"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════
                MODAL EDITAR
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
                {editHouse && (
                    <motion.div className="adm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={`adm-modal ${theme}`}
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="adm-modal-header">
                                <span className="adm-modal-title">EDITAR PROPIEDAD</span>
                                <button className="adm-modal-close" onClick={() => setEditHouse(null)}>✕</button>
                            </div>

                            <form className="adm-form" onSubmit={handleUpdate}>
                                <HouseFormFields
                                    data={editForm}
                                    onChange={handleSetEdit}
                                    onAmenitiesChange={amenities => setEditForm(prev => ({ ...prev, amenities }))}
                                />

                                {/* ── Imágenes existentes ── */}
                                <div className="adm-form-section-label">
                                    IMÁGENES ACTUALES ({(editForm.imageUrl as string[]).length}) — arrastrá para reordenar · ★ portada · ✕ eliminar
                                </div>

                                <div className="adm-img-preview-grid">
                                    {(editForm.imageUrl as string[]).map((url, i) => (
                                        <div
                                            key={i}
                                            className={`adm-img-thumb ${editCover === i ? "is-cover" : ""} ${dragSrcEditEx === i ? "is-dragging" : ""} ${dragOverEditEx === i && dragSrcEditEx !== i ? "is-drag-over" : ""}`}
                                            draggable
                                            onDragStart={e => { setDragSrcEditEx(i); e.dataTransfer.effectAllowed = "move" }}
                                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverEditEx(i) }}
                                            onDragLeave={() => setDragOverEditEx(null)}
                                            onDrop={e => {
                                                e.preventDefault()
                                                if (dragSrcEditEx !== null && dragSrcEditEx !== i) moveEditExistingImage(dragSrcEditEx, i)
                                                setDragSrcEditEx(null); setDragOverEditEx(null)
                                            }}
                                            onDragEnd={() => { setDragSrcEditEx(null); setDragOverEditEx(null) }}
                                        >
                                            <img src={url} alt={`img-${i}`} />
                                            <div className="adm-img-thumb-actions">
                                                <button type="button" className="adm-thumb-cover" onClick={() => setEditCover(i)}>
                                                    {editCover === i ? "★" : "☆"}
                                                </button>
                                                <button type="button" className="adm-thumb-del" onClick={() => removeEditExistingImage(i)}>✕</button>
                                            </div>
                                            {editCover === i && <span className="adm-cover-label">PORTADA</span>}
                                            <span className="adm-drag-handle" title="Arrastrá para reordenar">⠿</span>
                                            <span className="adm-img-index">{i + 1}</span>
                                            {/* ← → solo visible en mobile */}
                                            <div className="adm-img-mobile-order">
                                                <button type="button" className="adm-mobile-order-btn"
                                                    disabled={i === 0}
                                                    onClick={() => moveEditExistingImage(i, i - 1)}>←</button>
                                                <button type="button" className="adm-mobile-order-btn"
                                                    disabled={i === (editForm.imageUrl as string[]).length - 1}
                                                    onClick={() => moveEditExistingImage(i, i + 1)}>→</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Imágenes nuevas ── */}
                                <div className="adm-form-section-label" style={{ marginTop: "1.5rem" }}>
                                    AGREGAR IMÁGENES NUEVAS ({newEditImages.length}) — arrastrá para reordenar
                                </div>

                                <div className={`adm-dropzone ${dragOverEdit ? "is-over" : ""}`}
                                    onDragOver={e => { e.preventDefault(); setDragOverEdit(true) }}
                                    onDragLeave={() => setDragOverEdit(false)}
                                    onDrop={e => { e.preventDefault(); setDragOverEdit(false); addEditImages(e.dataTransfer.files) }}
                                    onClick={() => document.getElementById("edit-file-input")?.click()}
                                >
                                    <span>📁 Arrastrá imágenes o hacé click</span>
                                    <input id="edit-file-input" type="file" multiple accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={e => e.target.files && addEditImages(e.target.files)}
                                    />
                                </div>

                                {newEditImages.length > 0 && (
                                    <div className="adm-img-preview-grid">
                                        {newEditImages.map((file, i) => (
                                            <div
                                                key={i}
                                                className={`adm-img-thumb ${dragSrcEditNew === i ? "is-dragging" : ""} ${dragOverEditNew === i && dragSrcEditNew !== i ? "is-drag-over" : ""}`}
                                                draggable
                                                onDragStart={e => { setDragSrcEditNew(i); e.dataTransfer.effectAllowed = "move" }}
                                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverEditNew(i) }}
                                                onDragLeave={() => setDragOverEditNew(null)}
                                                onDrop={e => {
                                                    e.preventDefault()
                                                    if (dragSrcEditNew !== null && dragSrcEditNew !== i) moveEditNewImage(dragSrcEditNew, i)
                                                    setDragSrcEditNew(null); setDragOverEditNew(null)
                                                }}
                                                onDragEnd={() => { setDragSrcEditNew(null); setDragOverEditNew(null) }}
                                            >
                                                <img src={previewUrl(file)} alt={`new-${i}`} />
                                                <div className="adm-img-thumb-actions">
                                                    <button type="button" className="adm-thumb-del" onClick={() => removeEditNewImage(i)}>✕</button>
                                                </div>
                                                <span className="adm-new-label">NUEVA</span>
                                                <span className="adm-drag-handle" title="Arrastrá para reordenar">⠿</span>
                                                <span className="adm-img-index">{i + 1}</span>
                                                {/* ← → solo visible en mobile */}
                                                <div className="adm-img-mobile-order">
                                                    <button type="button" className="adm-mobile-order-btn"
                                                        disabled={i === 0}
                                                        onClick={() => moveEditNewImage(i, i - 1)}>←</button>
                                                    <button type="button" className="adm-mobile-order-btn"
                                                        disabled={i === newEditImages.length - 1}
                                                        onClick={() => moveEditNewImage(i, i + 1)}>→</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {errorEdit === "cloudinary" && <p className="adm-error">Error al subir imágenes.</p>}
                                {errorEdit === "general"   && <p className="adm-error">Error al guardar cambios.</p>}

                                {/* Footer: ELIMINAR (izquierda) · CANCELAR + GUARDAR (derecha) */}
                                <div className="adm-form-footer">
                                    <button
                                        type="button"
                                        className="adm-del-btn adm-del-btn--footer"
                                        onClick={() => setDeleteId(editHouse._id)}
                                    >
                                        ELIMINAR
                                    </button>
                                    <div className="adm-form-footer-right">
                                        <button type="button" className="adm-cancel-btn" onClick={() => setEditHouse(null)}>CANCELAR</button>
                                        <button type="submit" className="adm-submit-btn" disabled={loadingEdit}>
                                            {loadingEdit ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════
                MODAL CONFIRMAR ELIMINAR — z-index más alto para tapar el modal de edición
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div className="adm-overlay adm-overlay--top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={`adm-confirm ${theme}`}
                            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                        >
                            <p className="adm-confirm-title">¿Eliminar esta propiedad?</p>
                            <p className="adm-confirm-sub">Esta acción no se puede deshacer.</p>
                            <div className="adm-confirm-actions">
                                <button className="adm-cancel-btn" onClick={() => setDeleteId(null)}>CANCELAR</button>
                                <button className="adm-del-confirm-btn" onClick={handleDelete} disabled={loadingDel}>
                                    {loadingDel ? "ELIMINANDO..." : "SÍ, ELIMINAR"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}

export default AdminDashboard