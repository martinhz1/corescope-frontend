/**
 * chartExport.js — Helpers para exportar charts del dashboard como PNG.
 *
 * Patrón heredado de perfilesMatrixExport.js: el llamador construye un SVG
 * inline con el chart, este módulo lo rasteriza a PNG a 3x DPI y lo copia
 * al portapapeles (con fallback a download). Sin dependencias externas.
 *
 * Las fuentes Google del navegador no se transfieren al rasterizar SVG, así
 * que los chart builders deben usar el stack `FONT` (system fonts).
 */
import toast from "react-hot-toast";

// Stack de fuentes consistente con perfilesMatrixExport. Sistema solamente:
// las Google Fonts del navegador no llegan al canvas vía SVG.
export const FONT = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// 3x DPI: suficiente nitidez para Google Slides incluso con zoom.
const DEFAULT_SCALE = 3;

export function escapeXML(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Toma un SVG string + sus dimensiones y lo rasteriza a PNG.
 * Intenta copiar al clipboard; si falla (Firefox sin permiso, http, etc.)
 * dispara un download.
 *
 * Devuelve { copied: true } si llegó al clipboard, { copied: false } si
 * fue por download. Errores los re-lanza el caller para que muestre toast.
 */
export async function exportSvgAsPng(svgString, width, height, filename, scale = DEFAULT_SCALE) {
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Error cargando el SVG"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    // Fondo blanco — la mayoría de slides son blancas y un transparente
    // se ve raro al pegar.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falló la generación del PNG")), "image/png");
    });

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
        return { copied: true };
      } catch {
        // Cae al download
      }
    }

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

/**
 * Wrapper para exportar con feedback toast estándar. Llamar desde el handler
 * del botón directamente. Acepta `{ svg, width, height }` (lo que devuelven
 * los builders) o argumentos posicionales (compatibilidad).
 */
export async function handleExport(svgOrBundle, widthOrFilename, heightOrUndef, filenameOrUndef) {
  let svgString, width, height, filename;
  if (svgOrBundle && typeof svgOrBundle === "object" && svgOrBundle.svg) {
    ({ svg: svgString, width, height } = svgOrBundle);
    filename = widthOrFilename;
  } else {
    svgString = svgOrBundle;
    width = widthOrFilename;
    height = heightOrUndef;
    filename = filenameOrUndef;
  }
  try {
    const { copied } = await exportSvgAsPng(svgString, width, height, filename);
    toast.success(copied ? "Imagen copiada al portapapeles" : "Imagen descargada");
  } catch (err) {
    toast.error(err?.message || "Error al exportar la imagen");
  }
}

/**
 * Wrappea un texto a líneas según un máximo aproximado de chars por línea.
 * SVG no auto-wrappea texto, así que necesitamos esto para el header de cada chart.
 */
function wrapTextLines(text, maxCharsPerLine) {
  const words = (text || "").trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 <= maxCharsPerLine) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Construye el SVG para un LikertChart (pregunta de escala) — incluye:
 * - Texto de la pregunta (wrap a 2 líneas máximo)
 * - % favorable grande con label adaptativo + N
 * - Barra apilada 100% con segmentos favorable/neutral/desfavorable
 * - Leyenda con swatches
 *
 * Las dimensiones (1600x560) están pensadas para slides 16:9 — el chart
 * ocupa una banda horizontal cómoda.
 */
