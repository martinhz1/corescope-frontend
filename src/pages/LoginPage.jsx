import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, isAuthenticated } from "../lib/api";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import { theme as t, globalKeyframes } from "../lib/theme";

const LOGO_SRC = "/Logo-CoreScope.png";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/surveys", { replace: true });
      return;
    }
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("¡Bienvenido/a!");
      } else {
        await register(email, name, password);
        toast.success("Cuenta creada. Iniciando sesión...");
      }
      navigate("/surveys");
    } catch (err) {
      toast.error(err.message || (mode === "login" ? "Credenciales incorrectas" : "Error al crear la cuenta"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrapper}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        ${globalKeyframes}
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes glowDrift { 0%,100% { opacity: 0.55; transform: translate(0,0); } 50% { opacity: 0.85; transform: translate(8px,-10px); } }
        .li:focus { outline: none; border-color: ${t.color.brand} !important; box-shadow: 0 0 0 3px ${t.color.brandTint} !important; }
        .lb:not(:disabled):hover { background: ${t.color.brandHover} !important; }
        .switch-link:hover { color: ${t.color.brand} !important; }
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { padding: 32px 24px !important; align-items: flex-start !important; justify-content: flex-start !important; }
          .login-form-container { max-width: 100% !important; padding-top: 20px; }
          .login-mobile-brand { display: flex !important; }
        }
        @media (min-width: 769px) { .login-mobile-brand { display: none !important; } }
      `}</style>

      {/* Left panel */}
      <div className="login-left" style={S.leftPanel}>
        <div style={S.gridOverlay} />
        <div style={S.glowBlob} />
        <div style={S.cornerMark}>
          <span style={S.cornerTag}>CORESCOPE</span>
          <span style={S.cornerHair} />
          <span style={S.cornerTagFaint}>v1</span>
        </div>
        <div style={{ ...S.leftContent, opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.2s" }}>
          <img src={LOGO_SRC} alt="CoreScope" style={S.logo} />
          <div style={S.accentLine}>
            <span style={S.accentHair} />
            <span style={S.accentTag}>CORESCOPE</span>
            <span style={S.accentHair} />
          </div>
          <h2 style={S.tagline}>Mediciones ágiles de satisfacción</h2>
          <p style={S.description}>
            Pulsos rápidos para programas de formación y desarrollo. NPS, Likert,
            preguntas abiertas y dashboard en vivo en una sola plataforma.
          </p>
          <div style={S.pills}>
            {["Pulsos ad-hoc", "Dashboard en vivo", "NPS · Likert", "Exportación Excel"].map((text, i) => (
              <span key={i} style={{ ...S.pill, animationDelay: `${0.5 + i * 0.1}s` }}>{text}</span>
            ))}
          </div>
        </div>
        <p style={S.footer}>
          © {new Date().getFullYear()} CORESCOPE<br/>
          <span style={{ opacity: 0.6 }}>MEDICIONES ÁGILES DE SATISFACCIÓN</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="login-right" style={S.rightPanel}>
        <div className="login-mobile-brand" style={S.mobileBrand}>
          <Logo variant="horizontal" size={12} color="#2563eb" />
          <span style={{ width: 1, height: 14, background: "rgba(37,99,235,0.22)" }} />
          <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: "#2563eb", textTransform: "uppercase" }}>CoreScope</span>
        </div>

        <div className="login-form-container" style={{
          ...S.formContainer,
          animation: mounted ? "fadeUp 0.6s ease-out 0.3s both" : "none",
        }}>
          <div style={S.welcomeTag}>
            <span style={S.welcomeHair} />
            <span style={S.welcomeTagText}>{mode === "login" ? "ACCESO" : "REGISTRO"}</span>
          </div>

          <h1 style={S.title}>{mode === "login" ? "Bienvenido/a" : "Crear cuenta"}</h1>
          <p style={S.subtitle}>
            {mode === "login"
              ? "Inicia sesión para acceder a tus encuestas."
              : "Completá tus datos para comenzar."}
          </p>

          <form onSubmit={handleSubmit} style={S.form}>
            {mode === "register" && (
              <div style={S.field}>
                <label style={S.label}>NOMBRE</label>
                <input
                  className="li"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  style={S.input}
                />
              </div>
            )}

            <div style={S.field}>
              <label style={S.label}>CORREO</label>
              <input
                className="li"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                style={S.input}
              />
            </div>

            <div style={S.field}>
              <label style={S.label}>CONTRASEÑA</label>
              <input
                className="li"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={S.input}
              />
            </div>

            <button
              className="lb"
              type="submit"
              disabled={loading}
              style={S.button}
            >
              {loading ? "VERIFICANDO..." : mode === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
            </button>
          </form>

          <div style={S.switchRow}>
            <span style={S.switchText}>
              {mode === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}
            </span>
            <button
              className="switch-link"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setEmail(""); setPassword(""); setName(""); }}
              style={S.switchLink}
            >
              {mode === "login" ? "Registrarse" : "Iniciar sesión"}
            </button>
          </div>

          <div style={S.securityNote}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>CONEXIÓN SEGURA · CORESCOPE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  wrapper: { minHeight: "100vh", display: "flex", fontFamily: t.font.body, color: t.color.inkSoft },

  leftPanel: {
    width: "45%", background: "#070b1a", display: "flex", flexDirection: "column",
    justifyContent: "center", alignItems: "center", padding: "60px 56px",
    position: "relative", overflow: "hidden",
  },
  gridOverlay: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    backgroundSize: "44px 44px", pointerEvents: "none",
  },
  glowBlob: {
    position: "absolute", width: 540, height: 540, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)",
    bottom: -180, right: -180, animation: "glowDrift 9s ease-in-out infinite",
    filter: "blur(8px)", pointerEvents: "none",
  },
  cornerMark: { position: "absolute", top: 28, left: 32, display: "flex", alignItems: "center", gap: 10, zIndex: 2 },
  cornerTag: { fontFamily: t.font.display, fontSize: 10, fontWeight: 700, letterSpacing: t.track.technical, color: t.color.brandBright, textTransform: "uppercase" },
  cornerHair: { width: 18, height: 1, background: "rgba(37,99,235,0.4)", display: "inline-block" },
  cornerTagFaint: { fontFamily: t.font.display, fontSize: 10, fontWeight: 600, letterSpacing: t.track.widest, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" },
  leftContent: { position: "relative", zIndex: 1, maxWidth: 380, textAlign: "center" },
  logo: { width: 260, marginBottom: 36, animation: "float 7s ease-in-out infinite" },
  accentLine: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 26 },
  accentHair: { width: 32, height: 1, background: "rgba(37,99,235,0.5)", display: "inline-block" },
  accentTag: { fontFamily: t.font.display, fontSize: 10, fontWeight: 700, letterSpacing: t.track.technical, color: t.color.brandBright, textTransform: "uppercase" },
  tagline: { fontFamily: t.font.display, fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 18px", letterSpacing: t.track.tight, lineHeight: 1.18 },
  description: { fontFamily: t.font.body, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: "0 0 28px" },
  pills: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  pill: { fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600, letterSpacing: t.track.widest, textTransform: "uppercase", padding: "5px 11px", borderRadius: t.radius.sharp, background: "rgba(37,99,235,0.08)", color: t.color.brandBright, border: "1px solid rgba(37,99,235,0.18)", animation: "fadeIn 0.4s ease both" },
  footer: { position: "absolute", bottom: 28, fontFamily: t.font.display, fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: t.track.widest, textTransform: "uppercase", lineHeight: 1.8, textAlign: "center", zIndex: 2 },

  rightPanel: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", position: "relative", ...t.blueprintBg },
  mobileBrand: { display: "none", alignItems: "center", gap: 8, marginBottom: 32 },
  formContainer: { width: "100%", maxWidth: 380 },
  welcomeTag: { display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 },
  welcomeHair: { width: 28, height: 1, background: t.color.brandLineHover, display: "inline-block" },
  welcomeTagText: { fontFamily: t.font.display, fontSize: 10, fontWeight: 700, letterSpacing: t.track.technical, color: t.color.brand, textTransform: "uppercase" },
  title: { fontFamily: t.font.display, fontSize: 36, fontWeight: 700, color: t.color.ink, margin: "0 0 10px", letterSpacing: t.track.tight, lineHeight: 1.05 },
  subtitle: { fontSize: 14, color: t.color.mutedSoft, margin: "0 0 28px", lineHeight: 1.55, fontFamily: t.font.body },

  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontFamily: t.font.display, fontSize: 9.5, fontWeight: 700, letterSpacing: t.track.technical, color: t.color.muted, textTransform: "uppercase" },
  input: {
    fontFamily: t.font.body, fontSize: 14, color: t.color.ink,
    background: t.color.surface, border: `1px solid ${t.color.borderStrong}`,
    borderRadius: t.radius.sharp, padding: "10px 14px",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%", boxSizing: "border-box",
  },
  button: {
    marginTop: 4, fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: t.track.widest, textTransform: "uppercase",
    background: t.color.brand, color: "#fff", border: "none",
    borderRadius: t.radius.sharp, padding: "13px 24px",
    cursor: "pointer", transition: "background 0.15s",
    width: "100%",
  },
  switchRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  switchText: { fontFamily: t.font.display, fontSize: 10, fontWeight: 600, letterSpacing: t.track.wide, color: t.color.mutedSoft, textTransform: "uppercase" },
  switchLink: { fontFamily: t.font.display, fontSize: 10, fontWeight: 700, letterSpacing: t.track.wide, color: t.color.muted, textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", padding: 0 },
  securityNote: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 28, fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600, letterSpacing: t.track.widest, color: t.color.mutedFaint, textTransform: "uppercase" },
};
