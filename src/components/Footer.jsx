/**
 * Footer.jsx — Pie de página minimalista.
 *
 * Para páginas internas (admin). NO usar en páginas públicas
 * (PublicSurveyPage, dashboard cliente vía /d/:token).
 */
import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={S.footer}>
      <div style={S.inner}>
        <div style={S.left}>
          <Logo variant="horizontal" size={11} color="#2563eb" />
          <span style={S.divider} />
          <span style={S.tag}>CoreScope · {year}</span>
        </div>
      </div>
    </footer>
  );
}

const S = {
  footer: {
    borderTop: "1px solid rgba(37,99,235,0.12)",
    padding: "32px 24px 36px",
    marginTop: 80,
    background: "transparent",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  inner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
    flexWrap: "wrap",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  divider: {
    width: 1,
    height: 14,
    background: "rgba(37,99,235,0.22)",
    display: "inline-block",
  },
  tag: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.22em",
    color: "#2563eb",
    textTransform: "uppercase",
  },
  disclaimer: {
    fontSize: 11,
    color: "#64748b",
    margin: 0,
    maxWidth: 540,
    lineHeight: 1.65,
    textAlign: "right",
    flex: "1 1 auto",
  },
  strong: {
    color: "#2563eb",
    fontWeight: 700,
  },
};
