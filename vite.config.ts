import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function listCsvs() {
  const dir = path.resolve("public/data");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .sort();
}

function csvManifest(): Plugin {
  const payload = () => JSON.stringify({ files: listCsvs() });
  return {
    name: "csv-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/data/manifest.json") {
          res.setHeader("Content-Type", "application/json");
          res.end(payload());
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "data/manifest.json",
        source: payload(),
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [csvManifest()],
});
