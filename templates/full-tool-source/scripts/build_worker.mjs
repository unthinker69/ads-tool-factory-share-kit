import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlPath = join(root, "public", "index.html");
const templatePath = join(root, "src", "worker_api_template.js");
const outPath = join(root, "dist", "worker.js");
const secretPath = join(root, ".secrets", "worker_app_secret.txt");
const versionPath = join(root, "version.txt");

function getDevSecret() {
  if (existsSync(secretPath)) return readFileSync(secretPath, "utf8").trim();
  return "local-dev-" + crypto.createHash("sha256").update(root).digest("hex");
}

const template = readFileSync(templatePath, "utf8");
const version = existsSync(versionPath) ? readFileSync(versionPath, "utf8").trim() : "1.0.0";
const html = readFileSync(htmlPath, "utf8").replaceAll("__TOOL_VERSION__", version);
const worker = template
  .replace("__INDEX_HTML_JSON__", JSON.stringify(html))
  .replace("__APP_SECRET_JSON__", JSON.stringify(getDevSecret()))
  .replaceAll("__TOOL_VERSION__", version);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, worker, "utf8");
console.log(`Built ${outPath}`);

