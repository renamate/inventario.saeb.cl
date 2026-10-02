#!/usr/bin/env node
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function inflate(b64) {
  return zlib.inflateSync(Buffer.from(b64, "base64"));
}

function write(rel, buf) {
  fs.mkdirSync(path.dirname(rel), { recursive: true });
  fs.writeFileSync(rel, buf);
  console.log("wrote", rel, buf.length);
}

write("src/app/(app)/compras/tablero-compras.tsx", inflate(fs.readFileSync(".upload/tablero-compras.tsx.b64z", "utf8")));
write("data/seed.json", inflate(fs.readFileSync(".upload/seed.json.b64z", "utf8")));
write("supabase/seed.sql", inflate(fs.readFileSync(".upload/seed.sql.b64z", "utf8")));

const lockParts = fs.readdirSync(".upload").filter((f) => f.startsWith("package-lock.json.b64z.")).sort();
if (lockParts.length) {
  const b64 = lockParts.map((f) => fs.readFileSync(path.join(".upload", f), "utf8")).join("");
  write("package-lock.json", inflate(b64));
}
