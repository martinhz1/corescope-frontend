import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { updateQuestionDashboardVisibility, resolveImageUrl } from "../lib/api";
import { API_URL } from "../lib/config";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import { theme as t } from "../lib/theme";
import { useAutoRefresh } from "../lib/useAutoRefresh";
import { buildLikertChartSvg, buildFavorabilityChartSvg, buildAveragesChartSvg, buildLikertHistogramSvg, buildVariablesComparisonSvg, buildVariablesDetailSvg, handleExport, safeFilename } from "../lib/chartExport";

const STATUS_CONFIG = {
  active: { label: "En curso", bg: "rgba(37,99,235,0.12)", color: "#2563eb", dot: "#2563eb" },
  closed: { label: "Cerrada", bg: "rgba(220,38,38,0.08)", color: "#dc2626", dot: "#dc2626" },
  draft:  { label: "Borrador", bg: "rgba(153,153,153,0.1)", color: "#64748b", dot: "#999" },
};

export default function DashboardPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get("id");
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({}); // { demographic_q_id: [values...] }
  const [selectedDay, setSelectedDay] = useState(""); // "" = todos los días, "YYYY-MM-DD" = ese día
  const [liveMode, setLiveMode] = useState(false);
  // Vista del dashboard: "favorability" (default) | "averages" (legacy con promedio + histograma).
  // Persiste global del usuario en localStorage, así el consultor no tiene que volver a elegir
  // cada vez que abre un dashboard distinto.
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "favorability";
    return localStorage.getItem("dashboardMode") === "averages" ? "averages" : "favorability";
  });
  useEffect(() => {
    try { localStorage.setItem("dashboardMode", viewMode); } catch {}
  }, [viewMode]);
  // Comparativos cross-ola: cuando el survey tiene parent_survey_id y el
  // consultor activa el toggle, fetcheamos el dashboard del padre y lo
  // pasamos a los charts para mostrar deltas. Solo en vista privada (con
  // surveyId) — la vista pública del cliente no expone el id del padre.
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const intervalRef = useRef(null);
  const filtersRef = useRef(filters);
  const selectedDayRef = useRef(selectedDay);
  const statusRef = useRef(null);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { selectedDayRef.current = selectedDay; }, [selectedDay]);

  const fetchData = async (showRefresh = false, filterState = filters, dayState = selectedDay) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      const activeFilters = Object.fromEntries(
        Object.entries(filterState).filter(([, v]) => v && v.length > 0)
      );
      const params = new URLSearchParams();
      if (Object.keys(activeFilters).length > 0) {
        params.set("filters", JSON.stringify(activeFilters));
      }
      if (dayState) {
        params.set("day", dayState);
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      let res;
      if (token) {
        res = await fetch(`${API_URL}/api/public/dashboard/${token}${qs}`);
      } else if (surveyId) {
        const authToken = localStorage.getItem("token");
        res = await fetch(`${API_URL}/api/dashboard/${surveyId}${qs}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
      if (!res || !res.ok) throw new Error("Dashboard no disponible");
      const json = await res.json();
      setData(json);
      statusRef.current = json?.survey?.status || null;
      setLastUpdate(new Date());
      // Si el día seleccionado ya no aparece entre los disponibles, resetear a "todos"
      if (dayState && Array.isArray(json.available_days) && !json.available_days.some(d => d.date === dayState)) {
        setSelectedDay("");
      }
    } catch (err) { setError(err.message); }
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    fetchData();
    // Live mode baja el intervalo a 2s; el modo normal queda en 30s.
    const intervalMs = liveMode ? 2000 : 30000;
    intervalRef.current = setInterval(() => {
      // No pollear si la pestaña está oculta o si la encuesta ya está cerrada
      // (no llegan más respuestas). Ahorra requests y carga de Railway.
      if (document.hidden) return;
      if (statusRef.current === "closed") return;
      fetchData(true, filtersRef.current, selectedDayRef.current);
    }, intervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden && statusRef.current !== "closed") {
        fetchData(true, filtersRef.current, selectedDayRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, surveyId, liveMode]);

  useEffect(() => { fetchData(false, filters, selectedDay); }, [filters, selectedDay]); // eslint-disable-line

  // Fetch del dashboard del padre cuando se activa el modo comparar.
  // Solo en vista privada (surveyId presente). Si falla o se desactiva,
  // limpiamos compareData.
  const parentSurveyId = data?.survey?.parent_survey_id;
  useEffect(() => {
    if (!compareMode || !parentSurveyId || !surveyId) {
      setCompareData(null);
      return;
    }
    let abort = false;
    const fetchCompare = async () => {
      setCompareLoading(true);
      try {
        const authToken = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/dashboard/${parentSurveyId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error("No se pudo cargar la ola anterior");
        const json = await res.json();
        if (!abort) setCompareData(json);
      } catch (err) {
        if (!abort) {
          toast.error(err.message || "Error cargando ola anterior");
          setCompareMode(false);
        }
      } finally {
        if (!abort) setCompareLoading(false);
      }
    };
    fetchCompare();
    return () => { abort = true; };
  }, [compareMode, parentSurveyId, surveyId]);

  const toggleFilter = (demoId, value) => {
    setFilters(prev => {
      const current = prev[demoId] || [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [demoId]: next };
    });
  };

  const clearFilters = () => setFilters({});

  const togglePublicVisibility = async (demoId, nextValue) => {
    if (!surveyId) return;
    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      demographics: prev.demographics.map(d =>
        d.id === demoId ? { ...d, is_public_in_dashboard: nextValue } : d
      ),
    } : prev);
    try {
      await updateQuestionDashboardVisibility(surveyId, demoId, nextValue);
      toast.success(nextValue ? "Demográfico visible para el cliente" : "Demográfico oculto para el cliente");
    } catch (err) {
      toast.error(err.message || "Error al actualizar");
      // Revertir
      setData(prev => prev ? {
        ...prev,
        demographics: prev.demographics.map(d =>
          d.id === demoId ? { ...d, is_public_in_dashboard: !nextValue } : d
        ),
      } : prev);
    }
  };

  if (error) return (
    <div style={S.centerPage}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Archivo:wght@500;600;700&display=swap" rel="stylesheet" />
      <div style={S.errorCard}>
        <div style={S.errorIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 20, margin: "0 0 8px", color: "#e2e8f0", fontWeight: 700 }}>Dashboard no disponible</h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>{error}</p>
      </div>
    </div>
  );

  if (!data) return (
    <div style={S.centerPage}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Archivo:wght@500;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.spinner} />
      <p style={{ color: "#64748b", fontSize: 14, marginTop: 16 }}>Cargando dashboard...</p>
    </div>
  );

  const { survey, summary, questions } = data;
  const demographics = data.demographics || [];
  const segments = data.segments || {};
  const color = survey.primary_color || "#2563eb";
  const sc = STATUS_CONFIG[survey.status] || STATUS_CONFIG.draft;
  const likertQs = questions.filter(q => q.question_type === "likert");
  const npsQs    = questions.filter(q => q.question_type === "nps");
  const openQs   = questions.filter(q => q.question_type === "open_text");
  const choiceQs = questions.filter(q => q.question_type === "single_choice");
  const segmentableQs = questions.filter(q => q.question_type === "likert" || q.question_type === "nps");
  const surveyVariables = data.variables || [];
  const activeFilterCount = Object.values(filters).reduce((a, v) => a + (v?.length || 0), 0);

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Archivo:wght@500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(220,38,38,0.55); }
          50% { opacity: 0.7; transform: scale(1.25); box-shadow: 0 0 0 5px rgba(220,38,38,0); }
        }
        @keyframes barRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .d-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .d-card:hover { box-shadow: 0 8px 32px rgba(255,255,255,0.08) !important; transform: translateY(-2px); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ ...S.headerBar, borderTop: `3px solid ${color}` }}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {surveyId && (
              <>
                <button onClick={() => navigate(`/surveys/${surveyId}`)} style={S.backBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span style={{ width: 1, height: 18, background: "rgba(37,99,235,0.18)" }} />
                <Logo variant="horizontal" size={11} color="#2563eb" />
                <span style={{ width: 1, height: 18, background: "rgba(37,99,235,0.18)" }} />
              </>
            )}
            {survey.logo_url && (
              <img src={resolveImageUrl(survey.logo_url)} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "#0f172a", padding: 2 }} />
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 2 }}>
                {survey.client_name}
              </div>
              <h1 style={S.title}>{survey.title}</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {surveyId && survey.status !== "closed" && (
              <LiveToggle active={liveMode} onToggle={() => setLiveMode(!liveMode)} />
            )}
            <span style={{ ...S.badge, background: sc.bg, color: sc.color }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, display: "inline-block", marginRight: 6, animation: survey.status === "active" ? "pulse 2s ease infinite" : "none" }} />
              {sc.label}
            </span>
            {lastUpdate && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
                {isRefreshing && <div style={{ width: 11, height: 11, border: "2px solid rgba(37,99,235,0.2)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />}
                {liveMode ? "Live · cada 2s" : `Actualizado ${lastUpdate.toLocaleTimeString("es-CL")}`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={S.content}>

        {/* ── Share banner (solo vista interna) ── */}
        {surveyId && (
          <ShareBanner url={data.dashboard_url} />
        )}

        {/* ── Filtro por día ── */}
        {data.available_days && data.available_days.length > 0 && (
          <DayFilter
            availableDays={data.available_days}
            selectedDay={selectedDay}
            onChange={setSelectedDay}
            color={color}
          />
        )}

        {/* ── Filtros demográficos ── */}
        {demographics.length > 0 && (
          <FilterPanel
            demographics={demographics}
            filters={filters}
            activeFilterCount={activeFilterCount}
            toggleFilter={toggleFilter}
            clearFilters={clearFilters}
            color={color}
            totalFiltered={summary.total_responses}
            totalUnfiltered={summary.total_responses_unfiltered}
            isAdmin={!!surveyId}
            onTogglePublicVisibility={togglePublicVisibility}
          />
        )}

        {/* ── Summary cards ── */}
        <div style={{ ...S.summaryGrid, animation: "fadeUp 0.4s ease both" }}>
          <SummaryCard
            label="Respuestas totales"
            value={summary.total_responses}
            color={color}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          {summary.nps && (
            <SummaryCard
              label="NPS Score"
              value={summary.nps.score}
              color={summary.nps.score >= 50 ? "#2563eb" : summary.nps.score >= 0 ? "#f59e0b" : "#dc2626"}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              subtitle={`${summary.nps.promoters} prom · ${summary.nps.passives} pas · ${summary.nps.detractors} det`}
            />
          )}
          <SummaryCard
            label="Preguntas"
            value={questions.length}
            color="#ef4444"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
          />
        </div>

        {/* ── Toggles del dashboard: vista (favorabilidad/promedio) + comparar ── */}
        {likertQs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 18, flexWrap: "wrap", animation: "fadeUp 0.4s ease 0.05s both" }}>
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            {surveyId && data?.survey?.parent_survey_id && (
              <CompareToggle compareMode={compareMode} setCompareMode={setCompareMode} loading={compareLoading} />
            )}
          </div>
        )}

        {/* ── Variables ── */}
        {surveyVariables.length > 0 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.08s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="14" width="3" height="4"/></svg>}
              title="Variables"
              color={color}
            />
            <VariablesSection variables={surveyVariables} color={color} viewMode={viewMode} allQuestions={data.questions || []} />
          </div>
        )}

        {/* ── Favorabilidad por pregunta / Promedio por pregunta ── */}
        {likertQs.length > 1 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.08s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 17l4-8 4 5 5-9"/></svg>}
              title={viewMode === "averages" ? "Promedio por pregunta" : "Favorabilidad por pregunta"}
              color={color}
            />
            {viewMode === "favorability" && <ScaleGroupingLegend questions={likertQs} />}
            {viewMode === "averages"
              ? <QuestionAveragesChart questions={likertQs} color={color} compareData={compareData} />
              : <QuestionFavorabilityChart questions={likertQs} color={color} compareData={compareData} />}
          </div>
        )}

        {/* ── Preguntas de escala (Likert) ── */}
        {likertQs.length > 0 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.1s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>}
              title="Preguntas de escala"
              color={color}
            />
            {viewMode === "favorability" && <ScaleGroupingLegend questions={likertQs} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {likertQs.map(q => viewMode === "averages"
                ? <LikertChartAverages key={q.id} question={q} color={color} compareData={compareData} />
                : <LikertChart key={q.id} question={q} color={color} compareData={compareData} />
              )}
            </div>
          </div>
        )}

        {/* ── NPS ── */}
        {npsQs.length > 0 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.15s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              title="Net Promoter Score"
              color="#2563eb"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {npsQs.map(q => <NpsChart key={q.id} question={q} />)}
            </div>
          </div>
        )}

        {/* ── Resultados por segmento ── */}
        {demographics.length > 0 && segmentableQs.length > 0 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.18s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              title="Resultados por segmento"
              color="#7c3aed"
            />
            {viewMode === "favorability" && <ScaleGroupingLegend questions={segmentableQs} />}
            <SegmentsSection
              segmentableQs={segmentableQs}
              demographics={demographics}
              segments={segments}
              viewMode={viewMode}
              color={color}
            />
          </div>
        )}

        {/* ── Elección única / Sí-No ── */}
        {choiceQs.length > 0 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.17s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
              title="Preguntas de opción"
              color="#0ea5e9"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {choiceQs.map(q => <ChoiceChart key={q.id} question={q} />)}
            </div>
          </div>
        )}

        {/* ── Open ── */}
        {openQs.length > 0 && (
          <div style={{ ...S.section, animation: "fadeUp 0.4s ease 0.2s both" }}>
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
              title="Respuestas abiertas"
              color="#ef4444"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {openQs.map(q => <OpenResponses key={q.id} question={q} color={color} />)}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "16px 0 8px", fontSize: 11, color: "#475569", letterSpacing: "0.3px" }}>
          CoreScope · Auto-actualización cada 30s
        </div>
        {!surveyId && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 20px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", maxWidth: 320 }}>
              <span style={{ flex: 1, height: 1, background: t.color.brandLineSoft }} />
              <span style={{ fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600, letterSpacing: t.track.widest, color: t.color.mutedFaint, textTransform: "uppercase", flexShrink: 0 }}>Plataforma desarrollada por</span>
              <span style={{ flex: 1, height: 1, background: t.color.brandLineSoft }} />
            </div>
            <Logo variant="horizontal" size={11} color={t.color.brand} />
          </div>
        )}
      </div>
      {surveyId && <Footer />}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────── */

function DayFilter({ availableDays, selectedDay, onChange, color }) {
  const dayFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const formatDay = (iso) => {
    // iso = "YYYY-MM-DD" — usar splitting para evitar interpretación como UTC midnight
    const [y, m, d] = iso.split("-").map(Number);
    return dayFormatter.format(new Date(y, m - 1, d));
  };
  const totalAcrossDays = availableDays.reduce((acc, d) => acc + d.count, 0);
  const accent = color || "#2563eb";

  return (
    <div className="d-card" style={{
      background: "#0f172a", borderRadius: 16, padding: "18px 22px",
      marginBottom: 16, border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "0 2px 10px rgba(255,255,255,0.02)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Filtrar por día</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              {selectedDay
                ? `Viendo solo el ${formatDay(selectedDay)}`
                : `${availableDays.length} día${availableDays.length !== 1 ? "s" : ""} con respuestas · ${totalAcrossDays} en total`}
            </div>
          </div>
        </div>
        <select
          value={selectedDay}
          onChange={(e) => onChange(e.target.value)}
          style={{
            padding: "8px 32px 8px 14px",
            borderRadius: 8,
            border: `1px solid ${selectedDay ? accent : "rgba(255,255,255,0.12)"}`,
            background: "#0f172a",
            fontSize: 13,
            fontFamily: "inherit",
            fontWeight: 500,
            color: "#e2e8f0",
            cursor: "pointer",
            minWidth: 240,
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="">Todos los días</option>
          {availableDays.map(d => (
            <option key={d.date} value={d.date}>
              {formatDay(d.date)} · {d.count} respuesta{d.count !== 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ShareBanner({ url }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={S.shareBanner}>
      <div style={S.shareIconWrap}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.shareLabel}>Link del dashboard para el cliente</div>
        <div style={S.shareHint}>Cópialo y envíaselo — verá los resultados en tiempo real sin necesidad de iniciar sesión.</div>
        <div style={S.shareUrlRow}>
          <span style={S.shareUrl}>{url}</span>
          <button onClick={handleCopy} style={{ ...S.copyBtn, ...(copied ? S.copyBtnDone : {}) }}>
            {copied
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copiado</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar link</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${color}18` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "-0.3px" }}>{title}</h2>
    </div>
  );
}

