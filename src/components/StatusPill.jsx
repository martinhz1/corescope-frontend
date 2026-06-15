/**
 * StatusPill.jsx — Pill cuadrado uniforme para estados de encuesta.
 *
 * Reemplaza el badge round-pill que se usaba antes. Diseño cuadrado (radius 4),
 * Archivo uppercase con tracking widest, dot pulsante cuando active.
 *
 *   <StatusPill status="active" />
 *   <StatusPill status="closed" size="sm" />
 *   <StatusPill status="draft" />
 *
 * Si necesitás el keyframe `pulseDot`, asegurate que la página lo tenga
 * incluido (está en theme.js → globalKeyframes).
 */
import { theme as t } from "../lib/theme";

const CONFIG = {
  draft:  { label: "Borrador", color: t.color.mutedSoft,    bg: "rgba(153,153,153,0.08)", line: "rgba(153,153,153,0.22)" },
  active: { label: "Activa",   color: t.color.brand,        bg: t.color.brandTint,         line: t.color.brandLine },
  closed: { label: "Cerrada",  color: t.color.danger,       bg: t.color.dangerTint,        line: t.color.dangerLine },
};

const SIZE = {
  sm: { padX: 8,  padY: 3, font: 9,    dot: 5 },
  md: { padX: 11, padY: 5, font: 10,   dot: 6 },
  lg: { padX: 14, padY: 6, font: 11,   dot: 7 },
};

export default function StatusPill({ status = "draft", size = "md" }) {
  const c = CONFIG[status] || CONFIG.draft;
  const s = SIZE[size] || SIZE.md;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: `${s.padY}px ${s.padX}px`,
      background: c.bg,
      border: `1px solid ${c.line}`,
      borderRadius: t.radius.sharp,
      whiteSpace: "nowrap",
      lineHeight: 1,
    }}>
      <span style={{
        width: s.dot,
        height: s.dot,
        borderRadius: "50%",
        background: c.color,
        animation: status === "active" ? "pulseDot 2s ease infinite" : "none",
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: t.font.display,
        fontSize: s.font,
        fontWeight: 700,
        letterSpacing: t.track.widest,
        color: c.color,
        textTransform: "uppercase",
      }}>
        {c.label}
      </span>
    </span>
  );
}
