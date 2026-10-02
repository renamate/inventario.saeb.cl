#!/usr/bin/env node
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const { execSync } = require("child_process");

function inflate(b64) {
  return zlib.inflateSync(Buffer.from(String(b64).trim(), "base64"));
}

function write(rel, buf) {
  fs.mkdirSync(path.dirname(rel), { recursive: true });
  fs.writeFileSync(rel, buf);
  console.log("wrote", rel, buf.length);
}

write("src/app/(app)/compras/tablero-compras.tsx", inflate(fs.readFileSync(".upload/tablero-compras.tsx.b64z", "utf8")));
write("data/seed.json", inflate(fs.readFileSync(".upload/seed.json.b64z", "utf8")));
write("supabase/seed.sql", inflate(fs.readFileSync(".upload/seed.sql.b64z", "utf8")));

const lockParts = fs
  .readdirSync(".upload")
  .filter((f) => f.startsWith("package-lock.json.b64z."))
  .sort();
let lockOk = false;
if (lockParts.length) {
  try {
    const b64 = lockParts.map((f) => fs.readFileSync(path.join(".upload", f), "utf8")).join("");
    write("package-lock.json", inflate(b64));
    lockOk = true;
  } catch (e) {
    console.error("inflate lock failed:", e.message);
  }
}
if (!lockOk) {
  console.log("generating package-lock.json via npm install --package-lock-only");
  execSync("npm install --package-lock-only --ignore-scripts", { stdio: "inherit" });
  console.log("wrote package-lock.json", fs.statSync("package-lock.json").size);
}
