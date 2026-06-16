import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, isAuthenticated } from "../lib/api";
import toast from "react-hot-toast";
import { theme as t, globalKeyframes } from "../lib/theme";

// ─── Static content ───────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Producto", id: "producto" },
  { label: "Casos de uso", id: "casos" },
  { label: "Cómo funciona", id: "como-funciona" },
  { label: "FAQ", id: "faq" },
];

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: "Acceso por QR o enlace",
    desc: "Los participantes responden desde su celular o computadora escaneando un código QR o abriendo un enlace. Sin cuentas, sin contraseñas, sin barreras.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Datos en tiempo real",
    desc: "El panel recibe e integra las respuestas en el mismo segundo en que se envían. Ideal para proyectar gráficos consolidados en vivo frente a la audiencia.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: "Métricas nativas de RRHH",
    desc: "Favorabilidad Likert y NPS calculados automáticamente. Sin fórmulas manuales, sin hojas de cálculo intermedias para llegar al número.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    title: "Segmentación instantánea",
    desc: "Filtra los resultados por área, cargo o género con un clic. Identifica patrones en equipos concretos sin comprometer el anonimato.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
    title: "Reportes ejecutivos listos",
    desc: "Descarga el informe en PDF con diseño profesional para entregar a dirección o clientes, o exporta la base completa a Excel para análisis propio.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Anonimato por diseño",
    desc: "No se almacena ningún dato de autenticación del respondente. Los filtros demográficos se bloquean automáticamente si un grupo tiene menos de 3 respuestas.",
  },
];

const USE_CASES = [
  {
    label: "DOCENTES Y FORMADORES",
    title: "Encuestas durante la clase",
    desc: "Proyecta el QR en la pantalla y los alumnos responden desde su celular. Al terminar la actividad tienes el dashboard con los resultados consolidados para comentar en el momento.",
    metric: "Respuestas del grupo completo en menos de dos minutos",
  },
  {
    label: "SALUD Y BIENESTAR",
    title: "Feedback anónimo de pacientes",
    desc: "Psicólogos, terapeutas y médicos pueden recoger satisfacción o percepciones de sus pacientes sin que nadie tenga que identificarse. El anonimato incentiva respuestas más honestas.",
    metric: "Sin app, sin cuenta — solo un enlace",
  },
  {
    label: "NEGOCIOS Y SERVICIOS",
    title: "Satisfacción post-servicio",
    desc: "Salones de belleza, restaurantes, gimnasios o cualquier negocio de servicios puede enviar una encuesta corta después de cada atención. Los resultados se acumulan en un panel siempre actualizado.",
    metric: "NPS e índice de satisfacción calculados automáticamente",
  },
  {
    label: "CONSULTORÍA Y FORMACIÓN",
    title: "Diagnósticos y talleres",
    desc: "Facilitadores y formadores pueden medir satisfacción post-taller o alineamiento con los objetivos de la sesión. Resultados listos para presentar al cliente sin tabular datos a mano.",
    metric: "Informe descargable en PDF al terminar el proceso",
  },
  {
    label: "INVESTIGACIÓN Y ACADEMIA",
    title: "Levantamiento de datos para tesis",
    desc: "Diseña tu instrumento con escalas Likert, preguntas abiertas y variables de segmentación. Comparte el enlace con tu muestra y descarga los datos en Excel estructurado, listos para importar a tu análisis estadístico.",
    metric: "Compatible con SPSS, R y Python",
  },
];

const STEPS = [
  { n: "1", title: "Configura tu cuestionario", desc: "Elige entre preguntas Likert, NPS o texto libre. Agrega las variables demográficas que necesitas analizar, como áreas o sucursales." },
  { n: "2", title: "Muestra el QR o envía el enlace", desc: "Proyecta el código QR en pantalla durante tu evento en vivo, o distribuye el enlace a tu grupo por WhatsApp, email o cualquier canal." },
  { n: "3", title: "Analiza, proyecta o descarga", desc: "Observa cómo se actualizan los gráficos en tiempo real durante la sesión, o descarga el reporte ejecutivo en PDF una vez concluida la medición." },
];

