/**
 * qrExport.js — Helper para copiar/descargar el QR de una encuesta.
 *
 * Toma el <svg> renderizado por QRCodeSVG (de qrcode.react), lo serializa,
 * lo rasteriza a un PNG cuadrado a alta resolución (1080x1080 con padding
 * blanco para que se vea bien al pegarlo en una slide) y lo copia al
 * portapapeles del usuario.
 *
 * Si el navegador no soporta `ClipboardItem` con imágenes (Firefox sin flag,
 * navegadores viejos), cae a descargar el PNG.
 *
 * Devuelve { copied: true } si llegó al clipboard, o { copied: false } si
 * fue por download. Errores los re-lanza el caller.
 */

const DEFAULT_SIZE = 1080;
const PADDING_RATIO = 0.08; // 8% de margen blanco alrededor del QR

export async function copyQRImage(svgElement, filename = "qr.png", size = DEFAULT_SIZE) {
  if (!svgElement) throw new Error("No se encontró el QR en la página");

  // Serializar el SVG ya renderizado
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    // Cargar el SVG como Image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Error cargando el QR"));
      img.src = svgUrl;
    });

    // Pintarlo en canvas con fondo blanco + padding (queda más limpio en slides)
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const pad = Math.round(size * PADDING_RATIO);
    ctx.imageSmoothingEnabled = false; // QRs nítidos sin antialiasing
    ctx.drawImage(img, pad, pad, size - 2 * pad, size - 2 * pad);

    // Generar el blob PNG
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falló la generación del PNG")), "image/png");
    });

    // Intentar copiar al clipboard (HTTPS + navegador moderno)
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob })
        ]);
        return { copied: true };
      } catch {
        // Cae al fallback de download
      }
    }

    // Fallback: descargar el PNG
    const dlUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
    return { copied: false };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
