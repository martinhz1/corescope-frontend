import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, isAuthenticated } from "../lib/api";
import toast from "react-hot-toast";
import { theme as t, globalKeyframes } from "../lib/theme";

// ─── Static content ───────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "¿Necesito tarjeta de crédito para empezar?",
    a: "No. Podés crear tu cuenta y tu primer pulso sin ingresar datos de pago. El plan gratuito incluye encuestas ilimitadas para equipos pequeños.",
  },
  {
    q: "¿Los respondentes necesitan una cuenta?",
    a: "No. Recibirán un link único y pueden responder directamente desde el navegador, sin registrarse ni instalar nada.",
  },
  {
    q: "¿Cuántas respuestas puedo recibir?",
    a: "El plan gratuito incluye hasta 200 respuestas por mes. Para volúmenes mayores, los planes Pro y Business ofrecen respuestas ilimitadas.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Todos los datos se almacenan en servidores PostgreSQL con cifrado en tránsito (HTTPS). Los respondentes son completamente anónimos — no se guarda ningún dato identificable.",
  },
  {
    q: "¿Puedo exportar los resultados?",
    a: "Sí. Cada encuesta tiene exportación a Excel (.xlsx) y generación de reporte PDF con los resultados consolidados.",
  },
];

const USE_CASES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    title: "Post-capacitación",
    desc: "Medí satisfacción y aprendizaje percibido inmediatamente después de cada sesión de formación.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "NPS de equipo",
    desc: "Aplicá el Net Promoter Score internamente para medir lealtad y compromiso del equipo de forma periódica.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      </svg>
    ),
    title: "Clima laboral",
    desc: "Detectá tensiones tempranas con pulsos rápidos antes de que se conviertan en problemas de retención.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    title: "Feedback de producto",
    desc: "Recogé opiniones de usuarios reales sobre prototipos y nuevas funciones, sin fricción.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Creá tu pulso",
    desc: "Seleccioná preguntas del banco (Likert, NPS, texto libre) o escribí las tuyas. Personalizá con el logo de tu cliente en segundos.",
  },
  {
    n: "02",
    title: "Compartí el link",
    desc: "Publicá y obtenés un link único. Mandalo por WhatsApp, email o proyectalo como QR. Sin apps ni instalaciones.",
  },
  {
    n: "03",
    title: "Resultados en vivo",
    desc: "El dashboard se actualiza en tiempo real. Favorabilidad, NPS y preguntas abiertas disponibles al instante.",
  },
];