export function buildLikertChartSvg({
  questionText,
  surveyColor,
  fav,                       // { favorablePct, neutralPct, unfavorablePct, favorable, neutral, unfavorable, total }
  scaleLabels,               // { positive, neutral, negative }
  neutralBg = "#cbd5e1",
  neutralText = "#334155",
  unfavorableBg = "#475569",
}) {
  const W = 1600;
  const H = 560;
  const PAD = 60;
  const BAR_Y = 360;
  const BAR_H = 90;
  const BAR_X = PAD;
  const BAR_W = W - 2 * PAD;

  // Likert-7 subdivide la zona neutral en dos segmentos (neutral alto / absoluto)
  const segments = fav.hasMidSplit
    ? [
        { pct: fav.favorablePct, count: fav.favorable, bg: surveyColor, textColor: "#ffffff", opacity: 1 },
        { pct: fav.neutralHighPct, count: fav.neutralHigh, bg: surveyColor, textColor: neutralText, opacity: 0.5 },
        { pct: fav.neutralLowPct, count: fav.neutralLow, bg: neutralBg, textColor: neutralText, opacity: 1 },
        { pct: fav.unfavorablePct, count: fav.unfavorable, bg: unfavorableBg, textColor: "#ffffff", opacity: 1 },
      ]
    : [
        { pct: fav.favorablePct, count: fav.favorable, bg: surveyColor, textColor: "#ffffff", opacity: 1 },
        { pct: fav.neutralPct, count: fav.neutral, bg: neutralBg, textColor: neutralText, opacity: 1 },
        { pct: fav.unfavorablePct, count: fav.unfavorable, bg: unfavorableBg, textColor: "#ffffff", opacity: 1 },
      ];
  let cursorX = BAR_X;
  const segLayout = segments.map(s => {
    const w = (s.pct / 100) * BAR_W;
    const layout = { ...s, x: cursorX, w };
    cursorX += w;
    return layout;
  });
  const visibleSegs = segLayout.filter(s => s.pct > 0);

  const favPct = Math.round(fav.favorablePct);
  const validResp = fav.total;

  // Question text — 2 líneas max, ellipsis si se pasa
  const allLines = wrapTextLines(questionText, 70);
  const textLines = allLines.slice(0, 2);
  if (allLines.length > 2) {
    textLines[1] = textLines[1].replace(/\s\S*$/, "") + "…";
  }

  // Leyenda centrada al pie
  const LEGEND_Y = BAR_Y + BAR_H + 50;
  const legendItems = fav.hasMidSplit
    ? [
        { label: scaleLabels.positive, bg: surveyColor, opacity: 1 },
        { label: "Neutral alto", bg: surveyColor, opacity: 0.5 },
        { label: scaleLabels.neutral, bg: neutralBg, opacity: 1 },
        { label: scaleLabels.negative, bg: unfavorableBg, opacity: 1 },
      ]
    : [
        { label: scaleLabels.positive, bg: surveyColor, opacity: 1 },
        { label: scaleLabels.neutral, bg: neutralBg, opacity: 1 },
        { label: scaleLabels.negative, bg: unfavorableBg, opacity: 1 },
      ];
  const SWATCH_SIZE = 18;
  const GAP_SWATCH_TEXT = 10;
  const GAP_BETWEEN = 44;
  // Ancho aproximado por item (char ≈ 11px a fontSize 20)
  const itemWidths = legendItems.map(it => SWATCH_SIZE + GAP_SWATCH_TEXT + it.label.length * 11);
  const totalLegendWidth = itemWidths.reduce((a, b) => a + b, 0) + GAP_BETWEEN * (legendItems.length - 1);
  let cursorLegend = (W - totalLegendWidth) / 2;
  const legendXs = itemWidths.map(w => {
    const x = cursorLegend;
    cursorLegend += w + GAP_BETWEEN;
    return x;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${textLines.map((line, i) => `
  <text x="${PAD}" y="${PAD + 40 + i * 44}" font-size="32" fill="#1f2937" font-weight="500">${escapeXML(line)}</text>`).join("")}
  <text x="${W - PAD}" y="${PAD + 100}" font-size="96" fill="${surveyColor}" font-weight="800" text-anchor="end">${favPct}%</text>
  <text x="${W - PAD}" y="${PAD + 140}" font-size="22" fill="#94a3b8" font-weight="700" text-anchor="end" letter-spacing="1.5">${escapeXML(scaleLabels.positive.toUpperCase())} (${validResp})</text>
  <defs>
    <clipPath id="likertBarClip">
      <rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="14" ry="14"/>
    </clipPath>
  </defs>
  <rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="14" fill="rgba(255,255,255,0.04)"/>
  <g clip-path="url(#likertBarClip)">
    ${visibleSegs.map(s => `
    <rect x="${s.x}" y="${BAR_Y}" width="${s.w}" height="${BAR_H}" fill="${s.bg}" fill-opacity="${s.opacity}"/>${s.pct >= 6 ? `
    <text x="${s.x + s.w / 2}" y="${BAR_Y + BAR_H / 2 + 12}" font-size="34" fill="${s.textColor}" font-weight="700" text-anchor="middle">${Math.round(s.pct)}%${s.pct >= 15 ? ` (${s.count})` : ""}</text>` : ""}`).join("")}
  </g>
  ${legendItems.map((it, i) => `
  <g transform="translate(${legendXs[i]}, ${LEGEND_Y})">
    <rect x="0" y="0" width="${SWATCH_SIZE}" height="${SWATCH_SIZE}" rx="3" fill="${it.bg}" fill-opacity="${it.opacity}"/>
    <text x="${SWATCH_SIZE + GAP_SWATCH_TEXT}" y="${SWATCH_SIZE - 2}" font-size="20" fill="#475569" font-weight="500">${escapeXML(it.label)}</text>
  </g>`).join("")}
</svg>`.trim();
  return { svg, width: W, height: H };
}

/**
 * Construye el SVG para QuestionFavorabilityChart (overview multi-pregunta).
 * Cada fila: texto de la pregunta (display adaptativo según displayMode) +
 * barra con % favorable + label adaptativo en la derecha. Las filas vienen
 * en el orden actual (respeta sortMode), porque el caller pasa el array ya
 * ordenado y mapeado al texto a renderizar.
 *
 * Height es dinámico (depende del número de preguntas). El SVG se devuelve
 * junto a sus dimensiones para que el rasterizador no las tenga que parsear.
 */
export function buildFavorabilityChartSvg({ questionsToRender, surveyColor }) {
  const W = 1600;
  const PAD = 60;
  const ROW_H = 88;
  const TOP_PAD = 60;
  const BOT_PAD = 50;
  const RIGHT_W = 200;
  const BAR_GAP = 28;
  const BAR_X = PAD;
  const BAR_W = W - PAD * 2 - RIGHT_W - BAR_GAP;
  const H = TOP_PAD + ROW_H * Math.max(1, questionsToRender.length) + BOT_PAD;

  // Layout por fila (ROW_H=88):
  //   y=24  → baseline pregunta (fontSize 20)  Y baseline % (fontSize 28, mismo baseline)
  //   y=44  → baseline FAVORABLE (fontSize 12, debajo del %)
  //   y=46  → baseline segunda línea de pregunta si la hay
  //   y=64  → top de la barra (height 14)
  const rows = questionsToRender.map((q, i) => {
    const rowY = TOP_PAD + i * ROW_H;
    const pct = q.fav.favorablePct;
    const pctRounded = Math.round(pct);
    const segW = pct > 0 ? Math.max(14, (pct / 100) * BAR_W) : 0;

    const allLines = wrapTextLines(q.displayText, 95);
    const textLines = allLines.slice(0, 2);
    if (allLines.length > 2) {
      textLines[1] = textLines[1].replace(/\s\S*$/, "") + "…";
    }

    return `
  <text x="${PAD}" y="${rowY + 24}" font-size="20" fill="#1f2937" font-weight="500">${escapeXML(textLines[0] || "")}</text>${textLines[1] ? `
  <text x="${PAD}" y="${rowY + 46}" font-size="20" fill="#1f2937" font-weight="500">${escapeXML(textLines[1])}</text>` : ""}
  <rect x="${BAR_X}" y="${rowY + 64}" width="${BAR_W}" height="14" rx="7" fill="rgba(255,255,255,0.05)"/>
  ${segW > 0 ? `<rect x="${BAR_X}" y="${rowY + 64}" width="${segW}" height="14" rx="7" fill="${surveyColor}"/>` : ""}
  <text x="${W - PAD}" y="${rowY + 24}" font-size="28" fill="${surveyColor}" font-weight="800" text-anchor="end">${pctRounded}%</text>
  <text x="${W - PAD}" y="${rowY + 44}" font-size="12" fill="#94a3b8" font-weight="700" text-anchor="end" letter-spacing="1.2">${escapeXML(q.scaleLabels.positive.toUpperCase())}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>${rows}
</svg>`.trim();
  return { svg, width: W, height: H };
}

/**
 * Builder LEGACY: chart "Promedio por pregunta" — multi-fila, cada fila con
 * el promedio simple por pregunta sobre la escala (avg / scaleSize). Mismo
 * layout que el de favorabilidad pero el right column muestra "4.20 / 5".
 */
export function buildAveragesChartSvg({ questionsToRender, surveyColor }) {
  const W = 1600;
  const PAD = 60;
  const ROW_H = 88;
  const TOP_PAD = 60;
  const BOT_PAD = 50;
  const RIGHT_W = 200;
  const BAR_GAP = 28;
  const BAR_X = PAD;
  const BAR_W = W - PAD * 2 - RIGHT_W - BAR_GAP;
  const H = TOP_PAD + ROW_H * Math.max(1, questionsToRender.length) + BOT_PAD;

  const rows = questionsToRender.map((q, i) => {
    const rowY = TOP_PAD + i * ROW_H;
    const avg = q.average ?? 0;
    const scaleSize = q.scaleSize;
    const pct = Math.max(0, Math.min(100, (avg / scaleSize) * 100));
    const segW = avg > 0 ? Math.max(14, (pct / 100) * BAR_W) : 0;

    const allLines = wrapTextLines(q.displayText, 95);
    const textLines = allLines.slice(0, 2);
    if (allLines.length > 2) {
      textLines[1] = textLines[1].replace(/\s\S*$/, "") + "…";
    }

    return `
  <text x="${PAD}" y="${rowY + 24}" font-size="20" fill="#1f2937" font-weight="500">${escapeXML(textLines[0] || "")}</text>${textLines[1] ? `
  <text x="${PAD}" y="${rowY + 46}" font-size="20" fill="#1f2937" font-weight="500">${escapeXML(textLines[1])}</text>` : ""}
  <rect x="${BAR_X}" y="${rowY + 64}" width="${BAR_W}" height="14" rx="7" fill="rgba(255,255,255,0.05)"/>
  ${segW > 0 ? `<rect x="${BAR_X}" y="${rowY + 64}" width="${segW}" height="14" rx="7" fill="${surveyColor}"/>` : ""}
  <text x="${W - PAD}" y="${rowY + 24}" font-size="28" fill="${surveyColor}" font-weight="800" text-anchor="end">${avg.toFixed(2)}</text>
  <text x="${W - PAD}" y="${rowY + 44}" font-size="13" fill="#94a3b8" font-weight="700" text-anchor="end" letter-spacing="1.2">/ ${scaleSize}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>${rows}
</svg>`.trim();
  return { svg, width: W, height: H };
}

/**
 * Builder LEGACY: chart "Promedio + distribución" por pregunta —
 * promedio grande + histograma de N barras según la escala.
 */
export function buildLikertHistogramSvg({
  questionText,
  surveyColor,
  average,
  scaleSize,
  distribution,
  totalAnswers,
  nsnrCount = 0,
  scaleLabels = [],
}) {
  const W = 1600;
  const H = 700;
  const PAD = 60;

  const counts = Array.from({ length: scaleSize }, (_, i) => (distribution || {})[String(i + 1)] || 0);
  const maxCount = Math.max(...counts, 1);
  const validResp = totalAnswers - nsnrCount;

  // Histograma
  const HIST_Y_TOP = 280;
  const HIST_H = 240;
  const BAR_AREA_X = PAD;
  const BAR_AREA_W = W - 2 * PAD;
  const barSpacing = BAR_AREA_W / scaleSize;
  const barWidth = Math.min(scaleSize > 7 ? 60 : 100, barSpacing * 0.6);

  // Wrap pregunta a 2 líneas max
  const allLines = wrapTextLines(questionText, 70);
  const textLines = allLines.slice(0, 2);
  if (allLines.length > 2) {
    textLines[1] = textLines[1].replace(/\s\S*$/, "") + "…";
  }

  const firstLabel = scaleLabels[0] || "";
  const lastLabel = scaleLabels[scaleLabels.length - 1] || "";

  const avgStr = average != null ? Number(average).toFixed(2).replace(/\.00$/, ".00") : "—";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${textLines.map((line, i) => `
  <text x="${PAD}" y="${PAD + 40 + i * 44}" font-size="32" fill="#1f2937" font-weight="500">${escapeXML(line)}</text>`).join("")}
  <text x="${W - PAD}" y="${PAD + 100}" font-size="96" fill="${surveyColor}" font-weight="800" text-anchor="end">${avgStr}</text>
  <text x="${W - PAD}" y="${PAD + 140}" font-size="22" fill="#94a3b8" font-weight="700" text-anchor="end" letter-spacing="1.5">/ ${scaleSize} · ${validResp} resp.${nsnrCount > 0 ? ` · ${nsnrCount} NS/NR` : ""}</text>
  ${counts.map((count, i) => {
    const cx = BAR_AREA_X + (i + 0.5) * barSpacing;
    const x = cx - barWidth / 2;
    const h = count > 0 ? Math.max((count / maxCount) * HIST_H, 8) : 4;
    const y = HIST_Y_TOP + HIST_H - h;
    const isMax = count === maxCount && count > 0;
    const fill = isMax ? surveyColor : "rgba(255,255,255,0.08)";
    return `
  <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="${fill}"/>
  <text x="${cx}" y="${y - 12}" font-size="22" fill="${isMax ? surveyColor : "#94a3b8"}" font-weight="${isMax ? 700 : 500}" text-anchor="middle">${count}</text>`;
  }).join("")}
  <line x1="${BAR_AREA_X}" y1="${HIST_Y_TOP + HIST_H + 6}" x2="${BAR_AREA_X + BAR_AREA_W}" y2="${HIST_Y_TOP + HIST_H + 6}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  ${counts.map((_, i) => {
    const cx = BAR_AREA_X + (i + 0.5) * barSpacing;
    return `
  <text x="${cx}" y="${HIST_Y_TOP + HIST_H + 38}" font-size="22" fill="#475569" font-weight="500" text-anchor="middle">${i + 1}</text>`;
  }).join("")}
  ${firstLabel ? `<text x="${BAR_AREA_X}" y="${HIST_Y_TOP + HIST_H + 76}" font-size="18" fill="#94a3b8" font-weight="500" text-anchor="start">${escapeXML(firstLabel)}</text>` : ""}
  ${lastLabel ? `<text x="${BAR_AREA_X + BAR_AREA_W}" y="${HIST_Y_TOP + HIST_H + 76}" font-size="18" fill="#94a3b8" font-weight="500" text-anchor="end">${escapeXML(lastLabel)}</text>` : ""}
