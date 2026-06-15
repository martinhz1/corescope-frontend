import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadLogo, resolveImageUrl } from "../lib/api";

/**
 * LogoInput — campo unificado para logo de encuesta.
 *
 * Permite dos formas de cargar el logo:
 * 1. Subir un archivo local (PNG/JPG/SVG/WEBP/GIF, máx 500 KB).
 * 2. Pegar un URL externo (https://...).
 *
 * `value` es el string que se guarda en `Survey.logo_url` (relativo
 * `/api/uploads/{id}` o URL absoluto). `onChange(newValue)` se llama
 * con el nuevo valor.
 *
 * Props:
 *   value: string
 *   onChange: (next: string) => void
 *   disabled?: boolean
 *   inputStyle?: object  — override del estilo del text input para que
 *     encaje visualmente con el modal/card donde se monta.
 */
export default function LogoInput({ value, onChange, disabled, inputStyle }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Tiene que ser una imagen (PNG, JPG, SVG, WEBP, GIF).");
      e.target.value = "";
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("Máximo 500 KB. Reducí el peso del archivo y reintenta.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const result = await uploadLogo(file);
      onChange(result.url);
      toast.success("Logo subido");
    } catch (err) {
      toast.error(err.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
      // Permitir re-subir el mismo archivo si el usuario lo elige de nuevo.
      if (e.target) e.target.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
  };

  const isDisabled = !!disabled || uploading;
  const previewSrc = value ? resolveImageUrl(value) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {previewSrc && (
          <img
            src={previewSrc}
            alt=""
            style={{
              width: 40, height: 40, objectFit: "contain",
              borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
              background: "#0f172a", flexShrink: 0,
            }}
            onError={e => { e.currentTarget.style.display = "none"; }}
            onLoad={e => { e.currentTarget.style.display = "block"; }}
          />
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          ref={fileRef}
          onChange={handleFile}
          disabled={isDisabled}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isDisabled}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 6,
            border: "1px solid rgba(37,99,235,0.25)",
            background: "rgba(37,99,235,0.06)",
            color: "#2563eb",
            fontFamily: "Archivo, sans-serif",
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            cursor: isDisabled ? "wait" : "pointer",
            opacity: isDisabled ? 0.6 : 1,
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!isDisabled) { e.currentTarget.style.background = "rgba(37,99,235,0.12)"; e.currentTarget.style.borderColor = "#2563eb"; } }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,99,235,0.06)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.25)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {uploading ? "Subiendo..." : (value ? "Cambiar" : "Subir archivo")}
        </button>

        {value && !uploading && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isDisabled}
            style={{
              padding: "6px 10px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "#94a3b8",
              fontSize: 12, fontFamily: "inherit",
              cursor: "pointer",
            }}
            title="Quitar logo"
          >
            Quitar
          </button>
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={e => {
          const v = e.target.value;
          // El campo logo_url en DB es VARCHAR(500) — las data URLs en base64
          // miden miles de caracteres y revientan el INSERT. Forzamos al usuario
          // a subir el archivo o a pegar una URL pública.
          if (v.startsWith("data:")) {
            toast.error(
              "Eso es una imagen en base64, no se puede guardar. Usa el botón 'Subir archivo' o pega una URL pública (https://…).",
              { duration: 6000 }
            );
            return;
          }
          onChange(v);
        }}
        onPaste={e => {
          const pasted = e.clipboardData?.getData("text") || "";
          if (pasted.startsWith("data:")) {
            e.preventDefault();
            toast.error(
              "Lo que pegaste es una imagen embebida en base64. Para usar una imagen local, haz click en 'Subir archivo'. Para una URL externa, copia un link que empiece con https://.",
              { duration: 7000 }
            );
          }
        }}
        placeholder="…o pega una URL: https://ejemplo.com/logo.png"
        disabled={isDisabled}
        style={inputStyle || {
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          background: "#0f172a",
        }}
      />

      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -2 }}>
        PNG, JPG, WEBP, SVG o GIF — hasta 500 KB. La URL externa debe empezar con <code style={{ background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 3, fontSize: 10.5 }}>https://</code> (no se aceptan imágenes en base64).
      </div>
    </div>
  );
}