const BARS = [
  { label: "Liderazgo", pct: 84, delay: "0s" },
  { label: "Comunicación", pct: 71, delay: "0.12s" },
  { label: "Aprendizaje", pct: 91, delay: "0.24s" },
  { label: "Clima", pct: 67, delay: "0.36s" },
  { label: "NPS", pct: 78, delay: "0.48s" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) { navigate("/surveys", { replace: true }); return; }
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openModal = (mode = "register") => {
    setModalMode(mode);
    setEmail(""); setName(""); setPassword("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalMode === "login") {
        await login(email, password);
        toast.success("¡Bienvenido/a!");
      } else {
        await register(email, name, password);
        toast.success("Cuenta creada.");
      }
      navigate("/surveys");
    } catch (err) {
      toast.error(err.message || (modalMode === "login" ? "Credenciales incorrectas" : "Error al crear la cuenta"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{CSS}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className="cs-nav" style={{ ...S.nav, ...(scrolled ? S.navScrolled : {}) }}>
        <img src="/Logo-CoreScope.png" alt="CoreScope" style={S.navLogo} />
        <div style={S.navRight}>
          <button className="cs-nav-ghost" onClick={() => openModal("login")} style={S.navGhost}>
            Iniciar sesión
          </button>
          <button className="cs-btn-primary" onClick={() => openModal("register")} style={S.navPrimary}>
            Comenzar gratis
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={S.hero}>
        <div style={S.heroGlow} />
        <div style={S.heroGrid} />
        <div className="cs-hero-inner" style={S.heroInner}>
          {/* Left */}
          <div style={S.heroLeft}>
            <div style={S.eyebrow}>
              <span style={S.eyebrowDot} />
              PLATAFORMA DE MEDICIÓN · B2B
            </div>
            <h1 className="cs-hero-h1" style={S.heroH1}>
              Medí lo que importa,{" "}
              <span style={S.heroAccent}>en tiempo real.</span>
            </h1>
            <p className="cs-hero-sub" style={S.heroSub}>
              Pulsos de satisfacción con NPS, Likert y preguntas abiertas.
              Dashboard en vivo. Exportación Excel y PDF. Sin complicaciones.
            </p>
            <div className="cs-hero-ctas" style={S.heroCtas}>
              <button className="cs-btn-primary" onClick={() => openModal("register")} style={S.btnPrimary}>
                Comenzar gratis
              </button>
              <button
                className="cs-btn-ghost"
                onClick={() => document.getElementById("como-funciona").scrollIntoView({ behavior: "smooth" })}
                style={S.btnGhost}
              >
                Ver cómo funciona
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right — live dashboard mockup */}
          <div className="cs-hero-card-wrap" style={S.heroCardWrap}>
            <div style={S.liveCard}>
              <div style={S.liveCardHeader}>
                <span style={S.liveCardTitle}>Satisfacción General</span>
                <span style={S.livePill}>
                  <span style={S.liveDot} />
                  LIVE
                </span>
              </div>
              <div style={{ marginBottom: 4 }}>
                {BARS.map(({ label, pct, delay }) => (
                  <div key={label} style={S.barRow}>
                    <span style={S.barLabel}>{label}</span>
                    <div style={S.barTrack}>
                      <div
                        className="cs-bar-fill"
                        style={{ ...S.barFill, "--pct": `${pct}%`, animationDelay: delay }}
                      />
                    </div>
                    <span style={S.barPct}>{pct}%</span>
                  </div>
                ))}
              </div>
              <div style={S.cardFooter}>
                <span style={S.cardFooterDot} />
                <span style={S.cardFooterText}>47 respuestas · actualizado ahora</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUÉ ES CORESCOPE ───────────────────────────────────────────── */}
      <section className="cs-section" style={S.section}>
        <div style={S.sectionInner}>
          <p style={S.sectionLabel}>QUÉ ES CORESCOPE</p>
          <h2 className="cs-section-h2" style={S.sectionH2}>
            La herramienta que los consultores OD necesitaban
          </h2>
          <div className="cs-three-col" style={S.threeCol}>
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.color.brand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                  </svg>
                ),
                title: "Pulsos rápidos",
                desc: "Creá una encuesta en minutos con preguntas del banco o propias. Diseñada para consultores, no para ingenieros.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.color.brand} strokeWidth="1.8" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: "Dashboard en vivo",
                desc: "Favorabilidad, distribución de respuestas y NPS actualizados en tiempo real, mientras llegan las respuestas.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.color.brand} strokeWidth="1.8" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                ),
                title: "Exportación Excel y PDF",
                desc: "Resultados listos para presentar al cliente, con un clic. Sin formatear nada a mano.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="cs-feature-card" style={S.featureCard}>
                <div style={S.featureIconWrap}>{icon}</div>
                <h3 style={S.featureTitle}>{title}</h3>
                <p style={S.featureDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CASOS DE USO ───────────────────────────────────────────────── */}
      <section className="cs-section" style={{ ...S.section, background: t.color.surface }}>
        <div style={S.sectionInner}>
          <p style={S.sectionLabel}>CASOS DE USO</p>
          <h2 className="cs-section-h2" style={S.sectionH2}>
            Para cada momento de tu consultoría
          </h2>
          <div className="cs-use-grid" style={S.useGrid}>
            {USE_CASES.map(({ icon, title, desc }) => (
              <div key={title} className="cs-use-card" style={S.useCard}>
                <div style={S.useIconWrap}>{icon}</div>
                <h3 style={S.useTitle}>{title}</h3>
                <p style={S.useDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────── */}
      <section id="como-funciona" className="cs-section" style={S.section}>
        <div style={S.sectionInner}>
          <p style={S.sectionLabel}>CÓMO FUNCIONA</p>
          <h2 className="cs-section-h2" style={S.sectionH2}>
            De cero a resultados en tres pasos
          </h2>
          <div className="cs-steps" style={S.steps}>
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} style={S.stepWrap}>
                <div style={S.stepCard}>
                  <span style={S.stepNum}>{n}</span>
                  <h3 style={S.stepTitle}>{title}</h3>
                  <p style={S.stepDesc}>{desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="cs-step-connector" style={S.stepConnector} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="cs-section" style={{ ...S.section, background: t.color.surface }}>
        <div style={{ ...S.sectionInner, maxWidth: 700 }}>
          <p style={S.sectionLabel}>PREGUNTAS FRECUENTES</p>
          <h2 className="cs-section-h2" style={S.sectionH2}>
            Todo lo que necesitás saber
          </h2>
          <div>
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className="cs-faq-item"
                style={S.faqItem}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={S.faqQ}>
                  <span style={S.faqQText}>{q}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={t.color.muted} strokeWidth="2" strokeLinecap="round"
                    style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {openFaq === i && <p style={S.faqA}>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────── */}
      <section style={S.ctaSection}>
        <div style={S.ctaGlow} />
        <div style={S.ctaInner}>
          <h2 className="cs-cta-h2" style={S.ctaH2}>
            Tu próxima encuesta está a tres minutos.
          </h2>
          <p style={S.ctaSub}>
            Sin configuración compleja. Sin tarjeta de crédito. Solo resultados.
          </p>
          <button className="cs-btn-primary" onClick={() => openModal("register")} style={{ ...S.btnPrimary, padding: "14px 40px", fontSize: 12 }}>
            Comenzar gratis
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="cs-footer" style={S.footer}>
        <img src="/Logo-CoreScope.png" alt="CoreScope" style={{ height: 26, width: "auto", mixBlendMode: "screen" }} />
        <p style={S.footerCopy}>© 2026 CoreScope · Todos los derechos reservados</p>
        <div style={S.footerLinks}>
          <button className="cs-footer-link" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={S.footerLink}>
            Inicio
          </button>
          <span style={{ color: t.color.mutedFaint, fontSize: 10 }}>·</span>
          <a href="mailto:hola@corescope.app" style={{ ...S.footerLink, textDecoration: "none" }} className="cs-footer-link">
            Contacto
          </a>
        </div>
      </footer>

      {/* ── MODAL ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={S.overlay}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={S.modal}>
            <button className="cs-modal-close" onClick={() => setModalOpen(false)} style={S.modalClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <img src="/Logo-CoreScope.png" alt="CoreScope" style={{ height: 30, width: "auto", mixBlendMode: "screen", marginBottom: 24 }} />

            {/* Tabs */}
            <div style={S.modalTabs}>
              {[
                { key: "login", label: "Iniciar sesión" },
                { key: "register", label: "Registrarse" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setModalMode(key); setEmail(""); setName(""); setPassword(""); }}
                  className={modalMode === key ? "cs-modal-tab-active" : "cs-modal-tab"}
                  style={{ ...S.modalTab, ...(modalMode === key ? S.modalTabActive : {}) }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={S.modalForm}>
              {modalMode === "register" && (
                <div style={S.field}>
                  <label style={S.fieldLabel}>NOMBRE</label>
                  <input
                    className="cs-input"
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
                <label style={S.fieldLabel}>CORREO</label>
                <input
                  className="cs-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  style={S.input}
                />
              </div>
              <div style={S.field}>
                <label style={S.fieldLabel}>CONTRASEÑA</label>
                <input
                  className="cs-input"
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
                className="cs-btn-primary"
                type="submit"
                disabled={loading}
                style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", marginTop: 4 }}
              >
                {loading
                  ? "PROCESANDO..."
                  : modalMode === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSS (hovers, focus, keyframes, responsive) ───────────────────────────────

const CSS = `
  ${globalKeyframes}

  @keyframes barGrow {
    from { width: 0; }
    to   { width: var(--pct); }
  }
  @keyframes heroFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cardSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Navbar */
  .cs-nav-ghost:hover  { color: ${t.color.ink} !important; }
  .cs-btn-primary:hover:not(:disabled) {
    background: ${t.color.brandHover} !important;
    box-shadow: 0 8px 24px -8px rgba(37,99,235,0.55);
  }
  .cs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .cs-btn-ghost:hover {
    border-color: rgba(255,255,255,0.28) !important;
    color: ${t.color.inkSoft} !important;
  }

  /* Cards */
  .cs-feature-card:hover {
    border-color: rgba(37,99,235,0.35) !important;
    transform: translateY(-2px);
    box-shadow: 0 12px 32px -12px rgba(37,99,235,0.2);
  }
  .cs-use-card:hover {
    border-color: rgba(37,99,235,0.28) !important;
  }

  /* FAQ */
  .cs-faq-item:hover .cs-faq-q-text {
    color: ${t.color.ink} !important;
  }

  /* Footer */
  .cs-footer-link:hover { color: ${t.color.inkSoft} !important; }

  /* Modal */
  .cs-modal-close:hover { color: ${t.color.ink} !important; }
  .cs-modal-tab:hover { background: rgba(255,255,255,0.05) !important; }
  .cs-input:focus {
    outline: none;
    border-color: ${t.color.brand} !important;
    box-shadow: 0 0 0 3px ${t.color.brandTint} !important;
  }

  /* Hero animation */
  .cs-hero-inner { animation: heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
  .cs-hero-card-wrap { animation: cardSlideIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both; }

  /* Responsive */
  @media (max-width: 960px) {
    .cs-hero-inner  { flex-direction: column !important; padding: 100px 28px 60px !important; gap: 48px !important; }
    .cs-hero-card-wrap { flex: unset !important; width: 100% !important; max-width: 420px; }
    .cs-three-col   { grid-template-columns: 1fr !important; }
    .cs-use-grid    { grid-template-columns: 1fr !important; }
    .cs-steps       { flex-direction: column !important; gap: 32px !important; }
    .cs-step-connector { display: none !important; }
  }
  @media (max-width: 640px) {
    .cs-hero-h1  { font-size: 36px !important; }
    .cs-hero-sub { font-size: 15px !important; }
    .cs-hero-ctas { flex-direction: column !important; align-items: flex-start !important; }
    .cs-section  { padding: 64px 20px !important; }
    .cs-section-h2 { font-size: 26px !important; margin-bottom: 36px !important; }
    .cs-cta-h2   { font-size: 28px !important; }
    .cs-footer   { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 28px 20px !important; }
    .cs-nav      { padding: 14px 20px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cs-bar-fill, .cs-hero-inner, .cs-hero-card-wrap { animation: none !important; }
    .cs-bar-fill { width: var(--pct) !important; }
  }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    background: t.color.paper,
    color: t.color.ink,
    fontFamily: t.font.body,
    minHeight: "100vh",
  },

  // Navbar
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 48px",
    transition: "background 0.3s ease, box-shadow 0.3s ease",
  },
  navScrolled: {
    background: "rgba(7,11,26,0.88)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.06)",
  },
  navLogo: { height: 32, width: "auto", mixBlendMode: "screen" },
  navRight: { display: "flex", alignItems: "center", gap: 12 },
  navGhost: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    background: "none", border: "none", color: t.color.muted,
    cursor: "pointer", padding: "8px 16px", borderRadius: t.radius.sharp,
    transition: "color 0.15s",
  },
  navPrimary: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    background: t.color.brand, color: "#fff", border: "none",
    cursor: "pointer", padding: "9px 20px", borderRadius: t.radius.sharp,
    transition: "background 0.15s",
  },

  // Hero
  hero: {
    position: "relative", minHeight: "100vh",
    display: "flex", alignItems: "center", overflow: "hidden",
  },
  heroGlow: {
    position: "absolute", width: 900, height: 900, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,235,0.11) 0%, transparent 65%)",
    top: "40%", left: "35%", transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  heroGrid: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(37,99,235,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.035) 1px, transparent 1px)",
    backgroundSize: "40px 40px", pointerEvents: "none",
  },
  heroInner: {
    position: "relative", zIndex: 1,
    maxWidth: 1200, margin: "0 auto", width: "100%",
    padding: "100px 48px 80px",
    display: "flex", alignItems: "center", gap: 72,
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroCardWrap: { flex: "0 0 360px" },

  eyebrow: {
    display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.22em", color: t.color.brand, textTransform: "uppercase",
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: "50%", background: t.color.brand,
    display: "inline-block", animation: "pulseDot 2s ease-in-out infinite",
  },

  heroH1: {
    fontFamily: t.font.display, fontSize: 58, fontWeight: 900,
    color: t.color.ink, margin: "0 0 20px",
    letterSpacing: "-0.03em", lineHeight: 1.05,
  },
  heroAccent: { color: t.color.brand },
  heroSub: {
    fontSize: 17, color: t.color.muted, lineHeight: 1.68,
    margin: "0 0 36px", maxWidth: 460,
  },
  heroCtas: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" },

  btnPrimary: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    background: t.color.brand, color: "#fff", border: "none",
    borderRadius: t.radius.sharp, padding: "13px 28px",
    cursor: "pointer", transition: "background 0.15s, box-shadow 0.15s",
    display: "inline-flex", alignItems: "center",
  },
  btnGhost: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    background: "none", color: t.color.muted,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: t.radius.sharp, padding: "12px 24px",
    cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
    display: "inline-flex", alignItems: "center",
  },

  // Live card
  liveCard: {
    background: t.color.surface, borderRadius: t.radius.big,
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "24px 26px",
    boxShadow: "0 32px 72px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(37,99,235,0.07)",
  },
  liveCardHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  liveCardTitle: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.1em", color: t.color.inkSoft, textTransform: "uppercase",
  },
  livePill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: t.font.display, fontSize: 9, fontWeight: 700,
    letterSpacing: "0.18em", color: t.color.success,
    background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)",
    borderRadius: 999, padding: "3px 10px",
  },
  liveDot: {
    width: 5, height: 5, borderRadius: "50%", background: t.color.success,
    animation: "pulseDot 1.5s ease-in-out infinite",
  },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 11 },
  barLabel: {
    fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600,
    letterSpacing: "0.08em", color: t.color.muted, textTransform: "uppercase",
    width: 86, flexShrink: 0,
  },
  barTrack: {
    flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 999,
  },
  barFill: {
    height: "100%", borderRadius: 999,
    background: `linear-gradient(90deg, ${t.color.brand}, #60a5fa)`,
    width: 0,
    animation: "barGrow 1.1s cubic-bezier(0.16,1,0.3,1) forwards",
  },
  barPct: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    color: t.color.brand, width: 30, textAlign: "right", flexShrink: 0,
  },
  cardFooter: {
    marginTop: 14, paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", gap: 7,
  },
  cardFooterDot: {
    width: 5, height: 5, borderRadius: "50%", background: t.color.success,
    flexShrink: 0,
  },
  cardFooterText: {
    fontFamily: t.font.display, fontSize: 9, fontWeight: 600,
    letterSpacing: "0.1em", color: t.color.mutedFaint, textTransform: "uppercase",
  },

  // Sections shared
  section: { padding: "96px 48px" },
  sectionInner: { maxWidth: 1100, margin: "0 auto" },
  sectionLabel: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.22em", color: t.color.brand, textTransform: "uppercase",
    margin: "0 0 14px",
  },
  sectionH2: {
    fontFamily: t.font.display, fontSize: 34, fontWeight: 800,
    color: t.color.ink, margin: "0 0 52px",
    letterSpacing: "-0.025em", lineHeight: 1.1,
  },

  // Features
  threeCol: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  featureCard: {
    background: t.color.surface, borderRadius: t.radius.card,
    border: "1px solid rgba(255,255,255,0.06)", padding: "28px 24px",
    transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: t.radius.soft,
    background: "rgba(37,99,235,0.1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontFamily: t.font.display, fontSize: 15, fontWeight: 700,
    color: t.color.ink, margin: "0 0 8px", letterSpacing: "-0.01em",
  },
  featureDesc: { fontSize: 14, color: t.color.muted, lineHeight: 1.65, margin: 0 },

  // Use cases
  useGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 },
  useCard: {
    background: t.color.surfaceAlt, borderRadius: t.radius.card,
    border: "1px solid rgba(255,255,255,0.06)", padding: "24px 26px",
    transition: "border-color 0.2s",
    display: "flex", flexDirection: "column", gap: 10,
  },
  useIconWrap: {
    width: 38, height: 38, borderRadius: t.radius.soft,
    background: "rgba(37,99,235,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: t.color.brand,
  },
  useTitle: {
    fontFamily: t.font.display, fontSize: 14, fontWeight: 700,
    color: t.color.ink, margin: 0,
  },
  useDesc: { fontSize: 13.5, color: t.color.muted, lineHeight: 1.65, margin: 0 },

  // Steps
  steps: { display: "flex", alignItems: "flex-start", gap: 0 },
  stepWrap: { display: "flex", flex: 1, alignItems: "flex-start" },
  stepCard: { flex: 1, paddingRight: 24 },
  stepConnector: {
    width: 40, height: 1, flexShrink: 0, marginTop: 22,
    background: "linear-gradient(90deg, rgba(37,99,235,0.45), rgba(37,99,235,0.08))",
  },
  stepNum: {
    fontFamily: t.font.display, fontSize: 40, fontWeight: 900,
    color: "rgba(37,99,235,0.18)", letterSpacing: "-0.04em",
    display: "block", marginBottom: 10, lineHeight: 1,
  },
  stepTitle: {
    fontFamily: t.font.display, fontSize: 15, fontWeight: 700,
    color: t.color.ink, margin: "0 0 8px",
  },
  stepDesc: { fontSize: 14, color: t.color.muted, lineHeight: 1.65, margin: 0 },

  // FAQ
  faqItem: {
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    padding: "20px 0", cursor: "pointer",
  },
  faqQ: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  faqQText: {
    fontFamily: t.font.display, fontSize: 14.5, fontWeight: 600,
    color: t.color.inkSoft, lineHeight: 1.4, transition: "color 0.15s",
  },
  faqA: {
    fontSize: 14, color: t.color.muted, lineHeight: 1.7,
    margin: "14px 0 0", paddingRight: 28,
  },

  // CTA final
  ctaSection: {
    padding: "96px 48px", position: "relative", overflow: "hidden",
    background: t.color.surface, textAlign: "center",
  },
  ctaGlow: {
    position: "absolute", width: 700, height: 700, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 65%)",
    top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  ctaInner: { position: "relative", zIndex: 1, maxWidth: 580, margin: "0 auto" },
  ctaH2: {
    fontFamily: t.font.display, fontSize: 38, fontWeight: 800,
    color: t.color.ink, margin: "0 0 16px",
    letterSpacing: "-0.025em", lineHeight: 1.1,
  },
  ctaSub: {
    fontSize: 16, color: t.color.muted, lineHeight: 1.65, margin: "0 0 36px",
  },

  // Footer
  footer: {
    padding: "28px 48px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center",
    justifyContent: "space-between", flexWrap: "wrap", gap: 16,
  },
  footerCopy: {
    fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600,
    letterSpacing: "0.1em", color: t.color.mutedFaint,
    textTransform: "uppercase", margin: 0,
  },
  footerLinks: { display: "flex", alignItems: "center", gap: 12 },
  footerLink: {
    fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600,
    letterSpacing: "0.1em", color: t.color.mutedFaint, textTransform: "uppercase",
    background: "none", border: "none", cursor: "pointer", padding: 0,
    transition: "color 0.15s",
  },

  // Modal
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(7,11,26,0.82)",
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24, animation: "fadeIn 0.18s ease",
  },
  modal: {
    background: t.color.surface, borderRadius: t.radius.big,
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "36px 40px", width: "100%", maxWidth: 420,
    position: "relative",
    boxShadow: "0 32px 80px -16px rgba(0,0,0,0.8)",
    animation: "fadeUp 0.22s cubic-bezier(0.16,1,0.3,1)",
  },
  modalClose: {
    position: "absolute", top: 14, right: 14,
    background: "none", border: "none", color: t.color.muted,
    cursor: "pointer", padding: 6, lineHeight: 1,
    transition: "color 0.15s",
  },
  modalTabs: {
    display: "flex", marginBottom: 28,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: t.radius.sharp, overflow: "hidden",
  },
  modalTab: {
    flex: 1, fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    background: "none", border: "none", color: t.color.muted,
    padding: "10px 8px", cursor: "pointer", transition: "background 0.15s, color 0.15s",
  },
  modalTabActive: { background: t.color.brand, color: "#fff" },
  modalForm: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: {
    fontFamily: t.font.display, fontSize: 9.5, fontWeight: 700,
    letterSpacing: "0.22em", color: t.color.muted, textTransform: "uppercase",
  },
  input: {
    fontFamily: t.font.body, fontSize: 14, color: t.color.ink,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: t.radius.sharp, padding: "11px 14px",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%", boxSizing: "border-box",
  },
};
