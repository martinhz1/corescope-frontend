import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicSurvey, submitResponse, resolveImageUrl } from "../lib/api";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import { theme as t } from "../lib/theme";

const LIKERT_5 = ["Muy en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Muy de acuerdo"];
const LIKERT_7 = ["Totalmente en desacuerdo", "Muy en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Muy de acuerdo", "Totalmente de acuerdo"];
const LIKERT_10 = ["Muy en desacuerdo", "", "", "", "", "", "", "", "", "Muy de acuerdo"];

// Overrides mobile (≤600px). Reduce paddings horizontales (en pantallas
// angostas eat real estate), bumpea el tap target de los círculos Likert
// y acomoda la meta del header en columna para que no se atropelle.
const PUBLIC_MOBILE_CSS = `
  @media (max-width: 600px) {
    .pub-wrapper { padding: 0 12px !important; }
    .pub-header { padding: 26px 22px 22px !important; border-radius: 16px 16px 0 0 !important; margin-top: 14px !important; }
    .pub-hero-title { font-size: 20px !important; }
    .pub-header-meta { gap: 10px 14px !important; font-size: 12px !important; }
    .pub-questions { padding: 4px 16px 24px !important; border-radius: 0 0 16px 16px !important; }
    .pub-question-card { padding-left: 14px !important; padding-top: 18px !important; padding-bottom: 18px !important; }
    /* Likert circle fluido — se encoge cuando hay más opciones (likert_7, likert_10)
       para no desbordar. El max-width sigue siendo 44px en escalas chicas. */
    .pub-likert-circle { font-size: 15px !important; }
    .pub-likert-row { gap: 4px !important; }
    .pub-likert-edge-label { font-size: 9.5px !important; }
  }
`;

