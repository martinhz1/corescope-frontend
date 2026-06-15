// API_URL del backend. Se inyecta en build time vía VITE_API_URL en Vercel/Railway.
// El fallback de localhost permite levantar el frontend sin backend en dev sin romper imports.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
