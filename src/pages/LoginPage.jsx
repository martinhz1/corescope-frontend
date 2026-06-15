import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { googleLogin, isAuthenticated } from "../lib/api";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import { theme as t, globalKeyframes } from "../lib/theme";

const LOGO_SRC = "/Logo-CoreScope.png";

const GOOGLE_CLIENT_ID = "746559027969-8f14hks7c39rsrk078jqqseh6062o0cf.apps.googleusercontent.com";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/surveys", { replace: true });
      return;
    }
    setMounted(true);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: 300, text: "signin_with", shape: "pill", logo_alignment: "center" }
      );
    };
    document.head.appendChild(script);
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      await googleLogin(response.credential);
      toast.success("\u00a1Bienvenido/a!");
      navigate("/surveys");
    } catch (err) {
      toast.error(err.message || "Error al iniciar sesi\u00f3n con Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        ${globalKeyframes}
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes glowDrift { 0%,100% { opacity: 0.55; transform: translate(0,0); } 50% { opacity: 0.85; transform: translate(8px,-10px); } }
        .li:focus { border-color: ${t.color.brand} !important; box-shadow: 0 0 0 3px ${t.color.brandTint} !important; }
        .lb:not(:disabled):hover { background: ${t.color.brandHover} !important; box-shadow: 0 10px 28px -10px rgba(37,99,235,0.6); }
        .lb:not(:disabled):hover .lb-arrow { transform: translateX(4px); }
        .lb-arrow { transition: transform 0.2s ${t.ease}; display: inline-block; }

        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right {
            padding: 32px 24px !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
          }
          .login-form-container {
            max-width: 100% !important;
            padding-top: 20px;
          }
          .login-mobile-brand {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .login-mobile-brand { display: none !important; }
        }
      `}</style>

      {/* Left panel — oculto en móvil */}
      <div className="login-left" style={styles.leftPanel}>
        {/* Atmospheric glow + grid blueprint */}
        <div style={styles.gridOverlay} />
        <div style={styles.glowBlob} />

        {/* Top corner mark */}
        <div style={styles.cornerMark}>
          <span style={styles.cornerTag}>CORESCOPE</span>
          <span style={styles.cornerHair} />
          <span style={styles.cornerTagFaint}>v1</span>
        </div>

        {/* Content */}
        <div style={{ ...styles.leftContent, opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.2s" }}>
          <img src={LOGO_SRC} alt="CoreScope" style={styles.logo} />

          <div style={styles.accentLine}>
            <span style={styles.accentHair} />
            <span style={styles.accentTag}>CORESCOPE</span>
            <span style={styles.accentHair} />
          </div>

          <h2 style={styles.tagline}>Mediciones ágiles de satisfacción</h2>
          <p style={styles.description}>
            Pulsos rápidos para programas de formación y desarrollo. NPS, Likert,
            preguntas abiertas y dashboard en vivo en una sola plataforma.
          </p>

          {/* Feature pills */}
          <div style={styles.pills}>
            {["Pulsos ad-hoc", "Dashboard en vivo", "NPS · Likert", "Exportación Excel"].map((text, i) => (
              <span key={i} style={{ ...styles.pill, animationDelay: `${0.5 + i * 0.1}s` }}>{text}</span>
            ))}
          </div>
        </div>

        <p style={styles.footer}>
          © {new Date().getFullYear()} CORESCOPE<br/>
          <span style={{ opacity: 0.6 }}>MEDICIONES ÁGILES DE SATISFACCIÓN</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="login-right" style={styles.rightPanel}>

        {/* Marca compacta — solo visible en móvil */}
        <div className="login-mobile-brand" style={styles.mobileBrand}>
          <Logo variant="horizontal" size={12} color="#2563eb" />
          <span style={{ width: 1, height: 14, background: "rgba(37,99,235,0.22)" }} />
          <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: "#2563eb", textTransform: "uppercase" }}>CoreScope</span>
        </div>

        <div className="login-form-container" style={{
          ...styles.formContainer,
          animation: mounted ? "fadeUp 0.6s ease-out 0.3s both" : "none",
        }}>
          <div style={styles.welcomeTag}>
            <span style={styles.welcomeHair} />
            <span style={styles.welcomeTagText}>ACCESO</span>
          </div>

          <h1 style={styles.title}>Bienvenido/a</h1>
          <p style={styles.subtitle}>
            Inicia sesión para acceder a tus encuestas.
          </p>

          <div style={styles.googleBlock}>
            <div style={styles.googleHint}>
              <span style={styles.googleHair} />
              <span style={styles.googleHintText}>INICIA SESIÓN CON</span>
              <span style={styles.googleHair} />
            </div>
            <div id="google-signin-btn" style={styles.googleBtnWrap} />
            {loading && (
              <div style={styles.loadingRow}>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke={t.color.brandLine} strokeWidth="3" fill="none" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke={t.color.brand} strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
                <span>VERIFICANDO ACCESO</span>
              </div>
            )}
          </div>

          <div style={styles.securityNote}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>GOOGLE OAUTH · CONEXIÓN SEGURA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    fontFamily: t.font.body,
    color: t.color.inkSoft,
  },

  // ── Left panel (dark, brand) ──
  leftPanel: {
    width: "45%",
    background: "#070b1a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 56px",
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), " +
      "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    pointerEvents: "none",
  },
  glowBlob: {
    position: "absolute",
    width: 540,
    height: 540,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)",
    bottom: -180,
    right: -180,
    animation: "glowDrift 9s ease-in-out infinite",
    filter: "blur(8px)",
    pointerEvents: "none",
  },
  cornerMark: {
    position: "absolute",
    top: 28,
    left: 32,
    display: "flex",
    alignItems: "center",
    gap: 10,
    zIndex: 2,
  },
  cornerTag: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brandBright,
    textTransform: "uppercase",
  },
  cornerHair: {
    width: 18, height: 1,
    background: "rgba(37,99,235,0.4)",
    display: "inline-block",
  },
  cornerTagFaint: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
  },

  leftContent: {
    position: "relative",
    zIndex: 1,
    maxWidth: 380,
    textAlign: "center",
  },
  logo: {
    width: 260,
    marginBottom: 36,
    animation: "float 7s ease-in-out infinite",
  },
  accentLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 26,
  },
  accentHair: {
    width: 32, height: 1,
    background: "rgba(37,99,235,0.5)",
    display: "inline-block",
  },
  accentTag: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brandBright,
    textTransform: "uppercase",
  },
  tagline: {
    fontFamily: t.font.display,
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 18px",
    letterSpacing: t.track.tight,
    lineHeight: 1.18,
  },
  description: {
    fontFamily: t.font.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.65,
    margin: "0 0 28px",
  },
  pills: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  pill: {
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    textTransform: "uppercase",
    padding: "5px 11px",
    borderRadius: t.radius.sharp,
    background: "rgba(37,99,235,0.08)",
    color: t.color.brandBright,
    border: "1px solid rgba(37,99,235,0.18)",
    animation: "fadeIn 0.4s ease both",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 500,
    color: "rgba(255,255,255,0.3)",
    margin: 0,
    letterSpacing: t.track.widest,
    textTransform: "uppercase",
    lineHeight: 1.8,
    textAlign: "center",
    zIndex: 2,
  },

  // ── Right panel (form) ──
  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    position: "relative",
    ...t.blueprintBg,
  },
  mobileBrand: {
    display: "none",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
    maxWidth: 380,
  },
  welcomeTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  welcomeHair: {
    width: 28, height: 1,
    background: t.color.brandLineHover,
    display: "inline-block",
  },
  welcomeTagText: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: t.font.display,
    fontSize: 36,
    fontWeight: 700,
    color: t.color.ink,
    margin: "0 0 10px",
    letterSpacing: t.track.tight,
    lineHeight: 1.05,
  },
  subtitle: {
    fontSize: 14,
    color: t.color.mutedSoft,
    margin: "0 0 32px",
    lineHeight: 1.55,
    fontFamily: t.font.body,
  },
  // ── Google sign-in block ──
  googleBlock: {
    marginTop: 32,
  },
  googleHint: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 18,
  },
  googleHair: {
    flex: 1,
    height: 1,
    background: t.color.brandLineSoft,
  },
  googleHintText: {
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  googleBtnWrap: {
    display: "flex",
    justifyContent: "center",
    minHeight: 44,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 32,
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedFaint,
    textTransform: "uppercase",
  },
};
