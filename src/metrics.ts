import type { Row } from "./parse";

export type Resultado = "aceptado" | "pendiente" | "abierto" | "anulado" | "otro";

export type Filters = {
  desde: string;
  hasta: string;
  usuario: string;
  resultado: string;
  propuesta: string;
  estado: string;
  q: string;
};

export function resultadoDe(row: Row): Resultado {
  if (row.anulado) return "anulado";
  if (row.estadoRequisitos === "A") return "aceptado";
  if (row.estadoRequisitos === "P") return "pendiente";
  if (row.estadoRequisitos === "B") return "abierto";
  return "otro";
}

export const RESULTADO_LABEL: Record<Resultado, string> = {
  aceptado: "Aceptado",
  pendiente: "Pendiente (P)",
  abierto: "Abierto (B)",
  anulado: "Anulado",
  otro: "Otro",
};

export function shortEstado(value: string) {
  return value.replace(/^[0-9]+[º°]\s*/, "").trim() || value;
}

export function motiveOf(obs: string) {
  const o = obs.toUpperCase();
  if (!o) return "Sin observación";
  if (o === "FLOR" || o === "JDL") return `Iniciales (${o})`;
  const tags: string[] = [];
  if (o.includes("ARANCEL")) tags.push("Arancel");
  if (o.includes("REQUISITO")) tags.push("Requisitos");
  if (o.includes("DNI")) tags.push("DNI");
  if (["CARRERA", "ELECCI", "PAGO", "COMPROBANTE"].some((x) => o.includes(x))) {
    tags.push("Comprobante");
  }
  if (o.includes("TRAMITE ABIERTO") || o.includes("TRÁMITE ABIERTO")) {
    tags.push("Trámite abierto");
  }
  return tags.length ? tags.join(" + ") : "Otro";
}

export function lastRow(a: Row, b: Row) {
  if (a.paso !== b.paso) return a.paso > b.paso ? a : b;
  return a.fecha >= b.fecha ? a : b;
}

export function lastBySolicitud(rows: Row[]) {
  const map = new Map<string, Row>();
  for (const row of rows) {
    const prev = map.get(row.nroSolicitud);
    map.set(row.nroSolicitud, prev ? lastRow(prev, row) : row);
  }
  return map;
}

export function requiereAlertaDemora(row: Row) {
  return resultadoDe(row) === "aceptado"
    && row.diasTotales > 90
    && row.estadoNuevo.trim().toLocaleLowerCase("es") !== "diplomado";
}

export function applyFilters(rows: Row[], f: Filters) {
  return rows.filter((row) => {
    if (f.desde && row.fecha < f.desde) return false;
    if (f.hasta && row.fecha > f.hasta) return false;
    if (f.usuario && row.usuario !== f.usuario) return false;
    if (f.propuesta && row.propuesta !== f.propuesta) return false;
    if (f.estado && row.estadoNuevo !== f.estado) return false;
    if (f.resultado && resultadoDe(row) !== f.resultado) return false;
    if (f.q) {
      const blob = [
        row.apellidoNombres,
        row.nroSolicitud,
        row.documento,
        row.alumno,
        row.observaciones,
        row.expedienteDescr,
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
}

export type UserStat = {
  usuario: string;
  tramites: number;
  movimientos: number;
  aceptados: number;
  pendientes: number;
  abiertos: number;
  anulados: number;
};

export function userStats(rows: Row[]): UserStat[] {
  const byUser = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byUser.get(row.usuario) ?? [];
    list.push(row);
    byUser.set(row.usuario, list);
  }
  const stats: UserStat[] = [];
  for (const [usuario, list] of byUser) {
    const last = lastBySolicitud(list);
    let aceptados = 0;
    let pendientes = 0;
    let abiertos = 0;
    let anulados = 0;
    for (const row of last.values()) {
      const r = resultadoDe(row);
      if (r === "aceptado") aceptados++;
      else if (r === "pendiente") pendientes++;
      else if (r === "abierto") abiertos++;
      else if (r === "anulado") anulados++;
    }
    stats.push({
      usuario,
      tramites: last.size,
      movimientos: list.length,
      aceptados,
      pendientes,
      abiertos,
      anulados,
    });
  }
  return stats.sort((a, b) => b.tramites - a.tramites);
}

export function countMap(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function dailySeries(rows: Row[]) {
  const mov = new Map<string, number>();
  const sols = new Map<string, Set<string>>();
  for (const row of rows) {
    mov.set(row.fecha, (mov.get(row.fecha) ?? 0) + 1);
    if (!sols.has(row.fecha)) sols.set(row.fecha, new Set());
    sols.get(row.fecha)!.add(row.nroSolicitud);
  }
  const days = [...new Set([...mov.keys(), ...sols.keys()])].sort();
  return {
    days,
    movimientos: days.map((d) => mov.get(d) ?? 0),
    tramites: days.map((d) => sols.get(d)?.size ?? 0),
  };
}

export function shortName(usuario: string) {
  const parts = usuario.replace(/'/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return usuario;
}

export function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
