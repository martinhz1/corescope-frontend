import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getQuestions, createSurvey, getSurvey, getSurveyQuestions, getSurveyVariables,
  addQuestionToSurvey, updateSurveyQuestion, deleteSurveyQuestion, reorderSurveyQuestions,
} from "../lib/api";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import LogoInput from "../components/LogoInput";
import { theme as t, hairSpan, globalKeyframes } from "../lib/theme";

const TYPE_LABELS = { likert: "Likert", nps: "NPS", open_text: "Abierta", single_choice: "Opción", yes_no: "Sí / No" };
const TYPE_COLORS = { likert: "#2563eb", nps: "#2563eb", open_text: "#dc2626", single_choice: "#7c3aed", yes_no: "#0ea5e9" };
const TYPE_BG = { likert: "rgba(37,99,235,0.08)", nps: "rgba(37,99,235,0.08)", open_text: "rgba(220,38,38,0.08)", single_choice: "rgba(124,58,237,0.08)", yes_no: "rgba(14,165,233,0.08)" };

// Una pregunta es demográfica si su categoría es "Demográficas".
// (Antes también marcaba por type=single_choice, pero ahora single_choice se usa
// tanto para demográficas como para preguntas dicotómicas/opciones no-demográficas.)
const isDemographicQuestion = (q) => q.category === "Demográficas";
const isYesNoQuestion = (q) => q.question_type === "single_choice" && !q.isDemographic &&
  Array.isArray(q.default_options?.options) &&
  q.default_options.options.length === 2 &&
  q.default_options.options[0] === "Sí" && q.default_options.options[1] === "No";

const TEMPLATES = [
  {
    id: "corescope_standard",
    name: "Estándar",
    description: "9 preguntas. Evaluación completa post-taller con escala de notas, NPS y pregunta abierta.",
    icon: "star",
    color: "#2563eb",
    questionIds: [
      "86e9223b-7d69-419d-9d64-9ed2521c99d5",
      "f06c700c-ddea-43a8-b8c7-c887a573fd5d",
      "23cfda1e-0831-4ccc-9e3c-ff95c780e085",
      "540fc919-c473-43a5-a3bc-32b31a05c78a",
      "7da0fd78-4bd2-495e-a29a-f82b893aae84",
      "c18b6629-bf6a-42a9-9f7d-264ffa8e1fda",
      "9d30b9e2-19ea-4fc0-a22b-773d3f70ed3b",
      "2843e3ef-7828-409c-82e0-7a6f301349c4",
      "1c5c2ef0-ea3f-40be-a3b1-051136fcadf5",
    ],
  },
  {
    id: "post_taller_full",
    name: "Evaluación post-taller completa",
    description: "16 preguntas. Kirkpatrick Nivel 1 + 2: satisfacción, facilitación, NPS, aprendizaje y confianza.",
    icon: "clipboard",
    color: "#2563eb",
    questionIds: [
      "5819eb08-a447-4fd9-b2bd-a0c13d0d9aff",
      "e9241378-29ff-4265-899d-535022db25fd",
      "7991922b-e2bb-43a5-bffa-98a94e630d6a",
      "8bead075-8ae7-4b01-971f-23244cd24c3a",
      "c52be836-fd6e-43ea-992f-48056ce5fc1c",
      "aa804fba-c455-48a4-8e6b-5c8ca3dd208d",
      "e27aff38-18a9-4ede-a191-369e14f15889",
      "52ad0a09-b1f1-4fbd-97d1-6f59b692d882",
      "ef12d6b7-8c13-437b-9a60-de29f6f80e93",
      "2802ce5e-1f08-4fda-b635-bc36db5a5f6b",
      "6c1db754-60e4-47d9-9e74-7d10451710b3",
      "dabda7d3-86cf-4743-99e2-5bca20c30939",
      "ec7d4fb6-ab94-4ebf-aa97-12b4b64a9b55",
      "e626041e-6cfd-4b6a-8611-c40ff493af31",
      "6d09f2ca-ae26-49e6-98a8-78a1e0997aa2",
      "e7b80df5-a0d0-4740-812e-755c75606a54",
    ],
  },
  {
    id: "quick_pulse",
    name: "Pulso rápido de satisfacción",
    description: "5 preguntas. Solo Nivel 1: relevancia, facilitador, satisfacción, NPS y comentarios.",
    icon: "zap",
    color: "#ef4444",
    questionIds: [
      "5819eb08-a447-4fd9-b2bd-a0c13d0d9aff",
      "c52be836-fd6e-43ea-992f-48056ce5fc1c",
      "c18b6629-bf6a-42a9-9f7d-264ffa8e1fda",
      "ef12d6b7-8c13-437b-9a60-de29f6f80e93",
      "2802ce5e-1f08-4fda-b635-bc36db5a5f6b",
    ],
  },
  {
    id: "facilitator_eval",
    name: "Evaluación del facilitador",
    description: "6 preguntas. Foco en metodología, claridad, ritmo, ejemplos, comodidad y feedback abierto.",
    icon: "user",
    color: "#740839",
    questionIds: [
      "c52be836-fd6e-43ea-992f-48056ce5fc1c",
      "aa804fba-c455-48a4-8e6b-5c8ca3dd208d",
      "e27aff38-18a9-4ede-a191-369e14f15889",
      "52ad0a09-b1f1-4fbd-97d1-6f59b692d882",
      "7da0fd78-4bd2-495e-a29a-f82b893aae84",
      "2802ce5e-1f08-4fda-b635-bc36db5a5f6b",
    ],
  },
];

const TemplateIcon = ({ type, color }) => {
  const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "star") return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  if (type === "clipboard") return <svg {...props}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>;
  if (type === "zap") return <svg {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
  if (type === "user") return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  return null;
};

const CAT_DOT_COLORS = ["#2563eb", "#7c3aed", "#0ea5e9", "#ef4444", "#f59e0b", "#10b981", "#f97316", "#ec4899"];

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", userSelect: "none" }}>
      <div style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, position: "relative", background: checked ? "#2563eb" : "rgba(255,255,255,0.12)", transition: "background 0.2s", marginTop: 1 }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
        <div style={{ position: "absolute", top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3 }}>{label}</div>
        {description && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{description}</div>}
      </div>
    </label>
  );
}

