import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
    open: boolean;
    title: string;
    lines: string[];
    // Devuelve un mensaje para mostrar en el modal (queda abierto)
    // o null cuando el padre ya resolvió y lo cierra.
    onSign: (pin: string) => Promise<{ message: string; locked?: boolean } | null>;
    onClose: () => void;
}

export default function SignModal({ open, title, lines, onSign, onClose }: Props) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [locked, setLocked] = useState(false);
    const [sending, setSending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const returnFocus = useRef<HTMLElement | null>(null);

    // Al abrir: limpiar, enfocar la clave y recordar dónde estaba el foco
    useEffect(() => {
        if (!open) return;
        returnFocus.current = document.activeElement as HTMLElement | null;
        setPin("");
        setError(null);
        setLocked(false);
        const id = requestAnimationFrame(() => inputRef.current?.focus());
        return () => {
            cancelAnimationFrame(id);
            returnFocus.current?.focus?.();
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !sending) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, sending, onClose]);

    if (!open) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4 || sending || locked) return;
        setSending(true);
        setError(null);
        try {
            const result = await onSign(pin);
            if (result) {
                setError(result.message);
                setLocked(!!result.locked);
                setPin("");
                inputRef.current?.focus();
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="cq-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}>
            <form
                className="cq-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cq-modal-title"
                onSubmit={handleSubmit}
            >
                <h2 id="cq-modal-title" className="cq-modal-title">{title}</h2>

                <ul className="cq-modal-lines">
                    {lines.map((line) => <li key={line}>{line}</li>)}
                </ul>

                <label className="cq-modal-label" htmlFor="cq-pin">Clave de firma</label>
                <input
                    ref={inputRef}
                    id="cq-pin"
                    className="cq-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={pin}
                    disabled={locked || sending}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    aria-describedby={error ? "cq-pin-error" : undefined}
                    aria-invalid={!!error}
                />
                {error && <p id="cq-pin-error" className="cq-modal-error" role="alert">{error}</p>}

                <div className="cq-modal-actions">
                    <button type="button" className="cq-btn cq-btn--ghost" onClick={onClose} disabled={sending}>
                        Cancelar
                    </button>
                    <button type="submit" className="cq-btn" disabled={pin.length !== 4 || sending || locked}>
                        {sending ? "Aplicando…" : "Firmar y aplicar"}
                    </button>
                </div>
            </form>
        </div>
    );
}