function SummaryCard({ icon, label, value, color, suffix = "", subtitle }) {
  return (
    <div className="d-card" style={S.summaryCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-1px" }}>{value}</span>
            {suffix && <span style={{ fontSize: 16, fontWeight: 600, color: `${color}88` }}>{suffix}</span>}
          </div>
          {subtitle && <div style={{ fontSize: 11, color: "#475569", marginTop: 8, lineHeight: 1.4 }}>{subtitle}</div>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Umbrales por escala (cortes definidos con el equipo de medición):
//   Likert-5:  favorable 4-5 | neutral 3          | desfavorable 1-2
//   Likert-7:  favorable 6-7 | neutral alto 5     | neutral absoluto 4 | desfavorable 1-3
//   Likert-10: favorable 8-10 | neutral 5-7       | desfavorable 1-4
// El % favorable de Likert-7 no cambia (sigue siendo 6-7); solo se subdivide
// visualmente la zona neutral en dos segmentos.
function getFavorabilityThresholds(scaleSize) {
  if (scaleSize === 7) return { favorableMin: 6, unfavorableMax: 3 };
  if (scaleSize === 10) return { favorableMin: 8, unfavorableMax: 4 };
  return { favorableMin: 4, unfavorableMax: 2 };
}

function formatGrouping(scaleSize) {
  if (scaleSize === 7) {
    return {
      unfavorable: "1-3",
      neutralLow: "4",     // Neutral absoluto
      neutralHigh: "5",    // Neutral alto / Tibio
      favorable: "6-7",
    };
  }
  const t = getFavorabilityThresholds(scaleSize);
  const fmt = (lo, hi) => lo === hi ? `${lo}` : `${lo}-${hi}`;
  const neuStart = t.unfavorableMax + 1;
  const neuEnd = t.favorableMin - 1;
  return {
    unfavorable: fmt(1, t.unfavorableMax),
    neutral: neuStart > neuEnd ? null : fmt(neuStart, neuEnd),
    favorable: fmt(t.favorableMin, scaleSize),
  };
}

function ScaleGroupingLegend({ questions }) {
  const scales = [...new Set(
    (questions || [])
      .filter(q => q && q.question_type === "likert")
      .map(q => q.scale === "likert_7" ? 7 : q.scale === "likert_10" ? 10 : 5)
  )].sort((a, b) => a - b);
  if (scales.length === 0) return null;

  return (
    <div style={{
      fontSize: 11,
      color: "#94a3b8",
      marginBottom: 14,
      lineHeight: 1.5,
      fontStyle: "italic",
    }}>
      {scales.map((s, i) => {
        const g = formatGrouping(s);
        const prefix = scales.length > 1 ? `Escala 1-${s}: ` : `Agrupación de respuestas (escala 1-${s}): `;
        const isL7 = s === 7;
        return (
          <div key={s} style={{ marginTop: i === 0 ? 0 : 2 }}>
            {prefix}
            <span>desfavorable {g.unfavorable}</span>
            {isL7 ? (
              <>
                <span> · neutral absoluto {g.neutralLow}</span>
                <span> · neutral alto {g.neutralHigh}</span>
              </>
            ) : (
              g.neutral && <span> · neutral {g.neutral}</span>
            )}
            <span> · favorable {g.favorable}.</span>
          </div>
        );
      })}
    </div>
  );
}

// Colores de las barras apiladas. Favorable usa el color del survey (se pasa
// vía prop). Neutral y desfavorable son grises de tonos contrastantes.
const NEUTRAL_BG = "#cbd5e1";   // slate-300 — gris claro
const NEUTRAL_TEXT = "#334155"; // slate-700 — texto dentro de neutral (contraste sobre claro)
const UNFAVORABLE_BG = "#475569"; // slate-600 — gris oscuro

// Nombres adaptativos según la escala (las etiquetas de la pregunta).
// Siempre categoriza 1-2 / 3 / 4-5 — solo cambia el texto del porcentaje.
const SCALE_LABELS = {
  agreement: {
    pctName: "Favorabilidad",
    positive: "Favorable",
    neutral: "Neutral",
    negative: "Desfavorable",
  },
  frequency: {
    pctName: "Frecuencia",
    positive: "Frecuente",
    neutral: "Frecuencia media",
    negative: "Poco frecuente",
  },
  satisfaction: {
    pctName: "Satisfacción",
    positive: "Satisfecho",
    neutral: "Neutral",
    negative: "Insatisfecho",
  },
  importance: {
    pctName: "Importancia",
    positive: "Importante",
    neutral: "Neutral",
    negative: "Poco importante",
  },
};

function inferScaleCategory(question) {
  const labels = (question.options?.labels || []).map(l => (l || "").toLowerCase());
  const text = labels.join(" ");
  if (!text) return "agreement";
  if (/(nunca|rara vez|raramente|siempre|frecuent|ocasional)/.test(text)) return "frequency";
  if (/(satisf|insatis)/.test(text)) return "satisfaction";
  if (/(important|nada importante|muy importante)/.test(text)) return "importance";
  return "agreement";
}

function getScaleLabels(question) {
  return SCALE_LABELS[inferScaleCategory(question)] || SCALE_LABELS.agreement;
}

function computeFavorability(question) {
  const scaleSize = question.scale === "likert_7" ? 7 : question.scale === "likert_10" ? 10 : 5;
  const isLikert7 = scaleSize === 7;
  const { favorableMin, unfavorableMax } = getFavorabilityThresholds(scaleSize);
  const dist = question.distribution || {};
  let favorable = 0, unfavorable = 0;
  let neutralLow = 0;   // Likert-7: valor 4 (neutral absoluto). Otras escalas: todo el neutral.
  let neutralHigh = 0;  // Likert-7: valor 5 (neutral alto / tibio). Otras escalas: 0.

  for (let i = 1; i <= scaleSize; i++) {
    const count = dist[String(i)] || 0;
    if (i <= unfavorableMax) unfavorable += count;
    else if (i >= favorableMin) favorable += count;
    else if (isLikert7) {
      if (i === 4) neutralLow += count;
      else if (i === 5) neutralHigh += count;
    } else {
      neutralLow += count;
    }
  }
  const neutral = neutralHigh + neutralLow;
  const total = favorable + neutral + unfavorable;
  if (total === 0) {
    return {
      favorable: 0, neutral: 0, unfavorable: 0, total: 0,
      favorablePct: 0, neutralPct: 0, unfavorablePct: 0,
      neutralHigh: 0, neutralLow: 0, neutralHighPct: 0, neutralLowPct: 0,
      hasMidSplit: isLikert7,
    };
  }
  return {
    favorable, neutral, unfavorable, total,
    favorablePct: (favorable / total) * 100,
    neutralPct: (neutral / total) * 100,
    unfavorablePct: (unfavorable / total) * 100,
    neutralHigh, neutralLow,
    neutralHighPct: (neutralHigh / total) * 100,
    neutralLowPct: (neutralLow / total) * 100,
    hasMidSplit: isLikert7,
  };
}

// Construye el array de segmentos para barras apiladas. Likert-7 devuelve
// 4 segmentos (favorable / neutral alto / neutral absoluto / desfavorable);
// las demás escalas devuelven 3. El segmento "neutral alto" usa el color del
// survey con 50% alpha para que se vea visualmente relacionado con favorable
// pero distinto.
function getFavorabilitySegments(fav, color, neutralBg = NEUTRAL_BG, neutralText = NEUTRAL_TEXT, unfavorableBg = UNFAVORABLE_BG) {
  if (fav.hasMidSplit) {
    return [
      { pct: fav.favorablePct, count: fav.favorable, bg: color, textColor: "#fff", label: "Favorable" },
      { pct: fav.neutralHighPct, count: fav.neutralHigh, bg: `${color}80`, textColor: neutralText, label: "Neutral alto" },
      { pct: fav.neutralLowPct, count: fav.neutralLow, bg: neutralBg, textColor: neutralText, label: "Neutral" },
      { pct: fav.unfavorablePct, count: fav.unfavorable, bg: unfavorableBg, textColor: "#fff", label: "Desfavorable" },
    ];
  }
  return [
    { pct: fav.favorablePct, count: fav.favorable, bg: color, textColor: "#fff", label: "Favorable" },
    { pct: fav.neutralPct, count: fav.neutral, bg: neutralBg, textColor: neutralText, label: "Neutral" },
    { pct: fav.unfavorablePct, count: fav.unfavorable, bg: unfavorableBg, textColor: "#fff", label: "Desfavorable" },
  ];
}

// Calcula favorabilidad agregada de una variable sumando las distributions
// de las preguntas que la componen. Asume que todas las preguntas de la
// variable comparten escala (que es como el backend ya las trata).
function computeVariableFavorability(variable, allQuestions) {
  const memberIds = variable.survey_question_ids || [];
  const memberQs = (allQuestions || []).filter(q =>
    memberIds.includes(q.id) && q.question_type === "likert" && q.distribution
  );
  if (memberQs.length === 0) return null;
  const scale = memberQs[0].scale;
  const scaleSize = scale === "likert_7" ? 7 : scale === "likert_10" ? 10 : 5;
  const aggDist = {};
  for (let i = 1; i <= scaleSize; i++) aggDist[String(i)] = 0;
  for (const q of memberQs) {
    for (let i = 1; i <= scaleSize; i++) {
      aggDist[String(i)] += (q.distribution[String(i)] || 0);
    }
  }
  return computeFavorability({ scale, distribution: aggDist });
}

// Comparativos cross-ola: matchea preguntas entre olas por question_bank_id
// (que el backend expone en cada stat). Si no hay match, devuelve null y
// el caller debe mostrar "Nueva".
function findMatchingQuestion(question, compareData) {
  if (!compareData?.questions || !question?.question_bank_id) return null;
  return compareData.questions.find(q => q.question_bank_id === question.question_bank_id) || null;
}

function deltaFavorablePp(currentQ, previousQ) {
  if (!previousQ) return null;
  const c = computeFavorability(currentQ);
  const p = computeFavorability(previousQ);
  if (c.total === 0 || p.total === 0) return null;
  return c.favorablePct - p.favorablePct;
}

function deltaAverage(currentQ, previousQ) {
  if (!previousQ) return null;
  if (currentQ?.average == null || previousQ?.average == null) return null;
  return currentQ.average - previousQ.average;
}

function DeltaIndicator({ value, unit = "pp", isNew = false, size = "sm" }) {
  const sizeMap = {
    sm: { fontSize: 10.5, padding: "2px 7px" },
    md: { fontSize: 12, padding: "3px 8px" },
  };
  const cfg = sizeMap[size] || sizeMap.sm;
  if (isNew) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", padding: cfg.padding,
        fontSize: cfg.fontSize, fontWeight: 700, color: "#475569",
        background: "rgba(255,255,255,0.06)", borderRadius: 4, letterSpacing: "0.4px",
        whiteSpace: "nowrap",
      }}>
        NUEVA
      </span>
    );
  }
  if (value == null) return null;
  const threshold = unit === "pp" ? 0.5 : 0.05;
  const isUp = value > threshold;
  const isDown = value < -threshold;
  const color = isUp ? "#166534" : isDown ? "#991b1b" : "#475569";
  const bg = isUp ? "#dcfce7" : isDown ? "#fee2e2" : "rgba(255,255,255,0.05)";
  const sign = isUp ? "↑" : isDown ? "↓" : "=";
  const magnitude = unit === "pp" ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(2);
  const display = sign === "=" ? "= 0" : `${sign}${magnitude}${unit}`;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: cfg.padding,
      fontSize: cfg.fontSize, fontWeight: 700, color, background: bg,
      borderRadius: 4, letterSpacing: "0.3px", whiteSpace: "nowrap",
    }}>
      {display}
    </span>
  );
}

