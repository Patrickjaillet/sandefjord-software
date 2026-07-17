// Phase 3: discovers software repositories by GitHub topic and regenerates
// data/software.json from their GitHub Releases (version, changelog, assets).
//
// Convention: any repository owned by OWNER tagged with the GitHub topic
// TOPIC is treated as a Sandefjord Software product. New repositories with
// that topic appear on the site automatically; repositories are matched
// across renames using their stable GitHub repo id.

import { readFile, writeFile } from "node:fs/promises";

const OWNER = "Patrickjaillet";
const TOPIC = "sandefjord-software";
const SITE_REPO = "sandefjord-software";
const DATA_FILE = "data/software.json";
const DEFAULT_ICON = "assets/icons/default-app.svg";
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

async function api(path) {
  const response = await fetch(`${API}${path}`, { headers: apiHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function findSoftwareRepos() {
  const repos = [];
  let page = 1;
  for (;;) {
    const data = await api(
      `/search/repositories?q=topic:${TOPIC}+user:${OWNER}&per_page=100&page=${page}`
    );
    repos.push(...data.items);
    if (data.items.length < 100) break;
    page += 1;
  }
  return repos.filter((repo) => !repo.archived && repo.name !== SITE_REPO);
}

async function fetchPublishedReleases(owner, repo) {
  const releases = await api(`/repos/${owner}/${repo}/releases?per_page=50`);
  return releases
    .filter((release) => !release.draft)
    .sort((a, b) => new Date(b.published_at ?? b.created_at) - new Date(a.published_at ?? a.created_at));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function versionFromTag(tag) {
  return tag.replace(/^v/i, "");
}

function pickPrimaryAsset(assets) {
  const installer = assets.find((asset) => /\.(exe|msi)$/i.test(asset.name));
  if (installer) return installer;
  const archive = assets.find((asset) => /\.zip$/i.test(asset.name));
  return archive ?? assets[0] ?? null;
}

function notesFromBody(body) {
  if (!body || !body.trim()) return ["No release notes provided."];
  const lines = body
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : [body.trim()];
}

async function buildEntry(repo, existingByGithubId) {
  const existing = existingByGithubId.get(repo.id);
  const releases = await fetchPublishedReleases(repo.owner.login, repo.name);

  if (!releases.length) {
    if (existing) {
      console.warn(`${repo.full_name}: no published releases, keeping previous catalog entry`);
      return { ...existing, name: existing.name, repositoryUrl: repo.html_url };
    }
    console.warn(`${repo.full_name}: no published releases yet, skipping until first release`);
    return null;
  }

  const latestStable = releases.find((release) => !release.prerelease) ?? releases[0];

  const changelog = releases.map((release) => ({
    version: versionFromTag(release.tag_name),
    date: (release.published_at ?? release.created_at).slice(0, 10),
    notes: notesFromBody(release.body),
    prerelease: release.prerelease,
  }));

  const versionHistory = releases.map((release) => ({
    version: versionFromTag(release.tag_name),
    date: (release.published_at ?? release.created_at).slice(0, 10),
    prerelease: release.prerelease,
    assets: (release.assets || []).map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size,
    })),
  }));

  const primaryAsset = pickPrimaryAsset(latestStable.assets || []);
  const downloadUrl = primaryAsset ? primaryAsset.browser_download_url : latestStable.html_url;
  const fallbackDescription = repo.description || "No description provided yet.";

  return {
    id: existing?.id ?? slugify(repo.name),
    githubRepoId: repo.id,
    name: existing?.name ?? repo.name,
    shortDescription: existing?.shortDescription ?? fallbackDescription.slice(0, 140),
    description: existing?.description ?? fallbackDescription,
    version: versionFromTag(latestStable.tag_name),
    prerelease: latestStable.prerelease,
    category: existing?.category ?? "Utilities",
    icon: existing?.icon ?? DEFAULT_ICON,
    screenshots: existing?.screenshots ?? [],
    systemRequirements: existing?.systemRequirements ?? "Windows 10/11, 64-bit",
    downloadUrl,
    repositoryUrl: repo.html_url,
    changelog,
    versionHistory,
  };
}

async function loadExistingCatalog() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw).software ?? [];
  } catch {
    return [];
  }
}

async function sync() {
  const existingCatalog = await loadExistingCatalog();
  const existingByGithubId = new Map(
    existingCatalog.filter((entry) => entry.githubRepoId).map((entry) => [entry.githubRepoId, entry])
  );
  const existingBySlug = new Map(existingCatalog.map((entry) => [entry.id, entry]));

  const repos = await findSoftwareRepos();
  console.log(`Found ${repos.length} repositories tagged "${TOPIC}" under ${OWNER}`);

  const entries = [];
  for (const repo of repos) {
    try {
      const entry = await buildEntry(repo, existingByGithubId);
      if (entry) entries.push(entry);
    } catch (error) {
      console.error(`Failed to sync ${repo.full_name}: ${error.message}`);
      const fallback = existingByGithubId.get(repo.id) ?? existingBySlug.get(slugify(repo.name));
      if (fallback) entries.push(fallback);
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0 && existingCatalog.length > 0) {
    console.warn(
      "No repositories resolved this run but the catalog is not empty; keeping the existing catalog to avoid wiping the site (likely a rate limit, API error, or topic not yet applied to any repo)."
    );
    return;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    software: entries,
  };

  await writeFile(DATA_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${entries.length} software entries to ${DATA_FILE}`);
}

sync().catch((error) => {
  console.error(error);
  process.exit(1);
});
