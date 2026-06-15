/**
 * theme.js — Tokens compartidos del sistema de diseño CoreScope (dark theme).
 *
 * Toda la app importa de acá. Si tocás un valor, cambia en toda la plataforma.
 * Antes de hardcodear color/radius/font en una página nueva, pasá por este archivo.
 *
 *   import { theme as t } from "../lib/theme";
 *   const button = { background: t.color.brandBright, borderRadius: t.radius.sharp };
 */

export const theme = {
  // ───── Color system ─────────────────────────────────────────────
  color: {
    // Brand CoreScope — navy + azul eléctrico del logo
    brand: "#2563eb",          // Azul accent — botones primary, status active, links (el color "vivo" del logo)
    brandHover: "#1d4ed8",
    brandBright: "#2563eb",    // Alias para retrocompat — mismo azul
    brandTint: "rgba(37,99,235,0.10)",       // Backgrounds sutiles
    brandTintStrong: "rgba(37,99,235,0.20)", // Backgrounds más visibles
    brandLine: "rgba(37,99,235,0.32)",       // Bordes con tinte de marca
    brandLineSoft: "rgba(37,99,235,0.16)",
    brandLineHover: "rgba(37,99,235,0.55)",

    // Ink (texto) — invertido para dark theme
    ink: "#f8fafc",        // Títulos display (casi blanco, slate-50)
    inkSoft: "#e2e8f0",    // Body principal (slate-200)
    muted: "#94a3b8",      // Body secundario (slate-400)
    mutedSoft: "#64748b",  // Labels tertiary, metadata (slate-500)
    mutedFaint: "#475569", // Disabled, empty states (slate-600)

    // Surfaces — dark
    paper: "#070b1a",      // Background de página (navy casi negro, slightly different than logo bg)
    surface: "#0f172a",    // Cards, modals (slate-900)
    surfaceAlt: "#1e293b", // Surfaces elevadas / hover (slate-800)

    // Borders genéricos para dark theme
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.14)",

    // Estados — colores neutros
    danger: "#f87171",     // red-400 (más visible sobre dark)
    dangerSoft: "#ef4444",
    dangerTint: "rgba(248,113,113,0.10)",
    dangerLine: "rgba(248,113,113,0.30)",
    warning: "#fbbf24",    // amber-400
    success: "#34d399",    // emerald-400
  },

  // ───── Geometry ─────────────────────────────────────────────────
  radius: {
    sharp: 4,
    soft: 6,
    card: 8,
    big: 12,
    pill: 999,
  },

  // ───── Typography ───────────────────────────────────────────────
  font: {
    display: "'Archivo', 'Familjen Grotesk', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
  },

  // Letter-spacing presets
  track: {
    tight: "-0.025em",
    normal: 0,
    wide: "0.12em",
    wider: "0.18em",
    widest: "0.22em",
    technical: "0.32em",
  },

  // Hairlines reutilizables — sobre dark surface
  hairline: "1px solid rgba(255,255,255,0.10)",
  hairlineSoft: "1px solid rgba(255,255,255,0.05)",
  hairlineStrong: "1px solid rgba(255,255,255,0.18)",

  // Background sutil del .page (navy casi negro + grid muy tenue azul)
  blueprintBg: {
    background: "#070b1a",
    backgroundImage:
      "linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), " +
      "linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },

  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
};

// ───── Style helpers ──────────────────────────────────────────────

export function tagLabel({
  size = 10,
  weight = 600,
  color = theme.color.brandBright,
  track = theme.track.widest,
} = {}) {
  return {
    fontFamily: theme.font.display,
    fontSize: size,
    fontWeight: weight,
    letterSpacing: track,
    textTransform: "uppercase",
    color,
    lineHeight: 1,
  };
}

export function displayTitle({
  size = 32,
  weight = 700,
  color = theme.color.ink,
} = {}) {
  return {
    fontFamily: theme.font.display,
    fontSize: size,
    fontWeight: weight,
    color,
    letterSpacing: theme.track.tight,
    lineHeight: 1.06,
    margin: 0,
  };
}

export const hairSpan = {
  width: 18,
  height: 1,
  background: "rgba(255,255,255,0.18)",
  display: "inline-block",
  flexShrink: 0,
};

export const dotSpan = {
  width: 3,
  height: 3,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.3)",
  display: "inline-block",
  flexShrink: 0,
};

export const vDivider = {
  width: 1,
  height: 16,
  background: "rgba(255,255,255,0.16)",
  display: "inline-block",
  flexShrink: 0,
};

export const globalKeyframes = `
  @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  @keyframes fadeUp   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin     { to { transform: rotate(360deg); } }
`;