function CircularProgress({ count }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = count === 0 ? 0 : Math.min(count / 20, 1);
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"/>
      {count > 0 && (
        <circle cx="44" cy="44" r={r} fill="none" stroke="#2563eb" strokeWidth="7"
          strokeDasharray={`${fill * circ} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      )}
      <text x="44" y="50" textAnchor="middle" fill="#f8fafc" fontSize="22" fontWeight="900" fontFamily="Archivo, system-ui">{count}</text>
    </svg>
  );
}

export default function SurveyBuilderPage() {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [scale, setScale] = useState("likert_5");
  const [logoUrl, setLogoUrl] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [showPersonalReview, setShowPersonalReview] = useState(false);
  const [reviewQuestionDisplay, setReviewQuestionDisplay] = useState("both");
  const [showLabelsInForm, setShowLabelsInForm] = useState(true);
  const [filterCat, setFilterCat] = useState("Todas");
  const [bankSearch, setBankSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ text: "", type: "likert", category: "", newCategory: "", minLabel: "", maxLabel: "", label: "" });
  const [editingId, setEditingId] = useState(null);
  const [variables, setVariables] = useState([]); // [{tempId, name, questionIds}]
  const [showVarForm, setShowVarForm] = useState(false);
  const [varForm, setVarForm] = useState({ name: "", selectedIds: [] });
  const navigate = useNavigate();

  // ── Edit mode wiring ──
  const { id: editId } = useParams();
  const editMode = !!editId;
  const [editStatus, setEditStatus] = useState(null);   // "draft" | "active" | "closed"
  const [editLoading, setEditLoading] = useState(editMode);
  const [showRemoveModal, setShowRemoveModal] = useState(null); // sq object pendiente de eliminar
  // Snapshot del estado del servidor (para diff al guardar). Se actualiza en cada load.
  const [serverSnapshot, setServerSnapshot] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);

  // Marca dirty. Se llama desde cada handler en edit mode.
  const markDirty = () => { if (editMode) setDirty(true); };

  // Escala efectiva de una pregunta: lo que determina si pueden combinarse en una variable
  const getEffectiveScale = (q) => {
    if (q.question_type === "nps") return "nps_10";
    if (q.question_type === "likert") return q.scaleOverride || scale;
    return null;
  };

  useEffect(() => {
    getQuestions().then(setQuestions).catch(() => toast.error("Error cargando preguntas"));
  }, []);

  // Mapper SurveyQuestionInfo (backend) → forma local de selected[]
  const sqToLocal = (sq) => ({
    id: sq.question_bank_id || `sq-${sq.id}`,
    _sqId: sq.id,
    text: sq.custom_text || sq.text,
    customText: sq.custom_text || null,
    question_type: sq.question_type,
    category: sq.category || "",
    default_options: sq.default_options || null,
    scaleOverride: sq.scale_override || null,
    required: sq.is_required ?? true,
    isDemographic: sq.is_demographic,
    allowNsNr: sq.allow_nsnr ?? false,
    optionsOverride: sq.options_override || null,
    label: sq.label || "",
    isCustom: false,
    responseCount: sq.response_count || 0,
  });

  // Snapshot inmutable del estado del servidor (para diff). Es una copia
  // congelada, cualquier mutación local en `selected` no la afecta.
  const buildSnapshot = (qs) => qs.map(sq => ({
    _sqId: sq.id,
    customText: sq.custom_text || null,
    scaleOverride: sq.scale_override || null,
    required: sq.is_required ?? true,
    isDemographic: sq.is_demographic,
    allowNsNr: sq.allow_nsnr ?? false,
    optionsOverride: sq.options_override
      ? JSON.parse(JSON.stringify(sq.options_override))
      : null,
    label: sq.label || "",
  }));

  // Carga (o recarga) los datos del pulso. Se llama desde mount y desde saveEdits.
  const reloadEditData = async () => {
    const [s, qs, vars] = await Promise.all([
      getSurvey(editId),
      getSurveyQuestions(editId),
      getSurveyVariables(editId),
    ]);
    setTitle(s.title || "");
    setClientName(s.client_name || "");
    setPrimaryColor(s.primary_color || "#2563eb");
    setScale(s.default_scale || "likert_5");
    setLogoUrl(s.logo_url || "");
    setClosesAt(s.closes_at ? s.closes_at.slice(0, 16) : "");
    setShowPersonalReview(!!s.show_personal_review);
    setReviewQuestionDisplay(s.review_question_display || "both");
    setShowLabelsInForm(s.show_labels_in_form !== false);
    setEditStatus(s.status);
    setSelected(qs.map(sqToLocal));
    setServerSnapshot(buildSnapshot(qs));
    setVariables(vars.map(v => ({
      tempId: v.id,
      name: v.name,
      questionIds: v.survey_question_ids || [],
    })));
    setDirty(false);
  };

  // En modo edit: cargar el survey + sus preguntas + variables
  useEffect(() => {
    if (!editMode) return;
    let cancel = false;
    (async () => {
      try {
        await reloadEditData();
        if (cancel) return;
        setShowTemplates(false);
      } catch {
        toast.error("No se pudo cargar el pulso");
        navigate(`/surveys/${editId}`);
      } finally {
        if (!cancel) setEditLoading(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, editMode]);

  // Aviso al usuario si intenta cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const categories = ["Todas", ...new Set(questions.map(q => q.category))];
  const filtered = (() => {
    let qs = filterCat === "Todas" ? questions : questions.filter(q => q.category === filterCat);
    if (bankSearch.trim()) {
      const s = bankSearch.trim().toLowerCase();
      qs = qs.filter(q => q.text.toLowerCase().includes(s));
    }
    return qs;
  })();

  // ─────────────────────────────────────────────────────────────
  // Handlers — sólo modifican estado local. En edit mode, marcan
  // dirty=true para habilitar el botón "Guardar ediciones". El
  // commit al backend ocurre en saveEdits() vía un diff contra
  // serverSnapshot.
  // ─────────────────────────────────────────────────────────────

  const addQuestion = (q) => {
    if (selected.find(s => s.id === q.id)) return;
    const demo = isDemographicQuestion(q);
    setSelected([...selected, {
      ...q,
      scaleOverride: null,
      required: true,
      isDemographic: demo,
      allowNsNr: false,
      optionsOverride: demo ? { options: [] } : null,
      label: q.label || "",
    }]);
    markDirty();
  };

  const removeQuestion = (id) => {
    const item = selected.find(s => s.id === id);
    if (editMode && item?._sqId) {
      // Modal de confirmación: la pregunta puede tener respuestas asociadas
      setShowRemoveModal(item);
      return;
    }
    setSelected(prev => prev.filter(s => s.id !== id));
    markDirty();
  };

  const confirmRemoveQuestion = () => {
    const item = showRemoveModal;
    if (!item) return;
    setShowRemoveModal(null);
    setSelected(prev => prev.filter(s => s.id !== item.id));
    markDirty();
  };

  const moveQuestion = (idx, dir) => {
    const n = [...selected];
    const tIdx = idx + dir;
    if (tIdx < 0 || tIdx >= n.length) return;
    [n[idx], n[tIdx]] = [n[tIdx], n[idx]];
    setSelected(n);
    markDirty();
  };

  const toggleRequired = (idx) => {
    const n = [...selected];
    n[idx].required = !n[idx].required;
    setSelected(n);
    markDirty();
  };

  const toggleAllowNsNr = (idx) => {
    const n = [...selected];
    n[idx].allowNsNr = !n[idx].allowNsNr;
    setSelected(n);
    markDirty();
  };

  const setQuestionScale = (idx, val) => {
    const next = val === "default" ? null : val;
    const n = [...selected];
    n[idx].scaleOverride = next;
    setSelected(n);
    markDirty();
  };

  const addOption = (idx, value) => {
    const v = value.trim();
    if (!v) return;
    const n = [...selected];
    const current = n[idx].optionsOverride?.options || [];
    if (current.includes(v)) return;
    n[idx].optionsOverride = { options: [...current, v] };
    setSelected(n);
    markDirty();
  };

  const removeOption = (idx, optIdx) => {
    const n = [...selected];
    const current = n[idx].optionsOverride?.options || [];
    n[idx].optionsOverride = { options: current.filter((_, i) => i !== optIdx) };
    setSelected(n);
    markDirty();
  };

  const updateQuestionText = (idx, newText) => {
    const n = [...selected];
    if (n[idx].isCustom) n[idx].text = newText;
    else n[idx].customText = newText;
    setSelected(n);
    markDirty();
  };

  const updateQuestionLabel = (idx, newLabel) => {
    const n = [...selected];
    n[idx].label = newLabel.slice(0, 100);
    setSelected(n);
    markDirty();
  };

  const toggleVarQuestion = (qId) => {
    setVarForm(vf => ({
      ...vf,
      selectedIds: vf.selectedIds.includes(qId)
        ? vf.selectedIds.filter(id => id !== qId)
        : [...vf.selectedIds, qId],
    }));
  };

  const submitVariable = () => {
    const name = varForm.name.trim();
    if (!name) return toast.error("Escribe un nombre para la variable");
    if (varForm.selectedIds.length === 0) return toast.error("Selecciona al menos una pregunta");
    setVariables([...variables, { tempId: `var-${Date.now()}`, name, questionIds: varForm.selectedIds }]);
    setVarForm({ name: "", selectedIds: [] });
    setShowVarForm(false);
    toast.success("Variable creada");
  };

  const removeVariable = (tempId) => {
    setVariables(variables.filter(v => v.tempId !== tempId));
  };

  // Al remover una pregunta del pulso, limpiar referencias en variables.
  // En edit mode las variables son read-only y se gestionan en SurveyDetailPage,
  // así que no las tocamos acá (se sincronizan al recargar).
  useEffect(() => {
    if (editMode) return;
    const validIds = new Set(selected.map(q => q.id));
    setVariables(vs =>
      vs.map(v => ({ ...v, questionIds: v.questionIds.filter(id => validIds.has(id)) }))
        .filter(v => v.questionIds.length > 0)
    );
  }, [selected, editMode]);

  const submitCustomQuestion = () => {
    const text = customForm.text.trim();
    if (!text) return toast.error("Escribe el texto de la pregunta");
    const cat = customForm.category === "__new__" ? customForm.newCategory.trim() : customForm.category;
    if (!cat) return toast.error("Selecciona o escribe una categoría");

    // "yes_no" es un alias de UI — por detrás es single_choice con opciones fijas
    let questionType = customForm.type;
    let defaultOptions = null;
    if (customForm.type === "yes_no") {
      questionType = "single_choice";
      defaultOptions = { options: ["Sí", "No"] };
    } else if (customForm.type === "likert") {
      const min = customForm.minLabel.trim();
      const max = customForm.maxLabel.trim();
      if (min || max) defaultOptions = { labels: [min || "Mínimo", max || "Máximo"] };
    }

    const newCustom = {
      id: `custom-${Date.now()}`,
      text,
      question_type: questionType,
      category: cat,
      default_options: defaultOptions,
      scaleOverride: null,
      required: true,
      isDemographic: false,
      optionsOverride: null,
      label: customForm.label.trim(),
      isCustom: true,
    };
    setSelected([...selected, newCustom]);
    setCustomForm({ text: "", type: "likert", category: "", newCategory: "", minLabel: "", maxLabel: "", label: "" });
    setShowCustomForm(false);
    toast.success("Pregunta agregada al pulso");
    markDirty();
  };

  const applyTemplate = (template) => {
    const templateQuestions = template.questionIds
      .map(id => questions.find(q => q.id === id))
      .filter(Boolean)
      .map(q => {
        const demo = isDemographicQuestion(q);
        return { ...q, scaleOverride: null, required: true, isDemographic: demo, optionsOverride: demo ? { options: [] } : null };
      });

    if (templateQuestions.length === 0) {
      toast.error("No se encontraron las preguntas del template. Verifica que el banco esté cargado.");
      return;
    }

    setSelected(templateQuestions);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" aplicado con ${templateQuestions.length} preguntas`);
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Agrega un título al pulso");
    if (!clientName.trim()) return toast.error("Ingresa el nombre de la organización");
    if (selected.length === 0) return toast.error("Selecciona al menos una pregunta");

    // Validar que cada demográfica tenga al menos 2 opciones
    const demoSinOpciones = selected.find(q => q.isDemographic && (q.optionsOverride?.options?.length || 0) < 2);
    if (demoSinOpciones) return toast.error(`La demográfica "${demoSinOpciones.text}" necesita al menos 2 opciones`);

    // Ordenar: demográficas primero, luego preguntas regulares (respetando orden del usuario)
    const ordered = [
      ...selected.filter(q => q.isDemographic),
      ...selected.filter(q => !q.isDemographic),
    ];

    // Mapa selected.id → position para resolver variables
    const positionOf = Object.fromEntries(ordered.map((q, i) => [q.id, i + 1]));

    setSaving(true);
    try {
      const created = await createSurvey({
        title: title.trim(), client_name: clientName.trim(), primary_color: primaryColor, default_scale: scale,
        logo_url: logoUrl.trim() || null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        show_personal_review: showPersonalReview,
        review_question_display: reviewQuestionDisplay,
        show_labels_in_form: showLabelsInForm,
        question_ids: ordered.map((q, idx) => ({
          question_bank_id: q.isCustom ? null : q.id,
          new_question_text: q.isCustom ? q.text : null,
          new_question_type: q.isCustom ? q.question_type : null,
          new_question_category: q.isCustom ? q.category : null,
          new_question_options: q.isCustom ? q.default_options : null,
          position: idx + 1,
          scale_override: q.scaleOverride,
          is_required: q.required,
          is_demographic: q.isDemographic,
          allow_nsnr: q.allowNsNr || false,
          options_override: q.optionsOverride,
          custom_text: !q.isCustom && q.customText ? q.customText : null,
          label: q.label || null,
        })),
        variables: variables
          .map(v => ({
            name: v.name,
            question_positions: v.questionIds.map(id => positionOf[id]).filter(Boolean),
          }))
          .filter(v => v.question_positions.length > 0),
      });
      toast.success("¡Pulso creado!");
      navigate(`/surveys/${created.id}`);
    } catch (err) { toast.error(err.message || "Error al crear"); } finally { setSaving(false); }
  };

  // ─────────────────────────────────────────────────────────────
  // saveEdits — para edit mode. Calcula el diff entre el snapshot
  // del servidor y el estado actual de `selected`, y emite los
  // calls necesarios en orden: PATCH → DELETE → POST → reorder.
  // Termina recargando para sincronizar el snapshot con la realidad.
  // ─────────────────────────────────────────────────────────────

  const computeEditsDiff = () => {
    const snapById = new Map(serverSnapshot.map(s => [s._sqId, s]));
    const currIds = new Set(selected.map(c => c._sqId).filter(Boolean));

    const deletes = serverSnapshot
      .filter(s => !currIds.has(s._sqId))
      .map(s => s._sqId);

    const adds = selected.filter(c => !c._sqId);

    const updates = [];
    selected.forEach(c => {
      if (!c._sqId) return;
      const orig = snapById.get(c._sqId);
      if (!orig) return;
      const changes = {};
      if ((c.customText || null) !== (orig.customText || null)) changes.custom_text = c.customText || null;
      if ((c.scaleOverride || null) !== (orig.scaleOverride || null)) changes.scale_override = c.scaleOverride || null;
      if (c.required !== orig.required) changes.is_required = c.required;
      if (c.isDemographic !== orig.isDemographic) changes.is_demographic = c.isDemographic;
      if ((c.allowNsNr ?? false) !== (orig.allowNsNr ?? false)) changes.allow_nsnr = c.allowNsNr ?? false;
      if ((c.label || "") !== (orig.label || "")) changes.label = c.label || null;
      const currOpts = JSON.stringify(c.optionsOverride || null);
      const origOpts = JSON.stringify(orig.optionsOverride || null);
      if (currOpts !== origOpts) changes.options_override = c.optionsOverride || null;
      if (Object.keys(changes).length > 0) {
        updates.push({ sqId: c._sqId, changes });
      }
    });

    // Reorder: comparar el orden de los _sqId actuales contra el snapshot
    // (filtrando los que se borraron). Si difieren, o si hay adds, reorder.
    const snapOrderRemaining = serverSnapshot
      .filter(s => currIds.has(s._sqId))
      .map(s => s._sqId);
    const currOrderExisting = selected
      .filter(c => c._sqId)
      .map(c => c._sqId);
    const reorderNeeded = adds.length > 0
      || JSON.stringify(snapOrderRemaining) !== JSON.stringify(currOrderExisting);

    return { deletes, adds, updates, reorderNeeded };
  };

  const saveEdits = async () => {
    if (!editMode || savingEdits || !dirty) return;

    // Validar demográficas con menos de 2 opciones (mismo guard que create)
    const demoSinOpciones = selected.find(q => q.isDemographic && (q.optionsOverride?.options?.length || 0) < 2);
    if (demoSinOpciones) return toast.error(`La demográfica "${demoSinOpciones.text}" necesita al menos 2 opciones`);

    setSavingEdits(true);
    const diff = computeEditsDiff();
    const addLocalToSqId = new Map(); // local item.id → nuevo SurveyQuestion.id

    try {
      // 1. PATCHes — campos editados sobre preguntas existentes
      for (const u of diff.updates) {
        await updateSurveyQuestion(editId, u.sqId, u.changes);
      }
      // 2. DELETEs — preguntas removidas
      for (const sqId of diff.deletes) {
        await deleteSurveyQuestion(editId, sqId);
      }
      // 3. POSTs — preguntas nuevas (del banco o custom)
      for (const a of diff.adds) {
        const payload = a.isCustom
          ? {
              question_bank_id: null,
              new_question_text: a.text,
              new_question_type: a.question_type,
              new_question_category: a.category,
              new_question_options: a.default_options,
              position: 1,
              scale_override: a.scaleOverride,
              is_required: a.required,
              is_demographic: a.isDemographic,
              allow_nsnr: a.allowNsNr || false,
              options_override: a.optionsOverride,
              custom_text: null,
              label: a.label || null,
            }
          : {
              question_bank_id: a.id,
              position: 1,
              scale_override: a.scaleOverride,
              is_required: a.required,
              is_demographic: a.isDemographic,
              allow_nsnr: a.allowNsNr || false,
              options_override: a.optionsOverride,
              custom_text: a.customText || null,
              label: a.label || null,
            };
        const created = await addQuestionToSurvey(editId, payload);
        addLocalToSqId.set(a.id, created.id);
      }
      // 4. Reorder — siempre que haya adds, deletes o cambio de orden
      if (diff.reorderNeeded || diff.deletes.length > 0) {
        const items = selected.map((c, i) => {
          const sqId = c._sqId || addLocalToSqId.get(c.id);
          return sqId ? { id: sqId, position: i + 1 } : null;
        }).filter(Boolean);
        if (items.length > 0) {
          await reorderSurveyQuestions(editId, items);
        }
      }
      // 5. Recargar para sincronizar snapshot con la realidad
      await reloadEditData();
      toast.success("Cambios guardados");
    } catch (err) {
      toast.error(err.message || "Error al guardar — recargando estado actual");
      // Recargar igual para que el usuario vea qué quedó persistido
      try { await reloadEditData(); } catch { /* noop */ }
    } finally {
      setSavingEdits(false);
    }
  };

  // Cantidad de cambios pendientes (para el badge del botón)
  const pendingChangesCount = (() => {
    if (!editMode || !dirty) return 0;
    const diff = computeEditsDiff();
    return diff.deletes.length + diff.adds.length + diff.updates.length + (diff.reorderNeeded ? 1 : 0);
  })();

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        ${globalKeyframes}
        .q-card { transition: all 0.18s ${t.ease}; }
        .q-card:hover { border-color: ${t.color.brandLineHover} !important; background: rgba(37,99,235,0.04) !important; }
        .q-card:hover button { background: ${t.color.brandHover} !important; }
        .cat-btn { transition: all 0.15s ease; }
        .cat-btn:hover { background: ${t.color.brandTint} !important; border-color: ${t.color.brandLineHover} !important; color: ${t.color.brand} !important; }
        .box-input:focus { border-color: ${t.color.brand} !important; }
        .tmpl-card { transition: all 0.2s ${t.ease}; cursor: pointer; }
        .tmpl-card:hover { transform: translateY(-2px); border-color: ${t.color.brandLineHover}; box-shadow: 0 10px 30px -16px rgba(37,99,235,0.25); }
        .tmpl-card:hover .tmpl-arrow { transform: translateX(3px); }
        .save-btn { transition: all 0.18s ${t.ease}; }
        .save-btn:not(:disabled):hover { background: ${t.color.brandHover} !important; box-shadow: 0 8px 24px -8px rgba(37,99,235,0.55); }
        .save-btn:not(:disabled):hover .save-arrow { transform: translateX(3px); }
        .save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .ghost-btn { transition: all 0.15s ease; }
        .ghost-btn:hover { background: ${t.color.brandTint}; border-color: ${t.color.brandLineHover}; color: ${t.color.brand} !important; }
        .icon-btn { transition: all 0.15s ease; }
        .icon-btn:hover { background: ${t.color.brandTint}; border-color: ${t.color.brandLineHover}; color: ${t.color.brand}; }
      `}</style>

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topBarInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button className="icon-btn" onClick={() => navigate(editMode ? `/surveys/${editId}` : "/surveys")} style={S.backBtn} aria-label="Volver">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={S.thinDivider} />
            <Logo variant="horizontal" size={11} color="#2563eb" />
            <span style={S.thinDivider} />
            <div>
              <div style={S.topMetaLine}>
                <span style={S.topMetaTag}>{editMode ? "EDITANDO" : "NUEVO"}</span>
                <span style={hairSpan} />
                <span style={S.topMetaValue}>{selected.length} {selected.length === 1 ? "PREGUNTA" : "PREGUNTAS"}</span>
                {editMode && editStatus && (
                  <>
                    <span style={hairSpan} />
                    <span style={{ ...S.topMetaValue, color: editStatus === "active" ? t.color.brand : editStatus === "closed" ? t.color.danger : t.color.mutedSoft }}>
                      {editStatus === "active" ? "PULSO ACTIVO" : editStatus === "closed" ? "PULSO CERRADO" : "BORRADOR"}
                    </span>
                  </>
                )}
              </div>
              <h1 style={S.topTitle}>{editMode ? (title || "Editar pulso") : "Crear pulso"}</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {editMode ? (
              <>
                <button
                  className="ghost-btn"
                  onClick={() => {
                    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) return;
                    navigate(`/surveys/${editId}`);
                  }}
                  style={S.ghostBtn}
                >
                  <span>Volver al pulso</span>
                </button>
                <button
                  className="save-btn"
                  onClick={saveEdits}
                  disabled={!dirty || savingEdits}
                  style={S.saveBtn}
                  title={!dirty ? "No hay cambios para guardar" : ""}
                >
                  <span className="save-arrow" style={S.saveArrow}>{savingEdits ? "…" : "►"}</span>
                  <span>{savingEdits ? "Guardando" : "Guardar ediciones"}</span>
                  {pendingChangesCount > 0 && !savingEdits && (
                    <span style={S.saveBadge}>{pendingChangesCount}</span>
                  )}
                </button>
              </>
            ) : (
              <>
                {!showTemplates && selected.length > 0 && (
                  <button className="ghost-btn" onClick={() => { setSelected([]); setShowTemplates(true); }} style={S.ghostBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    <span>Templates</span>
                  </button>
                )}
                <button className="save-btn" onClick={handleSave} disabled={saving || selected.length === 0} style={S.saveBtn}>
                  <span className="save-arrow" style={S.saveArrow}>{saving ? "…" : "►"}</span>
                  <span>{saving ? "Guardando" : `Guardar pulso (${selected.length})`}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={S.content}>
        {/* Banner editorial — sólo en edit mode */}
        {editMode && !editLoading && (
          <div style={{
            ...S.editBanner,
            background: editStatus === "active" ? "rgba(37,99,235,0.05)" : editStatus === "closed" ? "rgba(220,38,38,0.04)" : "rgba(153,153,153,0.06)",
            borderColor: editStatus === "active" ? t.color.brandLine : editStatus === "closed" ? t.color.dangerLine : "rgba(153,153,153,0.18)",
          }}>
            <span style={{ ...S.editBannerDot, background: editStatus === "active" ? t.color.brand : editStatus === "closed" ? t.color.danger : t.color.mutedSoft, animation: editStatus === "active" ? "pulseDot 2s ease infinite" : "none" }} />
            <span style={S.editBannerLabel}>
              {editStatus === "active" && "EDITANDO PULSO ACTIVO"}
              {editStatus === "closed" && "EDITANDO PULSO CERRADO"}
              {editStatus === "draft" && "EDITANDO BORRADOR"}
            </span>
            <span style={S.editBannerHint}>
              {editStatus === "active"
                ? "Los cambios se aplican en tiempo real. Las respuestas existentes se preservan."
                : editStatus === "closed"
                ? "El pulso ya no acepta respuestas, pero puedes afinar las preguntas para futuras reaperturas o reportes."
                : "Edita libremente — todavía no recibió respuestas."}
            </span>
          </div>
        )}
        {/* Config — sólo en create mode (en edit, la metadata se gestiona desde el detail page) */}
        {!editMode && (
        <div style={{ animation: "fadeUp 0.4s ease both", marginBottom: 24 }}>
          <div style={S.configWrap}>
            {/* Card header */}
            <div style={S.configHeader}>
              <div style={S.configHeaderIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <span style={S.configHeaderTitle}>Configuración del pulso</span>
            </div>

            {/* Fila 1: campos principales */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 0.9fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={S.configLabel}>Título del pulso</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Pulso Q1 2026" style={S.boxInput} />
              </div>
              <div>
                <label style={S.configLabel}>Organización</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej: Empresa ABC" style={S.boxInput} />
              </div>
              <div>
                <label style={S.configLabel}>Escala</label>
                <select value={scale} onChange={e => setScale(e.target.value)} style={S.boxSelect}>
                  <option value="likert_5">Likert 1-5</option>
                  <option value="likert_7">Likert 1-7</option>
                  <option value="likert_10">Likert 1-10</option>
                </select>
              </div>
              <div>
                <label style={S.configLabel}>Cierre automático</label>
                <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} style={{ ...S.boxSelect, colorScheme: "dark" }} />
                {closesAt && (
                  <button onClick={() => setClosesAt("")} style={{ background: "none", border: "none", fontSize: 11, color: "#475569", cursor: "pointer", padding: "4px 0 0", fontFamily: "inherit" }}>
                    Quitar fecha
                  </button>
                )}
              </div>
            </div>

            {/* Fila 2: color + logo + toggles */}
            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <label style={S.configLabel}>Color y logotipo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 32, height: 32, border: "none", borderRadius: 8, cursor: "pointer", padding: 0, flexShrink: 0 }} />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => {
                      let v = e.target.value.trim();
                      if (v && !v.startsWith("#")) v = "#" + v;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v);
                    }}
                    maxLength={7}
                    style={{ width: 74, fontSize: 12, color: "#94a3b8", fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 8px", outline: "none", background: "#070b1a" }}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <LogoInput value={logoUrl} onChange={setLogoUrl} inputStyle={{ ...S.boxInput, marginTop: 4, fontSize: 12 }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 4 }}>
                <ToggleSwitch
                  checked={showLabelsInForm}
                  onChange={e => setShowLabelsInForm(e.target.checked)}
                  label="Etiquetas en formulario"
                  description={'Las etiquetas (ej. "Liderazgo") aparecen en negrita sobre cada pregunta.'}
                />
              </div>
              <div style={{ paddingTop: 4 }}>
                <ToggleSwitch
                  checked={showPersonalReview}
                  onChange={e => setShowPersonalReview(e.target.checked)}
                  label="Mostrar review al final"
                  description="El respondente verá un ranking de sus respuestas Likert antes de finalizar."
                />
                {showPersonalReview && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ ...S.configLabel, display: "block", marginBottom: 4 }}>Vista en la review</label>
                    <select value={reviewQuestionDisplay} onChange={e => setReviewQuestionDisplay(e.target.value)} style={S.boxSelect}>
                      <option value="both">Etiqueta + afirmación</option>
                      <option value="label_only">Solo etiqueta</option>
                      <option value="text_only">Solo afirmación</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Templates section */}
        {showTemplates && selected.length === 0 && (
          <div style={{ animation: "fadeUp 0.4s ease 0.1s both", marginBottom: 32 }}>
            <div style={S.tmplHeader}>
              <span style={S.tmplTag}>TEMPLATES</span>
              <span style={hairSpan} />
              <span style={S.tmplCount}>{TEMPLATES.length} DISPONIBLES</span>
            </div>
            <h2 style={S.sectionH2}>Comenzar con un template</h2>
            <p style={S.sectionLead}>Selecciona un template prediseñado o arma tu pulso manualmente abajo.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 18 }}>
              {TEMPLATES.map(tmpl => (
                <div key={tmpl.id} className="tmpl-card" onClick={() => applyTemplate(tmpl)} style={S.tmplCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: t.radius.sharp, background: `${tmpl.color}10`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tmpl.color}22` }}>
                      <TemplateIcon type={tmpl.icon} color={tmpl.color} />
                    </div>
                    <h3 style={S.tmplName}>{tmpl.name}</h3>
                  </div>
                  <p style={S.tmplDesc}>{tmpl.description}</p>
                  <div style={S.tmplFooter}>
                    <span style={{ ...S.tmplCta, color: tmpl.color }}>Usar template</span>
                    <span className="tmpl-arrow" style={{ ...S.tmplArrow, color: tmpl.color }}>→</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={S.tmplDivider}>
              <div style={S.tmplDividerLine} />
              <span style={S.tmplDividerText}>O ARMA TU PULSO MANUALMENTE</span>
              <div style={S.tmplDividerLine} />
            </div>
          </div>
        )}

        {/* Two columns */}
        <div style={{ ...S.columns, animation: "fadeUp 0.4s ease 0.1s both" }}>
          {/* Bank */}
          <div>
            <div style={S.sectionHeader}>
              <div>
                <span style={S.sectionTag}>BANCO</span>
                <h2 style={S.sectionH3}>Banco de preguntas</h2>
              </div>
              <span style={S.sectionMeta}>{questions.length} DISPONIBLES</span>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                placeholder="Buscar preguntas…"
                style={{ width: "100%", padding: "9px 12px 9px 33px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "#0f172a", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#e2e8f0", boxSizing: "border-box" }}
              />
            </div>

            {/* Category pills with colored dots */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {categories.map((cat, ci) => {
                const on = filterCat === cat;
                const dotColor = cat === "Todas" ? "#94a3b8" : CAT_DOT_COLORS[(ci - 1) % CAT_DOT_COLORS.length];
                return (
                  <button key={cat} className="cat-btn" onClick={() => setFilterCat(cat)} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px 5px 9px",
                    borderRadius: 999,
                    fontFamily: t.font.body,
                    fontSize: 12,
                    fontWeight: on ? 600 : 400,
                    cursor: "pointer",
                    border: `1px solid ${on ? t.color.brand : "rgba(255,255,255,0.1)"}`,
                    background: on ? t.color.brandTint : "rgba(255,255,255,0.04)",
                    color: on ? t.color.brand : t.color.muted,
                    transition: "all 0.15s",
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? t.color.brand : dotColor, flexShrink: 0, opacity: on ? 1 : 0.7 }} />
                    {cat}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 620, overflowY: "auto", paddingRight: 4 }}>
              {filtered.map(q => {
                const isSel = !!selected.find(s => s.id === q.id);
                return (
                  <div key={q.id} className={isSel ? "" : "q-card"} onClick={() => !isSel && addQuestion(q)} style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: `1px solid ${isSel ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.07)"}`,
                    background: isSel ? "rgba(37,99,235,0.06)" : "#0f172a",
                    cursor: isSel ? "default" : "pointer",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: isSel ? "#475569" : "#e2e8f0", lineHeight: 1.45 }}>{q.text}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 12, background: TYPE_BG[q.question_type], color: TYPE_COLORS[q.question_type] }}>{TYPE_LABELS[q.question_type]}</span>
                        <span style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "#64748b" }}>{q.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (!isSel) addQuestion(q); }}
                      disabled={isSel}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", border: "none", flexShrink: 0, marginTop: 2,
                        background: isSel ? "rgba(37,99,235,0.15)" : "#2563eb",
                        cursor: isSel ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      {isSel
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      }
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Agregar pregunta personalizada */}
            <div style={{ marginTop: 12 }}>
              {!showCustomForm ? (
                <button onClick={() => setShowCustomForm(true)} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1.5px dashed rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.04)",
                  color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Agregar pregunta personalizada
                </button>
              ) : (
                <div style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(37,99,235,0.2)", background: "#0f172a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.4px" }}>Nueva pregunta</div>
                    <button onClick={() => setShowCustomForm(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: 16, padding: 0 }}>×</button>
                  </div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Etiqueta <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "#475569" }}>(opcional)</span></label>
                  <input
                    type="text"
                    value={customForm.label}
                    onChange={e => setCustomForm({ ...customForm, label: e.target.value })}
                    placeholder="Ej: Liderazgo, Comunicación, Trabajo en equipo..."
                    maxLength={100}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginTop: 4, marginBottom: 4 }}
                  />
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>
                    Aparece en negrita sobre el texto de la pregunta en el formulario. Útil para agrupar visualmente.
                  </div>
                  <textarea
                    value={customForm.text}
                    onChange={e => setCustomForm({ ...customForm, text: e.target.value })}
                    placeholder="Escribe el texto de la pregunta..."
                    style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 10 }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Tipo</label>
                      <select
                        value={customForm.type}
                        onChange={e => setCustomForm({ ...customForm, type: e.target.value })}
                        style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", marginTop: 4, background: "#0f172a", outline: "none" }}
                      >
                        <option value="likert">Likert</option>
                        <option value="nps">NPS</option>
                        <option value="open_text">Abierta</option>
                        <option value="yes_no">Dicotómica (Sí / No)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Categoría</label>
                      <select
                        value={customForm.category}
                        onChange={e => setCustomForm({ ...customForm, category: e.target.value })}
                        style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", marginTop: 4, background: "#0f172a", outline: "none" }}
                      >
                        <option value="">— selecciona —</option>
                        {categories.filter(c => c !== "Todas").map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__new__">+ Nueva categoría…</option>
                      </select>
                    </div>
                  </div>
                  {customForm.category === "__new__" && (
                    <input
                      value={customForm.newCategory}
                      onChange={e => setCustomForm({ ...customForm, newCategory: e.target.value })}
                      placeholder="Nombre de la nueva categoría"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                    />
                  )}
                  {customForm.type === "likert" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Etiqueta mínimo</label>
                        <input
                          value={customForm.minLabel}
                          onChange={e => setCustomForm({ ...customForm, minLabel: e.target.value })}
                          placeholder="Ej: Muy malo"
                          style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", marginTop: 4, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Etiqueta máximo</label>
                        <input
                          value={customForm.maxLabel}
                          onChange={e => setCustomForm({ ...customForm, maxLabel: e.target.value })}
                          placeholder="Ej: Excelente"
                          style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontFamily: "inherit", marginTop: 4, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  )}
                  <button onClick={submitCustomQuestion} style={{
                    width: "100%", padding: "9px 14px", borderRadius: 8,
                    border: "none", background: "linear-gradient(135deg, #2563eb, #2563eb)",
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>Agregar al pulso</button>
                </div>
              )}
            </div>
          </div>

          {/* Cart / Selected — sticky panel */}
          <div style={{ alignSelf: "start", position: "sticky", top: 88 }}>
            {/* Progress ring + Tu pulso header */}
            <div style={S.cartHeader}>
              <CircularProgress count={selected.length} />
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <div style={{ fontFamily: t.font.display, fontSize: 17, fontWeight: 700, color: t.color.ink, letterSpacing: "-0.015em" }}>Tu pulso</div>
                <div style={{ fontSize: 12, color: t.color.mutedSoft, marginTop: 3 }}>
                  {selected.length === 0
                    ? "Sin preguntas aún"
                    : `${selected.length} pregunta${selected.length !== 1 ? "s" : ""} seleccionada${selected.length !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>

            {/* Question list */}
            <div style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto", paddingRight: 2 }}>
              {selected.length === 0 ? (
                <div style={S.empty}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="13" x2="12" y2="17"/><line x1="10" y1="15" x2="14" y2="15"/>
                  </svg>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 10, lineHeight: 1.5 }}>Elige un template o haz click en una pregunta del banco</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selected.some(q => q.isDemographic) && (
                    <div>
                      <div style={S.selectedSectionHeader}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Demográficas (segmentan el dashboard)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selected.map((q, idx) => q.isDemographic && (
                          <SelectedQuestionCard
                            key={q.id} q={q} idx={idx} total={selected.length}
                            moveQuestion={moveQuestion} removeQuestion={removeQuestion}
                            toggleRequired={toggleRequired} toggleAllowNsNr={toggleAllowNsNr} setQuestionScale={setQuestionScale}
                            addOption={addOption} removeOption={removeOption}
                            editingId={editingId} setEditingId={setEditingId}
                            updateQuestionText={updateQuestionText}
                            updateQuestionLabel={updateQuestionLabel}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.some(q => !q.isDemographic) && (
                    <div>
                      {selected.some(q => q.isDemographic) && (
                        <div style={S.selectedSectionHeader}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                          Preguntas del pulso
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selected.map((q, idx) => !q.isDemographic && (
                          <SelectedQuestionCard
                            key={q.id} q={q} idx={idx} total={selected.length}
                            moveQuestion={moveQuestion} removeQuestion={removeQuestion}
                            toggleRequired={toggleRequired} toggleAllowNsNr={toggleAllowNsNr} setQuestionScale={setQuestionScale}
                            addOption={addOption} removeOption={removeOption}
                            editingId={editingId} setEditingId={setEditingId}
                            updateQuestionText={updateQuestionText}
                            updateQuestionLabel={updateQuestionLabel}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CTA button */}
            {!editMode && selected.length > 0 && (
              <button className="save-btn" onClick={handleSave} disabled={saving} style={{ ...S.saveBtn, width: "100%", justifyContent: "center", marginTop: 14, borderRadius: 12, padding: "13px 22px" }}>
                <span>{saving ? "Guardando…" : "Guardar y continuar →"}</span>
              </button>
            )}
            {editMode && (
              <button className="save-btn" onClick={saveEdits} disabled={!dirty || savingEdits} style={{ ...S.saveBtn, width: "100%", justifyContent: "center", marginTop: 14, borderRadius: 12, padding: "13px 22px" }}>
                <span>{savingEdits ? "Guardando…" : "Guardar ediciones →"}</span>
                {pendingChangesCount > 0 && !savingEdits && <span style={S.saveBadge}>{pendingChangesCount}</span>}
              </button>
            )}
          </div>
        </div>

        {/* Variables — sólo create mode (en edit las variables se gestionan desde el detail page) */}
        {!editMode && selected.some(q => q.question_type === "likert" || q.question_type === "nps") && (
          <div style={{ marginTop: 32, animation: "fadeUp 0.4s ease 0.15s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={S.sectionTitle}>Variables</h2>
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

            {/* Lista de variables creadas */}
            {variables.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: showVarForm ? 14 : 0 }}>
                {variables.map(v => {
                  const qs = v.questionIds.map(id => selected.find(s => s.id === id)).filter(Boolean);
                  return (
                    <div key={v.tempId} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "#0f172a", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{v.name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {qs.map(q => (
                            <span key={q.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "rgba(37,99,235,0.08)", color: "#2563eb", fontWeight: 500 }}>
                              {(q.customText || q.text).slice(0, 60)}{(q.customText || q.text).length > 60 ? "…" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => removeVariable(v.tempId)} title="Eliminar variable"
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "#475569", fontSize: 18, padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#dc2626"}
                        onMouseLeave={e => e.currentTarget.style.color = "#b7b7b7"}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulario inline */}
            {showVarForm && (() => {
              const numericQs = selected.filter(q => q.question_type === "likert" || q.question_type === "nps");
              const firstSelected = numericQs.find(q => varForm.selectedIds.includes(q.id));
              const lockedScale = firstSelected ? getEffectiveScale(firstSelected) : null;

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
                      const qScale = getEffectiveScale(q);
                      const isChecked = varForm.selectedIds.includes(q.id);
                      const disabled = lockedScale && lockedScale !== qScale && !isChecked;
                      const scaleLabel = qScale === "nps_10" ? "NPS" : qScale.replace("likert_", "1-");
                      return (
                        <label key={q.id}
                          title={disabled ? "Escala distinta — no se puede mezclar en la misma variable" : ""}
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
                            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>{q.customText || q.text}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: TYPE_BG[q.question_type], color: TYPE_COLORS[q.question_type] }}>{TYPE_LABELS[q.question_type]}</span>
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

      {/* Modal de confirmación al eliminar pregunta en edit mode */}
      {showRemoveModal && (
        <div style={S.modalOverlay} onClick={() => setShowRemoveModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTag}>
              <span style={hairSpan} />
              <span>ELIMINAR PREGUNTA</span>
              <span style={hairSpan} />
            </div>
            <h2 style={S.modalTitle}>{showRemoveModal.text}</h2>
            <div style={S.modalMetaList}>
              {(showRemoveModal.responseCount || 0) > 0 && (
                <div style={S.modalMetaRow}>
                  <span style={S.modalMetaLabel}>RESPUESTAS A BORRAR</span>
                  <span style={{ ...S.modalMetaValue, color: t.color.danger }}>{showRemoveModal.responseCount}</span>
                </div>
              )}
              <div style={S.modalMetaRow}>
                <span style={S.modalMetaLabel}>TIPO</span>
                <span style={S.modalMetaValue}>{showRemoveModal.question_type?.toUpperCase()}</span>
              </div>
            </div>
            <p style={S.modalBody}>
              {(showRemoveModal.responseCount || 0) > 0
                ? "Las respuestas asociadas a esta pregunta se eliminan junto con ella. El resto del pulso y sus reportes no se afectan."
                : "Esta pregunta todavía no tiene respuestas. Eliminarla no afecta a ningún reporte."}
            </p>
            {editStatus === "active" && (
              <div style={S.modalWarning}>
                <strong style={{ color: t.color.danger }}>Cuidado:</strong> si un respondente está completando la encuesta justo ahora, su envío fallará y deberá empezar de nuevo. Considera cerrar el pulso antes.
              </div>
            )}
            <div style={S.modalActions}>
              <button onClick={() => setShowRemoveModal(null)} style={S.ghostBtn}>Cancelar</button>
              <button onClick={confirmRemoveQuestion} style={S.dangerSolidBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                <span>Eliminar pregunta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function SelectedQuestionCard({ q, idx, total, moveQuestion, removeQuestion, toggleRequired, toggleAllowNsNr, setQuestionScale, addOption, removeOption, editingId, setEditingId, updateQuestionText, updateQuestionLabel }) {
  const [newOption, setNewOption] = useState("");
  const options = q.optionsOverride?.options || [];
  const bgColor = q.isDemographic ? "rgba(124,58,237,0.1)" : "rgba(37,99,235,0.1)";
  const fgColor = q.isDemographic ? "#7c3aed" : "#2563eb";
  const isEditing = editingId === q.id;
  const isEditingLabel = editingId === `label-${q.id}`;
  const displayText = q.customText || q.text;
  const hasCustomText = !q.isCustom && !!q.customText;
  const hasLabel = !!(q.label && q.label.trim());

  const submitOption = () => {
    addOption(idx, newOption);
    setNewOption("");
  };

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: bgColor, color: fgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{idx + 1}</div>
        <div style={{ flex: 1 }}>
          {/* Etiqueta opcional (en negrita arriba de la pregunta en el público) */}
          {(hasLabel || isEditingLabel) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {isEditingLabel ? (
                <input
                  autoFocus
                  type="text"
                  value={q.label || ""}
                  onChange={e => updateQuestionLabel(idx, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setEditingId(null); } }}
                  placeholder="Ej: Liderazgo"
                  maxLength={100}
                  style={{ fontSize: 12, padding: "3px 8px", borderRadius: 5, border: `1.5px solid ${fgColor}`, fontFamily: "inherit", outline: "none", fontWeight: 700, color: fgColor, background: "#0f172a", maxWidth: 220 }}
                />
              ) : (
                <span
                  onClick={() => setEditingId(`label-${q.id}`)}
                  title="Click para editar la etiqueta"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: fgColor, padding: "2px 8px", borderRadius: 5, background: bgColor, cursor: "pointer", letterSpacing: "0.2px" }}
                >
                  {q.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </span>
              )}
              {hasLabel && !isEditingLabel && (
                <button
                  onClick={() => updateQuestionLabel(idx, "")}
                  title="Quitar etiqueta"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#475569", fontSize: 14, padding: "0 2px", lineHeight: 1 }}
                >×</button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setEditingId(`label-${q.id}`)}
              title="Agregar una etiqueta que aparezca en negrita sobre la pregunta"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#475569", fontSize: 10.5, fontWeight: 600, padding: "0 0 4px", letterSpacing: "0.3px", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 3 }}
              onMouseEnter={e => e.currentTarget.style.color = fgColor}
              onMouseLeave={e => e.currentTarget.style.color = "#b7b7b7"}
            >
              + Etiqueta
            </button>
          )}

          {isEditing ? (
            <div>
              <textarea
                autoFocus
                value={displayText}
                onChange={e => updateQuestionText(idx, e.target.value)}
                onBlur={() => setEditingId(null)}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setEditingId(null); } }}
                style={{ width: "100%", minHeight: 48, padding: 8, borderRadius: 6, border: `1.5px solid ${fgColor}`, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#e2e8f0", lineHeight: 1.45 }}
              />
              <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Click fuera para confirmar · Ctrl+Enter</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.45, flex: 1 }}>
                {displayText}
                {hasCustomText && <span title="Texto editado solo para este pulso" style={{ fontSize: 9, color: "#f59e0b", marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "rgba(245,158,11,0.1)", fontWeight: 600, letterSpacing: "0.3px" }}>editado</span>}
              </div>
              <button onClick={() => setEditingId(q.id)} title="Editar texto para este pulso" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2, color: "#475569", display: "flex", alignItems: "center" }}
                onMouseEnter={e => e.currentTarget.style.color = fgColor} onMouseLeave={e => e.currentTarget.style.color = "#b7b7b7"}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
            {(() => {
              const tk = isYesNoQuestion(q) ? "yes_no" : q.question_type;
              return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: TYPE_BG[tk], color: TYPE_COLORS[tk] }}>{TYPE_LABELS[tk]}</span>;
            })()}
            {q.question_type === "likert" && (
              <select
                value={q.scaleOverride || "default"}
                onChange={e => setQuestionScale(idx, e.target.value)}
                disabled={(q.responseCount || 0) > 0}
                title={(q.responseCount || 0) > 0 ? "Pregunta con respuestas — la escala no se puede modificar (duplica el pulso para cambiarla)" : ""}
                style={{
                  fontSize: 11, padding: "2px 6px", borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: (q.responseCount || 0) > 0 ? "#f0f0f0" : "#fafafa",
                  fontFamily: "inherit",
                  color: (q.responseCount || 0) > 0 ? "#bbb" : "#595959",
                  cursor: (q.responseCount || 0) > 0 ? "not-allowed" : "pointer",
                }}
              >
                <option value="default">Escala por defecto</option>
                <option value="likert_5">Likert 1-5</option>
                <option value="likert_7">Likert 1-7</option>
                <option value="likert_10">Likert 1-10</option>
              </select>
            )}
            <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#64748b", cursor: "pointer" }}>
              <input type="checkbox" checked={q.required} onChange={() => toggleRequired(idx)} style={{ width: 13, height: 13, accentColor: "#2563eb" }} />
              Obligatoria
            </label>
            {q.question_type === "likert" && (
              <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#64748b", cursor: "pointer" }} title="Agrega un botón 'No sabe / No responde' en la encuesta. Esas respuestas no entran al promedio.">
                <input type="checkbox" checked={!!q.allowNsNr} onChange={() => toggleAllowNsNr(idx)} style={{ width: 13, height: 13, accentColor: "#2563eb" }} />
                Permite "No sabe / No responde"
              </label>
            )}
          </div>

          {q.question_type === "single_choice" && q.isDemographic && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#070b1a", borderRadius: 8, border: "1px dashed rgba(124,58,237,0.25)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Opciones ({options.length})
              </div>
              {options.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {options.map((opt, optIdx) => (
                    <span key={optIdx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 14, background: "rgba(124,58,237,0.1)", color: "#7c3aed", fontSize: 12, fontWeight: 500 }}>
                      {opt}
                      <button onClick={() => removeOption(idx, optIdx)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#7c3aed", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitOption(); } }}
                  placeholder="Escribe una opción y presiona Enter"
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#0f172a" }}
                />
                <button onClick={submitOption} disabled={!newOption.trim()}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: newOption.trim() ? "#7c3aed" : "#e0e0e0", color: "#fff", fontSize: 12, fontWeight: 600, cursor: newOption.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                  Agregar
                </button>
              </div>
            </div>
          )}
          {q.question_type === "single_choice" && !q.isDemographic && q.default_options?.options && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {q.default_options.options.map((opt, i) => (
                <span key={i} style={{ padding: "3px 10px", borderRadius: 12, background: "rgba(14,165,233,0.1)", color: "#0369a1", fontSize: 11, fontWeight: 500 }}>{opt}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
          <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} style={{ border: "none", background: "transparent", cursor: idx > 0 ? "pointer" : "default", padding: 2, color: idx > 0 ? "#999" : "#e0e0e0", fontSize: 14 }}>▲</button>
          <button onClick={() => moveQuestion(idx, 1)} disabled={idx === total - 1} style={{ border: "none", background: "transparent", cursor: idx < total - 1 ? "pointer" : "default", padding: 2, color: idx < total - 1 ? "#999" : "#e0e0e0", fontSize: 14 }}>▼</button>
        </div>
        <button onClick={() => removeQuestion(q.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#475569", fontSize: 14 }}
          onMouseEnter={e => e.target.style.color = "#dc2626"} onMouseLeave={e => e.target.style.color = "#b7b7b7"}>✕</button>
      </div>
    </div>
  );
}

const S = {
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
    padding: "14px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  thinDivider: {
    width: 1, height: 16,
    background: "rgba(37,99,235,0.2)",
    display: "inline-block",
  },
  backBtn: {
    width: 30, height: 30,
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: t.color.brand,
  },
  topMetaLine: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  topMetaTag: {
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  topMetaValue: {
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  topTitle: {
    fontFamily: t.font.display,
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: t.color.ink,
    letterSpacing: t.track.tight,
    lineHeight: 1.05,
  },

  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 22px",
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
  saveArrow: {
    fontFamily: t.font.display,
    fontSize: 11,
    color: "#5fd6d6",
    lineHeight: 1,
    display: "inline-block",
    transition: `transform 0.2s ${t.ease}`,
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 14px",
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
  },

  // ── Content ──
  content: { maxWidth: 1400, margin: "0 auto", padding: "32px 32px 32px" },

  // ── Config unified card ──
  configWrap: {
    background: t.color.surface,
    borderRadius: 16,
    padding: "20px 24px",
    border: t.hairline,
  },
  configHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  configHeaderIcon: {
    width: 28, height: 28, borderRadius: 8,
    background: "rgba(37,99,235,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  configHeaderTitle: {
    fontFamily: t.font.display,
    fontSize: 13,
    fontWeight: 700,
    color: t.color.ink,
    letterSpacing: "-0.01em",
  },
  configLabel: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  },
  boxInput: {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${t.color.borderStrong}`,
    borderRadius: 10,
    background: t.color.paper,
    fontSize: 14,
    fontFamily: t.font.body,
    outline: "none",
    color: t.color.ink,
    fontWeight: 500,
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  boxSelect: {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${t.color.borderStrong}`,
    borderRadius: 10,
    background: t.color.paper,
    fontSize: 13,
    fontFamily: t.font.body,
    outline: "none",
    color: t.color.ink,
    boxSizing: "border-box",
  },
  // legacy — keep for SelectedQuestionCard inline usage
  label: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  inputLine: {
    width: "100%",
    padding: "10px 0",
    border: "none",
    borderBottom: `1.5px solid ${t.color.brandLine}`,
    background: "transparent",
    fontSize: 15,
    outline: "none",
    marginTop: 6,
    fontFamily: t.font.body,
    color: t.color.ink,
    fontWeight: 500,
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${t.color.brandLine}`,
    borderRadius: t.radius.sharp,
    background: t.color.surface,
    fontSize: 13,
    marginTop: 8,
    fontFamily: t.font.body,
    outline: "none",
    color: t.color.ink,
  },

  // ── Columns layout ──
  columns: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 24 },

  // ── Cart (selected) panel ──
  cartHeader: {
    background: t.color.surface,
    borderRadius: 16,
    border: t.hairline,
    padding: "22px 20px 18px",
    marginBottom: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  // ── Section headers ──
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: t.hairline,
    gap: 14,
  },
  sectionTag: {
    display: "block",
    fontFamily: t.font.display,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sectionH2: {
    fontFamily: t.font.display,
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    color: t.color.ink,
    letterSpacing: t.track.tight,
    lineHeight: 1.1,
  },
  sectionH3: {
    fontFamily: t.font.display,
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
    color: t.color.ink,
    letterSpacing: "-0.015em",
  },
  sectionLead: {
    fontSize: 13,
    color: t.color.mutedSoft,
    margin: "8px 0 0",
    lineHeight: 1.5,
  },
  sectionMeta: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  // legacy alias — algunas partes del archivo todavía lo referencian
  sectionTitle: {
    fontFamily: t.font.display,
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
    color: t.color.ink,
    letterSpacing: "-0.015em",
  },
  selectedSectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    color: t.color.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // ── Templates ──
  tmplHeader: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  tmplTag: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.brand,
    textTransform: "uppercase",
  },
  tmplCount: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  tmplCard: {
    background: t.color.surface,
    borderRadius: t.radius.card,
    padding: "20px 22px",
    border: t.hairline,
    position: "relative",
    overflow: "hidden",
  },
  tmplName: {
    fontFamily: t.font.display,
    fontSize: 14.5,
    fontWeight: 700,
    margin: 0,
    color: t.color.ink,
    letterSpacing: "-0.01em",
    lineHeight: 1.25,
  },
  tmplDesc: {
    fontSize: 12,
    color: t.color.mutedSoft,
    margin: 0,
    lineHeight: 1.55,
  },
  tmplFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: t.hairlineSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tmplCta: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    textTransform: "uppercase",
  },
  tmplArrow: {
    fontSize: 16,
    transition: `transform 0.2s ${t.ease}`,
    display: "inline-block",
  },
  tmplDivider: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    margin: "32px 0 12px",
  },
  tmplDividerLine: {
    flex: 1, height: 1,
    background: t.color.brandLineSoft,
  },
  tmplDividerText: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },

  empty: {
    padding: 48,
    borderRadius: t.radius.card,
    border: `1px dashed ${t.color.brandLine}`,
    textAlign: "center",
  },

  // ── Edit mode ──
  editBanner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    borderRadius: t.radius.card,
    border: "1px solid",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  editBannerDot: {
    width: 8, height: 8, borderRadius: "50%",
    flexShrink: 0,
  },
  editBannerLabel: {
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: t.track.widest,
    color: t.color.ink,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  editBannerHint: {
    fontFamily: t.font.body,
    fontSize: 12.5,
    color: t.color.muted,
    lineHeight: 1.5,
    flex: 1,
    minWidth: 240,
  },
  saveBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
    height: 18,
    padding: "0 6px",
    marginLeft: 4,
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    fontFamily: t.font.display,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: t.track.normal,
  },

  // Modal de eliminación
  modalOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(255,255,255,0.4)",
    backdropFilter: "blur(3px)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    background: t.color.surface,
    borderRadius: t.radius.card,
    padding: "32px 32px 28px",
    maxWidth: 480,
    width: "100%",
    border: t.hairline,
    boxShadow: "0 30px 80px -20px rgba(255,255,255,0.25)",
    fontFamily: t.font.body,
  },
  modalTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: t.track.technical,
    color: t.color.danger,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontFamily: t.font.display,
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 20px",
    color: t.color.ink,
    letterSpacing: t.track.tight,
    lineHeight: 1.2,
  },
  modalMetaList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 0",
    borderTop: t.hairlineSoft,
    borderBottom: t.hairlineSoft,
    marginBottom: 16,
  },
  modalMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  modalMetaLabel: {
    fontFamily: t.font.display,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: t.track.widest,
    color: t.color.mutedSoft,
    textTransform: "uppercase",
  },
  modalMetaValue: {
    fontFamily: t.font.display,
    fontSize: 14,
    fontWeight: 700,
    color: t.color.ink,
    letterSpacing: t.track.tight,
  },
  modalBody: {
    fontSize: 13,
    color: t.color.muted,
    lineHeight: 1.6,
    margin: "0 0 16px",
  },
  modalWarning: {
    padding: "12px 14px",
    borderRadius: t.radius.sharp,
    background: "rgba(220,38,38,0.05)",
    border: `1px solid ${t.color.dangerLine}`,
    fontSize: 12.5,
    color: t.color.muted,
    lineHeight: 1.55,
    marginBottom: 22,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  dangerSolidBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: t.radius.sharp,
    border: "none",
    background: t.color.danger,
    color: "#fff",
    fontFamily: t.font.display,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: t.track.wider,
    textTransform: "uppercase",
    cursor: "pointer",
  },
};
