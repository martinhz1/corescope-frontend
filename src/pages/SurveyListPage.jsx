import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMySurveys, logout, getUser, updateSurvey } from "../lib/api";
import LogoInput from "../components/LogoInput";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import StatusPill from "../components/StatusPill";
import { theme as t, hairSpan, globalKeyframes } from "../lib/theme";

export default function SurveyListPage() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const PAGE_SIZE = 8;
  const navigate = useNavigate();
  const user = getUser();
  const firstName = user.name ? user.name.split(" ")[0] : null;

  useEffect(() => {
    setMounted(true);
    getMySurveys()
      .then(setSurveys)
      .catch(() => toast.error("Error cargando encuestas"))
      .finally(() => setLoading(false));
  }, []);

  // Resetear paginación cuando cambia cualquier filtro, búsqueda o sort
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, clientFilter, dateRange, sortBy]);

  // Lista de clientes únicos para el dropdown
  const uniqueClients = [...new Set(surveys.map(s => s.client_name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  // Pipeline de filtros: cliente → búsqueda → fecha → estado → sort
  const q = searchQuery.trim().toLowerCase();
  const byClient = clientFilter === "all"
    ? surveys
    : surveys.filter(s => s.client_name === clientFilter);
  const bySearch = q
    ? byClient.filter(s =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.client_name || "").toLowerCase().includes(q)
      )
    : byClient;
  const cutoff = cutoffFor(dateRange);
  const byDate = cutoff
    ? bySearch.filter(s => new Date(s.created_at) >= cutoff)
    : bySearch;
  // El filtro "favorites" no es un status — atraviesa cualquier estado.
  let filtered;
  if (filter === "favorites") filtered = byDate.filter(s => s.is_favorite);
  else if (filter === "all") filtered = byDate;
  else filtered = byDate.filter(s => s.status === filter);
  const sorted = [...filtered].sort(sortComparator(sortBy));

  // Counts de las tarjetas superiores: totales del usuario (sin filtros aplicados)
  const counts = {
    all: surveys.length,
    active: surveys.filter(s => s.status === "active").length,
    draft: surveys.filter(s => s.status === "draft").length,
    closed: surveys.filter(s => s.status === "closed").length,
  };
  // Counts de las tabs de estado: respetan cliente + búsqueda + fecha
  const tabCounts = {
    all: byDate.length,
    favorites: byDate.filter(s => s.is_favorite).length,
    active: byDate.filter(s => s.status === "active").length,
    draft: byDate.filter(s => s.status === "draft").length,
    closed: byDate.filter(s => s.status === "closed").length,
  };

  // Toggle de favorito con actualización optimista: cambio el estado local
  // primero (UI responde instantáneo) y reverteo si la API falla.
  const toggleFavorite = async (surveyId, e) => {
    e.stopPropagation();
    const target = surveys.find(s => s.id === surveyId);
    if (!target) return;
    const next = !target.is_favorite;
    setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, is_favorite: next } : s));
    try {
      await updateSurvey(surveyId, { is_favorite: next });
    } catch (err) {
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, is_favorite: !next } : s));
      toast.error(err.message || "Error al actualizar favorito");
    }
  };

  const totalResponses = surveys.reduce((sum, s) => sum + s.response_count, 0);

  // Paginación (6 por página)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paged = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  const hasActiveFilter =
    q.length > 0 ||
    clientFilter !== "all" ||
    filter !== "all" ||
    dateRange !== "all";
  const clearAllFilters = () => {
    setSearchQuery("");
    setClientFilter("all");
    setFilter("all");
    setDateRange("all");
    setSortBy("recent");
  };

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        ${globalKeyframes}
        @keyframes pulseDot {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .survey-card {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease;
          box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02);
        }
        .survey-card:hover {
          transform: translateY(-4px);
          border-color: ${t.color.brandLineHover} !important;
          box-shadow: 0 18px 40px -16px rgba(37,99,235,0.22), 0 6px 12px -4px rgba(37,99,235,0.08);
        }
        .survey-card:hover .card-arrow { transform: translateX(6px); opacity: 1; }
        .survey-card:hover .card-stripe { opacity: 1; transform: scaleX(1); }
        .survey-card:hover .card-title { color: ${t.color.brand}; }
        .card-stripe {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          opacity: 0.65; transform: scaleX(0.6); transform-origin: left;
          transition: opacity 0.28s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-title { transition: color 0.18s ease; }
        .fav-btn:hover { background: rgba(245,158,11,0.12); transform: scale(1.15); }
        .fav-btn { transition: all 0.18s ${t.ease}; }
        .filter-btn { transition: all 0.15s ease; }
        .filter-btn:hover { background: ${t.color.brandTint} !important; color: ${t.color.brand} !important; }
        .primary-cta { transition: all 0.18s ${t.ease}; box-shadow: 0 4px 12px -4px rgba(37,99,235,0.35); }
        .primary-cta:hover { background: ${t.color.brandHover} !important; box-shadow: 0 10px 26px -8px rgba(37,99,235,0.55); transform: translateY(-1px); }
        .primary-cta:hover .cta-arrow { transform: translateX(3px); }
        .ghost-cta { transition: all 0.15s ease; }
        .ghost-cta:hover { background: ${t.color.brandTint}; border-color: ${t.color.brandLineHover}; color: ${t.color.brand}; }
        .type-card { transition: all 0.18s ${t.ease}; }
        .type-card:hover { border-color: ${t.color.brandBright} !important; background: rgba(37,99,235,0.04); transform: translateY(-2px); box-shadow: 0 8px 24px -12px rgba(37,99,235,0.25); }
        @media (max-width: 600px) {
          .type-options-grid { grid-template-columns: 1fr !important; }
        }
        .user-chip { transition: border-color 0.15s ease; }
        .user-chip:hover { border-color: ${t.color.brandLineHover}; }
        .stat-card {
          position: relative; overflow: hidden;
          transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease;
          box-shadow: 0 1px 2px rgba(15,23,42,0.04);
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(37,99,235,0.18); }
        .stat-card::before {
          content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: var(--accent, ${t.color.brand});
        }
        .stat-card::after {
          content: ""; position: absolute; top: -20px; right: -20px;
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--accent, ${t.color.brand}); opacity: 0.06;
          pointer-events: none;
        }
        .live-dot { animation: pulseDot 2.4s ease-in-out infinite; }
        .search-input:focus,
        .select-input:focus { border-color: ${t.color.brandLineHover} !important; box-shadow: 0 0 0 3px ${t.color.brandTint}; }
        .page-btn:not(:disabled):hover { background: ${t.color.brandTint}; border-color: ${t.color.brandLineHover}; color: ${t.color.brand}; }
        @media (max-width: 600px) {
          .search-row { flex-direction: column !important; }
          .search-row > * { width: 100% !important; min-width: 0 !important; }
        }
        .atmosphere {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 800px 600px at 90% -10%, rgba(37,99,235,0.10), transparent 60%),
            radial-gradient(ellipse 600px 500px at -10% 30%, rgba(37,99,235,0.06), transparent 55%);
        }
      `}</style>

      {/* Atmospheric backdrop — radial gradients suaves para dar profundidad */}
      <div className="atmosphere" aria-hidden="true" />

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.brandMark}>
            <Logo variant="horizontal" size={12} color="#2563eb" />
            <span style={styles.brandSep} />
            <span style={styles.brandTag}>CoreScope</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(user.picture || firstName) && (
              <div className="user-chip" style={styles.userChip}>
                {user.picture && (
                  <img src={user.picture} alt="" style={styles.userAvatar} referrerPolicy="no-referrer" />
                )}
                {firstName && <span style={styles.userName}>{firstName}</span>}
              </div>
            )}
            <button className="ghost-cta" onClick={() => navigate("/tutorial")} style={styles.tutorialBtn} title="Guía de uso de la plataforma">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, opacity: 0.85 }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span>Tutorial</span>
            </button>
            <button className="primary-cta" onClick={() => navigate("/surveys/new")} style={styles.createBtn}>
              <span className="cta-arrow" style={styles.ctaArrow}>+</span>
              <span>Crear pulso</span>
            </button>
            <button className="ghost-cta" onClick={logout} style={styles.logoutBtn}>Salir</button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Header */}
        <div style={{ animation: mounted ? "fadeUp 0.5s ease both" : "none", position: "relative" }}>
          <div style={styles.metaLine}>
            <span style={styles.metaDot} className="live-dot" />
            <span style={styles.metaTag}>{firstName ? firstName.toUpperCase() : "CONSULTOR"}</span>
            <span style={hairSpan} />
            <span style={styles.metaValue}>{surveys.length} {surveys.length === 1 ? "PULSO" : "PULSOS"} EN GESTIÓN</span>
          </div>
          <h1 style={styles.title}>
            Mis pulsos
            <span style={styles.titleAccent}>.</span>
          </h1>
          <p style={styles.subtitle}>Gestiona tus encuestas de satisfacción organizacional.</p>
        </div>

        {/* Stats row */}
        <div style={{ ...styles.statsRow, animation: mounted ? "fadeUp 0.5s ease 0.1s both" : "none" }}>
          <StatCard label="Total pulsos" value={surveys.length} accent={t.color.ink} />
          <StatCard label="Activas" value={counts.active} accent={t.color.brand} />
          <StatCard label="Respuestas totales" value={totalResponses} accent={t.color.brandBright} />
          <StatCard label="Cerradas" value={counts.closed} accent={t.color.danger} />
        </div>

        {/* Filter tabs */}
        <div style={{ ...styles.filterRow, animation: mounted ? "fadeUp 0.5s ease 0.2s both" : "none" }}>
          <span style={styles.filterLabel}>Filtrar</span>
          {[
            { key: "all", label: "Todas" },
            { key: "favorites", label: "Favoritos" },
            { key: "active", label: "Activas" },
            { key: "draft", label: "Borradores" },
            { key: "closed", label: "Cerradas" },
          ].map(f => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                className="filter-btn"
                onClick={() => setFilter(f.key)}
                style={{
                  ...styles.filterBtn,
                  ...(isActive ? styles.filterBtnActive : {}),
                }}
              >
                <span>{f.label}</span>
                <span style={{
                  ...styles.filterCount,
                  background: isActive ? t.color.brand : "rgba(255,255,255,0.04)",
                  color: isActive ? "#fff" : t.color.mutedSoft,
                }}>
                  {tabCounts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar: búsqueda + filtro por cliente */}
        <div className="search-row" style={{ ...styles.searchRow, animation: mounted ? "fadeUp 0.5s ease 0.25s both" : "none" }}>
          <div style={styles.searchInputWrap}>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={styles.searchIcon}
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar por título o cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={styles.searchClearBtn}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
          <select
            className="select-input"
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="all">Todos los clientes</option>
            {uniqueClients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="select-input"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            style={styles.selectInput}
            title="Filtrar por fecha de creación"
          >
            <option value="all">Todas las fechas</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="year">Este año</option>
          </select>
          <select
            className="select-input"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={styles.selectInput}
            title="Ordenar"
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="responses">Más respuestas</option>
            <option value="alpha-asc">Alfabético A–Z</option>
            <option value="alpha-desc">Alfabético Z–A</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p style={{ color: "#999999", fontSize: 14, marginTop: 16 }}>Cargando pulsos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...styles.emptyState, animation: "fadeIn 0.4s ease both" }}>
            <div style={styles.emptyTag}>
              <span style={hairSpan} />
              <span>{hasActiveFilter ? "SIN RESULTADOS" : "VACÍO"}</span>
              <span style={hairSpan} />
            </div>
            <p style={styles.emptyTitle}>
              {hasActiveFilter
                ? "No se encontraron pulsos con esos filtros"
                : "No tienes pulsos todavía"}
            </p>
            <p style={styles.emptySubtitle}>
              {hasActiveFilter
                ? "Ajusta o limpia los filtros para ver más resultados."
                : "Crea tu primer pulso de satisfacción y empieza a medir."}
            </p>
            {hasActiveFilter ? (
              <button className="ghost-cta" onClick={clearAllFilters} style={styles.clearFiltersBtn}>
                Limpiar filtros
              </button>
            ) : (
              <button className="primary-cta" onClick={() => navigate("/surveys/new")} style={styles.createBtn}>
                <span className="cta-arrow" style={styles.ctaArrow}>+</span>
                <span>Crear pulso</span>
              </button>
            )}
          </div>
        ) : (
          <div style={styles.grid}>
            {paged.map((s, idx) => {
              const accent = s.primary_color || t.color.brand;
              return (
                <div
                  key={s.id}
                  className="survey-card"
                  onClick={() => navigate(`/surveys/${s.id}`)}
                  style={{
                    ...styles.card,
                    animation: `fadeUp 0.4s ease ${0.05 * idx}s both`,
                  }}
                >
                  {/* Top stripe con el color del survey */}
                  <span className="card-stripe" style={{ background: accent }} aria-hidden="true" />

                  <button
                    type="button"
                    className="fav-btn"
                    onClick={e => toggleFavorite(s.id, e)}
                    aria-label={s.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
                    title={s.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
                    style={{
                      ...styles.favBtn,
                      color: s.is_favorite ? "#f59e0b" : t.color.mutedFaint,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={s.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, paddingRight: 36 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="card-title" style={styles.cardTitle}>{s.title}</h3>
                      <p style={styles.cardClient}>
                        <span style={{ ...styles.cardClientDot, background: accent }} aria-hidden="true" />
                        {s.client_name}
                      </p>
                    </div>
                    <StatusPill status={s.status} size="sm" />
                  </div>

                  <div style={styles.cardFooter}>
                    <div style={styles.responseStat}>
                      <span style={{ ...styles.responseValue, color: accent }}>{s.response_count}</span>
                      <span style={styles.responseLabel}>
                        {s.response_count === 1 ? "respuesta" : "respuestas"}
                      </span>
                    </div>
                    <span style={styles.cardDate}>
                      {new Date(s.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                    </span>
                    <span className="card-arrow" style={{ ...styles.cardArrow, color: accent }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div style={styles.paginationRow}>
            <button
              type="button"
              className="page-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                ...styles.pageBtn,
                ...(safePage === 1 ? styles.pageBtnDisabled : {}),
              }}
            >
              ← Anterior
            </button>
            <span style={styles.pageInfo}>
              Página {safePage} de {totalPages}
            </span>
            <button
              type="button"
              className="page-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                ...styles.pageBtn,
                ...(safePage === totalPages ? styles.pageBtnDisabled : {}),
              }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={{ ...styles.statCard, "--accent": accent }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: accent }}>{value}</div>
    </div>
  );
}

function sortComparator(key) {
  switch (key) {
    case "oldest":
      return (a, b) => new Date(a.created_at) - new Date(b.created_at);
    case "responses":
      return (a, b) => (b.response_count || 0) - (a.response_count || 0);
    case "alpha-asc":
      return (a, b) => (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" });
    case "alpha-desc":
      return (a, b) => (b.title || "").localeCompare(a.title || "", "es", { sensitivity: "base" });
    case "recent":
    default:
      return (a, b) => new Date(b.created_at) - new Date(a.created_at);
  }
}

function cutoffFor(range) {
  if (range === "all") return null;
  if (range === "year") return new Date(new Date().getFullYear(), 0, 1);
  const days = parseInt(range, 10);
  if (!Number.isFinite(days)) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const styles = {
  page: {
    minHeight: "100vh",
    fontFamily: t.font.body,
    color: t.color.inkSoft,
    ...t.blueprintBg,
  },

  // ── Top bar ──
  topBar: {
    background: t.color.surface,
    borderBottom: t.hairline,
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 1px 0 0 rgba(37,99,235,0.04)",
  },
  topBarInner: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandMark: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandSep: {
    width: 1,
    height: 14,
    background: "rgba(37,99,235,0.22)",
    display: "inline-block",
  },
  brandTag: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  brandDot: {  // legacy — sin uso
    width: 10, height: 10, borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #2563eb)",
  },
  brandText: { fontSize: 15, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.3px" },

  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "3px 11px 3px 3px",
    borderRadius: t.radius.sharp,
    background: t.color.brandTint,
    border: `1px solid ${t.color.brandLine}`,
    marginRight: 4,
  },
  userAvatar: {
    width: 26, height: 26,
    borderRadius: "50%",
    objectFit: "cover",
  },
  userName: {
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: t.track.wide,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  createBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 20px",
    borderRadius: t.radius.sharp,
    border: "none",
    background: t.color.brand,
    color: "#fff",
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  ctaArrow: {
    fontFamily: t.font.display,
    fontSize: 14,
    color: "#5fd6d6",
    lineHeight: 1,
    display: "inline-block",
    transition: `transform 0.2s ${t.ease}`,
  },
  logoutBtn: {
    padding: "10px 16px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  tutorialBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
    cursor: "pointer",
  },

  // ── Content ──
  content: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "56px 24px 32px",
    position: "relative",
    zIndex: 1,
  },

  metaLine: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: t.color.brandBright,
    boxShadow: "0 0 0 4px rgba(37,99,235,0.15)",
    display: "inline-block",
  },
  metaTag: {
    fontFamily: t.font.display,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  metaValue: {
    fontFamily: t.font.display,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: t.font.display,
    fontSize: 60,
    fontWeight: 800,
    margin: 0,
    color: t.color.ink,
    letterSpacing: "-0.035em",
    lineHeight: 0.98,
    display: "flex",
    alignItems: "baseline",
    gap: 2,
  },
  titleAccent: {
    color: t.color.brandBright,
    fontSize: 64,
    lineHeight: 0.98,
  },
  subtitle: {
    fontSize: 17,
    color: t.color.mutedSoft,
    margin: "14px 0 0",
    fontFamily: t.font.body,
    maxWidth: 540,
    lineHeight: 1.5,
  },

  // ── Stats ──
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    margin: "40px 0 36px",
  },
  statCard: {
    background: `linear-gradient(135deg, ${t.color.surface} 0%, rgba(255,255,255,0.6) 100%)`,
    borderRadius: 12,
    padding: "22px 22px 22px 28px",
    border: t.hairline,
    position: "relative",
    overflow: "hidden",
  },
  statNum: {
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.mutedFaint,
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: t.font.display,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  statValue: {
    fontFamily: t.font.display,
    fontSize: 44,
    fontWeight: 800,
    lineHeight: 0.95,
    letterSpacing: "-0.04em",
  },

  // ── Filters ──
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 22,
    background: t.color.surface,
    padding: 5,
    borderRadius: 10,
    border: t.hairlineSoft,
    width: "fit-content",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  filterLabel: {
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
    padding: "0 12px 0 10px",
    borderRight: t.hairlineSoft,
  },
  filterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 14px",
    borderRadius: t.radius.sharp,
    border: "none",
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: t.track.wide,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  filterBtnActive: {
    background: t.color.brandTint,
    color: t.color.brand,
    fontWeight: 700,
  },
  filterCount: {
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: t.radius.sharp,
    minWidth: 18,
    textAlign: "center",
    letterSpacing: t.track.normal,
  },

  // ── Toolbar de búsqueda + cliente ──
  searchRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 10,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  searchInputWrap: {
    position: "relative",
    flex: "1 1 280px",
    minWidth: 240,
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: t.color.mutedSoft,
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "11px 36px 11px 38px",
    background: t.color.surface,
    border: `1px solid ${t.color.brandLine}`,
    borderRadius: t.radius.sharp,
    fontFamily: t.font.body,
    fontSize: 14,
    color: t.color.ink,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  searchClearBtn: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: t.color.muted,
    fontSize: 22,
    lineHeight: 1,
    padding: "2px 8px",
    borderRadius: 4,
  },
  selectInput: {
    flex: "0 0 auto",
    minWidth: 180,
    padding: "11px 14px",
    background: t.color.surface,
    border: `1px solid ${t.color.brandLine}`,
    borderRadius: t.radius.sharp,
    fontFamily: t.font.body,
    fontSize: 14,
    color: t.color.ink,
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },

  // ── Paginación ──
  paginationRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 28,
    paddingTop: 24,
    borderTop: t.hairlineSoft,
    flexWrap: "wrap",
  },
  pageBtn: {
    padding: "8px 14px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: t.track.wide,
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  pageBtnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
  pageInfo: {
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    color: t.color.muted,
    letterSpacing: t.track.wide,
    textTransform: "uppercase",
  },
  clearFiltersBtn: {
    padding: "10px 18px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
    cursor: "pointer",
  },

  // ── Grid ──
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
    gap: 18,
  },
  card: {
    background: `linear-gradient(180deg, ${t.color.surface} 0%, #fafaf6 100%)`,
    borderRadius: 12,
    padding: "26px 26px 22px",
    border: t.hairline,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 168,
    cursor: "pointer",
    overflow: "hidden",
  },
  cardIndex: {
    position: "absolute",
    top: 14,
    right: 14,
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    color: t.color.mutedFaint,
  },
  cardTitle: {
    fontFamily: t.font.display,
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: t.color.ink,
    lineHeight: 1.26,
    letterSpacing: "-0.02em",
  },
  cardClient: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: t.font.display,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: t.track.wide,
    color: t.color.mutedSoft,
    margin: "10px 0 0",
    textTransform: "uppercase",
  },
  cardClientDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginTop: 22,
    paddingTop: 16,
    borderTop: t.hairlineSoft,
  },
  responseStat: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 6,
  },
  responseValue: {
    fontFamily: t.font.display,
    fontSize: 22,
    fontWeight: 800,
    color: t.color.brand,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  responseLabel: {
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  cardDate: {
    marginLeft: "auto",
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedFaint,
    textTransform: "uppercase",
  },
  cardArrow: {
    fontSize: 18,
    color: t.color.brand,
    opacity: 0.45,
    fontWeight: 600,
    transition: `transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease`,
    display: "inline-block",
    transform: "translateX(0)",
  },
  favBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    padding: 0,
    zIndex: 2,
  },

  // ── States ──
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
  },
  spinner: {
    width: 32, height: 32,
    border: `2px solid ${t.color.brandTintStrong}`,
    borderTopColor: t.color.brand,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    background: t.color.surface,
    borderRadius: t.radius.card,
    border: `1px dashed ${t.color.brandLine}`,
  },
  emptyTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
    marginBottom: 22,
  },
  emptyTitle: {
    fontFamily: t.font.display,
    fontSize: 22,
    fontWeight: 700,
    color: t.color.ink,
    letterSpacing: t.track.tight,
    margin: "0 0 10px",
    lineHeight: 1.2,
  },
  emptySubtitle: {
    fontFamily: t.font.body,
    fontSize: 14,
    color: t.color.mutedSoft,
    margin: "0 0 28px",
  },

  // ─── Modal Crear perfil ──────────────────────────────────────────
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  perfilesModal: {
    background: "#0f172a",
    borderRadius: t.radius.card,
    maxWidth: 480,
    width: "100%",
    boxShadow: "0 20px 60px rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  perfilesModalHeader: {
    padding: "24px 24px 18px",
    borderBottom: t.hairlineSoft,
  },

  // Modal de selector de tipo (Estándar / Perfiles)
  typeModal: {
    background: "#0f172a",
    borderRadius: t.radius.card,
    maxWidth: 820,
    width: "100%",
    boxShadow: "0 20px 60px rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  typeModalHeader: {
    padding: "24px 24px 18px",
    borderBottom: t.hairlineSoft,
  },
  typeOptionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    padding: "20px 24px",
  },
  typeCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "20px 18px",
    borderRadius: t.radius.card,
    border: `1px solid ${t.color.brandLine}`,
    background: "#0f172a",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    transition: "all 0.18s ease",
  },
  typeCardIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: "rgba(37,99,235,0.08)",
    color: t.color.brand,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  typeCardName: {
    fontFamily: t.font.display,
    fontSize: 15, fontWeight: 700,
    color: t.color.ink,
    letterSpacing: "-0.005em",
  },
  typeCardDesc: {
    fontFamily: t.font.body,
    fontSize: 12.5,
    color: t.color.muted,
    lineHeight: 1.5,
  },
  typeCardDisabled: {
    cursor: "not-allowed",
    opacity: 0.75,
    background: "#070b1a",
    position: "relative",
    pointerEvents: "auto", // permitimos hover para el tooltip
  },
  typeCardLockedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: "3px 9px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
  modalKicker: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    color: t.color.brandBright,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: t.font.display,
    fontSize: 22,
    fontWeight: 700,
    color: t.color.ink,
    letterSpacing: "-0.01em",
    margin: 0,
  },
  modalDescription: {
    fontFamily: t.font.body,
    fontSize: 13,
    color: t.color.muted,
    lineHeight: 1.55,
    margin: "10px 0 0",
  },
  modalLabel: {
    display: "block",
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    color: t.color.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    fontSize: 14,
    fontFamily: t.font.body,
    outline: "none",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    padding: "16px 24px 24px",
    borderTop: t.hairlineSoft,
  },
  modalCancelBtn: {
    padding: "10px 18px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  modalConfirmBtn: {
    padding: "10px 18px",
    borderRadius: t.radius.sharp,
    border: "none",
    background: t.color.brandBright,
    color: "#fff",
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
  },
};
