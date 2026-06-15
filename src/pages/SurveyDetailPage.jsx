import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSurvey, updateSurvey, publishSurvey, closeSurvey, reopenSurvey, deleteSurvey, duplicateSurvey, clearSurveyResponses, getSurveyQuestions, getSurveyVariables, createVariable, deleteVariable, getMySurveys, resolveImageUrl } from "../lib/api";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import LogoInput from "../components/LogoInput";
import { copyQRImage } from "../lib/qrExport";
import { API_URL } from "../lib/config";

const STATUS_CONFIG = {
  draft: { label: "Borrador", bg: "rgba(153,153,153,0.1)", color: "#999999", dot: "#999999" },
  active: { label: "Activa", bg: "rgba(37,99,235,0.1)", color: "#2563eb", dot: "#2563eb" },
  closed: { label: "Cerrada", bg: "rgba(220,38,38,0.08)", color: "#dc2626", dot: "#dc2626" },
};

export default function SurveyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", client_name: "", logo_url: "", show_personal_review: false, review_question_display: "both", show_labels_in_form: true, parent_survey_id: "" });
  const [availableParents, setAvailableParents] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [variables, setVariables] = useState([]);
  const [showVarForm, setShowVarForm] = useState(false);
  const [varForm, setVarForm] = useState({ name: "", selectedIds: [] });
  const [copyingQR, setCopyingQR] = useState(false);
  const qrContainerRef = useRef(null);

  const loadSurvey = async () => {
    try { setSurvey(await getSurvey(id)); }
    catch { toast.error("Encuesta no encontrada"); navigate("/surveys"); }
    finally { setLoading(false); }
  };

  const loadVariables = async () => {
    try { setVariables(await getSurveyVariables(id)); } catch { /* silencioso */ }
  };

  useEffect(() => {
    loadSurvey();
    getSurveyQuestions(id).then(setQuestions).catch(() => {});
    loadVariables();
  }, [id]);

  // Escala efectiva de una pregunta (para validar que una variable tenga escalas consistentes)
  const effectiveScale = (q) => q.question_type === "nps" ? "nps_10" : q.scale;

  const toggleVarQuestion = (qId) => {
    setVarForm(vf => ({
      ...vf,
      selectedIds: vf.selectedIds.includes(qId)
        ? vf.selectedIds.filter(i => i !== qId)
        : [...vf.selectedIds, qId],
    }));
  };

  const submitVariable = async () => {
    const name = varForm.name.trim();
    if (!name) return toast.error("Escribe un nombre");
    if (varForm.selectedIds.length === 0) return toast.error("Selecciona al menos una pregunta");
    try {
      await createVariable(id, { name, survey_question_ids: varForm.selectedIds });
      toast.success("Variable creada");
      setVarForm({ name: "", selectedIds: [] });
      setShowVarForm(false);
      await loadVariables();
    } catch (err) {
      toast.error(err.message || "Error al crear variable");
    }
  };

  const handleDeleteVariable = async (varId) => {
    try {
      await deleteVariable(id, varId);
      toast.success("Variable eliminada");
      await loadVariables();
    } catch (err) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const openEditModal = async () => {
    setEditForm({
      title: survey.title || "",
      client_name: survey.client_name || "",
      logo_url: survey.logo_url || "",
      show_personal_review: !!survey.show_personal_review,
      review_question_display: survey.review_question_display || "both",
      show_labels_in_form: survey.show_labels_in_form !== false,
      parent_survey_id: survey.parent_survey_id || "",
    });
    setShowEditModal(true);
    // Cargar encuestas candidatas a ola anterior: mismo cliente, mismo tipo,
    // no self. La lista la usa el <select> del modal.
    try {
      const all = await getMySurveys();
      const filtered = (all || [])
        .filter(s => s.id !== id)
        .filter(s => s.client_name === survey.client_name)
        .filter(s => (s.survey_type || "standard") === (survey.survey_type || "standard"))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAvailableParents(filtered);
    } catch {
      setAvailableParents([]);
    }
  };

  const handleSaveEdit = async () => {
    const title = editForm.title.trim();
    const clientName = editForm.client_name.trim();
    if (title.length < 3) return toast.error("El título debe tener al menos 3 caracteres");
    if (clientName.length < 2) return toast.error("El cliente debe tener al menos 2 caracteres");
    setSavingEdit(true);
    try {
      const updated = await updateSurvey(id, {
        title,
        client_name: clientName,
        logo_url: editForm.logo_url.trim() || null,
        show_personal_review: editForm.show_personal_review,
        review_question_display: editForm.review_question_display,
        show_labels_in_form: editForm.show_labels_in_form,
        parent_survey_id: editForm.parent_survey_id || null,
      });
      setSurvey(updated);
      toast.success("Encuesta actualizada");
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message || "Error al actualizar");
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try { setSurvey(await publishSurvey(id)); toast.success("¡Pulso publicado!"); }
    catch (err) { toast.error(err.message || "Error al publicar"); }
    finally { setPublishing(false); }
  };

  const handleClose = async () => {
    if (!window.confirm("¿Cerrar esta encuesta? No se podrán recibir más respuestas.")) return;
    try { setSurvey(await closeSurvey(id)); toast.success("Encuesta cerrada"); }
    catch (err) { toast.error(err.message || "Error al cerrar"); }
  };

  const handleReopen = async () => {
    try { setSurvey(await reopenSurvey(id)); toast.success("Encuesta reactivada"); }
    catch (err) { toast.error(err.message || "Error al reabrir"); }
  };

  const handleDelete = async () => {
    try {
      await deleteSurvey(id);
      toast.success("Encuesta eliminada");
      navigate("/surveys");
    } catch (err) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const handleClearResponses = async () => {
    if (clearConfirmText !== survey.title) return;
    setClearing(true);
    try {
      const res = await clearSurveyResponses(id, clearConfirmText);
      const n = res?.deleted_responses ?? 0;
      toast.success(n === 0 ? "No había respuestas para borrar" : `${n} respuesta${n !== 1 ? "s" : ""} eliminada${n !== 1 ? "s" : ""}`);
      setShowClearModal(false);
      setClearConfirmText("");
      await loadSurvey();
    } catch (err) {
      toast.error(err.message || "Error al limpiar respuestas");
    } finally {
      setClearing(false);
    }
  };

  const closeClearModal = () => {
    if (clearing) return;
    setShowClearModal(false);
    setClearConfirmText("");
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateSurvey(id);
      toast.success("Encuesta duplicada");
      navigate(`/surveys/${copy.id}`);
    } catch (err) {
      toast.error(err.message || "Error al duplicar");
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyQR = async () => {
    const svg = qrContainerRef.current?.querySelector("svg");
    if (!svg) return;
    setCopyingQR(true);
    try {
      const safeTitle = (survey.title || "qr").replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 60);
      const result = await copyQRImage(svg, `qr_${safeTitle}.png`);
      toast.success(result.copied ? "QR copiado al portapapeles" : "Tu navegador no soporta copiar imágenes — se descargó el PNG");
    } catch (err) {
      toast.error(err.message || "No se pudo copiar el QR");
    } finally {
      setCopyingQR(false);
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/api/surveys/${survey.id}/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `resultados_${survey.title}.xlsx`; a.click(); })
      .catch(() => toast.error("Error al exportar"));
  };

  const handleDownloadReport = () => {
    const token = localStorage.getItem("token");
    toast.loading("Generando reporte...", { id: "report" });
    fetch(`${API_URL}/api/surveys/${survey.id}/report`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error("Error al generar"); return res.blob(); })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Reporte_${survey.title}_${survey.client_name}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Reporte descargado", { id: "report" });
      })
      .catch(() => toast.error("Error al generar el reporte", { id: "report" }));
  };

  if (loading) return (
    <div style={S.page}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={S.spinner} />
      </div>
    </div>
  );
  if (!survey) return null;

  const sc = STATUS_CONFIG[survey.status] || STATUS_CONFIG.draft;
  const isActive = survey.status === "active";
  const isDraft = survey.status === "draft";
  const isClosed = survey.status === "closed";

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .atmosphere {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 900px 600px at 92% -10%, rgba(37,99,235,0.10), transparent 60%),
            radial-gradient(ellipse 700px 600px at -10% 40%, rgba(37,99,235,0.06), transparent 55%),
            radial-gradient(ellipse 500px 400px at 50% 110%, rgba(239,43,151,0.04), transparent 60%);
        }
        .action-btn { transition: all 0.2s ease; }
        .action-btn:hover { transform: translateY(-1px); opacity: 0.9; }
        .detail-card {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, border-color 0.22s ease;
          box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02);
        }
        .detail-card:hover {
          border-color: rgba(37,99,235,0.22) !important;
          transform: translateY(-2px);
          box-shadow: 0 14px 32px -14px rgba(37,99,235,0.18), 0 4px 8px -4px rgba(37,99,235,0.06);
        }
        .stat-card-detail {
          transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease;
          box-shadow: 0 1px 2px rgba(15,23,42,0.04);
          position: relative; overflow: hidden;
        }
        .stat-card-detail:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(37,99,235,0.18); }
        .stat-card-detail::after {
          content: ""; position: absolute; top: -30px; right: -30px;
          width: 100px; height: 100px; border-radius: 50%;
          background: var(--accent, #2563eb); opacity: 0.06;
          pointer-events: none;
        }
        .copy-btn { transition: all 0.15s ease; }
        .copy-btn:hover { background: rgba(37,99,235,0.05) !important; border-color: #2563eb !important; color: #2563eb !important; }

        /* — Refined toolbar interactions — */
        .icon-btn { transition: all 0.15s ease; }
        .icon-btn:hover { background: rgba(37,99,235,0.06); border-color: rgba(37,99,235,0.35); color: #2563eb; }
        .tool-btn { transition: all 0.15s ease; position: relative; }
        .tool-btn:hover { background: rgba(37,99,235,0.05); border-color: rgba(37,99,235,0.32); color: #2563eb; }
        .tool-btn:active { transform: translateY(1px); }
        .danger-btn { transition: all 0.15s ease; }
        .danger-btn:hover { background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.35); }
        .primary-action { transition: all 0.18s ease; }
        .primary-action:hover { background: #00485a; box-shadow: 0 8px 24px -8px rgba(37,99,235,0.55); }
        .primary-action:hover .primary-arrow { transform: translateX(3px); }
        .primary-arrow { transition: transform 0.2s ease; display: inline-block; }
        .primary-action:disabled { opacity: 0.55; cursor: not-allowed; }

        /* — Editorial control panel — */
        .ghost-btn { transition: all 0.15s ease; }
        .ghost-btn:hover { background: rgba(37,99,235,0.04); color: #2563eb; }
        .kebab-btn { transition: all 0.15s ease; }
        .kebab-btn:hover { background: rgba(37,99,235,0.04); border-color: rgba(37,99,235,0.32); color: #2563eb; }
        .kebab-btn.is-open { background: rgba(37,99,235,0.06); border-color: rgba(37,99,235,0.32); color: #2563eb; }
        .tool-btn .chevron { transition: transform 0.2s ease; transform-origin: center; }
        .tool-btn.is-open .chevron { transform: rotate(180deg); }
        .menu-item { transition: background 0.12s ease; }
        .menu-item:hover { background: rgba(37,99,235,0.05); }
        .menu-item-danger-soft:hover { background: rgba(220,38,38,0.05); }
        .menu-item-danger:hover { background: rgba(220,38,38,0.08); }
        @keyframes menuPop { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* Atmospheric backdrop — radial gradients para profundidad */}
      <div className="atmosphere" aria-hidden="true" />

      {/* Top bar — restructured: meta · title · toolbar */}
      <div style={S.topBar}>
        <div style={S.topBarInner}>

          {/* — Meta row: back + logo · status + client — */}
          <div style={S.metaRow}>
            <div style={S.metaSide}>
              <button className="icon-btn" onClick={() => navigate("/surveys")} style={S.iconBtn} aria-label="Volver">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={S.thinDivider} />
              <Logo variant="horizontal" size={11} color="#2563eb" />
            </div>
            <div style={S.metaSide}>
              <span style={S.statusInline}>
                <span style={{ ...S.statusDot, background: sc.dot, animation: isActive ? "pulseDot 2s ease infinite" : "none" }} />
                <span style={S.statusText}>{sc.label}</span>
              </span>
              <span style={S.metaDot} />
              <span style={S.clientName}>{survey.client_name}</span>
            </div>
          </div>

          {/* — Title block — */}
          <div style={S.titleBlock}>
            <div style={S.surveyIdLine}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 0 4px rgba(37,99,235,0.15)", display: "inline-block", animation: "pulseDot 2.4s ease-in-out infinite" }} aria-hidden="true" />
              <span style={S.surveyIdLabel}>{(survey.client_name || "").toUpperCase()}</span>
              <span style={S.surveyIdHair} />
              <span style={S.surveyIdMeta}>
                {survey.response_count} {survey.response_count === 1 ? "RESPUESTA" : "RESPUESTAS"}
              </span>
            </div>
            <h1 style={S.titleLarge}>{survey.title}</h1>
          </div>

          {/* — Action toolbar — primary + utility + export | destructive — */}
          <div style={S.toolbar}>

            {/* ── Tier 1 · Primary CTA ── */}
            <div style={S.toolbarPrimary}>
              {isDraft && (
                <button className="primary-action" onClick={handlePublish} disabled={publishing} style={S.primaryAction}>
                  <span className="primary-arrow" style={S.primaryArrow}>►</span>
                  <span>{publishing ? "Publicando…" : "Publicar pulso"}</span>
                </button>
              )}
              {isActive && (
                <button className="primary-action" onClick={() => navigate(`/dashboard?id=${survey.id}`)} style={S.primaryAction}>
                  <span className="primary-arrow" style={S.primaryArrow}>►</span>
                  <span>Ver dashboard</span>
                </button>
              )}
              {isClosed && (
                <button className="primary-action" onClick={handleReopen} style={S.primaryAction}>
                  <span className="primary-arrow" style={S.primaryArrow}>↻</span>
                  <span>Reabrir pulso</span>
                </button>
              )}
            </div>

            <span style={S.clusterRule} aria-hidden="true" />

            {/* ── Tier 2 · Edit cluster ── */}
            <div style={S.toolbarCluster}>
              <button className="tool-btn" onClick={openEditModal} style={S.toolBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Editar info</span>
              </button>
              <button className="tool-btn" onClick={() => navigate(`/surveys/${survey.id}/edit`)} style={S.toolBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                <span>Editar preguntas</span>
              </button>
              <button className="tool-btn" onClick={handleDuplicate} style={S.toolBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Duplicar</span>
              </button>
            </div>

            {/* ── Tier 3 · Export dropdown — solo cuando hay datos ── */}
            {(isActive || isClosed) && (
              <>
                <span style={S.clusterRule} aria-hidden="true" />
                <Dropdown
                  align="left"
                  trigger={({ open, toggle }) => (
                    <button onClick={toggle} className={`tool-btn ${open ? "is-open" : ""}`} style={{ ...S.toolBtn, ...(open ? S.toolBtnOpen : null) }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span>Descargar</span>
                      <svg className="chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 2 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  )}
                >
                  {({ close }) => (
                    <>
                      <MenuItem
                        onClick={() => { close(); handleExport(); }}
                        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                        label="Excel (.xlsx)"
                        meta="Datos crudos por respuesta"
                      />
                      {survey.response_count > 0 && (
                        <MenuItem
                          onClick={() => { close(); handleDownloadReport(); }}
                          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                          label="Reporte PDF"
                          meta="Resumen visual del dashboard"
                        />
                      )}
                    </>
                  )}
                </Dropdown>
              </>
            )}

            {/* Spacer flexible — empuja todo lo de la derecha al borde */}
            <div style={S.toolbarSpacer} />

            {/* ── Tier 4 · Lifecycle ghost ── */}
            {isActive && (
              <button className="ghost-btn" onClick={handleClose} style={S.ghostBtn}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span>Cerrar encuesta</span>
              </button>
            )}

            {/* ── Tier 5 · Overflow destructive ── */}
            <Dropdown
              align="right"
              trigger={({ open, toggle }) => (
                <button onClick={toggle} className={`kebab-btn ${open ? "is-open" : ""}`} style={S.kebabBtn} aria-label="Más acciones">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.6"/>
                    <circle cx="12" cy="12" r="1.6"/>
                    <circle cx="19" cy="12" r="1.6"/>
                  </svg>
                </button>
              )}
            >
              {({ close }) => (
                <>
                  {!isClosed && survey.response_count > 0 && (
                    <MenuItem
                      variant="danger-soft"
                      onClick={() => { close(); setShowClearModal(true); }}
                      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-.6 12.5a2 2 0 0 1-2 1.9H7.6a2 2 0 0 1-2-1.9L5 6"/><path d="M10 11l4 4"/><path d="M14 11l-4 4"/></svg>}
                      label="Limpiar respuestas"
                      meta="Borra solo las respuestas — preguntas y configuración intactas"
                    />
                  )}
                  {!isClosed && survey.response_count > 0 && <MenuSeparator />}
                  <MenuItem
                    variant="danger"
                    onClick={() => { close(); setShowDeleteModal(true); }}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>}
                    label="Eliminar pulso"
                    meta="Borra encuesta, preguntas y todas las respuestas"
                  />
                </>
              )}
            </Dropdown>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div style={S.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <h2 style={S.modalTitle}>¿Eliminar encuesta?</h2>
            <p style={S.modalBody}>
              Se eliminarán permanentemente <strong>"{survey.title}"</strong> y todas sus respuestas. Esta acción no se puede deshacer.
            </p>
            <div style={S.modalActions}>
              <button onClick={() => setShowDeleteModal(false)} style={S.secondaryBtn}>
                Cancelar
              </button>
              <button onClick={handleDelete} style={S.deleteBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div style={S.modalOverlay} onClick={closeClearModal}>
          <div style={{ ...S.modalBox, textAlign: "left", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.modalIcon, margin: "0 0 18px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M19 6l-.6 12.5a2 2 0 0 1-2 1.9H7.6a2 2 0 0 1-2-1.9L5 6"/>
                <path d="M10 11l4 4"/>
                <path d="M14 11l-4 4"/>
              </svg>
            </div>
            <h2 style={{ ...S.modalTitle, textAlign: "left", margin: "0 0 8px" }}>Limpiar respuestas</h2>
            <p style={{ ...S.modalBody, textAlign: "left", margin: "0 0 14px" }}>
              Vas a borrar permanentemente <strong>{survey.response_count} respuesta{survey.response_count !== 1 ? "s" : ""}</strong> de <strong>"{survey.title}"</strong>. Las preguntas y la configuración de la encuesta no se tocan.
            </p>
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#92400e", margin: "0 0 18px", lineHeight: 1.5 }}>
              <strong>Esta acción no se puede deshacer.</strong> Usala para limpiar respuestas de prueba antes de enviar el pulso real.
            </div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.3px" }}>
              Para confirmar, escribe el título exacto de la encuesta:
            </label>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontFamily: "ui-monospace, 'SF Mono', monospace", background: "#070b1a", padding: "6px 10px", borderRadius: 6, userSelect: "none" }}>
              {survey.title}
            </div>
            <input
              autoFocus
              value={clearConfirmText}
              onChange={e => setClearConfirmText(e.target.value)}
              placeholder="Escribe el título aquí"
              disabled={clearing}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${clearConfirmText === survey.title ? "#dc2626" : "rgba(255,255,255,0.12)"}`,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 18,
                transition: "border-color 0.15s",
              }}
            />
            <div style={S.modalActions}>
              <button onClick={closeClearModal} disabled={clearing} style={S.secondaryBtn}>
                Cancelar
              </button>
              <button
                onClick={handleClearResponses}
                disabled={clearConfirmText !== survey.title || clearing}
                style={{
                  ...S.deleteBtn,
                  opacity: (clearConfirmText !== survey.title || clearing) ? 0.4 : 1,
                  cursor: (clearConfirmText !== survey.title || clearing) ? "not-allowed" : "pointer",
                }}
              >
                {clearing ? "Borrando..." : "Sí, borrar las respuestas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={S.modalOverlay} onClick={() => !savingEdit && setShowEditModal(false)}>
          <div style={{ ...S.modalBox, textAlign: "left", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...S.modalTitle, textAlign: "left", margin: "0 0 6px" }}>Editar encuesta</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 22px" }}>
              Actualiza el nombre, cliente o logo. Los cambios se reflejan al instante en el link público.
            </p>

            <div style={S.editFieldGroup}>
              <label style={S.editLabel}>Título</label>
              <input
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Pulso de satisfacción Q3"
                style={S.editInput}
                disabled={savingEdit}
              />
            </div>

            <div style={S.editFieldGroup}>
              <label style={S.editLabel}>Cliente</label>
              <input
                value={editForm.client_name}
                onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                placeholder="Nombre del cliente"
                style={S.editInput}
                disabled={savingEdit}
              />
            </div>

            <div style={S.editFieldGroup}>
              <label style={S.editLabel}>Logo</label>
              <LogoInput
                value={editForm.logo_url}
                onChange={v => setEditForm({ ...editForm, logo_url: v })}
                disabled={savingEdit}
                inputStyle={{ ...S.editInput, marginTop: 0 }}
              />
            </div>

            <div style={S.editFieldGroup}>
              <label style={S.editLabel}>Ola anterior</label>
              <select
                value={editForm.parent_survey_id}
                onChange={e => setEditForm({ ...editForm, parent_survey_id: e.target.value })}
                disabled={savingEdit}
                style={{ ...S.editInput, cursor: savingEdit ? "not-allowed" : "pointer" }}
              >
                <option value="">Ninguna</option>
                {availableParents.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, lineHeight: 1.45 }}>
                Si esta encuesta es la continuación de una medición anterior del mismo cliente, vinculala acá para habilitar la comparación en el dashboard. Solo se listan encuestas del mismo cliente y tipo.
              </div>
            </div>

            <div style={{ ...S.editFieldGroup, marginTop: 20, padding: "14px 14px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "#070b1a" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", margin: 0 }}>
                <input
                  type="checkbox"
                  checked={editForm.show_labels_in_form}
                  onChange={e => setEditForm({ ...editForm, show_labels_in_form: e.target.checked })}
                  disabled={savingEdit}
                  style={{ marginTop: 3, accentColor: "#2563eb", flexShrink: 0, width: 16, height: 16, cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>
                    Mostrar etiquetas de preguntas en el formulario
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    Si está activo, las etiquetas (ej. "Liderazgo") aparecen en negrita sobre el texto de cada pregunta cuando el respondente completa la encuesta. No afecta la review final.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ ...S.editFieldGroup, marginTop: 14, padding: "14px 14px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "#070b1a" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", margin: 0 }}>
                <input
                  type="checkbox"
                  checked={editForm.show_personal_review}
                  onChange={e => setEditForm({ ...editForm, show_personal_review: e.target.checked })}
                  disabled={savingEdit}
                  style={{ marginTop: 3, accentColor: "#2563eb", flexShrink: 0, width: 16, height: 16, cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>
                    Mostrar al respondente sus respuestas al final
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    Antes de finalizar, verá un ranking de sus respuestas Likert ordenadas de menor a mayor acuerdo, con opción de volver a editar.
                  </div>
                </div>
              </label>

              {editForm.show_personal_review && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>
                    Cómo se muestran las preguntas en la review
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 8 }}>
                    Controla el contenido de cada item del ranking individual. Las preguntas sin etiqueta caen a su texto.
                  </div>
                  <select
                    value={editForm.review_question_display}
                    onChange={e => setEditForm({ ...editForm, review_question_display: e.target.value })}
                    disabled={savingEdit}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#0f172a", cursor: savingEdit ? "not-allowed" : "pointer" }}
                  >
                    <option value="both">Etiqueta + afirmación (default)</option>
                    <option value="label_only">Solo etiqueta</option>
                    <option value="text_only">Solo afirmación</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ ...S.modalActions, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowEditModal(false)} disabled={savingEdit} style={S.secondaryBtn}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} style={{ ...S.primaryBtn, opacity: savingEdit ? 0.6 : 1 }}>
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.content}>
        {/* Stats row */}
        <div style={{ ...S.statsRow, animation: "fadeUp 0.4s ease both" }}>
          <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} label="Respuestas" value={survey.response_count} color="#2563eb" />
          <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} label="Estado" value={sc.label} color={sc.color} />
          <ClienteStatCard survey={survey} />
          <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#595959" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} label="Creado" value={new Date(survey.created_at).toLocaleDateString("es-CL")} color="#595959" />
        </div>

        {/* Main grid */}
        <div style={{ ...S.mainGrid, animation: "fadeUp 0.4s ease 0.1s both" }}>
          {/* Survey link */}
          <div className="detail-card" style={S.card}>
            <div style={S.cardHeader}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <h3 style={S.cardTitle}>Link de la encuesta</h3>
            </div>
            {isActive || survey.status === "closed" ? (
              <>
                <div style={S.linkBox}>
                  <span style={{ fontSize: 13, color: "#94a3b8", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.5 }}>{survey.public_url}</span>
                </div>
                <button className="copy-btn" onClick={() => copyToClipboard(survey.public_url, "Link encuesta")} style={S.copyBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {copied === "Link encuesta" ? "¡Copiado!" : "Copiar link"}
                </button>
              </>
            ) : (
              <div style={S.placeholderMsg}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Publica el pulso para generar el link
              </div>
            )}
          </div>

          {/* Dashboard link */}
          <div className="detail-card" style={S.card}>
            <div style={S.cardHeader}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              <h3 style={S.cardTitle}>Dashboard (para cliente)</h3>
            </div>
            {isActive || survey.status === "closed" ? (
              <>
                <div style={S.linkBox}>
                  <span style={{ fontSize: 13, color: "#94a3b8", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.5 }}>{survey.dashboard_url}</span>
                </div>
                <button className="copy-btn" onClick={() => copyToClipboard(survey.dashboard_url, "Link dashboard")} style={S.copyBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {copied === "Link dashboard" ? "¡Copiado!" : "Copiar link"}
                </button>
              </>
            ) : (
              <div style={S.placeholderMsg}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Publica el pulso para compartir
              </div>
            )}
          </div>
        </div>

        {/* QR Section */}
        <div style={{ ...S.qrSection, animation: "fadeUp 0.4s ease 0.2s both" }}>
          <div className="detail-card" style={{ ...S.card, alignItems: "center", textAlign: "center", padding: "32px 24px" }}>
            <div style={S.cardHeader}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <h3 style={S.cardTitle}>Código QR</h3>
            </div>
            {isActive || survey.status === "closed" ? (
              <div style={{ marginTop: 20 }}>
                <div ref={qrContainerRef} style={{ background: "#0f172a", padding: 20, borderRadius: 16, display: "inline-block", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <QRCodeSVG
                    value={survey.public_url}
                    size={180}
                    fgColor="#222222"
                    style={{ display: "block" }}
                  />
                </div>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 16, marginBottom: 12 }}>
                  Escanea para abrir la encuesta
                </p>
                <button
                  className="copy-btn"
                  onClick={handleCopyQR}
                  disabled={copyingQR}
                  style={{ ...S.copyBtn, margin: "0 auto", cursor: copyingQR ? "wait" : "pointer", opacity: copyingQR ? 0.7 : 1 }}
                  title="Copia el QR como imagen al portapapeles para pegarlo en una presentación"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {copyingQR ? "Copiando..." : "Copiar QR"}
                </button>
              </div>
            ) : (
              <div style={{ ...S.placeholderMsg, marginTop: 20 }}>
                Publica el pulso para generar el QR
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="detail-card" style={{ ...S.card, padding: "28px 24px" }}>
            <div style={S.cardHeader}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#595959" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <h3 style={S.cardTitle}>Información</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 16 }}>
              <InfoRow label="Título" value={survey.title} />
              <InfoRow label="Cliente" value={survey.client_name} />
              <InfoRow label="Color del pulso" value={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: survey.primary_color, border: "1px solid rgba(255,255,255,0.08)" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 13 }}>{survey.primary_color}</span>
                </span>
              } />
              <InfoRow label="Escala" value={survey.default_scale === "likert_10" ? "Likert 1-10" : survey.default_scale === "likert_7" ? "Likert 1-7" : "Likert 1-5"} />
              <InfoRow label="Creado" value={new Date(survey.created_at).toLocaleString("es-CL")} />
              <InfoRow label="Cierre" value={survey.closes_at ? new Date(survey.closes_at).toLocaleString("es-CL") : "Sin fecha de cierre"} />
            </div>
          </div>
        </div>

        {/* Variables */}
        {questions.filter(q => q.question_type === "likert" || q.question_type === "nps").length > 0 && (
          <div style={{ marginTop: 28, animation: "fadeUp 0.4s ease 0.25s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#e2e8f0" }}>Variables</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  Agrupa preguntas para ver promedios agregados en el dashboard.
                </p>
              </div>
              {!showVarForm && (
                <button onClick={() => setShowVarForm(true)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #2563eb",
                  background: "rgba(37,99,235,0.08)", color: "#2563eb", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Crear variable
                </button>
              )}
            </div>

            {variables.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: showVarForm ? 14 : 0 }}>
                {variables.map(v => {
                  const qs = v.survey_question_ids.map(qid => questions.find(q => q.id === qid)).filter(Boolean);
                  return (
                    <div key={v.id} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "#0f172a", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{v.name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {qs.map(q => (
                            <span key={q.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "rgba(37,99,235,0.08)", color: "#2563eb", fontWeight: 500 }}>
                              {q.text.slice(0, 60)}{q.text.length > 60 ? "…" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteVariable(v.id)} title="Eliminar variable"
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "#475569", fontSize: 18, padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#dc2626"}
                        onMouseLeave={e => e.currentTarget.style.color = "#b7b7b7"}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {showVarForm && (() => {
              const numericQs = questions.filter(q => q.question_type === "likert" || q.question_type === "nps");
              const firstSelected = numericQs.find(q => varForm.selectedIds.includes(q.id));
              const lockedScale = firstSelected ? effectiveScale(firstSelected) : null;
              return (
                <div style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(37,99,235,0.25)", background: "#0f172a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.4px" }}>Nueva variable</div>
                    <button onClick={() => { setShowVarForm(false); setVarForm({ name: "", selectedIds: [] }); }}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: 16, padding: 0 }}>×</button>
                  </div>
                  <input
                    value={varForm.name}
                    onChange={e => setVarForm({ ...varForm, name: e.target.value })}
                    placeholder="Nombre de la variable (ej: Liderazgo)"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                  />
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
                    Preguntas {lockedScale && <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· escala {lockedScale === "nps_10" ? "NPS 0-10" : lockedScale.replace("likert_", "Likert 1-")}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
                    {numericQs.map(q => {
                      const qScale = effectiveScale(q);
                      const isChecked = varForm.selectedIds.includes(q.id);
                      const disabled = lockedScale && lockedScale !== qScale && !isChecked;
                      const typeLabel = q.question_type === "nps" ? "NPS" : "Likert";
                      const scaleLabel = qScale === "nps_10" ? "0-10" : qScale.replace("likert_", "1-");
                      return (
                        <label key={q.id}
                          title={disabled ? "Escala distinta — no se puede mezclar" : ""}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                            borderRadius: 8, border: "1px solid",
                            borderColor: isChecked ? "#2563eb" : "rgba(255,255,255,0.06)",
                            background: isChecked ? "rgba(37,99,235,0.05)" : "#fff",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.35 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={disabled}
                            onChange={() => toggleVarQuestion(q.id)}
                            style={{ marginTop: 2, accentColor: "#2563eb" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>{q.text}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: q.question_type === "nps" ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.08)", color: q.question_type === "nps" ? "#2563eb" : "#2563eb" }}>{typeLabel}</span>
                              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "rgba(255,255,255,0.04)", color: "#94a3b8" }}>{scaleLabel}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <button onClick={submitVariable}
                    disabled={!varForm.name.trim() || varForm.selectedIds.length === 0}
                    style={{
                      marginTop: 14, width: "100%", padding: "10px 16px", borderRadius: 8,
                      border: "none", background: "linear-gradient(135deg, #2563eb, #2563eb)",
                      color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      opacity: (!varForm.name.trim() || varForm.selectedIds.length === 0) ? 0.5 : 1,
                    }}>
                    Guardar variable
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card-detail" style={{ ...S.statCard, "--accent": color }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {icon}
        <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.18em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontSize: 38, fontWeight: 800, color, lineHeight: 0.95, letterSpacing: "-0.035em" }}>{value}</div>
    </div>
  );
}

// Variante de stat card para Cliente: logo preview en vez de icono SVG, y
// nombre del cliente con tipografia mas chica que un numero.
function ClienteStatCard({ survey }) {
  const ACCENT = "#ef4444";
  const logoSrc = survey.logo_url ? resolveImageUrl(survey.logo_url) : null;
  return (
    <div className="stat-card-detail" style={{ ...S.statCard, "--accent": ACCENT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            style={{
              width: 28, height: 28, borderRadius: 5,
              objectFit: "contain",
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: 2,
              boxSizing: "border-box",
              flexShrink: 0,
            }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>
            <path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>
          </svg>
        )}
        <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.18em" }}>Cliente</span>
      </div>
      <div style={{
        fontFamily: "'Archivo', sans-serif",
        fontSize: 24,
        fontWeight: 800,
        color: "#1f2937",
        lineHeight: 1.05,
        letterSpacing: "-0.025em",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }} title={survey.client_name}>
        {survey.client_name}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0" }}>{typeof value === "string" ? value : value}</span>
    </div>
  );
}

/* ─── Dropdown primitive — used for export menu and overflow menu ─────── */

function Dropdown({ trigger, children, align = "left" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const toggle = () => setOpen((o) => !o);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
      {trigger({ open, toggle })}
      {open && (
        <div
          role="menu"
          style={{
            ...S.dropdownMenu,
            [align === "right" ? "right" : "left"]: 0,
          }}
        >
          {children({ close })}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, meta, onClick, variant = "default" }) {
  const variantClass =
    variant === "danger" ? "menu-item-danger" :
    variant === "danger-soft" ? "menu-item-danger-soft" : "";
  const variantStyle =
    variant === "danger" ? S.menuItemDanger :
    variant === "danger-soft" ? S.menuItemDangerSoft : null;
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`menu-item ${variantClass}`}
      style={{ ...S.menuItem, ...(variantStyle || {}) }}
    >
      {icon && <span style={S.menuItemIcon}>{icon}</span>}
      <span style={S.menuItemContent}>
        <span style={S.menuItemLabel}>{label}</span>
        {meta && <span style={S.menuItemMeta}>{meta}</span>}
      </span>
    </button>
  );
}

function MenuSeparator() {
  return <div role="separator" style={S.menuSeparator} aria-hidden="true" />;
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#070b1a",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: "#e2e8f0",
    backgroundImage: "linear-gradient(rgba(37,99,235,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.022) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    backgroundPosition: "0 0",
  },

  // ── Top bar ──
  topBar: {
    background: "#0f172a",
    borderBottom: "1px solid rgba(37,99,235,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 1px 0 0 rgba(37,99,235,0.04)",
  },
  topBarInner: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: "14px 24px 16px",
    position: "relative",
    zIndex: 1,
  },

  // Meta row (back + logo · status + client)
  metaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(37,99,235,0.08)",
  },
  metaSide: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 30, height: 30,
    borderRadius: 4,
    border: "1px solid rgba(37,99,235,0.18)",
    background: "transparent",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#2563eb",
  },
  thinDivider: {
    width: 1, height: 16,
    background: "rgba(37,99,235,0.2)",
    display: "inline-block",
  },
  statusInline: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 11px 5px 9px",
    background: "rgba(37,99,235,0.06)",
    border: "1px solid rgba(37,99,235,0.14)",
    borderRadius: 4,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: "50%",
    display: "inline-block",
  },
  statusText: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.22em",
    color: "#2563eb",
    textTransform: "uppercase",
  },
  metaDot: {
    width: 3, height: 3, borderRadius: "50%",
    background: "rgba(37,99,235,0.4)",
    display: "inline-block",
  },
  clientName: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.14em",
    color: "#94a3b8",
    textTransform: "uppercase",
  },

  // Title block
  titleBlock: {
    padding: "26px 0 22px",
  },
  surveyIdLine: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  surveyIdLabel: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.32em",
    color: "#2563eb",
    textTransform: "uppercase",
  },
  surveyIdHash: {
    fontFamily: "'Archivo', monospace",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.12em",
    color: "#64748b",
  },
  surveyIdMeta: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.2em",
    color: "#64748b",
    textTransform: "uppercase",
  },
  surveyIdHair: {
    width: 18, height: 1,
    background: "rgba(37,99,235,0.25)",
    display: "inline-block",
  },
  titleLarge: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 58,
    fontWeight: 800,
    margin: 0,
    color: "#f8fafc",
    letterSpacing: "-0.035em",
    lineHeight: 0.98,
  },

  // Toolbar — editorial control panel: primary CTA · clusters · ghost · overflow
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 18,
    borderTop: "1px solid rgba(37,99,235,0.08)",
    flexWrap: "wrap",
  },
  toolbarPrimary: {
    display: "inline-flex",
    alignItems: "center",
  },
  toolbarCluster: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  toolbarSpacer: {
    flex: 1,
    minWidth: 8,
  },
  clusterRule: {
    width: 1, height: 22,
    background: "rgba(37,99,235,0.14)",
    display: "inline-block",
    flexShrink: 0,
  },
  primaryAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 22px",
    borderRadius: 4,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontFamily: "'Archivo', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  primaryArrow: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 11,
    color: "#5fd6d6",
    lineHeight: 1,
  },
  toolBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 13px",
    borderRadius: 4,
    border: "1px solid rgba(37,99,235,0.16)",
    background: "transparent",
    color: "#e2e8f0",
    fontFamily: "'Archivo', sans-serif",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  toolBtnOpen: {
    background: "rgba(37,99,235,0.06)",
    borderColor: "rgba(37,99,235,0.32)",
    color: "#2563eb",
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 13px",
    borderRadius: 4,
    border: "1px solid transparent",
    background: "transparent",
    color: "#94a3b8",
    fontFamily: "'Archivo', sans-serif",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  kebabBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38, height: 38,
    borderRadius: 4,
    border: "1px solid rgba(37,99,235,0.16)",
    background: "transparent",
    color: "#e2e8f0",
    cursor: "pointer",
  },
  // Dropdown menu primitive
  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    background: "#0f172a",
    border: "1px solid rgba(37,99,235,0.14)",
    borderRadius: 4,
    minWidth: 240,
    padding: 6,
    boxShadow: "0 12px 32px -8px rgba(37,99,235,0.18), 0 4px 12px rgba(37,99,235,0.06)",
    zIndex: 100,
    animation: "menuPop 0.16s ease-out",
  },
  menuItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    width: "100%",
    padding: "10px 11px",
    borderRadius: 3,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    color: "#e2e8f0",
  },
  menuItemDanger: {
    color: "#dc2626",
  },
  menuItemDangerSoft: {
    color: "#dc2626",
  },
  menuItemIcon: {
    display: "inline-flex",
    flexShrink: 0,
    paddingTop: 1,
  },
  menuItemContent: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  menuItemLabel: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  menuItemMeta: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 11.5,
    fontWeight: 400,
    color: "#94a3b8",
    lineHeight: 1.4,
    letterSpacing: 0,
    textTransform: "none",
  },
  menuSeparator: {
    height: 1,
    background: "rgba(37,99,235,0.08)",
    margin: "5px 8px",
  },

  // — Legacy aliases (mantienen compatibilidad con el resto del archivo) —
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  secondaryBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 6, border: "1px solid rgba(37,99,235,0.16)", background: "#0f172a", color: "#e2e8f0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  badge: { fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 4, display: "flex", alignItems: "center" },

  content: { maxWidth: 1500, margin: "0 auto", padding: "40px 24px 32px", position: "relative", zIndex: 1 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: {
    background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)",
    borderRadius: 12,
    padding: "22px 24px 22px 28px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 },
  qrSection: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  card: {
    background: "linear-gradient(180deg, #ffffff 0%, #fafaf6 100%)",
    borderRadius: 12,
    padding: "26px 26px 22px",
    border: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#1f2937", margin: 0, letterSpacing: "-0.01em" },
  linkBox: { marginTop: 14, padding: "13px 16px", background: "#070b1a", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" },
  copyBtn: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "#0f172a", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#94a3b8", width: "fit-content" },
  placeholderMsg: { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "#475569" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(37,99,235,0.15)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(255,255,255,0.35)", backdropFilter: "blur(3px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox: { background: "#0f172a", borderRadius: 20, padding: "36px 32px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(255,255,255,0.15)", textAlign: "center" },
  modalIcon: { width: 60, height: 60, borderRadius: "50%", background: "rgba(220,38,38,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px" },
  modalBody: { fontSize: 14, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 28px" },
  modalActions: { display: "flex", gap: 10, justifyContent: "center" },
  editFieldGroup: { marginBottom: 14 },
  editLabel: { display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 },
  editInput: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  deleteBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
