import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("docs");
const PORT = Number(process.env.PORT) || 4173;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  let filePath = path.join(ROOT, decoded);
  if (!filePath.startsWith(ROOT)) return null;

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    filePath = path.join(ROOT, "404.html");
  }

  try {
    return { filePath, content: await readFile(filePath) };
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const result = await resolveFile(request.url || "/");
  if (!result) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }
  const ext = path.extname(result.filePath);
  response.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  response.end(result.content);
});

server.listen(PORT, () => {
  console.log(`Serving docs/ at http://localhost:${PORT}`);
});
