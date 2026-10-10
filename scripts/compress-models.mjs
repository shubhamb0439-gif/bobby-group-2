// Pre-compress the 3D models: writes public/models/<name>.glb.gz next to each .glb.
// Hosts don't gzip .glb on the fly, and meshopt geometry compresses ~40% further with gzip.
// Run after replacing any model:  node scripts/compress-models.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "models");
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".glb"))) {
  const src = fs.readFileSync(path.join(dir, f));
  const gz = zlib.gzipSync(src, { level: 9 });
  fs.writeFileSync(path.join(dir, f + ".gz"), gz);
  console.log(`${f}: ${(src.length / 1e6).toFixed(2)} MB -> ${(gz.length / 1e6).toFixed(2)} MB`);
}
