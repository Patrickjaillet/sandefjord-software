import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "src";
const OUT_DIR = "docs";
const PARTIALS_DIR = path.join(SRC_DIR, "partials");
const SITE_URL = "https://patrickjaillet.github.io/sandefjord-software";

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

async function buildSitemap() {
  const catalog = JSON.parse(await readFile(path.join("data", "software.json"), "utf8"));
  const staticUrls = ["/", "/downloads.html", "/about.html"];
  const softwareUrls = catalog.software.map((item) => `/software.html?id=${encodeURIComponent(item.id)}`);
  const urls = [...staticUrls, ...softwareUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE_URL}${url}</loc></url>`).join("\n")}
</urlset>
`;

  await writeFile(path.join(OUT_DIR, "sitemap.xml"), xml, "utf8");
}

async function build() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const partials = await loadPartials();
  await buildPages(partials);
  await cp("assets", path.join(OUT_DIR, "assets"), { recursive: true });
  await cp("data", path.join(OUT_DIR, "data"), { recursive: true });
  await buildSitemap();
  console.log("Build complete: src -> docs (partials injected)");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
