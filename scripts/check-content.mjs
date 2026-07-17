// Phase 8: periodic content review — flags dead download links and archived
// source repositories so stale content doesn't sit unnoticed on the site.

import { readFile, appendFile } from "node:fs/promises";

const OWNER = "Patrickjaillet";
const API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function apiHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.ok ? null : `${response.status} ${response.statusText}`;
  } catch (error) {
    return error.message;
  }
}

async function checkRepoArchived(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const [, owner, repo] = match;
  try {
    const response = await fetch(`${API}/repos/${owner}/${repo}`, { headers: apiHeaders() });
    if (!response.ok) return `repository lookup failed: ${response.status}`;
    const data = await response.json();
    return data.archived ? "repository is archived" : null;
  } catch (error) {
    return error.message;
  }
}

async function checkSoftware(item) {
  const problems = [];

  const downloadProblem = await checkUrl(item.downloadUrl);
  if (downloadProblem) problems.push(`current download link broken (${downloadProblem}): ${item.downloadUrl}`);

  const archivedProblem = await checkRepoArchived(item.repositoryUrl);
  if (archivedProblem) problems.push(archivedProblem);

  const latestVersion = (item.versionHistory || [])[0];
  for (const asset of latestVersion?.assets || []) {
    const problem = await checkUrl(asset.url);
    if (problem) problems.push(`latest release asset broken (${problem}): ${asset.url}`);
  }

  return { name: item.name, id: item.id, problems };
}

async function run() {
  const raw = await readFile("data/software.json", "utf8");
  const catalog = JSON.parse(raw);

  const results = [];
  for (const item of catalog.software) {
    results.push(await checkSoftware(item));
  }

  const withProblems = results.filter((r) => r.problems.length > 0);

  if (withProblems.length === 0) {
    console.log(`Content review: no issues found across ${results.length} software entries.`);
    process.exit(0);
  }

  console.log(`Content review: issues found in ${withProblems.length}/${results.length} software entries.\n`);
  const lines = [];
  for (const result of withProblems) {
    lines.push(`### ${result.name} (\`${result.id}\`)`);
    for (const problem of result.problems) lines.push(`- ${problem}`);
    lines.push("");
  }
  const report = lines.join("\n");
  console.log(report);

  if (process.env.GITHUB_OUTPUT) {
    const delimiter = "REPORT_EOF";
    await appendFile(process.env.GITHUB_OUTPUT, `report<<${delimiter}\n${report}\n${delimiter}\n`);
  }
  process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
