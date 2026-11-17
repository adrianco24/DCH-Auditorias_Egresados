# EGRE · Tablero de auditorías

Sitio estático con el reporte de egresados. Cada `git push` a `main` publica el tablero en GitHub Pages.

**Importante:** GitHub Pages es público. La pantalla de acceso es solo visual y no protege los datos; publicá únicamente archivos anonimizados en `public/data/`.

El tablero muestra únicamente movimientos de los cinco usuarios configurados como personal del área. Esta restricción aplica a la interfaz y a la descarga filtrada, no protege los CSV publicados frente a quien acceda directamente a sus URL.

## Flujo de todos los días

1. Bajá el CSV del sistema.
2. Copialo a `public/data/`. Podés pisar `EGRE.csv` o sumar un archivo por día (`2026-11-17.csv`). El tablero lee **todos** los `.csv` de esa carpeta y saca duplicados.
3. Subí el cambio:

```bash
git add public/data
git commit -m "Reporte EGRE 2026-11-17"
git push
```

GitHub Actions arma el sitio y actualiza la URL de Pages.

## En tu máquina

```bash
npm install
npm run dev
```

Abrí la URL que imprime Vite.

## Qué muestra

- Trámites únicos (no filas: cada fila es un cambio de estado)
- Estado de requisitos: A = aceptado, P = pendiente, B = abierto; anulado = 1 se clasifica como anulado
- El filtro Estado ofrece Aceptado (A no anulado), Anulado y Todos; en Todos también aparecen P y B no anulados. El filtro Etapa del trámite selecciona el estado del movimiento.
- Desglose de trámites anulados por estado de requisitos (B, P y otros), según el último movimiento dentro de los filtros; combiná los filtros Estado y Estado de requisitos para revisar cada grupo
- Productividad por usuario
- Volumen diario, pipeline, motivos y detalle filtrable
- En el detalle, alerta para trámites aceptados y no anulados con más de 90 días totales cuyo último estado en el CSV no es «Diplomado», incluso si otro usuario realizó ese movimiento. Los datos se actualizan al subir un nuevo CSV; no se recalculan diariamente.