function CompareToggle({ compareMode, setCompareMode, loading = false }) {
  return (
    <button
      type="button"
      onClick={() => setCompareMode(!compareMode)}
      disabled={loading}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: `1px solid ${compareMode ? "#2563eb" : "rgba(255,255,255,0.06)"}`,
        background: compareMode ? "#2563eb" : "#fff",
        color: compareMode ? "#fff" : "#475569",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: loading ? 0.7 : 1,
      }}
      title={compareMode ? "Ocultar comparación" : "Mostrar deltas vs ola anterior"}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="7 17 12 22 17 17"/>
        <line x1="12" y1="22" x2="12" y2="11"/>
        <polyline points="17 7 12 2 7 7"/>
        <line x1="12" y1="2" x2="12" y2="13"/>
      </svg>
      {loading ? "Cargando..." : "Comparar con ola anterior"}
    </button>
  );
}

function QuestionFavorabilityChart({ questions, color, compareData }) {
  // Solo Likert con distribución (excluye NPS, que tiene escala 0-10 distinta)
  const data = useMemo(
    () => questions
      .filter(q => q.question_type === "likert" && q.distribution)
      .map(q => ({ ...q, fav: computeFavorability(q) }))
      .filter(q => q.fav.total > 0),
    [questions]
  );
  // text_only (default) | label_only | both
  const [displayMode, setDisplayMode] = useState("text_only");
  // original | desc (mayor favorabilidad) | asc (menor favorabilidad)
  const [sortMode, setSortMode] = useState("original");

  const sorted = useMemo(() => {
    const arr = [...data];
    if (sortMode === "desc") arr.sort((a, b) => b.fav.favorablePct - a.fav.favorablePct);
    else if (sortMode === "asc") arr.sort((a, b) => a.fav.favorablePct - b.fav.favorablePct);
    return arr;
  }, [data, sortMode]);

  const getDisplayText = (q) => {
    const hasLabel = !!q.label;
    if (displayMode === "label_only") return hasLabel ? q.label : q.text;
    if (displayMode === "both") return hasLabel ? `${q.label} · ${q.text}` : q.text;
    return q.text;
  };

  // Export se construye con el orden y display actuales — adaptativo.
  const onExport = () => {
    const questionsToRender = sorted.map(q => ({
      displayText: getDisplayText(q),
      fav: q.fav,
      scaleLabels: getScaleLabels(q),
    }));
    const bundle = buildFavorabilityChartSvg({ questionsToRender, surveyColor: color });
    handleExport(bundle, "favorabilidad-por-pregunta.png");
  };

  if (data.length === 0) return null;

  return (
    <div className="d-card" style={{ ...S.card, padding: "22px 26px", position: "relative" }}>
      <ChartExportButton onClick={onExport} />
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>Mostrar</div>
          <select
            value={displayMode}
            onChange={e => setDisplayMode(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#0f172a", cursor: "pointer", color: "#475569" }}
          >
            <option value="text_only">Afirmación</option>
            <option value="label_only">Solo etiqueta</option>
            <option value="both">Etiqueta + afirmación</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>Ordenar</div>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#0f172a", cursor: "pointer", color: "#475569" }}
          >
            <option value="original">Orden de preguntas</option>
            <option value="desc">Mayor favorabilidad</option>
            <option value="asc">Menor favorabilidad</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sorted.map(q => {
          const fav = q.fav;
          const text = getDisplayText(q);
          const pct = Math.max(0, Math.min(100, fav.favorablePct));
          const labels = getScaleLabels(q);
          const prev = compareData ? findMatchingQuestion(q, compareData) : null;
          const delta = prev ? deltaFavorablePp(q, prev) : null;
          const isNew = !!compareData && !prev;
          return (
            <div key={q.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 110px", gap: 16, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: "#e2e8f0", marginBottom: 8, lineHeight: 1.35,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", textOverflow: "ellipsis",
                }} title={text}>
                  {text}
                </div>
                <div style={{ position: "relative", height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 6,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.5px" }}>
                  {Math.round(fav.favorablePct)}%
                </span>
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  {labels.positive}
                </div>
                {compareData && (
                  <div style={{ marginTop: 4 }}>
                    <DeltaIndicator value={delta} unit="pp" isNew={isNew} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ViewModeToggle({ viewMode, setViewMode }) {
  const opts = [
    { key: "favorability", label: "Favorabilidad" },
    { key: "averages", label: "Promedio + distribución" },
  ];
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: "#0f172a",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: 4,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        padding: "0 10px 0 8px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}>
        Vista
      </div>
      {opts.map(opt => {
        const active = viewMode === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setViewMode(opt.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: active ? "#2563eb" : "transparent",
              color: active ? "#fff" : "#475569",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ChartExportButton({ onClick, label = "Copiar como imagen" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        color: "#64748b",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 0.15s ease",
        zIndex: 2,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "#334155";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.color = "#64748b";
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 16l5-5 4 4 4-4 5 5"/>
        <circle cx="9" cy="9" r="1.5"/>
      </svg>
    </button>
  );
}

// Vista LEGACY (modo "averages") — promedio por pregunta como barra horizontal,
// con sort y display modes. Solo se usa cuando viewMode === "averages".
// La vista "favorability" sigue siendo QuestionFavorabilityChart.
function QuestionAveragesChart({ questions, color, compareData }) {
  const data = useMemo(
    () => questions.filter(q => q.question_type === "likert" && typeof q.average === "number"),
    [questions]
  );
  const [displayMode, setDisplayMode] = useState("text_only");
  const [sortMode, setSortMode] = useState("original");

  const sorted = useMemo(() => {
    const arr = [...data];
    if (sortMode === "desc") arr.sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
    else if (sortMode === "asc") arr.sort((a, b) => (a.average ?? 0) - (b.average ?? 0));
    return arr;
  }, [data, sortMode]);

  const getDisplayText = (q) => {
    const hasLabel = !!q.label;
    if (displayMode === "label_only") return hasLabel ? q.label : q.text;
    if (displayMode === "both") return hasLabel ? `${q.label} · ${q.text}` : q.text;
    return q.text;
  };

  const onExport = () => {
    const questionsToRender = sorted.map(q => ({
      displayText: getDisplayText(q),
      average: q.average,
      scaleSize: q.scale === "likert_7" ? 7 : q.scale === "likert_10" ? 10 : 5,
    }));
    const bundle = buildAveragesChartSvg({ questionsToRender, surveyColor: color });
    handleExport(bundle, "promedio-por-pregunta.png");
  };

  if (data.length === 0) return null;

  return (
    <div className="d-card" style={{ ...S.card, padding: "22px 26px", position: "relative" }}>
      <ChartExportButton onClick={onExport} />
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>Mostrar</div>
          <select
            value={displayMode}
            onChange={e => setDisplayMode(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#0f172a", cursor: "pointer", color: "#475569" }}
          >
            <option value="text_only">Afirmación</option>
            <option value="label_only">Solo etiqueta</option>
            <option value="both">Etiqueta + afirmación</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>Ordenar</div>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#0f172a", cursor: "pointer", color: "#475569" }}
          >
            <option value="original">Orden de preguntas</option>
            <option value="desc">Mayor a menor</option>
            <option value="asc">Menor a mayor</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map(q => {
          const scaleSize = q.scale === "likert_7" ? 7 : q.scale === "likert_10" ? 10 : 5;
          const avg = q.average ?? 0;
          const pct = Math.max(0, Math.min(100, (avg / scaleSize) * 100));
          const text = getDisplayText(q);
          const prev = compareData ? findMatchingQuestion(q, compareData) : null;
          const delta = prev ? deltaAverage(q, prev) : null;
          const isNew = !!compareData && !prev;
          return (
            <div key={q.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 110px", gap: 16, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.35,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", textOverflow: "ellipsis",
                }} title={text}>
                  {text}
                </div>
                <div style={{ position: "relative", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRadius: 5,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: "-0.5px" }}>
                    {avg.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>
                    / {scaleSize}
                  </span>
                </div>
                {compareData && (
                  <div style={{ marginTop: 4 }}>
                    <DeltaIndicator value={delta} unit="" isNew={isNew} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vista LEGACY por pregunta (modo "averages"): promedio grande + histograma 5 barras.
function LikertChartAverages({ question, color, compareData }) {
  const dist = question.distribution || {};
  const scaleSize = question.scale === "likert_7" ? 7 : question.scale === "likert_10" ? 10 : 5;
  const labels = question.options?.labels || [];
  const counts = Array.from({ length: scaleSize }, (_, i) => dist[String(i + 1)] || 0);
  const maxCount = Math.max(...counts, 1);
  const BAR_MAX_H = 80;
  const validResp = (question.total_answers ?? 0) - (question.nsnr_count ?? 0);
  const prevQ = compareData ? findMatchingQuestion(question, compareData) : null;
  const avgDelta = prevQ ? deltaAverage(question, prevQ) : null;
  const isNewQ = !!compareData && !prevQ;

  const onExport = () => {
    const bundle = buildLikertHistogramSvg({
      questionText: question.text,
      surveyColor: color,
      average: question.average,
      scaleSize,
      distribution: dist,
      totalAnswers: question.total_answers ?? 0,
      nsnrCount: question.nsnr_count ?? 0,
      scaleLabels: labels,
    });
    handleExport(bundle, `${safeFilename(question.label || question.text)}.png`);
  };

  return (
    <div className="d-card" style={{ ...S.card, position: "relative" }}>
      <ChartExportButton onClick={onExport} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, lineHeight: 1.55, flex: 1, marginRight: 20 }}>
          {question.text}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginRight: 48 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-1px" }}>
            {question.average ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
            /{scaleSize} · {validResp} resp.{question.nsnr_count > 0 ? ` · ${question.nsnr_count} NS/NR` : ""}
          </div>
          {compareData && (
            <div style={{ marginTop: 6 }}>
              <DeltaIndicator value={avgDelta} unit="" isNew={isNewQ} size="md" />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: scaleSize > 7 ? 4 : 8, alignItems: "flex-end", height: BAR_MAX_H + 22 }}>
        {counts.map((count, i) => {
          const barH = Math.max((count / maxCount) * BAR_MAX_H, count > 0 ? 6 : 3);
          const isMax = count === maxCount && count > 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ fontSize: 12, fontWeight: isMax ? 700 : 400, color: isMax ? color : "#bbb", lineHeight: 1 }}>
                {count}
              </div>
              <div style={{
                width: "100%", maxWidth: 48, height: barH,
                borderRadius: "6px 6px 3px 3px",
                background: isMax ? `linear-gradient(180deg, ${color}, ${color}bb)` : "rgba(255,255,255,0.055)",
                transformOrigin: "bottom",
                animation: "barRise 0.5s ease both",
              }} />
            </div>
          );
        })}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 8px" }} />

      <div style={{ display: "flex", gap: scaleSize > 7 ? 4 : 8 }}>
        {counts.map((_, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            {i + 1}
          </div>
        ))}
      </div>

      {labels.length > 0 && (
        <div style={{ display: "flex", gap: scaleSize > 7 ? 4 : 8, marginTop: 4 }}>
          {counts.map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === scaleSize - 1;
            const label = isFirst ? (labels[0] || "") : isLast ? (labels[labels.length - 1] || "") : "";
            return (
              <div key={i} style={{
                flex: 1, fontSize: 10, color: "#475569", lineHeight: 1.3,
                textAlign: isFirst ? "left" : isLast ? "right" : "center",
              }}>
                {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LikertChart({ question, color, compareData }) {
  const fav = computeFavorability(question);
  const scaleLabels = getScaleLabels(question);
  const validResp = (question.total_answers ?? 0) - (question.nsnr_count ?? 0);
  const prevQ = compareData ? findMatchingQuestion(question, compareData) : null;
  const favDelta = prevQ ? deltaFavorablePp(question, prevQ) : null;
  const isNewQ = !!compareData && !prevQ;

  if (fav.total === 0) {
    return (
      <div className="d-card" style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, lineHeight: 1.55, flex: 1 }}>
            {question.text}
          </div>
          <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic", flexShrink: 0 }}>
            Sin respuestas
          </div>
        </div>
      </div>
    );
  }

  const onExport = () => {
    const bundle = buildLikertChartSvg({
      questionText: question.text,
      surveyColor: color,
      fav,
      scaleLabels,
      neutralBg: NEUTRAL_BG,
      neutralText: NEUTRAL_TEXT,
      unfavorableBg: UNFAVORABLE_BG,
    });
    handleExport(bundle, `${safeFilename(question.label || question.text)}.png`);
  };

  return (
    <div className="d-card" style={{ ...S.card, position: "relative" }}>
      <ChartExportButton onClick={onExport} />
      {/* Header: pregunta + % favorable (N) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, lineHeight: 1.55, flex: 1, marginRight: 20 }}>
          {question.text}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginRight: 48 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-1px" }}>
            {`${Math.round(fav.favorablePct)}%`}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase" }}>
            {scaleLabels.positive} ({validResp})
          </div>
          {compareData && (
            <div style={{ marginTop: 6 }}>
              <DeltaIndicator value={favDelta} unit="pp" isNew={isNewQ} size="md" />
            </div>
          )}
        </div>
      </div>

      {/* Leyenda centrada arriba */}
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 10, fontSize: 10.5, color: "#94a3b8", fontWeight: 500, flexWrap: "wrap" }}>
        {getFavorabilitySegments(fav, color).map((seg, i) => {
          // Reemplazo "Favorable"/"Neutral"/"Desfavorable" por las etiquetas
          // adaptativas según la escala. El "Neutral alto" se mantiene literal.
          let labelText = seg.label;
          if (seg.label === "Favorable") labelText = scaleLabels.positive;
          else if (seg.label === "Neutral") labelText = scaleLabels.neutral;
          else if (seg.label === "Desfavorable") labelText = scaleLabels.negative;
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.bg }} />
              {labelText}
            </span>
          );
        })}
      </div>

      {/* Barra apilada al 100% — % y N (entre paréntesis) dentro de cada segmento */}
      <div style={{ display: "flex", height: 48, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
        {getFavorabilitySegments(fav, color).map((seg, i) => seg.pct > 0 && (
          <div
            key={i}
            style={{
              width: `${seg.pct}%`,
              background: seg.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 700, color: seg.textColor, letterSpacing: "0.3px",
              transition: "width 0.4s ease",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {seg.pct >= 15
              ? `${Math.round(seg.pct)}% (${seg.count})`
              : seg.pct >= 6
                ? `${Math.round(seg.pct)}%`
                : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function NpsChart({ question }) {
  if (question.nps_score == null) return (
    <div className="d-card" style={S.card}>
      <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, marginBottom: 12 }}>{question.text}</div>
      <div style={{ fontSize: 13, color: "#475569" }}>Sin respuestas todavía</div>
    </div>
  );

  const npsColor = question.nps_score >= 50 ? "#2563eb" : question.nps_score >= 0 ? "#f59e0b" : "#dc2626";
  const total = (question.promoters || 0) + (question.passives || 0) + (question.detractors || 0);

  return (
    <div className="d-card" style={S.card}>
      <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, marginBottom: 24 }}>{question.text}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>

        {/* Score */}
        <div style={{ textAlign: "center", minWidth: 100 }}>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: npsColor, letterSpacing: "-2px" }}>
            {question.nps_score}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>NPS</div>
        </div>

        {/* Bar + breakdown */}
        <div style={{ flex: 1 }}>
          {/* Stacked bar */}
          <div style={{ display: "flex", height: 32, borderRadius: 10, overflow: "hidden", gap: 2, marginBottom: 16 }}>
            {question.detractors > 0 && (
              <div style={{ flex: question.detractors, background: "rgba(220,38,38,0.12)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{question.detractors_pct}%</span>
              </div>
            )}
            {question.passives > 0 && (
              <div style={{ flex: question.passives, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>{question.passives_pct}%</span>
              </div>
            )}
            {question.promoters > 0 && (
              <div style={{ flex: question.promoters, background: "rgba(37,99,235,0.12)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>{question.promoters_pct}%</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20 }}>
            <LegendItem color="#dc2626" label="Detractores" value={question.detractors} total={total} />
            <LegendItem color="#d97706" label="Pasivos" value={question.passives} total={total} />
            <LegendItem color="#2563eb" label="Promotores" value={question.promoters} total={total} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#475569" }}>{value} resp.</div>
      </div>
    </div>
  );
}

function OpenResponses({ question, color }) {
  const responses = question.responses || [];
  return (
    <div className="d-card" style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{question.text}</div>
        <span style={{
          fontSize: 11, fontWeight: 600, color, background: `${color}12`,
          padding: "4px 12px", borderRadius: 20,
        }}>
          {responses.length} respuesta{responses.length !== 1 ? "s" : ""}
        </span>
      </div>
      {responses.length === 0 ? (
        <div style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>Sin respuestas todavía</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
          {responses.map((text, idx) => (
            <div key={idx} style={{
              padding: "12px 16px",
              background: "#070b1a",
              borderRadius: 10,
              fontSize: 13,
              color: "#cbd5e1",
              lineHeight: 1.65,
              borderLeft: `3px solid ${color}40`,
            }}>
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariablesSection({ variables, color, viewMode = "averages", allQuestions = [] }) {
  const isFavMode = viewMode === "favorability";
  // Precalcular favorabilidad por variable (sirve tanto al render como al export).
  // Lo computo en ambos modos porque el export de Detalle lo necesita igualmente
  // si el usuario tiene activo modo favorabilidad.
  const favByVar = useMemo(() => {
    const out = {};
    for (const v of variables) {
      out[v.id] = computeVariableFavorability(v, allQuestions);
    }
    return out;
  }, [variables, allQuestions]);

  const onExportComparison = () => {
    const rows = variables.map(v => {
      if (isFavMode) {
        const fav = favByVar[v.id];
        return { name: v.name, fav, hasData: !!(fav && fav.total > 0) };
      }
      return {
        name: v.name,
        average: v.average,
        scaleMin: v.scale_min,
        scaleMax: v.scale_max,
        hasData: v.average !== null && v.average !== undefined,
      };
    });
    const bundle = buildVariablesComparisonSvg({
      rows,
      color,
      viewMode,
      neutralBg: NEUTRAL_BG,
      neutralText: NEUTRAL_TEXT,
      unfavorableBg: UNFAVORABLE_BG,
    });
    handleExport(bundle, `variables-comparacion-${isFavMode ? "favorabilidad" : "promedio"}.png`);
  };

  const onExportDetail = () => {
    const rows = variables.map(v => {
      const fav = favByVar[v.id];
      const favHasData = !!(fav && fav.total > 0);
      return {
        name: v.name,
        average: v.average,
        scaleMax: v.scale_max,
        favorablePct: favHasData ? fav.favorablePct : null,
        questions: v.question_texts || [],
        hasData: isFavMode ? favHasData : (v.average !== null && v.average !== undefined),
      };
    });
    const bundle = buildVariablesDetailSvg({ rows, color, viewMode });
    handleExport(bundle, `variables-detalle-${isFavMode ? "favorabilidad" : "promedio"}.png`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Gráfico comparativo */}
      <div className="d-card" style={{ ...S.card, position: "relative" }}>
        <ChartExportButton onClick={onExportComparison} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
          Comparación
        </div>
        {isFavMode && (() => {
          // Si CUALQUIER variable contiene preguntas Likert-7, mostramos
          // la leyenda de 4 segmentos.
          const anyL7 = Object.values(favByVar).some(f => f && f.hasMidSplit);
          const items = anyL7
            ? [
                { label: "Favorable",         bg: color },
                { label: "Neutral alto",      bg: `${color}80` },
                { label: "Neutral",           bg: NEUTRAL_BG },
                { label: "Desfavorable",      bg: UNFAVORABLE_BG },
              ]
            : [
                { label: "Favorable",         bg: color },
                { label: "Neutral",           bg: NEUTRAL_BG },
                { label: "Desfavorable",      bg: UNFAVORABLE_BG },
              ];
          return (
            <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 14, fontSize: 10.5, color: "#94a3b8", fontWeight: 500, flexWrap: "wrap" }}>
              {items.map((it, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: it.bg }} />
                  {it.label}
                </span>
              ))}
            </div>
          );
        })()}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {variables.map(v => {
            if (isFavMode) {
              const fav = favByVar[v.id];
              const hasData = fav && fav.total > 0;
              return (
                <div key={v.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 110px", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.name}>
                    {v.name}
                  </div>
                  <div style={{ display: "flex", height: 26, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                    {hasData && getFavorabilitySegments(fav, color).map((seg, i) => seg.pct > 0 && (
                      <div key={i} style={{
                        width: `${seg.pct}%`,
                        background: seg.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: seg.textColor,
                        transition: "width 0.4s ease", overflow: "hidden",
                      }}>
                        {seg.pct >= 12 ? `${Math.round(seg.pct)}%` : ""}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: hasData ? color : "#ccc", textAlign: "right", whiteSpace: "nowrap" }}>
                    {hasData ? `${Math.round(fav.favorablePct)}% fav.` : "—"}
                  </div>
                </div>
              );
            }
            const hasData = v.average !== null && v.average !== undefined;
            const range = v.scale_max - v.scale_min;
            const pct = hasData && range > 0 ? ((v.average - v.scale_min) / range) * 100 : 0;
            return (
              <div key={v.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 90px", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.name}>
                  {v.name}
                </div>
                <div style={{ position: "relative", height: 26, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                  {hasData && (
                    <div style={{
                      width: `${Math.max(2, pct)}%`, height: "100%",
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                      borderRadius: 6, transition: "width 0.4s ease",
                    }} />
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: hasData ? "#222" : "#ccc", textAlign: "right" }}>
                  {hasData ? `${v.average} / ${v.scale_max}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla de detalle */}
      <div className="d-card" style={{ ...S.card, position: "relative" }}>
        <ChartExportButton onClick={onExportDetail} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
          Detalle
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Variable</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>
                  {isFavMode ? "Favorabilidad" : "Promedio"}
                </th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Preguntas incluidas</th>
              </tr>
            </thead>
            <tbody>
              {variables.map(v => {
                const texts = v.question_texts || [];
                const preview = texts.slice(0, 2);
                const extra = texts.length - preview.length;
                const fav = isFavMode ? favByVar[v.id] : null;
                const favHasData = fav && fav.total > 0;
                return (
                  <tr key={v.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 10px", color: "#e2e8f0", fontWeight: 600 }}>{v.name}</td>
                    <td style={{ padding: "12px 10px", textAlign: "right", color: isFavMode && favHasData ? color : "#222", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {isFavMode
                        ? (favHasData ? `${Math.round(fav.favorablePct)}%` : "—")
                        : (v.average !== null && v.average !== undefined ? `${v.average} / ${v.scale_max}` : "—")}
                    </td>
                    <td style={{ padding: "12px 10px", color: "#94a3b8", lineHeight: 1.5 }}>
                      {preview.join(" · ")}
                      {extra > 0 && <span style={{ color: "#64748b" }}>{` · y ${extra} más`}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChoiceChart({ question }) {
  const options = question.options?.options || [];
  const distribution = question.distribution || {};
  const total = question.total_answers || 0;
  const isYesNo = options.length === 2 && options[0] === "Sí" && options[1] === "No";

  return (
    <div className="d-card" style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, flex: 1 }}>{question.text}</div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
          background: "rgba(14,165,233,0.1)", color: "#0369a1",
          textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0,
        }}>{isYesNo ? "Sí / No" : "Opción"}</span>
      </div>
      {total === 0 ? (
        <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>Sin respuestas todavía</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt, i) => {
            const count = distribution[opt] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const barColor = isYesNo && opt === "Sí" ? "#0ea5e9"
                           : isYesNo && opt === "No" ? "#dc2626"
                           : i % 2 === 0 ? "#0ea5e9" : "#7c3aed";
            return (
              <div key={opt} style={{ display: "grid", gridTemplateColumns: "140px 1fr 78px", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={opt}>
                  {opt}
                </div>
                <div style={{ position: "relative", height: 24, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.max(2, pct)}%`, height: "100%",
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                    borderRadius: 6, transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", textAlign: "right" }}>
                  {count}
                  <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>
                    ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPanel({ demographics, filters, activeFilterCount, toggleFilter, clearFilters, color, totalFiltered, totalUnfiltered, isAdmin, onTogglePublicVisibility }) {
  return (
    <div className="d-card" style={{
      background: "#0f172a", borderRadius: 16, padding: "18px 22px",
      marginBottom: 16, border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "0 2px 10px rgba(255,255,255,0.02)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Filtros demográficos</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              {activeFilterCount > 0
                ? `Mostrando ${totalFiltered} de ${totalUnfiltered} respuesta${totalUnfiltered !== 1 ? "s" : ""}`
                : isAdmin
                  ? "Selecciona valores para segmentar · Usa el ojito para controlar qué ve el cliente"
                  : "Selecciona valores para segmentar los resultados"}
            </div>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{
            border: "1px solid rgba(220,38,38,0.2)", background: "#0f172a", color: "#dc2626",
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {demographics.map(demo => {
          const selected = filters[demo.id] || [];
          const isPublic = demo.is_public_in_dashboard !== false;
          return (
            <div key={demo.id} style={{
              padding: isAdmin ? "10px 12px" : 0,
              borderRadius: 10,
              background: isAdmin && !isPublic ? "rgba(255,255,255,0.025)" : "transparent",
              border: isAdmin ? `1px dashed ${isPublic ? "rgba(255,255,255,0.06)" : "rgba(220,38,38,0.18)"}` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: 8 }}>
                  {demo.text}
                  {isAdmin && !isPublic && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                      background: "rgba(220,38,38,0.1)", color: "#dc2626",
                      letterSpacing: "0.5px",
                    }}>
                      OCULTO PARA EL CLIENTE
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onTogglePublicVisibility(demo.id, !isPublic)}
                    title={isPublic ? "Ocultar este demográfico al cliente" : "Mostrar este demográfico al cliente"}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 14, fontSize: 11,
                      fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      border: `1px solid ${isPublic ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.12)"}`,
                      background: isPublic ? "rgba(37,99,235,0.08)" : "#fff",
                      color: isPublic ? "#2563eb" : "#888",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    {isPublic ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    )}
                    {isPublic ? "Visible al cliente" : "Oculto al cliente"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {demo.options.map(opt => {
                  const isOn = selected.includes(opt);
                  const count = demo.counts?.[opt] ?? 0;
                  return (
                    <button key={opt} onClick={() => toggleFilter(demo.id, opt)} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 18, fontSize: 12,
                      fontWeight: isOn ? 600 : 500, cursor: "pointer", fontFamily: "inherit",
                      border: `1.5px solid ${isOn ? color : "rgba(255,255,255,0.1)"}`,
                      background: isOn ? `${color}15` : "#fff",
                      color: isOn ? color : "#595959",
                      transition: "all 0.15s",
                    }}>
                      {opt}
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 8,
                        background: isOn ? color : "rgba(255,255,255,0.06)",
                        color: isOn ? "#fff" : "#999", fontWeight: 600,
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SegmentsSection({ segmentableQs, demographics, segments, color, viewMode = "favorability" }) {
  const [selectedDemoId, setSelectedDemoId] = useState(null);
  const selectedDemo = demographics.find(d => d.id === selectedDemoId);

  const handleClick = (id) => {
    setSelectedDemoId(prev => prev === id ? null : id);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Segmentar por:</span>
        {demographics.map(d => (
          <button key={d.id} onClick={() => handleClick(d.id)} style={{
            padding: "6px 14px", borderRadius: 18, fontSize: 12,
            fontWeight: d.id === selectedDemoId ? 700 : 500,
            cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${d.id === selectedDemoId ? "#7c3aed" : "rgba(255,255,255,0.08)"}`,
            background: d.id === selectedDemoId ? "rgba(124,58,237,0.08)" : "#fff",
            color: d.id === selectedDemoId ? "#7c3aed" : "#595959",
          }}>
            {d.text.replace(/^¿|\?$/g, "")}
          </button>
        ))}
      </div>
      {selectedDemo ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {segmentableQs.map(q => {
            const segData = segments[q.id]?.[selectedDemo.id] || [];
            return <SegmentChart key={q.id} question={q} segments={segData} color={color} viewMode={viewMode} />;
          })}
        </div>
      ) : (
        <div style={{
          padding: "24px 20px", textAlign: "center",
          background: "rgba(124,58,237,0.04)", borderRadius: 12,
          border: "1px dashed rgba(124,58,237,0.2)",
          fontSize: 13, color: "#7c3aed", fontWeight: 500,
        }}>
          Selecciona un demográfico arriba para ver los resultados segmentados
        </div>
      )}
    </>
  );
}

function SegmentChart({ question, segments, color, viewMode = "favorability" }) {
  const isNps = question.question_type === "nps";
  const maxScale = isNps ? 100 : (question.scale === "likert_10" ? 10 : question.scale === "likert_7" ? 7 : 5);
  const withData = segments.filter(s => s.count > 0);
  const scaleLabels = isNps ? null : getScaleLabels(question);
  const useAverages = !isNps && viewMode === "averages";

  return (
    <div className="d-card" style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, flex: 1 }}>{question.text}</div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
          background: isNps ? "rgba(37,99,235,0.08)" : `${color}12`,
          color: isNps ? "#2563eb" : color,
          textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0,
        }}>{isNps ? "NPS" : `Likert 1-${maxScale}`}</span>
      </div>
      {withData.length === 0 ? (
        <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>Sin respuestas en los segmentos</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {segments.map(s => {
            const hasData = s.count > 0;
            if (isNps) {
              const val = s.nps_score;
              const npsHasData = hasData && val !== null && val !== undefined;
              const pct = npsHasData ? (val + 100) / 200 : 0;
              const barColor = val >= 50 ? "#2563eb" : val >= 0 ? "#f59e0b" : "#dc2626";
              return (
                <div key={s.value} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.value}>
                    {s.value}
                  </div>
                  <div style={{ position: "relative", height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                    {npsHasData && (
                      <div style={{
                        width: `${Math.max(2, pct * 100)}%`, height: "100%",
                        background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                        borderRadius: 6, transition: "width 0.4s ease",
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: npsHasData ? "#222" : "#ccc", textAlign: "right" }}>
                    {npsHasData ? val : "—"}
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>
                      (n={s.count})
                    </span>
                  </div>
                </div>
              );
            }

            // Likert — dos paths según viewMode
            if (useAverages) {
              const val = s.average;
              const avgHasData = hasData && val !== null && val !== undefined;
              const pct = avgHasData ? val / maxScale : 0;
              return (
                <div key={s.value} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.value}>
                    {s.value}
                  </div>
                  <div style={{ position: "relative", height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                    {avgHasData && (
                      <div style={{
                        width: `${Math.max(2, pct * 100)}%`, height: "100%",
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        borderRadius: 6, transition: "width 0.4s ease",
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: avgHasData ? "#222" : "#ccc", textAlign: "right" }}>
                    {avgHasData ? val.toFixed(2) : "—"}
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>
                      (n={s.count})
                    </span>
                  </div>
                </div>
              );
            }

            // Likert favorabilidad: barra apilada al 100% con favorable / neutral / desfavorable
            const fav = hasData ? computeFavorability({ ...question, distribution: s.distribution }) : null;
            const favHasData = fav && fav.total > 0;
            return (
              <div key={s.value} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.value}>
                  {s.value}
                </div>
                <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                  {favHasData && getFavorabilitySegments(fav, color).map((seg, i) => seg.pct > 0 && (
                    <div
                      key={i}
                      style={{
                        width: `${seg.pct}%`,
                        background: seg.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: seg.textColor,
                        transition: "width 0.4s ease",
                        overflow: "hidden",
                      }}
                    >
                      {seg.pct >= 14 ? `${Math.round(seg.pct)}%` : ""}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: favHasData ? color : "#ccc", textAlign: "right" }}>
                  {favHasData ? `${Math.round(fav.favorablePct)}%` : "—"}
                  <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>
                    (n={s.count})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isNps && !useAverages && scaleLabels && withData.length > 0 && (() => {
        // Detectar si la pregunta es Likert-7 para mostrar la leyenda de 4 segmentos.
        const isL7 = question.scale === "likert_7";
        const items = isL7
          ? [
              { label: scaleLabels.positive,   bg: color },
              { label: "Neutral alto",         bg: `${color}80` },
              { label: scaleLabels.neutral,    bg: NEUTRAL_BG },
              { label: scaleLabels.negative,   bg: UNFAVORABLE_BG },
            ]
          : [
              { label: scaleLabels.positive,   bg: color },
              { label: scaleLabels.neutral,    bg: NEUTRAL_BG },
              { label: scaleLabels.negative,   bg: UNFAVORABLE_BG },
            ];
        return (
          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 14, fontSize: 10.5, color: "#94a3b8", fontWeight: 500, flexWrap: "wrap" }}>
            {items.map((it, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: it.bg }} />
                {it.label}
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */

const S = {
  page: {
    minHeight: "100vh",
    background: "#070b1a",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  centerPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#070b1a",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  spinner: {
    width: 32, height: 32,
    border: "3px solid rgba(37,99,235,0.15)",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorCard: {
    background: "#0f172a",
    padding: "48px 40px",
    borderRadius: 20,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.05)",
    maxWidth: 420,
    boxShadow: "0 4px 24px rgba(255,255,255,0.05)",
  },
  errorIcon: {
    width: 64, height: 64, borderRadius: 16,
    background: "rgba(220,38,38,0.06)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  headerBar: {
    background: "#0f172a",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 1px 12px rgba(255,255,255,0.04)",
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: "#e2e8f0",
    letterSpacing: "-0.5px",
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 14px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
  },
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "28px 24px 48px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    marginBottom: 36,
  },
  summaryCard: {
    background: "#0f172a",
    borderRadius: 16,
    padding: "22px 24px",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 2px 12px rgba(255,255,255,0.04)",
  },
  section: {
    marginBottom: 36,
  },
  shareBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.06))",
    border: "1px solid rgba(37,99,235,0.2)",
    borderRadius: 16,
    padding: "18px 22px",
    marginBottom: 28,
    animation: "fadeUp 0.4s ease both",
  },
  shareIconWrap: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    background: "rgba(37,99,235,0.1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  shareLabel: {
    fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 3,
  },
  shareHint: {
    fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.5,
  },
  shareUrlRow: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  },
  shareUrl: {
    fontSize: 12, fontFamily: "monospace", color: "#cbd5e1",
    background: "rgba(255,255,255,0.04)", padding: "6px 12px",
    borderRadius: 8, wordBreak: "break-all", lineHeight: 1.5,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  copyBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 16px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #2563eb, #2563eb)",
    color: "#fff", fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
    transition: "opacity 0.15s ease",
  },
  copyBtnDone: {
    background: "linear-gradient(135deg, #10b981, #059669)",
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#0f172a",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#94a3b8",
    flexShrink: 0,
  },
  card: {
    background: "#0f172a",
    borderRadius: 16,
    padding: "24px 28px",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 2px 12px rgba(255,255,255,0.04)",
  },
};


// ─── Live mode toggle ─────────────────────────────────────────────────
// Botón pill que alterna entre 30s (default) y 2s (en vivo). El dot
// pulsa con livePulse cuando está activo para señalar la "liveness".

function LiveToggle({ active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? "Apagar modo vivo (vuelve a 30s)" : "Activar modo vivo (refresh cada 2s)"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "6px 12px", borderRadius: 999,
        border: active ? "1.5px solid #dc2626" : "1px solid rgba(37,99,235,0.22)",
        background: active ? "rgba(220,38,38,0.08)" : "transparent",
        color: active ? "#dc2626" : "#475569",
        fontFamily: "Archivo, sans-serif",
        fontSize: 10, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        cursor: "pointer", transition: "all 0.15s ease",
      }}
    >
      <span style={{
        display: "inline-block",
        width: 7, height: 7, borderRadius: "50%",
        background: active ? "#dc2626" : "#94a3b8",
        animation: active ? "livePulse 1.2s ease infinite" : "none",
      }} />
      {active ? "EN VIVO" : "Modo vivo"}
    </button>
  );
}


