export type Row = {
  observaciones: string;
  anulado: boolean;
  estadoRequisitos: string;
  alumno: string;
  nroSolicitud: string;
  documento: string;
  propuesta: string;
  apellidoNombres: string;
  nroExpediente: string;
  expedienteDescr: string;
  fechaInicio: string;
  paso: number;
  fecha: string;
  estadoAnterior: string;
  estadoNuevo: string;
  usuario: string;
  diasEntre: number;
  diasTotales: number;
  sourceFile: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((c) => c.length)) rows.push(row);
  }
  return rows;
}

function clean(value: string | undefined) {
  const v = (value ?? "").trim();
  if (!v || v.toUpperCase() === "NULL") return "";
  return v;
}

export function rowsFromCsv(text: string, sourceFile: string): Row[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  const idx = (name: string) => header.indexOf(name);
  const i = {
    observaciones: idx("observaciones"),
    anulado: idx("anulado"),
    estado_requisitos: idx("estado_requisitos"),
    alumno: idx("alumno"),
    nro_solicitud: idx("nro_solicitud"),
    tipo_nro_documento: idx("tipo_nro_documento"),
    propuesta_nombre: idx("propuesta_nombre"),
    apellido_nombres: idx("apellido_nombres"),
    nro_expediente: idx("nro_expediente"),
    nro_expediente_descr: idx("nro_expediente_descr"),
    fecha_inicio_tramite: idx("fecha_inicio_tramite"),
    paso: idx("paso"),
    fecha: idx("fecha"),
    estado_anterior: idx("estado_anterior"),
    estado_nuevo: idx("estado_nuevo"),
    usuario_cambio: idx("usuario_cambio"),
    dias_entre_estados: idx("dias_entre_estados"),
    dias_totales_tramite: idx("dias_totales_tramite"),
  };
  return table.slice(1).map((cols) => ({
    observaciones: clean(cols[i.observaciones]),
    anulado: clean(cols[i.anulado]) === "1",
    estadoRequisitos: clean(cols[i.estado_requisitos]),
    alumno: clean(cols[i.alumno]),
    nroSolicitud: clean(cols[i.nro_solicitud]),
    documento: clean(cols[i.tipo_nro_documento]),
    propuesta: clean(cols[i.propuesta_nombre]),
    apellidoNombres: clean(cols[i.apellido_nombres]),
    nroExpediente: clean(cols[i.nro_expediente]),
    expedienteDescr: clean(cols[i.nro_expediente_descr]),
    fechaInicio: clean(cols[i.fecha_inicio_tramite]),
    paso: Number(clean(cols[i.paso]) || 0),
    fecha: clean(cols[i.fecha]),
    estadoAnterior: clean(cols[i.estado_anterior]),
    estadoNuevo: clean(cols[i.estado_nuevo]),
    usuario: clean(cols[i.usuario_cambio]),
    diasEntre: Number(clean(cols[i.dias_entre_estados]) || 0),
    diasTotales: Number(clean(cols[i.dias_totales_tramite]) || 0),
    sourceFile,
  }));
}

export function dedupe(rows: Row[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const row of rows) {
    const key = [
      row.nroSolicitud,
      row.paso,
      row.fecha,
      row.usuario,
      row.estadoAnterior,
      row.estadoNuevo,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
