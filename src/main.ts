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
  resultadoDe,
  shortEstado,
  shortName,
  userStats,
  type Filters,
  type Resultado,
} from "./metrics";
import { dedupe, rowsFromCsv, type Row } from "./parse";

const app = document.querySelector("#app")!;

const filters: Filters = {
  desde: "",
  hasta: "",
  usuario: "",
  resultado: "",
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

function render(all: Row[], files: string[]) {
  const fechas = unique(all.map((r) => r.fecha));
  const filtered = applyFilters(all, filters);
  const last = lastBySolicitud(filtered);
  const lastRows = [...last.values()];
  const users = userStats(filtered);
  const daily = dailySeries(filtered);
  const resultados = countMap(lastRows.map(resultadoDe));
  const pipeline = countMap(lastRows.map((r) => r.estadoNuevo));
  const carreras = countMap(lastRows.map((r) => r.propuesta));
  const motives = countMap(
    lastRows.filter((r) => r.anulado).map((r) => motiveOf(r.observaciones)),
  ).slice(0, 8);

  const nAcept = lastRows.filter((r) => resultadoDe(r) === "aceptado").length;
  const nObs = lastRows.filter((r) => resultadoDe(r) === "observado").length;
  const nBaja = lastRows.filter((r) => resultadoDe(r) === "baja").length;

  app.innerHTML = `
    <header class="top">
      <div>
        <p class="eyebrow">UNNE · egresados</p>
        <h1>Tablero de auditorías EGRE</h1>
        <p class="sub">${files.length} archivo${files.length === 1 ? "" : "s"} · ${all.length} movimientos · ${lastBySolicitud(all).size} trámites · ${fechas.length ? `${formatDate(fechas[0])} – ${formatDate(fechas.at(-1)!)}` : "sin fechas"}</p>
      </div>
      <p class="hint">Actualizá el CSV, hacé <code>git push</code> y este tablero se republica solo.</p>
    </header>

    <section class="filters">
      <label>Desde
        <input type="date" id="desde" value="${filters.desde}">
      </label>
      <label>Hasta
        <input type="date" id="hasta" value="${filters.hasta}">
      </label>
      <label>Usuario
        <select id="usuario">${optionList(unique(all.map((r) => r.usuario)), filters.usuario, "Todos")}</select>
      </label>
      <label>Resultado
        <select id="resultado">
          <option value="">Todos</option>
          ${(["aceptado", "observado", "baja", "otro"] as Resultado[])
            .map(
              (k) =>
                `<option value="${k}" ${filters.resultado === k ? "selected" : ""}>${RESULTADO_LABEL[k]}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>Carrera
        <select id="propuesta">${optionList(unique(all.map((r) => r.propuesta)), filters.propuesta, "Todas")}</select>
      </label>
      <label>Estado
        <select id="estado">${optionList(unique(all.map((r) => r.estadoNuevo)), filters.estado, "Todos")}</select>
      </label>
      <label class="grow">Buscar
        <input type="search" id="q" placeholder="Alumno, solicitud, DNI…" value="${escapeAttr(filters.q)}">
      </label>
    </section>

    <section class="kpis">
      <article><strong>${last.size}</strong><span>Trámites únicos</span></article>
      <article class="ok"><strong>${nAcept}</strong><span>Aceptados</span></article>
      <article class="bad"><strong>${nObs}</strong><span>Observados</span></article>
      <article class="warn"><strong>${nBaja}</strong><span>Baja / abierto</span></article>
      <article><strong>${filtered.length}</strong><span>Movimientos</span></article>
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
                  { name: "Observados", color: COLORS.observado, data: users.map((u) => u.observados) },
                  { name: "Baja / abierto", color: COLORS.baja, data: users.map((u) => u.baja) },
                ],
              )
            : "<p>No hay datos con estos filtros.</p>"
        }
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th><th>Trámites</th><th>Aceptados</th><th>P</th><th>B</th><th>Movimientos</th><th>Días</th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map(
                  (u) => `<tr>
                    <td>${escapeHtml(u.usuario)}</td>
                    <td>${u.tramites}</td><td>${u.aceptados}</td><td>${u.observados}</td><td>${u.baja}</td>
                    <td>${u.movimientos}</td><td>${u.dias}</td>
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
            color:
              k === "aceptado"
                ? COLORS.aceptado
                : k === "observado"
                  ? COLORS.observado
                  : k === "baja"
                    ? COLORS.baja
                    : COLORS.muted,
          })),
        )}
      </div>
      <div>
        <h2>Estado actual</h2>
        ${pieChart(
          pipeline.map(([k, v], i) => ({
            label: shortEstado(k),
            value: v,
            color: [COLORS.info, COLORS.baja, COLORS.aceptado, COLORS.muted, COLORS.observado][i % 5],
          })),
        )}
      </div>
      <div>
        <h2>Motivos de anulación</h2>
        ${
          motives.length
            ? stackedBars(
                motives.map(([k]) => k),
                [{ name: "Trámites", color: COLORS.observado, data: motives.map(([, v]) => v) }],
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
      <h2>Detalle</h2>
      <p class="caption">Último movimiento de cada trámite en el filtro · ${lastRows.length} filas</p>
      <div class="table-wrap tall">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Solicitud</th><th>Alumno</th><th>Carrera</th>
              <th>Usuario</th><th>Estado</th><th>Resultado</th><th>Observación</th>
            </tr>
          </thead>
          <tbody>
            ${lastRows
              .sort((a, b) => b.fecha.localeCompare(a.fecha) || Number(b.nroSolicitud) - Number(a.nroSolicitud))
              .slice(0, 250)
              .map((r) => {
                const res = resultadoDe(r);
                return `<tr>
                  <td>${formatDate(r.fecha)}</td>
                  <td>${escapeHtml(r.nroSolicitud)}</td>
                  <td>${escapeHtml(r.apellidoNombres)}</td>
                  <td>${escapeHtml(r.propuesta)}</td>
                  <td>${escapeHtml(r.usuario)}</td>
                  <td>${escapeHtml(shortEstado(r.estadoNuevo))}</td>
                  <td><span class="tag ${res}">${RESULTADO_LABEL[res]}</span></td>
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
      render(all, files);
    });
  };
  bind("desde", "change");
  bind("hasta", "change");
  bind("usuario", "change");
  bind("resultado", "change");
  bind("propuesta", "change");
  bind("estado", "change");
  document.getElementById("q")?.addEventListener("input", (e) => {
    filters.q = (e.target as HTMLInputElement).value;
    render(all, files);
  });
}

function loadDashboard() {
  app.innerHTML = `<p class="boot">Cargando reportes…</p>`;

  loadRows()
    .then(({ rows, files }) => {
      if (!files.length) {
        app.innerHTML = `<p class="boot">No hay CSV en <code>public/data</code>. Copiá el reporte ahí y hacé push.</p>`;
        return;
      }
      render(rows, files);
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
