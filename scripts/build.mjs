import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "src";
const OUT_DIR = "docs";
const PARTIALS_DIR = path.join(SRC_DIR, "partials");

async function loadPartials() {
  const files = await readdir(PARTIALS_DIR);
  const partials = {};
  for (const file of files) {
    const name = path.basename(file, ".html");
    partials[name] = await readFile(path.join(PARTIALS_DIR, file), "utf8");
  }
  return partials;
}

function injectPartials(html, partials) {
  return html.replace(/<!--\s*include:(\w+)\s*-->/g, (match, name) => {
    return partials[name] ?? match;
  });
}

async function buildPages(partials) {
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "partials") continue;
    const srcPath = path.join(SRC_DIR, entry.name);
    const outPath = path.join(OUT_DIR, entry.name);
    if (entry.isDirectory()) {
      await cp(srcPath, outPath, { recursive: true });
    } else if (entry.name.endsWith(".html")) {
      const raw = await readFile(srcPath, "utf8");
      await writeFile(outPath, injectPartials(raw, partials), "utf8");
    } else {
      await cp(srcPath, outPath);
    }
  }
}

async function build() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const partials = await loadPartials();
  await buildPages(partials);
  await cp("assets", path.join(OUT_DIR, "assets"), { recursive: true });
  await cp("data", path.join(OUT_DIR, "data"), { recursive: true });
  console.log("Build complete: src -> docs (partials injected)");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
