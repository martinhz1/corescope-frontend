/**
 * Logo.jsx — Logo de CoreScope.
 *
 * Dos versiones según el background de la superficie donde aparece:
 *  - variant="dark" (default) — logo con texto blanco para usar sobre fondos
 *    oscuros (la plataforma usa dark theme por defecto). Archivo: Logo-CoreScope.png
 *  - variant="light" — logo con texto navy para usar sobre fondos claros
 *    (ej: el reporte PDF, hojas exportadas). Archivo: logo-corescope-fondoblanco.png
 *
 * Props:
 *  - variant: "dark" (default) | "light"
 *  - size: altura del logo en pixels. El ancho se calcula automático.
 *  - color: deprecado — la imagen tiene sus propios colores fijos.
 */
export default function Logo({ variant = "dark", size = 24, color }) {
  // eslint-disable-next-line no-unused-vars
  void color;
  const src = variant === "light"
    ? "/logo-corescope-fondoblanco.png"
    : "/Logo-CoreScope.png";
  return (
    <img
      src={src}
      alt="CoreScope"
      style={{
        height: size,
        width: "auto",
        display: "inline-block",
        userSelect: "none",
      }}
      draggable={false}
    />
  );
}
