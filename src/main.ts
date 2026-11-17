import { COLORS, lineChart, pieChart, stackedBars } from "./charts";
import "./style.css";
import {
  RESULTADO_LABEL,
  applyFilters,
  countMap,
  dailySeries,
  formatDate,
  lastBySolicitud,
  motiveOf,
  requiereAlertaDemora,
  resultadoDe,
  shortEstado,
  shortName,
  userStats,
  type Filters,
  type Resultado,
} from "./metrics";
import { dedupe, rowsFromCsv, type Row } from "./parse";

const app = document.querySelector("#app")!;

const usuariosArea = new Set([
  "LOPEZ JOSE DANIEL",
  "LEDESMA YAMILA GISELLE",
  "GOMEZ JOANA MARISOL",
  "D'ANDREA FLORENCIA LORENA",
  "MEZA JULIA MARCELA",
]);

const filters: Filters = {
  desde: "",
  hasta: "",
  inicioDesde: "",
  inicioHasta: "",
  usuario: "",
  resultado: "",
  requisitos: "",
  propuesta: "",
  estado: "",
  q: "",
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function optionList(values: string[], selected: string, allLabel: string) {
  return `<option value="">${allLabel}</option>${values
    .map(
      (v) =>
        `<option value="${escapeAttr(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`,
    )
    .join("")}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function downloadCsv(rows: Row[]) {
  const headers = [
    "observaciones",
    "anulado",
    "estado_requisitos",
    "alumno",
    "nro_solicitud",
    "propuesta_nombre",
    "fecha_inicio_tramite",
    "paso",
    "fecha",
    "estado_anterior",
    "estado_nuevo",
    "usuario_cambio",
    "dias_entre_estados",
    "dias_totales_tramite",
  ];
  const values = rows.map((row) => [
    row.observaciones,
    row.anulado ? "1" : "0",
    row.estadoRequisitos,
    row.alumno,
    row.nroSolicitud,
    row.propuesta,
    row.fechaInicio,
    row.paso,
    row.fecha,
    row.estadoAnterior,
    row.estadoNuevo,
    row.usuario,
    row.diasEntre,
    row.diasTotales,
  ]);
  const csv = [headers, ...values]
    .map((record) =>
      record
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `egre-filtrado-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadRows(): Promise<{ rows: Row[]; files: string[] }> {
  const manifest = await fetch("./data/manifest.json").then((r) => {
    if (!r.ok) throw new Error("No se encontró el listado de reportes");
    return r.json() as Promise<{ files: string[] }>;
  });
  const files = manifest.files ?? [];
  const chunks = await Promise.all(
    files.map(async (file) => {
      const text = await fetch(`./data/${encodeURIComponent(file)}`).then((r) => r.text());
      return rowsFromCsv(text, file);
    }),
  );
  return { rows: dedupe(chunks.flat()), files };
}

function render(all: Row[], files: string[], actualPorSolicitud: Map<string, Row>) {
  const fechas = unique(all.map((r) => r.fecha));
  const filtered = applyFilters(all, filters);
  const last = lastBySolicitud(filtered);
  const lastRows = [...last.values()];
  const alertas = lastRows.filter((row) => {
    const actual = actualPorSolicitud.get(row.nroSolicitud);
    return actual !== undefined && requiereAlertaDemora(actual);
  }).length;
  const users = userStats(filtered);
  const daily = dailySeries(filtered);
  const resultados = countMap(lastRows.map(resultadoDe));
  const pipeline = countMap(lastRows.map((r) => r.estadoNuevo));
  const carreras = countMap(lastRows.map((r) => r.propuesta));
  const motives = countMap(
    lastRows.filter((r) => r.anulado).map((r) => motiveOf(r.observaciones)),
  ).slice(0, 8);

  const nAcept = lastRows.filter((r) => resultadoDe(r) === "aceptado").length;
  const nPendiente = lastRows.filter((r) => resultadoDe(r) === "pendiente").length;
  const nAbierto = lastRows.filter((r) => resultadoDe(r) === "abierto").length;
  const nAnulado = lastRows.filter((r) => resultadoDe(r) === "anulado").length;
  const anuladosB = lastRows.filter((r) => r.anulado && r.estadoRequisitos === "B").length;
  const anuladosP = lastRows.filter((r) => r.anulado && r.estadoRequisitos === "P").length;
  const otrosAnulados = nAnulado - anuladosB - anuladosP;

  app.innerHTML = `
    <header class="top">
      <div>
        <p class="eyebrow">UNNE · egresados</p>
        <h1>Tablero de auditorías de EGRESADOS de la Facultad de Derecho</h1>
        <p class="sub">${files.length} archivo${files.length === 1 ? "" : "s"} · ${all.length} movimientos · ${lastBySolicitud(all).size} trámites · ${fechas.length ? `${formatDate(fechas[0])} – ${formatDate(fechas.at(-1)!)}` : "sin fechas"}</p>
      </div>
      <p class="hint">Actualizá el CSV, hacé <code>git push</code> y este tablero se republica solo.</p>
    </header>

    <p class="area-notice">Mostrando únicamente los movimientos del personal del área.</p>

    <section class="filters">
      <label>Inicio del trámite desde
        <input type="date" id="inicioDesde" value="${filters.inicioDesde}">
      </label>
      <label>Inicio del trámite hasta
        <input type="date" id="inicioHasta" value="${filters.inicioHasta}">
      </label>
      <label>Movimiento desde
        <input type="date" id="desde" value="${filters.desde}">
      </label>
      <label>Movimiento hasta
        <input type="date" id="hasta" value="${filters.hasta}">
      </label>
      <label>Usuario
        <select id="usuario">${optionList(unique(all.map((r) => r.usuario)), filters.usuario, "Todos")}</select>
      </label>
      <label>Estado
        <select id="resultado">
          <option value="">Todos</option>
          ${(["aceptado", "anulado"] as const)
            .map(
              (k) =>
                `<option value="${k}" ${filters.resultado === k ? "selected" : ""}>${RESULTADO_LABEL[k]}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>Estado de requisitos
        <select id="requisitos">
          <option value="">Todos</option>
          ${[["A", "Aceptado (A)"], ["P", "Pendiente (P)"], ["B", "Abierto (B)"]]
            .map(([value, label]) => `<option value="${value}" ${filters.requisitos === value ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </label>
      <label>Carrera
        <select id="propuesta">${optionList(unique(all.map((r) => r.propuesta)), filters.propuesta, "Todas")}</select>
      </label>
      <label>Etapa del trámite
        <select id="estado">${optionList(unique(all.map((r) => r.estadoNuevo)), filters.estado, "Todos")}</select>
      </label>
      <label class="grow">Buscar
        <input type="search" id="q" placeholder="Alumno, solicitud, DNI…" value="${escapeAttr(filters.q)}">
      </label>
    </section>
    <p class="caption">Los rangos son inclusivos y se combinan: la fecha de movimiento limita los movimientos mostrados y descargados.</p>

    <section class="kpis">
      <article><strong>${last.size}</strong><span>Trámites únicos</span></article>
      <article class="ok"><strong>${nAcept}</strong><span>Aceptados</span></article>
      <article class="info"><strong>${nPendiente}</strong><span>Pendientes</span></article>
      <article class="warn"><strong>${nAbierto}</strong><span>Abiertos</span></article>
      <article class="bad"><strong>${nAnulado}</strong><span>Anulados</span></article>
      <article><strong>${filtered.length}</strong><span>Movimientos</span></article>
    </section>

    <section class="annulled-breakdown" aria-labelledby="annulled-heading">
      <h2 id="annulled-heading">Desglose de anulados</h2>
      <p class="caption">Trámites únicos según su último movimiento dentro de los filtros. Para ver cuáles son, seleccioná Estado: Anulado y Estado de requisitos: B o P.</p>
      <div class="chips">
        <span class="chip">Abiertos (B) <b>${anuladosB}</b></span>
        <span class="chip">Pendientes (P) <b>${anuladosP}</b></span>
        <span class="chip">Otros estados <b>${otrosAnulados}</b></span>
      </div>
    </section>

    <section class="grid-2">
      <div>
        <h2>Qué hizo cada usuario</h2>
        <p class="caption">Trámites únicos (no filas). Apilado por resultado de su último movimiento en el filtro.</p>
        ${
          users.length
            ? stackedBars(
                users.map((u) => shortName(u.usuario)),
                [
                  { name: "Aceptados", color: COLORS.aceptado, data: users.map((u) => u.aceptados) },
                  { name: "Pendientes", color: COLORS.pendiente, data: users.map((u) => u.pendientes) },
                  { name: "Abiertos", color: COLORS.abierto, data: users.map((u) => u.abiertos) },
                  { name: "Anulados", color: COLORS.anulado, data: users.map((u) => u.anulados) },
                ],
              )
            : "<p>No hay datos con estos filtros.</p>"
        }
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th><th>Trámites</th><th>Aceptados</th><th>Pendientes</th><th>Abiertos</th><th>Anulados</th><th>Movimientos</th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map(
                  (u) => `<tr>
                    <td>${escapeHtml(u.usuario)}</td>
                    <td>${u.tramites}</td><td>${u.aceptados}</td><td>${u.pendientes}</td><td>${u.abiertos}</td><td>${u.anulados}</td>
                    <td>${u.movimientos}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2>Volumen diario</h2>
        <p class="caption">Trámites únicos tocados vs cambios de estado. Eje X: fecha · Eje Y: cantidad</p>
        ${
          daily.days.length
            ? lineChart(daily.days, [
                { name: "Trámites únicos", color: COLORS.info, data: daily.tramites },
                { name: "Movimientos", color: COLORS.muted, data: daily.movimientos },
              ])
            : "<p>No hay datos con estos filtros.</p>"
        }
      </div>
    </section>

    <section class="grid-3">
      <div>
        <h2>Resultado</h2>
        ${pieChart(
          resultados.map(([k, v]) => ({
            label: RESULTADO_LABEL[k as Resultado] ?? k,
            value: v,
            color: COLORS[k as keyof typeof COLORS] ?? COLORS.muted,
          })),
        )}
      </div>
      <div>
        <h2>Estado actual</h2>
        ${pieChart(
          pipeline.map(([k, v], i) => ({
            label: shortEstado(k),
            value: v,
            color: [COLORS.info, COLORS.abierto, COLORS.aceptado, COLORS.muted, COLORS.pendiente][i % 5],
          })),
        )}
      </div>
      <div>
        <h2>Motivos de anulación</h2>
        ${
          motives.length
            ? stackedBars(
                motives.map(([k]) => k),
                [{ name: "Trámites", color: COLORS.anulado, data: motives.map(([, v]) => v) }],
                { height: 260 },
              )
            : "<p>No hay anulados en el filtro.</p>"
        }
      </div>
    </section>

    <section>
      <h2>Carreras</h2>
      <div class="chips">
        ${carreras
          .map(([k, v]) => `<span class="chip">${escapeHtml(k)} <b>${v}</b></span>`)
          .join("")}
      </div>
    </section>

    <section>
      <div class="detail-heading">
        <div>
          <h2>Detalle</h2>
          <p class="caption">Último movimiento de cada trámite en el filtro · ${lastRows.length} filas</p>
        </div>
        <button class="download-button" id="download-csv" type="button" ${filtered.length ? "" : "disabled"}>
          Descargar CSV filtrado · ${filtered.length} movimientos
        </button>
      </div>
      <p class="caption">La descarga incluye todos los movimientos que cumplen los filtros, no solo el último de cada trámite.</p>
      <p class="delay-summary" role="status">Alerta: ${alertas} trámite${alertas === 1 ? "" : "s"} aceptado${alertas === 1 ? "" : "s"}, con más de 90 días y sin estado Diplomado.</p>
      <p class="caption">Días totales y estado actual corresponden al último movimiento del CSV, incluso si lo realizó otro usuario. Se muestran hasta 250 trámites, con las alertas primero.</p>
      <div class="table-wrap tall">
        <table>
          <thead>
            <tr>
              <th>Inicio del trámite</th><th>Fecha del movimiento</th><th>Solicitud</th><th>Alumno</th><th>Carrera</th>
              <th>Usuario</th><th>Estado del movimiento</th><th>Estado actual</th><th>Días totales</th><th>Alerta</th><th>Resultado</th><th>Estado de requisitos</th><th>Observación</th>
            </tr>
          </thead>
          <tbody>
            ${lastRows
              .sort((a, b) => {
                const actualA = actualPorSolicitud.get(a.nroSolicitud);
                const actualB = actualPorSolicitud.get(b.nroSolicitud);
                const alertaA = actualA !== undefined && requiereAlertaDemora(actualA);
                const alertaB = actualB !== undefined && requiereAlertaDemora(actualB);
                return Number(alertaB) - Number(alertaA) || b.fecha.localeCompare(a.fecha) || Number(b.nroSolicitud) - Number(a.nroSolicitud);
              })
              .slice(0, 250)
              .map((r) => {
                const res = resultadoDe(r);
                const actual = actualPorSolicitud.get(r.nroSolicitud);
                const alerta = actual !== undefined && requiereAlertaDemora(actual);
                return `<tr>
                  <td>${r.fechaInicio ? formatDate(r.fechaInicio) : "Sin dato"}</td>
                  <td>${formatDate(r.fecha)}</td>
                  <td>${escapeHtml(r.nroSolicitud)}</td>
                  <td>${escapeHtml(r.apellidoNombres)}</td>
                  <td>${escapeHtml(r.propuesta)}</td>
                  <td>${escapeHtml(r.usuario)}</td>
                  <td>${escapeHtml(shortEstado(r.estadoNuevo))}</td>
                  <td>${actual ? escapeHtml(shortEstado(actual.estadoNuevo)) : "No disponible"}</td>
                  <td>${actual ? actual.diasTotales : "No disponible"}</td>
                  <td>${alerta ? '<span class="tag anulado">Más de 90 días sin diplomar</span>' : "—"}</td>
                  <td><span class="tag ${res}">${RESULTADO_LABEL[res]}</span></td>
                  <td>${escapeHtml(r.estadoRequisitos) || "Sin dato"}</td>
                  <td>${escapeHtml(r.observaciones)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;

  const bind = (id: keyof Filters, event: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    el?.addEventListener(event, () => {
      filters[id] = el.value;
      render(all, files, actualPorSolicitud);
    });
  };
  bind("inicioDesde", "change");
  bind("inicioHasta", "change");
  bind("desde", "change");
  bind("hasta", "change");
  bind("usuario", "change");
  bind("resultado", "change");
  bind("requisitos", "change");
  bind("propuesta", "change");
  bind("estado", "change");
  document.getElementById("q")?.addEventListener("input", (e) => {
    filters.q = (e.target as HTMLInputElement).value;
    render(all, files, actualPorSolicitud);
  });
  document.getElementById("download-csv")?.addEventListener("click", () => downloadCsv(filtered));
}

function loadDashboard() {
  app.innerHTML = `<p class="boot">Cargando reportes…</p>`;

  loadRows()
    .then(({ rows, files }) => {
      if (!files.length) {
        app.innerHTML = `<p class="boot">No hay CSV en <code>public/data</code>. Copiá el reporte ahí y hacé push.</p>`;
        return;
      }
      render(rows.filter((row) => usuariosArea.has(row.usuario)), files, lastBySolicitud(rows));
    })
    .catch((err: Error) => {
      app.innerHTML = `<p class="boot">No se pudo leer el reporte: ${escapeHtml(err.message)}</p>`;
    });
}

function renderLogin() {
  app.innerHTML = `
    <section class="login-card">
      <p class="eyebrow">EGRE · egresados</p>
      <h1>Acceso al tablero</h1>
      <p class="login-warning">Esta pantalla es solo demostrativa: no verifica la identidad ni protege los datos. El sitio y sus archivos siguen siendo públicos.</p>
      <form id="login-form">
        <label>Usuario
          <input id="login-user" name="username" autocomplete="username" required>
        </label>
        <label>Contraseña
          <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <button type="submit">Continuar</button>
      </form>
    </section>
  `;

  document.getElementById("login-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadDashboard();
  });
}

renderLogin();