const FAQS = [
  {
    q: "¿Solo pueden usarlo empresas o también profesionales independientes?",
    a: "Cualquier persona puede usar CoreScope. Está diseñado tanto para un psicólogo que quiere recoger feedback anónimo de sus pacientes como para una empresa que mide el clima de sus equipos. Si trabajas con personas y necesitas escucharlas, CoreScope funciona para ti.",
  },
  {
    q: "¿Los participantes necesitan instalar algo o crear una cuenta?",
    a: "No. Reciben un enlace o escanean un código QR y responden directamente desde el navegador de su celular o computadora. Sin apps, sin registro, sin fricción.",
  },
  {
    q: "¿Cómo se garantiza que las respuestas sean anónimas?",
    a: "CoreScope no almacena ningún dato de autenticación del respondente. Las respuestas se registran sin ningún identificador personal. Cuando se muestran resultados segmentados, el sistema bloquea automáticamente la visualización si un grupo tiene menos de 3 respuestas, evitando que alguien sea identificado por descarte.",
  },
  {
    q: "¿Cuál es la diferencia con Google Forms o SurveyMonkey?",
    a: "Google Forms y SurveyMonkey entregan los datos en bruto: ves una hoja de cálculo o gráficos básicos. CoreScope va un paso más allá — calcula automáticamente índices de favorabilidad y NPS, permite segmentar resultados por variables demográficas, y genera un informe en PDF listo para presentar. No necesitas procesar ni formatear nada.",
  },
  {
    q: "¿Necesito tarjeta de crédito para empezar?",
    a: "No. Crea tu cuenta, configura tu primera encuesta y empieza a recibir respuestas sin ingresar datos de pago. Solo necesitas un plan pago cuando quieras superar el límite del plan gratuito.",
  },
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
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openModal = (mode = "register") => {
    setModalMode(mode);
    setEmail(""); setName(""); setPassword("");
    setModalOpen(true);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;600&family=Archivo:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="cs-nav" style={{ ...S.nav, ...(scrolled ? S.navScrolled : {}) }}>
        <img src="/logo-corescope-transparente.png" alt="CoreScope" style={S.navLogo} />

        <nav style={S.navLinks}>
          {NAV_LINKS.map(({ label, id }) => (
            <button key={id} className="cs-navlink" onClick={() => scrollTo(id)} style={S.navLink}>
              {label}
            </button>
          ))}
        </nav>

        <div style={S.navRight}>
          <button className="cs-navlink" onClick={() => openModal("login")} style={S.navLink}>
            Iniciar sesión
          </button>
          <button className="cs-cta-pill" onClick={() => openModal("register")} style={S.ctaPill}>
            Comenzar gratis
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={S.hero}>
        {/* Aurora background */}
        <div style={S.aurora1} />
        <div style={S.aurora2} />
        <div style={S.heroDotGrid} />

        <div style={S.heroInner}>
          {/* Headline */}
          <h1 className="cs-h1" style={S.h1}>
            Encuestas con dashboards<br />
            de resultados en vivo.
          </h1>
          <p className="cs-hero-sub" style={S.heroSub}>
            Diseña encuestas para levantar información de tus usuarios o clientes.
            Comparte por enlace o QR y recibe respuestas anónimas sin registro.
            Los datos se procesan al instante en paneles listos para proyectar o descargar.
          </p>

          {/* CTAs */}
          <div style={S.heroCtas}>
            <button className="cs-btn-brand" onClick={() => openModal("register")} style={S.btnBrand}>
              Comenzar gratis
            </button>
            <button className="cs-btn-text" onClick={() => scrollTo("como-funciona")} style={S.btnText}>
              Ver cómo funciona
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Product mockup */}
          <div className="cs-mockup" style={S.mockup}>
            {/* Mockup top bar */}
            <div style={S.mockupBar}>
              <div style={S.mockupDots}>
                <span style={{ ...S.mockupDot, background: "#ff5f57" }} />
                <span style={{ ...S.mockupDot, background: "#febc2e" }} />
                <span style={{ ...S.mockupDot, background: "#28c840" }} />
              </div>
              <div style={S.mockupUrl}>corescope.app/dashboard</div>
            </div>

            {/* Mockup content */}
            <div style={S.mockupBody}>
              {/* Left sidebar */}
              <div style={S.mockupSidebar}>
                <div style={S.sidebarItem}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.color.brand} strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span style={{ color: t.color.brand }}>Mis pulsos</span>
                </div>
                {["Banco", "Tutorial"].map(l => (
                  <div key={l} style={{ ...S.sidebarItem, color: "#4d5568" }}>{l}</div>
                ))}
              </div>

              {/* Main content */}
              <div style={S.mockupMain}>
                {/* Stat cards */}
                <div style={S.statRow}>
                  {[
                    { label: "Respuestas", value: "847", delta: "+12%" },
                    { label: "Favorabilidad", value: "84%", delta: "+3pts" },
                    { label: "NPS", value: "62", delta: "+8" },
                  ].map(({ label, value, delta }) => (
                    <div key={label} style={S.statCard}>
                      <span style={S.statLabel}>{label}</span>
                      <span style={S.statValue}>{value}</span>
                      <span style={S.statDelta}>{delta}</span>
                    </div>
                  ))}
                </div>

                {/* Mini bars */}
                <div style={S.mockupBars}>
                  <div style={S.mockupBarsTitle}>Favorabilidad por dimensión</div>
                  {[
                    { label: "Liderazgo", pct: 87, d: "0s" },
                    { label: "Comunicación", pct: 74, d: "0.08s" },
                    { label: "Clima", pct: 81, d: "0.16s" },
                    { label: "NPS", pct: 62, d: "0.24s" },
                  ].map(({ label, pct, d }) => (
                    <div key={label} style={S.miniBarRow}>
                      <span style={S.miniBarLabel}>{label}</span>
                      <div style={S.miniBarTrack}>
                        <div className="cs-bar-fill" style={{ ...S.miniBarFill, "--pct": `${pct}%`, animationDelay: d }} />
                      </div>
                      <span style={S.miniBarPct}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTO ─────────────────────────────────────────────────────── */}
      <section id="producto" style={S.section}>
        <div style={S.inner}>
          <div style={S.sectionEyebrow}>PRODUCTO</div>
          <h2 className="cs-h2" style={S.h2}>Todo lo que necesitas<br />para recoger feedback.</h2>
          <div className="cs-feat-grid" style={S.featGrid}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="cs-feat-card" style={S.featCard}>
                <div style={S.featIcon}>{icon}</div>
                <h3 style={S.featTitle}>{title}</h3>
                <p style={S.featDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CASOS DE USO ─────────────────────────────────────────────────── */}
      <section id="casos" style={{ ...S.section, borderTop: S.divider }}>
        <div style={S.inner}>
          <div style={S.sectionEyebrow}>CASOS DE USO</div>
          <h2 className="cs-h2" style={S.h2}>Para cualquier profesional<br />que trabaja con personas.</h2>
          <div className="cs-use-grid" style={S.useGrid}>
            {USE_CASES.map(({ label, title, desc, metric }) => (
              <div key={title} className="cs-use-card" style={S.useCard}>
                <div style={S.useLabel}>{label}</div>
                <h3 style={S.useTitle}>{title}</h3>
                <p style={S.useDesc}>{desc}</p>
                <div style={S.useMetric}>{metric}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="como-funciona" style={{ ...S.section, borderTop: S.divider }}>
        <div style={S.inner}>
          <div style={S.sectionEyebrow}>CÓMO FUNCIONA</div>
          <h2 className="cs-h2" style={S.h2}>De cero a resultados<br />en un día.</h2>
          <div className="cs-steps" style={S.steps}>
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} style={S.stepCard}>
                <div style={S.stepN}>{n}</div>
                <h3 style={S.stepTitle}>{title}</h3>
                <p style={S.stepDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ ...S.section, borderTop: S.divider }}>
        <div style={{ ...S.inner, maxWidth: 680 }}>
          <div style={S.sectionEyebrow}>FAQ</div>
          <h2 className="cs-h2" style={S.h2}>Preguntas frecuentes.</h2>
          <div>
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className="cs-faq"
                style={{ ...S.faqRow, borderTop: i === 0 ? S.divider : "none" }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={S.faqQ}>
                  <span style={S.faqQText}>{q}</span>
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke={t.color.muted} strokeWidth="2" strokeLinecap="round"
                    style={{ flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none" }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                {openFaq === i && <p style={S.faqA}>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section style={{ ...S.section, borderTop: S.divider, textAlign: "center" }}>
        <div style={S.ctaAurora} />
        <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <h2 className="cs-h2" style={{ ...S.h2, fontSize: 44, marginBottom: 16, textAlign: "center" }}>
            Lanza tu primera encuesta<br />y empieza a escuchar hoy.
          </h2>
          <p style={{ ...S.heroSub, textAlign: "center", margin: "0 auto 36px", maxWidth: 480 }}>
            Dashboards automáticos, reportes listos para presentar y cero registro de participantes.
          </p>
          <button className="cs-btn-brand" onClick={() => openModal("register")} style={{ ...S.btnBrand, padding: "14px 40px" }}>
            Comenzar gratis
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="cs-footer" style={S.footer}>
        <div style={S.footerLeft}>
          <img src="/logo-corescope-transparente.png" alt="CoreScope" style={{ height: 44, width: "auto" }} />
          <span style={S.footerCopy}>© 2026 CoreScope</span>
        </div>
        <div style={S.footerRight}>
          {NAV_LINKS.map(({ label, id }) => (
            <button key={id} className="cs-footer-link" onClick={() => scrollTo(id)} style={S.footerLink}>
              {label}
            </button>
          ))}
          <a href="mailto:hola@corescope.app" className="cs-footer-link" style={{ ...S.footerLink, textDecoration: "none" }}>
            Contacto
          </a>
        </div>
      </footer>

      {/* ── MODAL ────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={S.modal}>
            <button className="cs-modal-close" onClick={() => setModalOpen(false)} style={S.modalClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <img src="/logo-corescope-transparente.png" alt="CoreScope" style={{ height: 52, marginBottom: 28 }} />

            <div style={S.modalTabs}>
              {[{ k: "login", l: "Iniciar sesión" }, { k: "register", l: "Registrarse" }].map(({ k, l }) => (
                <button
                  key={k}
                  onClick={() => { setModalMode(k); setEmail(""); setName(""); setPassword(""); }}
                  style={{ ...S.modalTab, ...(modalMode === k ? S.modalTabOn : {}) }}
                  className={modalMode === k ? "" : "cs-modal-tab-off"}
                >
                  {l}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={S.form}>
              {modalMode === "register" && (
                <div style={S.field}>
                  <label style={S.label}>Nombre completo</label>
                  <input className="cs-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required style={S.input} />
                </div>
              )}
              <div style={S.field}>
                <label style={S.label}>Correo electrónico</label>
                <input className="cs-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required style={S.input} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Contraseña</label>
                <input className="cs-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} style={S.input} />
              </div>
              <button
                className="cs-btn-brand"
                type="submit"
                disabled={loading}
                style={{ ...S.btnBrand, width: "100%", justifyContent: "center", marginTop: 4 }}
              >
                {loading ? "Procesando..." : modalMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  html, body { margin: 0; padding: 0; background: #070b1a; overflow-x: hidden; }
  *, *::before, *::after { box-sizing: border-box; }
  ${globalKeyframes}
  @keyframes barGrow { from { width: 0 } to { width: var(--pct) } }
  @keyframes heroin  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
  @keyframes mockin  { from { opacity:0; transform:translateY(24px) scale(0.98) } to { opacity:1; transform:none } }

  .cs-navlink:hover    { color: #fff !important; }
  .cs-cta-pill:hover   { background: ${t.color.brandHover} !important; }
  .cs-btn-brand:hover:not(:disabled) {
    background: ${t.color.brandHover} !important;
    box-shadow: 0 0 0 4px rgba(37,99,235,0.18);
  }
  .cs-btn-brand:disabled { opacity: 0.55; cursor: not-allowed; }
  .cs-btn-text:hover   { color: #fff !important; }
  .cs-btn-text:hover svg { transform: translateX(3px); }
  .cs-btn-text svg     { transition: transform 0.18s; }
  .cs-feat-card:hover  { border-color: rgba(255,255,255,0.14) !important; background: rgba(255,255,255,0.03) !important; }
  .cs-use-card:hover   { border-color: rgba(37,99,235,0.35) !important; }
  .cs-faq:hover .cs-faq-q-text { color: #fff !important; }
  .cs-footer-link:hover { color: rgba(255,255,255,0.7) !important; }
  .cs-modal-close:hover { color: #fff !important; }
  .cs-modal-tab-off:hover { color: rgba(255,255,255,0.6) !important; }
  .cs-input:focus { outline: none; border-color: ${t.color.brand} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.14) !important; }

  .cs-hero-anim { animation: heroin 0.7s cubic-bezier(0.16,1,0.3,1) both; }
  .cs-mockup    { animation: mockin 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both; }

  @media (max-width: 1024px) {
    .cs-mockup  { display: none !important; }
    .cs-feat-grid { grid-template-columns: repeat(2,1fr) !important; }
    .cs-steps     { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .cs-use-grid  { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .cs-h1  { font-size: 38px !important; }
    .cs-h2  { font-size: 28px !important; }
    .cs-hero-sub { font-size: 15px !important; }
    .cs-nav { padding: 0 20px !important; }
    .cs-feat-grid { grid-template-columns: 1fr !important; }
    .cs-footer { flex-direction: column !important; gap: 20px !important; padding: 28px 20px !important; }
  }
  @media (max-width: 768px) {
    .cs-nav nav { display: none !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cs-bar-fill { animation: none !important; width: var(--pct) !important; }
    .cs-hero-anim, .cs-mockup { animation: none !important; }
  }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────

const divider = "1px solid rgba(255,255,255,0.07)";

const S = {
  divider,
  page: {
    background: t.color.paper,
    color: t.color.ink,
    fontFamily: t.font.body,
    minHeight: "100vh",
  },

  // Nav
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    height: 56, display: "flex", alignItems: "center",
    padding: "0 32px", gap: 32,
    transition: "background 0.25s, border-color 0.25s",
    borderBottom: "1px solid transparent",
  },
  navScrolled: {
    background: "rgba(8,11,20,0.86)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  navLogo: { height: 52, width: "auto", flexShrink: 0 },
  navLinks: { display: "flex", alignItems: "center", gap: 4, flex: 1 },
  navLink: {
    fontFamily: t.font.body, fontSize: 13.5, fontWeight: 450,
    color: "rgba(255,255,255,0.45)",
    background: "none", border: "none", cursor: "pointer",
    padding: "5px 10px", borderRadius: t.radius.soft,
    transition: "color 0.15s", letterSpacing: 0,
  },
  navRight: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  ctaPill: {
    fontFamily: t.font.body, fontSize: 13.5, fontWeight: 500,
    background: t.color.brand, color: "#fff", border: "none",
    borderRadius: t.radius.pill, padding: "7px 16px",
    cursor: "pointer", transition: "background 0.15s, box-shadow 0.15s",
    display: "inline-flex", alignItems: "center", gap: 6,
  },

  // Hero
  hero: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    position: "relative", overflow: "hidden", paddingTop: 56,
  },
  aurora1: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse 70% 55% at 60% -10%, rgba(37,99,235,0.18) 0%, transparent 65%)",
  },
  aurora2: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse 50% 40% at 20% 80%, rgba(37,99,235,0.08) 0%, transparent 60%)",
  },
  heroDotGrid: {
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
    maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
    WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
  },
  heroInner: {
    position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto",
    width: "100%", padding: "80px 48px", boxSizing: "border-box",
    animation: "heroin 0.7s cubic-bezier(0.16,1,0.3,1) both",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
    background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.22)",
    borderRadius: t.radius.pill, padding: "5px 14px",
  },
  badgeDot: {
    width: 5, height: 5, borderRadius: "50%", background: t.color.brand,
    flexShrink: 0, animation: "pulseDot 2s ease-in-out infinite",
  },
  badgeText: {
    fontFamily: t.font.body, fontSize: 12, fontWeight: 500,
    color: t.color.brand, letterSpacing: 0,
  },

  h1: {
    fontFamily: t.font.display, fontSize: 64, fontWeight: 800,
    color: "#fff", margin: "0 0 20px",
    letterSpacing: "-0.04em", lineHeight: 1.04,
  },
  heroSub: {
    fontSize: 17, color: "rgba(255,255,255,0.44)", lineHeight: 1.65,
    margin: "0 0 36px", maxWidth: 460, fontWeight: 400,
  },
  heroCtas: { display: "flex", alignItems: "center", gap: 12, marginBottom: 72 },

  btnBrand: {
    fontFamily: t.font.body, fontSize: 14, fontWeight: 500,
    background: t.color.brand, color: "#fff", border: "none",
    borderRadius: t.radius.soft, padding: "11px 22px",
    cursor: "pointer", transition: "background 0.15s, box-shadow 0.15s",
    display: "inline-flex", alignItems: "center", gap: 8,
  },
  btnText: {
    fontFamily: t.font.body, fontSize: 14, fontWeight: 500,
    background: "none", border: "none", color: "rgba(255,255,255,0.44)",
    cursor: "pointer", padding: "11px 4px",
    display: "inline-flex", alignItems: "center", gap: 6,
    transition: "color 0.15s",
  },

  // Product mockup
  mockup: {
    background: t.color.surface,
    border: divider,
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 40px 100px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
    maxWidth: 760,
  },
  mockupBar: {
    height: 36, background: "#0d1321", borderBottom: divider,
    display: "flex", alignItems: "center", padding: "0 14px", gap: 12,
  },
  mockupDots: { display: "flex", gap: 5 },
  mockupDot: { width: 10, height: 10, borderRadius: "50%" },
  mockupUrl: {
    flex: 1, height: 20, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4,
    fontFamily: t.font.body, fontSize: 10.5, color: "rgba(255,255,255,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    maxWidth: 240,
  },
  mockupBody: { display: "flex", minHeight: 220 },
  mockupSidebar: {
    width: 130, borderRight: divider, padding: "16px 12px",
    display: "flex", flexDirection: "column", gap: 2,
  },
  sidebarItem: {
    display: "flex", alignItems: "center", gap: 7,
    fontFamily: t.font.body, fontSize: 11.5, color: "rgba(255,255,255,0.28)",
    padding: "5px 8px", borderRadius: 4,
  },
  mockupMain: { flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16 },
  statRow: { display: "flex", gap: 12 },
  statCard: {
    flex: 1, background: "rgba(255,255,255,0.03)", border: divider,
    borderRadius: 6, padding: "10px 12px",
    display: "flex", flexDirection: "column", gap: 2,
  },
  statLabel: { fontFamily: t.font.body, fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 500 },
  statValue: { fontFamily: t.font.display, fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 },
  statDelta: { fontFamily: t.font.body, fontSize: 10, color: t.color.success, fontWeight: 500 },
  mockupBars: { flex: 1 },
  mockupBarsTitle: {
    fontFamily: t.font.body, fontSize: 10.5, color: "rgba(255,255,255,0.3)",
    marginBottom: 10, fontWeight: 500,
  },
  miniBarRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  miniBarLabel: {
    fontFamily: t.font.body, fontSize: 10, color: "rgba(255,255,255,0.3)",
    width: 80, flexShrink: 0, fontWeight: 500,
  },
  miniBarTrack: { flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999 },
  miniBarFill: {
    height: "100%", borderRadius: 999,
    background: `linear-gradient(90deg, ${t.color.brand}, rgba(96,165,250,0.9))`,
    width: 0, animation: "barGrow 1s cubic-bezier(0.16,1,0.3,1) 0.4s forwards",
  },
  miniBarPct: {
    fontFamily: t.font.body, fontSize: 10, fontWeight: 600,
    color: t.color.brand, width: 28, textAlign: "right", flexShrink: 0,
  },

  // Sections
  section: { padding: "88px 48px", position: "relative" },
  inner: { maxWidth: 1100, margin: "0 auto" },
  sectionEyebrow: {
    fontFamily: t.font.body, fontSize: 11, fontWeight: 600,
    letterSpacing: "0.12em", color: t.color.brand,
    textTransform: "uppercase", marginBottom: 16,
  },
  h2: {
    fontFamily: t.font.display, fontSize: 40, fontWeight: 700,
    color: "#fff", margin: "0 0 52px",
    letterSpacing: "-0.03em", lineHeight: 1.1,
  },

  // Features
  featGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px",
    border: divider, borderRadius: t.radius.card, overflow: "hidden",
    background: "rgba(255,255,255,0.07)",
  },
  featCard: {
    background: t.color.paper, padding: "28px 24px",
    transition: "background 0.2s, border-color 0.2s",
    border: "none",
  },
  featIcon: {
    width: 36, height: 36, marginBottom: 14, borderRadius: t.radius.soft,
    background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "rgba(255,255,255,0.6)",
  },
  featTitle: {
    fontFamily: t.font.display, fontSize: 14, fontWeight: 600,
    color: "#fff", margin: "0 0 7px", letterSpacing: "-0.01em",
  },
  featDesc: { fontSize: 13.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.65, margin: 0 },

  // Use cases
  useGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  useCard: {
    border: divider, borderRadius: t.radius.card, padding: "28px 24px",
    transition: "border-color 0.2s",
    display: "flex", flexDirection: "column", gap: 10,
  },
  useLabel: {
    fontFamily: t.font.body, fontSize: 10, fontWeight: 600,
    letterSpacing: "0.12em", color: t.color.brand, textTransform: "uppercase",
  },
  useTitle: {
    fontFamily: t.font.display, fontSize: 18, fontWeight: 700,
    color: "#fff", margin: 0, letterSpacing: "-0.02em",
  },
  useDesc: { fontSize: 13.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, margin: 0, flex: 1 },
  useMetric: {
    fontFamily: t.font.body, fontSize: 12, fontWeight: 500,
    color: t.color.success, marginTop: 4,
  },

  // Steps
  steps: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 },
  stepCard: { display: "flex", flexDirection: "column", gap: 10 },
  stepN: {
    fontFamily: t.font.display, fontSize: 13, fontWeight: 700,
    color: t.color.brand, letterSpacing: "0.05em",
    width: 28, height: 28, borderRadius: "50%",
    border: "1px solid rgba(37,99,235,0.3)",
    background: "rgba(37,99,235,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  stepTitle: {
    fontFamily: t.font.display, fontSize: 16, fontWeight: 700,
    color: "#fff", margin: 0, letterSpacing: "-0.01em",
  },
  stepDesc: { fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, margin: 0 },

  // FAQ
  faqRow: {
    borderBottom: divider, padding: "20px 0", cursor: "pointer",
  },
  faqQ: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  faqQText: {
    fontFamily: t.font.body, fontSize: 15, fontWeight: 500,
    color: "rgba(255,255,255,0.7)", transition: "color 0.15s",
  },
  faqA: {
    fontFamily: t.font.body, fontSize: 14, color: "rgba(255,255,255,0.4)",
    lineHeight: 1.7, margin: "14px 0 0", paddingRight: 24,
  },

  // CTA final
  ctaAurora: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(37,99,235,0.1) 0%, transparent 70%)",
  },

  // Footer
  footer: {
    padding: "24px 48px", borderTop: divider,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16,
  },
  footerLeft: { display: "flex", alignItems: "center", gap: 16 },
  footerCopy: {
    fontFamily: t.font.body, fontSize: 12.5, color: "rgba(255,255,255,0.25)",
    margin: 0, fontWeight: 400,
  },
  footerRight: { display: "flex", alignItems: "center", gap: 20 },
  footerLink: {
    fontFamily: t.font.body, fontSize: 12.5, fontWeight: 400,
    color: "rgba(255,255,255,0.3)", background: "none", border: "none",
    cursor: "pointer", padding: 0, transition: "color 0.15s",
  },

  // Modal
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(5,8,18,0.75)",
    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24, animation: "fadeIn 0.15s ease",
  },
  modal: {
    background: "#0d1321",
    border: divider,
    borderRadius: 12, padding: "32px 36px",
    width: "100%", maxWidth: 400,
    position: "relative",
    boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
    animation: "fadeUp 0.2s cubic-bezier(0.16,1,0.3,1)",
  },
  modalClose: {
    position: "absolute", top: 14, right: 14,
    background: "none", border: "none",
    color: "rgba(255,255,255,0.3)", cursor: "pointer",
    padding: 6, lineHeight: 1, transition: "color 0.15s",
  },
  modalTabs: {
    display: "flex", gap: 0, marginBottom: 24,
    borderBottom: divider,
  },
  modalTab: {
    fontFamily: t.font.body, fontSize: 13.5, fontWeight: 500,
    background: "none", border: "none", padding: "0 0 12px",
    cursor: "pointer", marginRight: 20, transition: "color 0.15s",
    borderBottom: "2px solid transparent",
  },
  modalTabOn: {
    color: "#fff",
    borderBottomColor: t.color.brand,
  },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontFamily: t.font.body, fontSize: 12.5, fontWeight: 500,
    color: "rgba(255,255,255,0.45)",
  },
  input: {
    fontFamily: t.font.body, fontSize: 14, color: "#fff",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: t.radius.soft, padding: "10px 13px",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%", boxSizing: "border-box",
  },
};