</svg>`.trim();
  return { svg, width: W, height: H };
}

/**
 * Builder: chart "Comparación" de Variables (multi-fila). Acepta `viewMode`:
 *   - "averages":     barra simple de promedio sobre escala + "avg / max"
 *   - "favorability": barra apilada 100% (favorable / neutral / desfavorable)
 *                     + "% fav."
 *
 * Cada `row` debe ser:
 *   averages:     { name, average, scaleMin, scaleMax, hasData }
 *   favorability: { name, fav: {favorablePct, neutralPct, unfavorablePct, total}, hasData }
 */
export function buildVariablesComparisonSvg({
  rows,
  color,
  viewMode,
  neutralBg = "#cbd5e1",
  neutralText = "#334155",
  unfavorableBg = "#475569",
}) {
  const W = 1600;
  const PAD = 60;
  const ROW_H = 60;
  const NAME_COL = 320;
  const VALUE_COL = 160;
  const BAR_GAP = 24;
  const BAR_X = PAD + NAME_COL + BAR_GAP;
  const BAR_W = W - PAD * 2 - NAME_COL - VALUE_COL - BAR_GAP * 2;
  const isFav = viewMode === "favorability";
  const headerH = isFav ? 110 : 70;
  const BOT_PAD = 50;
  const H = headerH + ROW_H * Math.max(1, rows.length) + BOT_PAD;

  // Kicker "COMPARACIÓN"
  const kickerSvg = `<text x="${PAD}" y="50" font-size="14" fill="#999" font-weight="700" letter-spacing="2" text-transform="uppercase">COMPARACIÓN</text>`;

  // Detectar si CUALQUIER variable trae mid-split (Likert-7) — para decidir
  // si la leyenda muestra 3 o 4 segmentos. Solo aplica en modo favorabilidad.
  const anyMidSplit = isFav && rows.some(r => r.fav && r.fav.hasMidSplit);

  // Leyenda solo en modo favorabilidad
  let legendSvg = "";
  if (isFav) {
    const items = anyMidSplit
      ? [
          { label: "Favorable",    bg: color,         opacity: 1 },
          { label: "Neutral alto", bg: color,         opacity: 0.5 },
          { label: "Neutral",      bg: neutralBg,     opacity: 1 },
          { label: "Desfavorable", bg: unfavorableBg, opacity: 1 },
        ]
      : [
          { label: "Favorable",    bg: color,         opacity: 1 },
          { label: "Neutral",      bg: neutralBg,     opacity: 1 },
          { label: "Desfavorable", bg: unfavorableBg, opacity: 1 },
        ];
    const swatch = 14;
    const swatchGap = 8;
    const itemGap = 32;
    const charW = 8.5;
    const itemWidths = items.map(it => swatch + swatchGap + it.label.length * charW);
    const totalW = itemWidths.reduce((a, b) => a + b, 0) + itemGap * (items.length - 1);
    let cursorX = (W - totalW) / 2;
    const legendY = 92;
    legendSvg = items.map((it, i) => {
      const x = cursorX;
      cursorX += itemWidths[i] + itemGap;
      return `<rect x="${x}" y="${legendY - 12}" width="${swatch}" height="${swatch}" rx="2" fill="${it.bg}" fill-opacity="${it.opacity}"/><text x="${x + swatch + swatchGap}" y="${legendY}" font-size="14" fill="#475569" font-weight="500">${escapeXML(it.label)}</text>`;
    }).join("");
  }

  // Rows
  const rowsSvg = rows.map((r, i) => {
    const rowY = headerH + i * ROW_H;
    const barY = rowY + (ROW_H - 24) / 2;
    const valueY = rowY + ROW_H / 2 + 5;
    const nameTrunc = r.name.length > 38 ? r.name.slice(0, 37) + "…" : r.name;
    const nameSvg = `<text x="${PAD}" y="${valueY}" font-size="15" fill="#222" font-weight="700">${escapeXML(nameTrunc)}</text>`;
    const bgSvg = `<rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="24" rx="6" fill="rgba(255,255,255,0.04)"/>`;

    if (isFav) {
      const fav = r.fav;
      if (!r.hasData) {
        return `${nameSvg}${bgSvg}<text x="${W - PAD}" y="${valueY}" font-size="15" fill="#ccc" font-weight="700" text-anchor="end">—</text>`;
      }
      const segs = fav.hasMidSplit
        ? [
            { pct: fav.favorablePct,    bg: color,         tc: "#fff",      opacity: 1 },
            { pct: fav.neutralHighPct,  bg: color,         tc: neutralText, opacity: 0.5 },
            { pct: fav.neutralLowPct,   bg: neutralBg,     tc: neutralText, opacity: 1 },
            { pct: fav.unfavorablePct,  bg: unfavorableBg, tc: "#fff",      opacity: 1 },
          ]
        : [
            { pct: fav.favorablePct,    bg: color,         tc: "#fff",      opacity: 1 },
            { pct: fav.neutralPct,      bg: neutralBg,     tc: neutralText, opacity: 1 },
            { pct: fav.unfavorablePct,  bg: unfavorableBg, tc: "#fff",      opacity: 1 },
          ];
      let cursorX = BAR_X;
      const segsXml = segs.map(s => {
        if (s.pct <= 0) return "";
        const w = (s.pct / 100) * BAR_W;
        const xml = `<rect x="${cursorX}" y="${barY}" width="${w}" height="24" fill="${s.bg}" fill-opacity="${s.opacity}"/>${s.pct >= 12 ? `<text x="${cursorX + w/2}" y="${barY + 17}" font-size="12" fill="${s.tc}" font-weight="700" text-anchor="middle">${Math.round(s.pct)}%</text>` : ""}`;
        cursorX += w;
        return xml;
      }).join("");
      const valueStr = `${Math.round(fav.favorablePct)}% fav.`;
      return `${nameSvg}<defs><clipPath id="vbc${i}"><rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="24" rx="6"/></clipPath></defs>${bgSvg}<g clip-path="url(#vbc${i})">${segsXml}</g><text x="${W - PAD}" y="${valueY}" font-size="15" fill="${color}" font-weight="700" text-anchor="end">${valueStr}</text>`;
    }

    // averages mode
    if (!r.hasData) {
      return `${nameSvg}${bgSvg}<text x="${W - PAD}" y="${valueY}" font-size="15" fill="#ccc" font-weight="700" text-anchor="end">—</text>`;
    }
    const range = r.scaleMax - r.scaleMin;
    const pct = range > 0 ? ((r.average - r.scaleMin) / range) * 100 : 0;
    const segW = Math.max(12, (pct / 100) * BAR_W);
    return `${nameSvg}${bgSvg}<rect x="${BAR_X}" y="${barY}" width="${segW}" height="24" rx="6" fill="${color}"/><text x="${W - PAD}" y="${valueY}" font-size="15" fill="#222" font-weight="700" text-anchor="end">${r.average} / ${r.scaleMax}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${kickerSvg}
  ${legendSvg}
  ${rowsSvg}
