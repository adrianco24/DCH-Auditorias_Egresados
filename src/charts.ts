const COLORS = {
  aceptado: "#1f7a4d",
  pendiente: "#185fa5",
  abierto: "#b54708",
  anulado: "#b42318",
  info: "#185fa5",
  muted: "#8a7e6d",
  axis: "#6f675c",
};

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function stackedBars(
  categories: string[],
  series: { name: string; color: string; data: number[] }[],
  opts?: { height?: number },
) {
  const height = opts?.height ?? 220;
  const width = Math.max(520, categories.length * 88);
  const pad = { t: 12, r: 12, b: 52, l: 36 };
  const max = Math.max(
    1,
    ...categories.map((_, i) => series.reduce((s, ser) => s + ser.data[i], 0)),
  );
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const gap = 0.32;
  const bw = innerW / categories.length;
  const barW = bw * (1 - gap);
  let bars = "";
  categories.forEach((label, i) => {
    let y = pad.t + innerH;
    series.forEach((ser) => {
      const h = (ser.data[i] / max) * innerH;
      y -= h;
      if (h > 0) {
        bars += `<rect x="${pad.l + i * bw + (bw - barW) / 2}" y="${y}" width="${barW}" height="${h}" fill="${ser.color}" rx="2"><title>${esc(label)} · ${esc(ser.name)}: ${ser.data[i]}</title></rect>`;
      }
    });
    const total = series.reduce((s, ser) => s + ser.data[i], 0);
    bars += `<text x="${pad.l + i * bw + bw / 2}" y="${height - 34}" text-anchor="middle" class="chart-label">${esc(label)}</text>`;
    bars += `<text x="${pad.l + i * bw + bw / 2}" y="${pad.t + innerH - (total / max) * innerH - 6}" text-anchor="middle" class="chart-value">${total}</text>`;
  });
  const legend = series
    .map(
      (s, i) =>
        `<span class="legend-item"><i style="background:${s.color}"></i>${esc(s.name)}</span>`,
    )
    .join("");
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img">${bars}<line x1="${pad.l}" y1="${pad.t + innerH}" x2="${width - pad.r}" y2="${pad.t + innerH}" stroke="${COLORS.axis}" stroke-opacity="0.35"/></svg><div class="legend">${legend}</div></div>`;
}

export function lineChart(
  categories: string[],
  series: { name: string; color: string; data: number[] }[],
  opts?: { height?: number },
) {
  const height = opts?.height ?? 240;
  const width = Math.max(640, categories.length * 28);
  const pad = { t: 16, r: 16, b: 44, l: 36 };
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (i: number) =>
    pad.l + (categories.length === 1 ? innerW / 2 : (i / (categories.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const step = Math.ceil(categories.length / 8);
  let labels = "";
  categories.forEach((c, i) => {
    if (i % step !== 0 && i !== categories.length - 1) return;
    const [yy, mm, dd] = c.split("-");
    labels += `<text x="${x(i)}" y="${height - 18}" text-anchor="middle" class="chart-label">${dd}/${mm}</text>`;
  });
  const paths = series
    .map((s) => {
      const d = s.data
        .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
        .join(" ");
      const dots = s.data
        .map(
          (v, i) =>
            `<circle cx="${x(i)}" cy="${y(v)}" r="2.4" fill="${s.color}"><title>${esc(categories[i])} · ${esc(s.name)}: ${v}</title></circle>`,
        )
        .join("");
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2"/>${dots}`;
    })
    .join("");
  const legend = series
    .map(
      (s) =>
        `<span class="legend-item"><i style="background:${s.color}"></i>${esc(s.name)}</span>`,
    )
    .join("");
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img">${paths}${labels}<line x1="${pad.l}" y1="${pad.t + innerH}" x2="${width - pad.r}" y2="${pad.t + innerH}" stroke="${COLORS.axis}" stroke-opacity="0.35"/></svg><div class="legend">${legend}</div></div>`;
}

export function pieChart(
  slices: { label: string; value: number; color: string }[],
) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((s, x) => s + x.value, 0) || 1;
  const r = 72;
  const cx = 90;
  const cy = 90;
  let a0 = -Math.PI / 2;
  const paths = data
    .map((s) => {
      const a1 = a0 + (s.value / total) * Math.PI * 2;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      a0 = a1;
      return `<path d="${d}" fill="${s.color}"><title>${esc(s.label)}: ${s.value}</title></path>`;
    })
    .join("");
  const legend = data
    .map(
      (s) =>
        `<span class="legend-item"><i style="background:${s.color}"></i>${esc(s.label)} · ${s.value}</span>`,
    )
    .join("");
  return `<div class="pie-block"><svg viewBox="0 0 180 180" class="pie">${paths}<circle cx="${cx}" cy="${cy}" r="42" fill="#f6f1e8"/></svg><div class="legend col">${legend}</div></div>`;
}

export { COLORS };
