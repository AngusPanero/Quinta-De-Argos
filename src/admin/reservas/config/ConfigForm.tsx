import { useEffect, useMemo, useState } from "react";
import SignModal from "./SignModal";
import { applySection, previewSection, toApiError } from "./configApi";
import { displayValue, toFormString } from "./configUtils";
import type { ConfigResponse, FieldChange, FieldDef, FormSection, Values } from "./configTypes";

const GROUP_TITLES: Record<string, string> = {
    horarios: "Horarios de entrada y salida",
    contacto: "Contacto y licencia",
    reservas: "Reservas",
    textos: "Textos y políticas",
};

interface Props {
    section: FormSection;
    intro: string;
    fields: FieldDef[];
    values: Values;
    onApplied: (config: ConfigResponse) => void;
}

type FormState = Record<string, string>;

const toForm = (values: Values): FormState =>
    Object.fromEntries(Object.entries(values).map(([k, v]) => [k, toFormString(v)]));

export default function ConfigForm({ section, intro, fields, values, onApplied }: Props) {
    const initial = useMemo(() => toForm(values), [values]);
    const [form, setForm] = useState<FormState>(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [changes, setChanges] = useState<FieldChange[] | null>(null);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
    const [signing, setSigning] = useState(false);

    // Si llega una configuración nueva (después de aplicar), el formulario se resetea
    useEffect(() => {
        setForm(initial);
        setErrors({});
        setChanges(null);
    }, [initial]);

    const fieldMap = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

    // Solo se mandan los campos que el usuario tocó; el servidor valida y compara
    const edited = useMemo(() => {
        const out: Values = {};
        for (const f of fields) {
            if ((form[f.key] ?? "") !== (initial[f.key] ?? "")) out[f.key] = form[f.key] ?? "";
        }
        return out;
    }, [form, initial, fields]);

    const hasEdits = Object.keys(edited).length > 0;

    const groups = useMemo(() => {
        const map = new Map<string, FieldDef[]>();
        for (const f of fields) {
            const g = f.group ?? "_";
            map.set(g, [...(map.get(g) ?? []), f]);
        }
        return [...map.entries()];
    }, [fields]);

    const update = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setChanges(null);
        setMessage(null);
        if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
    };

    const handleReview = async () => {
        setChecking(true);
        setMessage(null);
        try {
            const result = await previewSection(section, edited);
            setErrors({});
            if (!result.length) {
                setMessage({ tone: "ok", text: "No hay cambios para aplicar." });
                setChanges(null);
            } else {
                setChanges(result);
            }
        } catch (err) {
            const e = toApiError(err);
            setErrors(e.errors ?? {});
            setMessage({ tone: "error", text: e.detail });
        } finally {
            setChecking(false);
        }
    };

    const handleSign = async (pin: string) => {
        try {
            const result = await applySection(section, edited, pin);
            setSigning(false);
            setMessage({
                tone: "ok",
                text: `${result.applied === 1 ? "Se guardó 1 cambio" : `Se guardaron ${result.applied} cambios`} en Beds24.`,
            });
            onApplied(result.config);
            return null;
        } catch (err) {
            const e = toApiError(err);
            if (e.code === "CLAVE_INCORRECTA") return { message: e.detail };
            if (e.code === "CLAVE_BLOQUEADA") return { message: e.detail, locked: true };
            setSigning(false);
            setErrors(e.errors ?? {});
            setChanges(null);
            setMessage({ tone: "error", text: e.detail });
            return null;
        }
    };

    return (
        <div className="cq-panel">
            <p className="cq-intro">{intro}</p>

            {groups.map(([group, list]) => (
                <fieldset key={group} className="cq-fieldset">
                    {group !== "_" && <legend className="cq-legend">{GROUP_TITLES[group] ?? group}</legend>}
                    <div className={`cq-grid ${group === "textos" ? "cq-grid--wide" : ""}`}>
                        {list.map((field) => (
                            <FieldInput
                                key={field.key}
                                field={field}
                                value={form[field.key] ?? ""}
                                current={values[field.key]}
                                error={errors[field.key]}
                                onChange={(v) => update(field.key, v)}
                            />
                        ))}
                    </div>
                </fieldset>
            ))}

            {message && (
                <p className={`cq-message cq-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
                    {message.text}
                </p>
            )}

            {changes && (
                <div className="cq-review">
                    <h3 className="cq-review-title">
                        {changes.length === 1 ? "Vas a cambiar 1 dato" : `Vas a cambiar ${changes.length} datos`}
                    </h3>
                    <ul className="cq-diff">
                        {changes.map((c) => (
                            <li key={c.key} className="cq-diff-item">
                                <span className="cq-diff-label">{c.label}</span>
                                <span className="cq-diff-before">{displayValue(fieldMap.get(c.key), c.before)}</span>
                                <span className="cq-diff-after">{displayValue(fieldMap.get(c.key), c.after)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="cq-actions">
                {hasEdits && (
                    <button type="button" className="cq-btn cq-btn--ghost" onClick={() => { setForm(initial); setChanges(null); setErrors({}); setMessage(null); }}>
                        Descartar cambios
                    </button>
                )}
                {changes ? (
                    <button type="button" className="cq-btn" onClick={() => setSigning(true)}>
                        Firmar y aplicar
                    </button>
                ) : (
                    <button type="button" className="cq-btn" onClick={handleReview} disabled={!hasEdits || checking}>
                        {checking ? "Revisando…" : "Revisar cambios"}
                    </button>
                )}
            </div>

            <SignModal
                open={signing}
                title="Firmar cambios"
                lines={(changes ?? []).map((c) => `${c.label}: ${displayValue(fieldMap.get(c.key), c.after)}`)}
                onSign={handleSign}
                onClose={() => setSigning(false)}
            />
        </div>
    );
}

// ---------- Un campo según su tipo ----------
interface FieldProps {
    field: FieldDef;
    value: string;
    current: Values[string];
    error?: string;
    onChange: (value: string) => void;
}

function FieldInput({ field, value, current, error, onChange }: FieldProps) {
    const id = `cq-f-${field.key}`;
    const describedBy = [field.help ? `${id}-help` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
    const common = { id, "aria-invalid": !!error, "aria-describedby": describedBy };

    // Si Beds24 tiene un valor que no está entre las opciones, se muestra igual
    const options = field.options ?? [];
    const currentStr = toFormString(current);
    const showCurrentOption = field.type === "select" && currentStr !== "" && !options.some((o) => o.value === currentStr);

    let control;
    if (field.type === "select") {
        control = (
            <select {...common} className="cq-input" value={value} onChange={(e) => onChange(e.target.value)}>
                {value === "" && <option value="">Elegí una opción</option>}
                {showCurrentOption && <option value={currentStr}>Actual ({currentStr})</option>}
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    } else if (field.type === "textarea") {
        control = (
            <>
                <textarea {...common} className="cq-input cq-textarea" rows={6} maxLength={field.maxLength}
                    value={value} onChange={(e) => onChange(e.target.value)} />
                {field.maxLength && <span className="cq-count">{value.length} / {field.maxLength}</span>}
            </>
        );
    } else {
        const type = field.type === "int" || field.type === "number" ? "number"
            : field.type === "time" ? "time"
            : field.type === "email" ? "email"
            : field.type === "phone" ? "tel" : "text";
        control = (
            <div className="cq-input-wrap">
                <input
                    {...common}
                    className="cq-input"
                    type={type}
                    min={field.min}
                    max={field.max}
                    step={field.type === "number" ? "0.01" : field.type === "int" ? "1" : undefined}
                    maxLength={field.maxLength}
                    inputMode={field.type === "int" ? "numeric" : field.type === "number" ? "decimal" : undefined}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                {field.unit && <span className="cq-unit">{field.unit}</span>}
            </div>
        );
    }

    return (
        <div className={`cq-field ${field.type === "textarea" ? "cq-field--wide" : ""}`}>
            <label className="cq-label" htmlFor={id}>{field.label}</label>
            {control}
            {field.help && <p id={`${id}-help`} className="cq-help">{field.help}</p>}
            {error && <p id={`${id}-error`} className="cq-field-error">{error}</p>}
        </div>
    );
}