</svg>`.trim();
  return { svg, width: W, height: H };
}

/**
 * Builder: tabla "Detalle" de Variables. Tres columnas: Variable, valor
 * (Promedio o Favorabilidad según viewMode) y Preguntas incluidas.
 *
 * Cada `row` debe ser:
 *   { name, average, scaleMax, favorablePct (o null), questions: [textos], hasData }
 */
export function buildVariablesDetailSvg({ rows, color, viewMode }) {
  const W = 1600;
  const PAD = 60;
  const isFav = viewMode === "favorability";
  const HEAD_H = 110;     // kicker + table header
  const ROW_PAD_Y = 14;
  const ROW_TEXT_LH = 22;
  const COL_NAME = 300;
  const COL_VALUE = 180;
  const COL_GAP = 24;
  const COL_QS_X = PAD + COL_NAME + COL_GAP + COL_VALUE + COL_GAP;
  const COL_QS_W = W - PAD * 2 - COL_NAME - COL_VALUE - COL_GAP * 2;
  const HEADER_ROW_Y = 80;
  const BOT_PAD = 50;
  const VALUE_HEADER = isFav ? "FAVORABILIDAD" : "PROMEDIO";

  // Calcular wrap por row (preguntas incluidas se trunca a 2 líneas + "…")
  const rowsLayout = rows.map(r => {
    const texts = r.questions || [];
    const preview = texts.slice(0, 3);
    const extra = texts.length - preview.length;
    let combined = preview.join(" · ");
    if (extra > 0) combined += ` · y ${extra} más`;
    const lines = wrapTextLines(combined, 80).slice(0, 2);
    return { ...r, lines, rowH: ROW_PAD_Y * 2 + Math.max(1, lines.length) * ROW_TEXT_LH };
  });

  const totalRowsH = rowsLayout.reduce((sum, r) => sum + r.rowH, 0);
  const H = HEAD_H + totalRowsH + BOT_PAD;

  // Kicker "DETALLE" + table headers
  const headerSvg = `
    <text x="${PAD}" y="50" font-size="14" fill="#999" font-weight="700" letter-spacing="2">DETALLE</text>
    <line x1="${PAD}" y1="${HEADER_ROW_Y + 14}" x2="${W - PAD}" y2="${HEADER_ROW_Y + 14}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="${PAD}" y="${HEADER_ROW_Y}" font-size="12" fill="#999" font-weight="700" letter-spacing="1.5">VARIABLE</text>
    <text x="${PAD + COL_NAME + COL_GAP + COL_VALUE}" y="${HEADER_ROW_Y}" font-size="12" fill="#999" font-weight="700" letter-spacing="1.5" text-anchor="end">${VALUE_HEADER}</text>
    <text x="${COL_QS_X}" y="${HEADER_ROW_Y}" font-size="12" fill="#999" font-weight="700" letter-spacing="1.5">PREGUNTAS INCLUIDAS</text>
  `;

  // Body rows
  let cursorY = HEAD_H;
  const rowsSvg = rowsLayout.map(r => {
    const rowY = cursorY;
    cursorY += r.rowH;
    const valueText = isFav
      ? (r.hasData && r.favorablePct != null ? `${Math.round(r.favorablePct)}%` : "—")
      : (r.hasData && r.average != null ? `${r.average} / ${r.scaleMax}` : "—");
    const valueColor = isFav ? (r.hasData ? color : "#ccc") : (r.hasData ? "#222" : "#ccc");
    const nameTrunc = r.name.length > 36 ? r.name.slice(0, 35) + "…" : r.name;
    const nameY = rowY + ROW_PAD_Y + 16;

    const linesSvg = r.lines.map((line, idx) => {
      const lineY = rowY + ROW_PAD_Y + 16 + idx * ROW_TEXT_LH;
      return `<text x="${COL_QS_X}" y="${lineY}" font-size="14" fill="#595959">${escapeXML(line)}</text>`;
    }).join("");

    return `
      <text x="${PAD}" y="${nameY}" font-size="15" fill="#222" font-weight="700">${escapeXML(nameTrunc)}</text>
      <text x="${PAD + COL_NAME + COL_GAP + COL_VALUE}" y="${nameY}" font-size="15" fill="${valueColor}" font-weight="700" text-anchor="end">${valueText}</text>
      ${linesSvg}
      <line x1="${PAD}" y1="${rowY + r.rowH - 1}" x2="${W - PAD}" y2="${rowY + r.rowH - 1}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    `;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${headerSvg}
  ${rowsSvg}
</svg>`.trim();
  return { svg, width: W, height: H };
}

/**
 * Sanitiza una cadena para usarla como nombre de archivo.
 */
export function safeFilename(s) {
  return String(s ?? "chart")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    || "chart";
}
