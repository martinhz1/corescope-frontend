import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMySurveys, logout, getUser, updateSurvey } from "../lib/api";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import StatusPill from "../components/StatusPill";
import { theme as t, globalKeyframes } from "../lib/theme";

export default function SurveyListPage() {
  const [surveys, setSurveys]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateRange, setDateRange]   = useState("all");
  const [sortBy, setSortBy]         = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted]       = useState(false);
  const PAGE_SIZE = 12;
  const navigate = useNavigate();
  const user      = getUser();
  const firstName = user.name ? user.name.split(" ")[0] : null;

  useEffect(() => {
    setMounted(true);
    getMySurveys()
      .then(setSurveys)
      .catch(() => toast.error("Error cargando encuestas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filter, searchQuery, clientFilter, dateRange, sortBy]);

  const uniqueClients = [...new Set(surveys.map(s => s.client_name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const q        = searchQuery.trim().toLowerCase();
  const byClient = clientFilter === "all" ? surveys : surveys.filter(s => s.client_name === clientFilter);
  const bySearch = q
    ? byClient.filter(s => (s.title || "").toLowerCase().includes(q) || (s.client_name || "").toLowerCase().includes(q))
    : byClient;
  const cutoff   = cutoffFor(dateRange);
  const byDate   = cutoff ? bySearch.filter(s => new Date(s.created_at) >= cutoff) : bySearch;
  let filtered;
  if (filter === "favorites")  filtered = byDate.filter(s => s.is_favorite);
  else if (filter === "all")   filtered = byDate;
  else                         filtered = byDate.filter(s => s.status === filter);
  const sorted   = [...filtered].sort(sortComparator(sortBy));

  const counts = {
    all:    surveys.length,
    active: surveys.filter(s => s.status === "active").length,
    draft:  surveys.filter(s => s.status === "draft").length,
    closed: surveys.filter(s => s.status === "closed").length,
  };
  const tabCounts = {
    all:       byDate.length,
    favorites: byDate.filter(s => s.is_favorite).length,
    active:    byDate.filter(s => s.status === "active").length,
    draft:     byDate.filter(s => s.status === "draft").length,
    closed:    byDate.filter(s => s.status === "closed").length,
  };

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
  const totalPages     = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage       = Math.min(currentPage, totalPages);
  const startIdx       = (safePage - 1) * PAGE_SIZE;
  const paged          = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  const hasActiveFilter = q.length > 0 || clientFilter !== "all" || filter !== "all" || dateRange !== "all";
  const clearAllFilters = () => {
    setSearchQuery(""); setClientFilter("all"); setFilter("all"); setDateRange("all"); setSortBy("recent");
  };

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{CSS}</style>

      {/* ─── SIDEBAR ────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          {/* Logo — prominente */}
          <div style={S.sideLogoWrap}>
            <Logo size={56} />
          </div>

          {/* Nav */}
          <nav style={S.sideNav} aria-label="Navegación principal">
            <button style={{ ...S.sideLink, ...S.sideLinkActive }} aria-current="page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span>Mis pulsos</span>
              {surveys.length > 0 && <span style={S.sideBadge}>{surveys.length}</span>}
            </button>
            <button className="side-link" onClick={() => navigate("/tutorial")} style={S.sideLink}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span>Guía de uso</span>
            </button>
          </nav>
        </div>

        <div style={{ flex: 1 }} />

        {/* User row + logout */}
        <div style={S.sideBottom}>
          <div style={S.sideUserRow}>
            {user.picture ? (
              <img src={user.picture} alt="" style={S.sideAvatar} referrerPolicy="no-referrer" />
            ) : (
              <div style={S.sideAvatarFallback}>
                {(firstName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.sideUserName}>{firstName || "Usuario"}</div>
              <div style={S.sideUserEmail}>{user.email || ""}</div>
            </div>
          </div>
          <button className="side-logout" onClick={logout} style={S.sideLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </aside>

      {/* ─── MAIN ────────────────────────────────────────────── */}
      <main style={S.main}>

        {/* Page header */}
        <div style={S.pageHeader}>
          <div style={{ animation: mounted ? "fadeUp 0.45s ease both" : "none" }}>
            <div style={S.eyebrow}>
              <span style={S.eyebrowDot} className="live-dot" />
              <span style={S.eyebrowText}>
                {firstName ? `${firstName.toUpperCase()} · ` : ""}
                {surveys.length} {surveys.length === 1 ? "PULSO" : "PULSOS"} EN GESTIÓN
              </span>
            </div>
            <h1 style={S.pageTitle}>Mis pulsos</h1>
          </div>
          <button className="create-btn" onClick={() => navigate("/surveys/new")} style={S.createBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Crear pulso
          </button>
        </div>

        {/* ── SCOPE STRIP ─── Signature element: sweep animation ─ */}
        <div style={S.scopeStrip}>
          {/* Sweep line — plays once on mount */}
          <div className="scope-sweep" style={S.scopeSweep} aria-hidden="true" />
          {/* EKG-style decorative line on top edge */}
          <div style={S.scopeEdgeLine} aria-hidden="true" />

          <ScopeItem label="Total pulsos"       value={surveys.length}  color={t.color.ink} />
          <div style={S.scopeDivider} />
          <ScopeItem label="Activas"            value={counts.active}   color={t.color.brand} live={counts.active > 0} />
          <div style={S.scopeDivider} />
          <ScopeItem label="Respuestas totales" value={totalResponses}  color="#22d3ee" />
          <div style={S.scopeDivider} />
          <ScopeItem label="Cerradas"           value={counts.closed}   color={t.color.mutedSoft} />
        </div>

        {/* ── TOOLBAR ──────────────────────────────────────────── */}
        <div style={{ animation: mounted ? "fadeUp 0.5s ease 0.12s both" : "none" }}>
          {/* Status filter tabs */}
          <div style={S.filterRow}>
            {[
              { key: "all",       label: "Todas"      },
              { key: "favorites", label: "Favoritas"  },
              { key: "active",    label: "Activas"    },
              { key: "draft",     label: "Borradores" },
              { key: "closed",    label: "Cerradas"   },
            ].map(f => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  className="filter-btn"
                  onClick={() => setFilter(f.key)}
                  aria-pressed={on}
                  style={{ ...S.filterBtn, ...(on ? S.filterBtnOn : {}) }}
                >
                  {f.label}
                  <span style={{
                    ...S.filterBadge,
                    background: on ? t.color.brand              : "rgba(255,255,255,0.05)",
                    color:      on ? "#fff"                     : t.color.mutedFaint,
                  }}>
                    {tabCounts[f.key]}
                  </span>
                </button>
              );
            })}

            {hasActiveFilter && (
              <button className="filter-btn" onClick={clearAllFilters} style={{ ...S.filterBtn, marginLeft: 8, color: t.color.danger }}>
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Search + selects */}
          <div style={S.searchRow}>
            <div style={{ position: "relative", flex: "1 1 0", minWidth: 200 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.color.mutedSoft, pointerEvents: "none" }} aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="search-input"
                type="text"
                placeholder="Buscar por título u organización..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={S.searchInput}
                aria-label="Buscar encuestas"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} style={S.searchClear} aria-label="Limpiar búsqueda">×</button>
              )}
            </div>
            {uniqueClients.length > 0 && (
              <select className="sel-input" value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={S.selInput} aria-label="Filtrar por organización">
                <option value="all">Todas las organizaciones</option>
                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select className="sel-input" value={dateRange} onChange={e => setDateRange(e.target.value)} style={S.selInput} aria-label="Filtrar por fecha">
              <option value="all">Todas las fechas</option>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="year">Este año</option>
            </select>
            <select className="sel-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={S.selInput} aria-label="Ordenar encuestas">
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="responses">Más respuestas</option>
              <option value="alpha-asc">A–Z</option>
              <option value="alpha-desc">Z–A</option>
            </select>
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        <div style={S.contentArea}>
          {loading ? (
            <div style={S.loadingWrap}>
              <div style={S.spinner} />
              <p style={{ color: t.color.mutedSoft, fontSize: 13, marginTop: 16 }}>Cargando pulsos...</p>
            </div>

          ) : filtered.length === 0 ? (
            <div style={S.emptyWrap}>
              <div style={S.emptyIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="13" x2="12" y2="17"/><line x1="10" y1="15" x2="14" y2="15"/>
                </svg>
              </div>
              <p style={S.emptyTitle}>{hasActiveFilter ? "Sin resultados" : "Sin pulsos todavía"}</p>
              <p style={S.emptyDesc}>{hasActiveFilter ? "Ajusta los filtros para ver más resultados." : "Crea tu primer pulso de satisfacción y empieza a medir."}</p>
              {hasActiveFilter ? (
                <button className="ghost-btn" onClick={clearAllFilters} style={S.ghostBtn}>Limpiar filtros</button>
              ) : (
                <button className="create-btn" onClick={() => navigate("/surveys/new")} style={S.createBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Crear pulso
                </button>
              )}
            </div>

          ) : (
            <div style={S.list} role="list">
              {/* Table header */}
              <div style={S.listHeader} aria-hidden="true">
                <span style={{ flex: "1 1 0", paddingLeft: 24 }}>Pulso</span>
                <span style={{ width: 110, textAlign: "center" }}>Estado</span>
                <span style={{ width: 130, textAlign: "right" }}>Respuestas</span>
                <span style={{ width: 130, textAlign: "right" }}>Creado</span>
                <span style={{ width: 64 }} />
              </div>

              {paged.map((s, idx) => {
                const accent = s.primary_color || t.color.brand;
                return (
                  <div
                    key={s.id}
                    role="listitem"
                    className="survey-row"
                    onClick={() => navigate(`/surveys/${s.id}`)}
                    style={{ ...S.surveyRow, animation: `fadeUp 0.32s ease ${idx * 0.035}s both` }}
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && navigate(`/surveys/${s.id}`)}
                    aria-label={`Pulso: ${s.title}`}
                  >
                    {/* Left color accent */}
                    <div style={{ ...S.rowAccent, background: accent }} aria-hidden="true" />

                    {/* Title + org */}
                    <div style={{ flex: "1 1 0", minWidth: 0, paddingLeft: 20, paddingRight: 16 }}>
                      <div className="row-title" style={S.rowTitle}>{s.title}</div>
                      {s.client_name && (
                        <div style={S.rowOrg}>
                          <span style={{ ...S.rowOrgDot, background: accent }} aria-hidden="true" />
                          {s.client_name}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ width: 110, display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <StatusPill status={s.status} size="sm" />
                    </div>

                    {/* Responses */}
                    <div style={{ width: 130, textAlign: "right", display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 6 }}>
                      <span style={{ ...S.rowResponseNum, color: accent }}>{s.response_count}</span>
                      <span style={S.rowResponseLabel}>{s.response_count === 1 ? "resp." : "resp."}</span>
                    </div>

                    {/* Date */}
                    <div style={{ width: 130, textAlign: "right" }}>
                      <span style={S.rowDate}>
                        {new Date(s.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ width: 64, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingRight: 16 }}>
                      <button
                        type="button"
                        className="fav-btn"
                        onClick={e => toggleFavorite(s.id, e)}
                        aria-label={s.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
                        style={{ ...S.favBtn, color: s.is_favorite ? "#f59e0b" : t.color.mutedFaint }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={s.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                      <span className="row-arrow" style={S.rowArrow} aria-hidden="true">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={S.pageRow}>
              <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ ...S.pageBtn, ...(safePage === 1 ? S.pageBtnDis : {}) }}>
                ← Anterior
              </button>
              <span style={S.pageInfo}>Página {safePage} de {totalPages}</span>
              <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ ...S.pageBtn, ...(safePage === totalPages ? S.pageBtnDis : {}) }}>
                Siguiente →
              </button>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}

// ─── ScopeItem ───────────────────────────────────────────────────
function ScopeItem({ value, label, color, live }) {
  return (
    <div style={{ flex: 1, padding: "30px 36px", position: "relative" }}>
      <div style={{
        fontFamily: t.font.display, fontSize: 9.5, fontWeight: 700,
        letterSpacing: "0.28em", color: t.color.mutedFaint,
        textTransform: "uppercase", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {live && (
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: color, boxShadow: `0 0 0 3px ${color}25`,
            flexShrink: 0,
          }} className="live-dot" aria-hidden="true" />
        )}
        {label}
      </div>
      <div style={{
        fontFamily: t.font.display, fontSize: 48, fontWeight: 900,
        color: color || t.color.ink, letterSpacing: "-0.05em",
        lineHeight: 0.92, fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────
function sortComparator(key) {
  switch (key) {
    case "oldest":     return (a, b) => new Date(a.created_at) - new Date(b.created_at);
    case "responses":  return (a, b) => (b.response_count || 0) - (a.response_count || 0);
    case "alpha-asc":  return (a, b) => (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" });
    case "alpha-desc": return (a, b) => (b.title || "").localeCompare(a.title || "", "es", { sensitivity: "base" });
    case "recent":
    default:           return (a, b) => new Date(b.created_at) - new Date(a.created_at);
  }
}

function cutoffFor(range) {
  if (range === "all")  return null;
  if (range === "year") return new Date(new Date().getFullYear(), 0, 1);
  const days = parseInt(range, 10);
  if (!Number.isFinite(days)) return null;
  const d = new Date(); d.setDate(d.getDate() - days); return d;
}

// ─── CSS ─────────────────────────────────────────────────────────
const CSS = `
  ${globalKeyframes}

  @keyframes pulseDot {
    0%, 100% { opacity: 1;   transform: scale(1);    }
    50%       { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes scopeSweep {
    0%   { left: -42%; opacity: 0;   }
    8%   { opacity: 1;               }
    92%  { opacity: 1;               }
    100% { left: 110%; opacity: 0;   }
  }

  .live-dot   { animation: pulseDot 2.4s ease-in-out infinite; }
  .scope-sweep { animation: scopeSweep 2s cubic-bezier(0.4, 0, 0.6, 1) 0.6s forwards; }

  /* Sidebar interactive */
  .side-link:hover  { background: rgba(37,99,235,0.09) !important; color: ${t.color.inkSoft} !important; }
  .side-logout:hover { background: rgba(248,113,113,0.08) !important; color: #f87171 !important; border-color: rgba(248,113,113,0.25) !important; }

  /* Create button */
  .create-btn { transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.15s ease; box-shadow: 0 4px 14px -4px rgba(37,99,235,0.35); }
  .create-btn:hover { background: ${t.color.brandHover} !important; transform: translateY(-1px); box-shadow: 0 10px 28px -8px rgba(37,99,235,0.55) !important; }

  /* Filter chips */
  .filter-btn { transition: all 0.14s ease; }
  .filter-btn:hover { background: rgba(37,99,235,0.08) !important; color: ${t.color.inkSoft} !important; }

  /* Search/select inputs */
  .search-input:focus, .sel-input:focus {
    border-color: rgba(37,99,235,0.5) !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    outline: none;
  }

  /* Survey rows */
  .survey-row { transition: background 0.16s ease; position: relative; }
  .survey-row:hover { background: rgba(37,99,235,0.055) !important; }
  .survey-row:hover .row-title { color: ${t.color.brand} !important; }
  .survey-row:hover .row-arrow { opacity: 1 !important; transform: translateX(5px) !important; }
  .survey-row:focus-visible { outline: 2px solid ${t.color.brand}; outline-offset: -2px; }

  .row-title { transition: color 0.15s ease; }
  .row-arrow { transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.16,1,0.3,1); }

  /* Fav button */
  .fav-btn { transition: color 0.15s ease, transform 0.18s ease; }
  .fav-btn:hover { color: #f59e0b !important; transform: scale(1.22); }

  .ghost-btn:hover { border-color: rgba(37,99,235,0.5) !important; color: ${t.color.brand} !important; }

  /* Pagination */
  .page-btn:not(:disabled):hover { background: rgba(37,99,235,0.08) !important; border-color: rgba(37,99,235,0.4) !important; color: ${t.color.brand} !important; }
`;

// ─── Styles ──────────────────────────────────────────────────────
const S = {
  // Root — sidebar + main flex layout
  root: {
    display: "flex",
    minHeight: "100vh",
    background: t.color.paper,
    fontFamily: t.font.body,
    color: t.color.inkSoft,
  },

  // ── Sidebar ──
  sidebar: {
    width: 240,
    flexShrink: 0,
    height: "100vh",
    position: "sticky",
    top: 0,
    background: "#060919",
    borderRight: "1px solid rgba(37,99,235,0.12)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 20,
  },
  sideTop: {
    display: "flex",
    flexDirection: "column",
  },
  sideLogoWrap: {
    padding: "28px 24px 22px",
    borderBottom: "1px solid rgba(37,99,235,0.08)",
    marginBottom: 8,
  },
  sideNav: {
    padding: "4px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  sideLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  sideLinkActive: {
    background: "rgba(37,99,235,0.12)",
    color: t.color.brand,
  },
  sideBadge: {
    marginLeft: "auto",
    fontSize: 9.5,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.2)",
    color: t.color.brand,
    letterSpacing: "0.02em",
  },
  sideBottom: {
    padding: "14px 10px",
    borderTop: "1px solid rgba(37,99,235,0.08)",
  },
  sideUserRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px 12px",
  },
  sideAvatar: {
    width: 32, height: 32,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "2px solid rgba(37,99,235,0.2)",
  },
  sideAvatarFallback: {
    width: 32, height: 32,
    borderRadius: "50%",
    background: "rgba(37,99,235,0.18)",
    color: t.color.brand,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: t.font.display,
    fontSize: 14, fontWeight: 700,
    flexShrink: 0,
  },
  sideUserName: {
    fontFamily: t.font.display,
    fontSize: 12.5, fontWeight: 700,
    color: t.color.ink,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },
  sideUserEmail: {
    fontFamily: t.font.body,
    fontSize: 10.5,
    color: t.color.mutedSoft,
    marginTop: 2,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    maxWidth: 164,
  },
  sideLogout: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "transparent",
    color: t.color.mutedSoft,
    fontFamily: t.font.display,
    fontSize: 10.5, fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  // ── Main ──
  main: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    backgroundImage:
      "linear-gradient(rgba(37,99,235,0.025) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(37,99,235,0.025) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },

  // Page header
  pageHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: "52px 48px 40px",
    borderBottom: "1px solid rgba(37,99,235,0.08)",
    flexWrap: "wrap",
    gap: 20,
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 7, height: 7,
    borderRadius: "50%",
    background: t.color.brand,
    boxShadow: "0 0 0 3px rgba(37,99,235,0.2)",
    display: "inline-block",
    flexShrink: 0,
  },
  eyebrowText: {
    fontFamily: t.font.display,
    fontSize: 9.5, fontWeight: 700,
    letterSpacing: "0.3em",
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  pageTitle: {
    fontFamily: t.font.display,
    fontSize: 56, fontWeight: 900,
    margin: 0,
    color: t.color.ink,
    letterSpacing: "-0.04em",
    lineHeight: 0.95,
  },
  createBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "13px 24px",
    borderRadius: 6,
    border: "none",
    background: t.color.brand,
    color: "#fff",
    fontFamily: t.font.display,
    fontSize: 11, fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    cursor: "pointer",
  },

  // ── Scope strip ──
  scopeStrip: {
    position: "relative",
    display: "flex",
    alignItems: "stretch",
    background: "#060919",
    borderBottom: "1px solid rgba(37,99,235,0.1)",
    overflow: "hidden",
  },
  scopeSweep: {
    position: "absolute",
    inset: 0,
    width: "42%",
    background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.16), transparent)",
    pointerEvents: "none",
    zIndex: 2,
  },
  scopeEdgeLine: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 2,
    background: "linear-gradient(90deg, rgba(37,99,235,0.55), rgba(34,211,238,0.4), rgba(37,99,235,0.08))",
    pointerEvents: "none",
  },
  scopeDivider: {
    width: 1,
    background: "rgba(37,99,235,0.1)",
    alignSelf: "stretch",
    flexShrink: 0,
  },

  // ── Toolbar ──
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "28px 48px 12px",
    flexWrap: "wrap",
  },
  filterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 10.5, fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  filterBtnOn: {
    background: "rgba(37,99,235,0.12)",
    color: t.color.brand,
  },
  filterBadge: {
    fontSize: 9.5, fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 4,
    letterSpacing: 0,
  },
  searchRow: {
    display: "flex",
    gap: 10,
    padding: "0 48px 24px",
    flexWrap: "wrap",
  },
  searchInput: {
    width: "100%",
    padding: "11px 36px 11px 40px",
    background: t.color.surface,
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: 6,
    fontFamily: t.font.body,
    fontSize: 13.5,
    color: t.color.ink,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  searchClear: {
    position: "absolute",
    right: 8, top: "50%",
    transform: "translateY(-50%)",
    background: "transparent", border: "none",
    cursor: "pointer",
    color: t.color.muted,
    fontSize: 20, lineHeight: 1,
    padding: "2px 8px", borderRadius: 4,
  },
  selInput: {
    flex: "0 0 auto",
    minWidth: 160,
    padding: "11px 14px",
    background: t.color.surface,
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: 6,
    fontFamily: t.font.body,
    fontSize: 13,
    color: t.color.ink,
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },

  // ── Content area ──
  contentArea: {
    padding: "0 0 48px",
    flex: 1,
  },

  // Survey list (table-style)
  list: {
    margin: "0 48px",
    border: "1px solid rgba(37,99,235,0.1)",
    borderRadius: 10,
    overflow: "hidden",
    background: t.color.surface,
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    padding: "11px 0",
    background: "#060919",
    borderBottom: "1px solid rgba(37,99,235,0.1)",
    fontFamily: t.font.display,
    fontSize: 9, fontWeight: 700,
    letterSpacing: "0.22em",
    color: t.color.mutedFaint,
    textTransform: "uppercase",
    gap: 0,
  },
  surveyRow: {
    display: "flex",
    alignItems: "center",
    position: "relative",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    minHeight: 72,
    background: "transparent",
    cursor: "pointer",
    gap: 0,
  },
  rowAccent: {
    width: 3,
    alignSelf: "stretch",
    flexShrink: 0,
    opacity: 0.9,
  },
  rowTitle: {
    fontFamily: t.font.display,
    fontSize: 15, fontWeight: 700,
    color: t.color.ink,
    letterSpacing: "-0.012em",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 380,
  },
  rowOrg: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: t.font.display,
    fontSize: 9.5, fontWeight: 600,
    color: t.color.mutedSoft,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginTop: 5,
  },
  rowOrgDot: {
    width: 5, height: 5,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
    opacity: 0.75,
  },
  rowResponseNum: {
    fontFamily: t.font.display,
    fontSize: 26, fontWeight: 800,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  rowResponseLabel: {
    fontFamily: t.font.display,
    fontSize: 9, fontWeight: 600,
    color: t.color.mutedFaint,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  rowDate: {
    fontFamily: t.font.display,
    fontSize: 9.5, fontWeight: 600,
    color: t.color.mutedFaint,
    letterSpacing: "0.06em",
  },
  rowArrow: {
    fontFamily: t.font.display,
    fontSize: 16,
    color: t.color.brand,
    opacity: 0.28,
    display: "inline-block",
    transform: "translateX(0)",
  },
  favBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 5,
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Loading / empty ──
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    margin: "0 48px",
  },
  spinner: {
    width: 28, height: 28,
    border: "2px solid rgba(37,99,235,0.18)",
    borderTopColor: t.color.brand,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyWrap: {
    textAlign: "center",
    padding: "80px 24px",
    margin: "0 48px",
    background: t.color.surface,
    borderRadius: 10,
    border: "1px dashed rgba(37,99,235,0.2)",
  },
  emptyIcon: {
    width: 58, height: 58,
    borderRadius: 14,
    background: "rgba(37,99,235,0.08)",
    color: t.color.brand,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  emptyTitle: {
    fontFamily: t.font.display,
    fontSize: 20, fontWeight: 700,
    color: t.color.ink,
    letterSpacing: "-0.02em",
    margin: "0 0 8px",
  },
  emptyDesc: {
    fontSize: 13.5,
    color: t.color.mutedSoft,
    margin: "0 0 26px",
    lineHeight: 1.6,
  },
  ghostBtn: {
    padding: "10px 20px",
    borderRadius: 6,
    border: "1px solid rgba(37,99,235,0.28)",
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 11, fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  },

  // ── Pagination ──
  pageRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    margin: "28px 48px 0",
    paddingTop: 24,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap",
  },
  pageBtn: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "1px solid rgba(37,99,235,0.18)",
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display,
    fontSize: 10.5, fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.14s ease",
  },
  pageBtnDis: { opacity: 0.3, cursor: "not-allowed" },
  pageInfo: {
    fontFamily: t.font.display,
    fontSize: 11, fontWeight: 600,
    color: t.color.muted,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
};
