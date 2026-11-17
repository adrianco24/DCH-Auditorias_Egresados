# EGRE · Tablero de auditorías

Sitio estático con el reporte de egresados. Cada `git push` a `main` publica el tablero en GitHub Pages.

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
- Aceptados (A, no anulado), observados (P) y baja / trámite abierto (B)
- Productividad por usuario
- Volumen diario, pipeline, motivos y detalle filtrable
