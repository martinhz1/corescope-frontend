/**
 * api.js — Cliente para comunicarse con el backend FastAPI.
 *
 * Centraliza todas las llamadas a la API en un solo lugar.
 * Maneja automáticamente el token JWT en cada request.
 */

import { API_URL } from "./config";

export { API_URL };

/**
 * Resuelve un URL de imagen para usar en <img src>. Si es absoluto
 * (http/https/data:) lo devuelve como está; si es relativo a la API
 * (/api/uploads/...) le antepone API_URL.
 */
export function resolveImageUrl(url) {
  if (!url) return url;
  if (/^(https?:|data:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_URL}${url}`;
  return url;
}

// ─── Token management ──────────────────────────────────────────────────

let token = localStorage.getItem("token");

export function setToken(newToken) {
  token = newToken;
  if (newToken) {
    localStorage.setItem("token", newToken);
  } else {
    localStorage.removeItem("token");
  }
}

export function getToken() {
  return token;
}

export function isAuthenticated() {
  return !!token;
}

export function logout() {
  setToken(null);
  localStorage.removeItem("user");
  window.location.href = "/";
}

// ─── User info ─────────────────────────────────────────────────────────

export function setUser(name, picture) {
  localStorage.setItem("user", JSON.stringify({ name, picture: picture || null }));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

// ─── Base fetch wrapper ────────────────────────────────────────────────

async function apiFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detail = error.detail;
    let message;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail.map(e => `${e.loc?.slice(-1)[0] ?? "campo"}: ${e.msg}`).join(" | ");
    } else {
      message = "Error en el servidor";
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  setUser(data.user_name, null);
  return data;
}

export async function googleLogin(credential) {
  const data = await apiFetch("/api/auth/google-login", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  setToken(data.access_token);
  setUser(data.user_name, data.user_picture);
  return data;
}

export async function register(email, name, password) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name, password }),
  });
}

// ─── Questions ─────────────────────────────────────────────────────────

export async function getQuestions(category = null) {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch(`/api/questions/${params}`);
}

// ─── Surveys ───────────────────────────────────────────────────────────

export async function createSurvey(surveyData) {
  return apiFetch("/api/surveys/", {
    method: "POST",
    body: JSON.stringify(surveyData),
  });
}

export async function getMySurveys() {
  return apiFetch("/api/surveys/");
}

export async function getSurvey(id) {
  return apiFetch(`/api/surveys/${id}`);
}

export async function updateSurvey(id, data) {
  return apiFetch(`/api/surveys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function publishSurvey(id) {
  return apiFetch(`/api/surveys/${id}/publish`, {
    method: "POST",
  });
}

export async function closeSurvey(id) {
  return apiFetch(`/api/surveys/${id}/close`, {
    method: "POST",
  });
}

export async function reopenSurvey(id) {
  return apiFetch(`/api/surveys/${id}/reopen`, {
    method: "POST",
  });
}

export async function deleteSurvey(id) {
  return apiFetch(`/api/surveys/${id}`, {
    method: "DELETE",
  });
}

export async function clearSurveyResponses(id, confirmTitle) {
  return apiFetch(`/api/surveys/${id}/clear-responses`, {
    method: "POST",
    body: JSON.stringify({ confirm_title: confirmTitle }),
  });
}

export async function duplicateSurvey(id) {
  return apiFetch(`/api/surveys/${id}/duplicate`, {
    method: "POST",
  });
}

// ─── Uploads (logos) ───────────────────────────────────────────────────

/**
 * Sube un File (imagen) como logo. Devuelve { id, url, mime_type, size_bytes }
 * con `url` = '/api/uploads/{id}' (relativo, usar resolveImageUrl para <img>).
 */
export async function uploadLogo(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/api/uploads/logo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    let detail = "Error al subir el archivo";
    try { const data = await res.json(); detail = data.detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}


// ─── Survey questions + variables ──────────────────────────────────────

export async function getSurveyQuestions(surveyId) {
  return apiFetch(`/api/surveys/${surveyId}/questions`);
}

export async function getSurveyVariables(surveyId) {
  return apiFetch(`/api/surveys/${surveyId}/variables`);
}

export async function createVariable(surveyId, data) {
  return apiFetch(`/api/surveys/${surveyId}/variables`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteVariable(surveyId, variableId) {
  return apiFetch(`/api/surveys/${surveyId}/variables/${variableId}`, {
    method: "DELETE",
  });
}

export async function updateQuestionDashboardVisibility(surveyId, questionId, isPublic) {
  return apiFetch(`/api/surveys/${surveyId}/questions/${questionId}/dashboard-visibility`, {
    method: "PATCH",
    body: JSON.stringify({ is_public_in_dashboard: isPublic }),
  });
}

// ─── Survey question editing (edit mode of a published pulso) ──────────

export async function addQuestionToSurvey(surveyId, payload) {
  return apiFetch(`/api/surveys/${surveyId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSurveyQuestion(surveyId, sqId, payload) {
  return apiFetch(`/api/surveys/${surveyId}/questions/${sqId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSurveyQuestion(surveyId, sqId) {
  return apiFetch(`/api/surveys/${surveyId}/questions/${sqId}`, {
    method: "DELETE",
  });
}

export async function reorderSurveyQuestions(surveyId, items) {
  return apiFetch(`/api/surveys/${surveyId}/questions/reorder`, {
    method: "PUT",
    body: JSON.stringify(items),
  });
}

// ─── Public (respondents) ──────────────────────────────────────────────

export async function getPublicSurvey(token) {
  return apiFetch(`/api/public/s/${token}`);
}

export async function submitResponse(token, answers) {
  return apiFetch(`/api/public/s/${token}`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