export default function PublicSurveyPage() {
  const { token } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  // step: "form" | "review" | "done". Cuando el survey tiene show_personal_review
  // activo, después del submit pasamos a "review" SIN tocar el backend; el POST
  // real se dispara al clickear "Finalizar" en esa pantalla. Si está apagado,
  // submit va directo: form → done.
  const [step, setStep] = useState("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  // IDs de preguntas obligatorias sin contestar al apretar Enviar. Se limpian
  // a medida que el respondente las completa (ver setAnswer/setNsNr).
  const [missingIds, setMissingIds] = useState(new Set());

  const clearMissing = (qId) => setMissingIds((prev) => {
    if (!prev.has(qId)) return prev;
    const next = new Set(prev);
    next.delete(qId);
    return next;
  });

  useEffect(() => {
    setMounted(true);
    getPublicSurvey(token)
      .then(setSurvey)
      .catch((err) => setError(err.message || "Encuesta no disponible"));
  }, [token]);

  const setAnswer = (qId, value, type) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: (type === "open_text" || type === "single_choice") ? { text_value: value } : { numeric_value: value },
    }));
    clearMissing(qId);
  };

  // NS/NR (solo Likert): numeric_value null + sentinel "NS/NR". Elegir un número
  // luego sobrescribe esta entrada con { numeric_value } y limpia el sentinel.
  const setNsNr = (qId) => {
    setAnswers((prev) => ({ ...prev, [qId]: { numeric_value: null, text_value: "NS/NR" } }));
    clearMissing(qId);
  };

  const validateRequired = () => {
    const required = survey.questions.filter((q) => q.is_required);
    const missing = required.filter((q) => !answers[q.id]);
    if (missing.length > 0) {
      setMissingIds(new Set(missing.map((q) => q.id)));
      const plural = missing.length > 1;
      toast.error(
        `Faltan ${missing.length} pregunta${plural ? "s" : ""} obligatoria${plural ? "s" : ""} por contestar`,
        { duration: 5000 }
      );
      const first = document.getElementById(`q-${missing[0].id}`);
      if (first) {
        const y = first.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      return false;
    }
    return true;
  };

  const postAnswers = async () => {
    const payload = Object.entries(answers).map(([qId, val]) => ({ survey_question_id: qId, ...val }));
    await submitResponse(token, payload);
  };

  const handleSubmit = async () => {
    if (!validateRequired()) return;
    // Si la encuesta tiene review activado, vamos a la pantalla intermedia
    // sin pegarle al backend — el POST queda diferido hasta "Finalizar".
    if (survey.show_personal_review) {
      setStep("review");
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    setSubmitting(true);
    try {
      await postAnswers();
      setStep("done");
    } catch (err) { setError(err.message || "Error al enviar"); }
    finally { setSubmitting(false); }
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      await postAnswers();
      setStep("done");
    } catch (err) { toast.error(err.message || "Error al enviar"); }
    finally { setSubmitting(false); }
  };

  const handleBackToEdit = () => {
    setStep("form");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  // Progress
  const totalQuestions = survey?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (error && !survey) {
    return (
      <div style={S.centerPage}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={S.errorCard}>
          <div style={S.errorIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ fontSize: 22, margin: "0 0 8px", color: "#e2e8f0", fontWeight: 700 }}>Encuesta no disponible</h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!survey) return (
    <div style={S.centerPage}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={S.spinner} />
      <p style={{ color: "#64748b", fontSize: 14, marginTop: 16 }}>Cargando encuesta...</p>
    </div>
  );

  const color = survey.primary_color || "#2563eb";

  if (step === "done") {
    return (
      <div style={S.centerPage}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } } @keyframes checkDraw { to { stroke-dashoffset: 0; } }`}</style>
        <div style={{ ...S.successCard, animation: "scaleIn 0.5s ease both" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}dd)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "checkDraw 0.4s ease 0.3s forwards" }} />
            </svg>
          </div>
          <h2 style={{ fontSize: 26, margin: "0 0 10px", color: "#e2e8f0", fontWeight: 700 }}>¡Gracias por responder!</h2>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.6 }}>Tu opinión es anónima y nos ayuda a mejorar.</p>
          <div style={{ marginTop: 28, padding: "14px 24px", background: "rgba(255,255,255,0.03)", borderRadius: 10, fontSize: 13, color: "#64748b" }}>
            Puedes cerrar esta ventana
          </div>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <ReviewScreen
        survey={survey}
        answers={answers}
        color={color}
        submitting={submitting}
        onBack={handleBackToEdit}
        onFinalize={handleFinalize}
      />
    );
  }

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .likert-opt { transition: all 0.2s ease; -webkit-tap-highlight-color: transparent; }
        .likert-opt:hover { transform: scale(1.08); }
        .likert-opt:active { transform: scale(0.96); }
        .nps-opt { transition: all 0.2s ease; -webkit-tap-highlight-color: transparent; }
        .nps-opt:hover { transform: scale(1.06); }
        .nps-opt:active { transform: scale(0.95); }
        ${PUBLIC_MOBILE_CSS}
      `}</style>

      {/* Sticky progress bar */}
      <div style={S.progressBar}>
        <div style={{ ...S.progressFill, width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>

      <div style={S.formWrapper} className="pub-wrapper">
        {/* Header */}
        <div className="pub-header" style={{ ...S.header, background: `linear-gradient(135deg, ${color}, ${color}bb)`, animation: mounted ? "fadeUp 0.5s ease both" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            {survey.logo_url && (
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, flexShrink: 0 }}>
                <img src={resolveImageUrl(survey.logo_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>{survey.client_name}</div>
              <h1 className="pub-hero-title" style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 0", letterSpacing: "-0.3px", lineHeight: 1.2 }}>{survey.title}</h1>
            </div>
          </div>
          <div className="pub-header-meta" style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, opacity: 0.75, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Anónimo y confidencial
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Menos de 3 min
            </span>
          </div>
        </div>

        {/* Progress info */}
        <div style={S.progressInfo}>
          <span style={{ fontSize: 13, color: "#64748b" }}>{answeredCount} de {totalQuestions} respondidas</span>
          <span style={{ fontSize: 13, fontWeight: 600, color }}>{progress}%</span>
        </div>

        {/* Questions */}
        <div style={S.questionsContainer} className="pub-questions">
          {error && (
            <div style={S.errorBanner}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {survey.questions.map((q, idx) => {
            const count = q.scale === "likert_10" ? 10 : q.scale === "likert_7" ? 7 : 5;
            const defaultLabels = q.scale === "likert_10" ? LIKERT_10 : q.scale === "likert_7" ? LIKERT_7 : LIKERT_5;
            const bankLabels = q.options?.labels;
            const minLabel = bankLabels?.[0] ?? defaultLabels[0];
            const maxLabel = bankLabels?.[bankLabels.length - 1] ?? defaultLabels[defaultLabels.length - 1];
            const currentVal = answers[q.id];
            const isAnswered = !!currentVal;

            return (
              <div
                key={q.id}
                id={`q-${q.id}`}
                className="pub-question-card"
                style={{
                  ...S.questionCard,
                  animation: `fadeUp 0.4s ease ${0.05 * idx}s both`,
                  borderLeft: missingIds.has(q.id)
                    ? `3px solid ${t.color.danger}`
                    : isAnswered
                      ? `3px solid ${color}`
                      : "3px solid transparent",
                  boxShadow: missingIds.has(q.id) ? "0 0 0 1px rgba(220,38,38,0.18)" : undefined,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                {q.label && survey.show_labels_in_form !== false && (
                  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                    {q.label}
                  </div>
                )}
                <div style={S.questionText}>
                  <span style={{ color, fontWeight: 700, marginRight: 8 }}>{idx + 1}.</span>
                  {q.text}
                  {q.is_required && <span style={{ color: "#ef4444", marginLeft: 4, fontSize: 16 }}>*</span>}
                </div>

                {q.question_type === "likert" && (
                  <>
                    <div className="pub-likert-row" style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      {Array.from({ length: count }, (_, i) => {
                        const val = i + 1;
                        const isActive = currentVal?.numeric_value === val;
                        return (
                          <div key={i} className="likert-opt" onClick={() => setAnswer(q.id, val, "likert")} style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", cursor: "pointer" }}>
                            <div className="pub-likert-circle" style={{
                              width: "100%",
                              maxWidth: 44,
                              aspectRatio: "1 / 1",
                              borderRadius: "50%",
                              margin: "0 auto 8px",
                              border: `2px solid ${isActive ? color : "rgba(255,255,255,0.1)"}`,
                              background: isActive ? color : "transparent",
                              color: isActive ? "#fff" : "#595959",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: count >= 10 ? 12 : count >= 7 ? 13 : 14,
                              fontWeight: 600, transition: "all 0.2s",
                            }}>
                              {val}
                            </div>
                            <div className="pub-likert-edge-label" style={{ fontSize: 10, color: "#475569", lineHeight: 1.3, minHeight: 26, padding: "0 2px", wordBreak: "break-word" }}>
                              {i === 0 ? minLabel : i === count - 1 ? maxLabel : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {q.allow_nsnr && (() => {
                      const isNsNr = currentVal?.text_value === "NS/NR";
                      return (
                        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                          <div className="nsnr-opt" onClick={() => setNsNr(q.id)} style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                            fontSize: 13, fontWeight: 500, transition: "all 0.2s",
                            border: `1.5px solid ${isNsNr ? color : "rgba(255,255,255,0.12)"}`,
                            background: isNsNr ? `${color}12` : "transparent",
                            color: isNsNr ? color : "#999",
                          }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                              border: `2px solid ${isNsNr ? color : "rgba(255,255,255,0.25)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {isNsNr && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />}
                            </span>
                            No sabe / No responde
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {q.question_type === "nps" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
                      {Array.from({ length: 11 }, (_, i) => {
                        const isActive = currentVal?.numeric_value === i;
                        const npsColor = i <= 6 ? "#dc2626" : i <= 8 ? "#999" : color;
                        return (
                          <div key={i} className="nps-opt" onClick={() => setAnswer(q.id, i, "nps")} style={{
                            flex: 1, height: 40, borderRadius: 8,
                            border: `2px solid ${isActive ? npsColor : "rgba(255,255,255,0.08)"}`,
                            background: isActive ? npsColor : "transparent",
                            color: isActive ? "#fff" : "#595959",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                          }}>
                            {i}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 500 }}>Nada probable</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>Neutral</span>
                      <span style={{ fontSize: 11, color, fontWeight: 500 }}>Muy probable</span>
                    </div>
                  </div>
                )}

                {q.question_type === "open_text" && (
                  <textarea
                    value={currentVal?.text_value || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value, "open_text")}
                    placeholder="Escribe tu respuesta aquí..."
                    style={{
                      width: "100%", minHeight: 100, borderRadius: 12,
                      border: "1.5px solid rgba(255,255,255,0.08)", padding: 14,
                      fontSize: 16, fontFamily: "inherit", resize: "vertical",
                      outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = color}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                )}

                {q.question_type === "single_choice" && (() => {
                  const opts = q.options?.options || [];
                  if (opts.length > 5) {
                    return (
                      <select
                        value={currentVal?.text_value || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value, "single_choice")}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 10,
                          border: `2px solid ${currentVal?.text_value ? color : "rgba(255,255,255,0.08)"}`,
                          background: "#0f172a", fontSize: 14, fontFamily: "inherit",
                          color: currentVal?.text_value ? "#222" : "#999",
                          outline: "none", cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        <option value="" disabled>Selecciona una opción...</option>
                        {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    );
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {opts.map((opt) => {
                        const isActive = currentVal?.text_value === opt;
                        return (
                          <div key={opt} onClick={() => setAnswer(q.id, opt, "single_choice")} style={{
                            padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                            border: `2px solid ${isActive ? color : "rgba(255,255,255,0.08)"}`,
                            background: isActive ? `${color}12` : "#fff",
                            display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
                          }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                              border: `2px solid ${isActive ? color : "rgba(255,255,255,0.2)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {isActive && <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />}
                            </div>
                            <span style={{ fontSize: 14, color: isActive ? "#222" : "#595959", fontWeight: isActive ? 500 : 400 }}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Submit */}
          <div style={{ padding: "8px 0 0" }}>
            <button onClick={handleSubmit} disabled={submitting} style={{
              ...S.submitBtn,
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}>
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                  Enviando...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Enviar respuestas
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                </span>
              )}
            </button>
            <div style={S.footerNote}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b7b7b7" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Tus respuestas son completamente anónimas
            </div>
          </div>
        </div>
      </div>

      <div style={S.brandFooter}>
        <div style={S.brandFooterHint}>
          <span style={S.brandFooterHair} />
          <span style={S.brandFooterLabel}>Plataforma desarrollada por</span>
          <span style={S.brandFooterHair} />
        </div>
        <Logo variant="horizontal" size={11} color={t.color.brand} />
      </div>
    </div>
  );
}


// ─── Pantalla intermedia "Review" ─────────────────────────────────────
// Solo se monta si survey.show_personal_review === true. Muestra las
// respuestas Likert del respondente ordenadas asc por numeric_value
// (de menor a mayor acuerdo). Excluye NS/NR y todo lo que no sea Likert.
// El POST real ocurre al hacer click en "Finalizar →".

const LIKERT_LABELS = { likert_5: LIKERT_5, likert_7: LIKERT_7, likert_10: LIKERT_10 };

function effectiveScale(question, defaultScale) {
  return question.scale_override || defaultScale || "likert_5";
}

// Clasifica un valor Likert en tres tiers según el ratio value / maxValue:
//   ≥ 0.7  → Fortaleza    (verde, ▲)         — Likert 1-5: 4-5
//   ≤ 0.4  → A intervenir (rojo, ⚠)         — Likert 1-5: 1-2
//   resto  → A reforzar   (ámbar, ▼)         — Likert 1-5: 3
//
// Los thresholds escalan proporcionales: 1-7 intervenir 1-2, 1-10 intervenir 1-4.
function getValueInsight(value, maxValue) {
  const ratio = value / maxValue;
  if (ratio >= 0.7) {
    return { kind: "fortaleza", label: "Fortaleza", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "▲" };
  }
  if (ratio <= 0.4) {
    return { kind: "intervenir", label: "A intervenir", color: "#dc2626", bg: "rgba(220,38,38,0.12)", icon: "⚠" };
  }
  return { kind: "reforzar", label: "A reforzar", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "▼" };
}

function ReviewScreen({ survey, answers, color, submitting, onBack, onFinalize }) {
  const ranked = survey.questions
    .filter(q => q.question_type === "likert")
    .map(q => {
      const ans = answers[q.id];
      const value = ans && typeof ans.numeric_value === "number" ? ans.numeric_value : null;
      return { q, value };
    })
    // Excluyo NS/NR (value === null) y preguntas sin contestar.
    .filter(item => item.value !== null)
    .sort((a, b) => a.value - b.value);

  // Promedios por variable. Solo aplica a variables 100% Likert con al menos
  // una respuesta válida (NS/NR excluido). Si no hay variables que califiquen
  // la sección no se renderiza.
  const questionsById = new Map(survey.questions.map(q => [q.id, q]));
  const variableAverages = (survey.variables || [])
    .map(v => {
      const members = (v.survey_question_ids || [])
        .map(id => questionsById.get(id))
        .filter(Boolean);
      if (members.length === 0) return null;
      // Si CUALQUIER miembro no es Likert, descartar toda la variable
      if (members.some(q => q.question_type !== "likert")) return null;
      const values = [];
      members.forEach(q => {
        const ans = answers[q.id];
        if (ans && typeof ans.numeric_value === "number") values.push(ans.numeric_value);
      });
      if (values.length === 0) return null;
      const avg = values.reduce((s, n) => s + n, 0) / values.length;
      const scale = effectiveScale(members[0], survey.default_scale);
      const labels = LIKERT_LABELS[scale] || LIKERT_5;
      const maxValue = labels.length;
      const labelIdx = Math.max(0, Math.min(maxValue - 1, Math.round(avg) - 1));
      return {
        variable: v,
        avg,
        count: values.length,
        maxValue,
        scaleLabel: labels[labelIdx] || "",
        pct: (avg / maxValue) * 100,
      };
    })
    .filter(Boolean);

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ${PUBLIC_MOBILE_CSS}
      `}</style>

      <div className="pub-wrapper" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 40px" }}>
        <div className="pub-header" style={{ ...S.header, background: `linear-gradient(135deg, ${color}, ${color}bb)`, animation: "fadeUp 0.4s ease both", borderRadius: "20px 20px 0 0", marginBottom: 0, marginTop: 0 }}>
          {survey.logo_url && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, flexShrink: 0 }}>
                <img src={resolveImageUrl(survey.logo_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, color: "#fff" }}>{survey.client_name}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{survey.title}</div>
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, opacity: 0.78, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 8, color: "#fff" }}>
            Revisa tus respuestas
          </div>
          <h1 className="pub-hero-title" style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.4px", color: "#fff", lineHeight: 1.2 }}>
            Tus respuestas
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.88)", margin: 0, lineHeight: 1.55 }}>
            Estas son tus respuestas ordenadas de <strong>menor a mayor acuerdo</strong>. Si quieres cambiar alguna, vuelve a editar antes de finalizar.
          </p>
        </div>

        <div style={{ background: "#0f172a", padding: "20px 22px 26px", borderRadius: "0 0 20px 20px", animation: "fadeUp 0.5s ease 0.05s both" }}>
          {variableAverages.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                Promedio por dimensión
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {variableAverages.map(({ variable, avg, count, maxValue, scaleLabel, pct }, idx) => (
                  <div
                    key={variable.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: `1px solid ${color}20`,
                      background: `${color}06`,
                      animation: `fadeUp 0.4s ease ${0.05 * idx}s both`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                      {variable.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
                        {avg.toFixed(1)}
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8", marginLeft: 4 }}>
                          / {maxValue}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {scaleLabel}
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        borderRadius: 3,
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      Promedio de {count} {count === 1 ? "respuesta" : "respuestas"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ranked.length === 0 ? (
            <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", padding: "20px 0", margin: 0 }}>
              No hay respuestas Likert para mostrar.
            </p>
          ) : (
            <>
              {variableAverages.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                  Detalle por pregunta
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ranked.map(({ q, value }, idx) => {
                const scale = effectiveScale(q, survey.default_scale);
                const labels = LIKERT_LABELS[scale] || LIKERT_5;
                const maxValue = labels.length;
                const label = labels[value - 1] || "";
                const pct = (value / maxValue) * 100;
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "#070b1a",
                      animation: `fadeUp 0.4s ease ${0.06 * idx}s both`,
                    }}
                  >
                    {(() => {
                      // Decide qué mostrar según el modo configurado.
                      // - both:       label arriba (si existe) + texto al lado del numero
                      // - label_only: solo label (fallback a texto si no hay label)
                      // - text_only:  solo texto, sin label
                      const mode = survey.review_question_display || "both";
                      const hasLabel = !!q.label;
                      const showLabelHeader = mode === "both" && hasLabel;
                      const mainText = mode === "label_only" && hasLabel ? q.label : q.text;
                      const insight = getValueInsight(value, maxValue);
                      return (
                        <>
                          {showLabelHeader && (
                            <div style={{
                              fontSize: 11, fontWeight: 700, color,
                              textTransform: "uppercase", letterSpacing: "0.5px",
                              marginBottom: 8,
                            }}>
                              {q.label}
                            </div>
                          )}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 10px", borderRadius: 999,
                                background: insight.bg, color: insight.color,
                                fontSize: 10.5, fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: "0.4px",
                              }}>
                                <span style={{ fontSize: 9 }}>{insight.icon}</span>
                                {insight.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 13.5, color: "#e2e8f0", lineHeight: 1.45 }}>
                              {mainText}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24, flexDirection: "column" }}>
            <button
              onClick={onFinalize}
              disabled={submitting}
              style={{
                width: "100%", padding: "16px", borderRadius: 14, border: "none",
                color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "inherit",
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                transition: "all 0.25s ease",
              }}
            >
              {submitting ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                  Enviando…
                </span>
              ) : "Finalizar →"}
            </button>
            <button
              onClick={onBack}
              disabled={submitting}
              style={{
                width: "100%", padding: "13px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#0f172a", color: "#475569",
                fontSize: 14, fontWeight: 500, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.5 : 1,
              }}
            >
              ← Volver a editar
            </button>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: "#94a3b8", textAlign: "center", fontStyle: "italic" }}>
          Tus respuestas aún no se enviaron. Al hacer click en "Finalizar" se registran de forma anónima.
        </div>
      </div>
    </div>
  );
}


const S = {
  page: { minHeight: "100vh", background: "#070b1a", fontFamily: "'DM Sans', system-ui, sans-serif" },
  centerPage: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#070b1a", fontFamily: "'DM Sans', system-ui, sans-serif" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(37,99,235,0.15)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  formWrapper: { maxWidth: 680, margin: "0 auto", padding: "0 20px" },
  header: { padding: "36px 36px 28px", color: "#fff", borderRadius: "20px 20px 0 0", marginTop: 20 },
  progressBar: { position: "sticky", top: 0, zIndex: 20, height: 3, background: "rgba(255,255,255,0.06)" },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },
  progressInfo: { display: "flex", justifyContent: "space-between", padding: "14px 20px", background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  questionsContainer: { background: "#0f172a", padding: "8px 28px 32px", borderRadius: "0 0 20px 20px" },
  questionCard: { padding: "24px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", borderRadius: 0, paddingLeft: 16, transition: "border-left-color 0.3s ease" },
  questionText: { fontSize: 15, color: "#e2e8f0", fontWeight: 500, marginBottom: 18, lineHeight: 1.6 },
  submitBtn: { width: "100%", padding: "16px", borderRadius: 14, border: "none", color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "inherit", transition: "all 0.25s ease", marginTop: 12 },
  footerNote: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, fontSize: 12, color: "#475569" },
  brandFooter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 20px 32px" },
  brandFooterHint: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", maxWidth: 320 },
  brandFooterHair: { flex: 1, height: 1, background: t.color.brandLineSoft },
  brandFooterLabel: { fontFamily: t.font.display, fontSize: 9.5, fontWeight: 600, letterSpacing: t.track.widest, color: t.color.mutedFaint, textTransform: "uppercase", flexShrink: 0 },
  errorCard: { background: "#0f172a", padding: "48px 40px", borderRadius: 20, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)", maxWidth: 420, boxShadow: "0 4px 24px rgba(255,255,255,0.04)" },
  errorIcon: { width: 64, height: 64, borderRadius: 16, background: "rgba(220,38,38,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  successCard: { background: "#0f172a", padding: "56px 48px", borderRadius: 20, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)", maxWidth: 440, boxShadow: "0 4px 24px rgba(255,255,255,0.04)" },
  errorBanner: { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(220,38,38,0.05)", color: "#dc2626", borderRadius: 10, fontSize: 13, fontWeight: 500, margin: "16px 0" },
};
