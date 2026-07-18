const GH_API = "https://api.github.com";
const REPO_OWNER = "Patrickjaillet";
const REPO_NAME = "sandefjord-software";
const BRANCH = "main";
const ALLOWED_LOGIN = "Patrickjaillet";
const TOKEN_STORAGE_KEY = "sandefjord_admin_token_v1";
const CHANGELOG_PATH = "CHANGELOG.md";
const SOFTWARE_PATH = "data/software.json";
const SITE_CONTENT_PATH = "data/site-content.json";

let authToken = null;
let authUser = null;
let softwareFile = null;
let siteContentFile = null;
let pendingIconUpload = null;
let pendingScreenshotUploads = [];

const app = () => document.getElementById("admin-app");

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(token, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return { salt: bufToBase64(salt), iv: bufToBase64(iv), ciphertext: bufToBase64(ciphertext) };
}

async function decryptToken(stored, passphrase) {
  const salt = new Uint8Array(base64ToBuf(stored.salt));
  const iv = new Uint8Array(base64ToBuf(stored.iv));
  const key = await deriveKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBuf(stored.ciphertext));
  return new TextDecoder().decode(plaintext);
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function ghHeaders(extra) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${authToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

async function ghApi(path, options = {}) {
  const response = await fetch(`${GH_API}${path}`, { ...options, headers: ghHeaders(options.headers) });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub API ${path} failed: ${response.status} ${body.slice(0, 300)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function getFile(path) {
  const data = await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`);
  const bytes = new Uint8Array(base64ToBuf(data.content.replace(/\n/g, "")));
  const text = new TextDecoder("utf-8").decode(bytes);
  return { text, sha: data.sha };
}

async function commitFiles(files, message) {
  const ref = await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BRANCH}`);
  const latestCommitSha = ref.object.sha;
  const latestCommit = await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${latestCommitSha}`);
  const baseTreeSha = latestCommit.tree.sha;

  const treeEntries = [];
  for (const file of files) {
    const content = file.base64 ?? utf8ToBase64(file.content);
    const blob = await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content, encoding: "base64" }),
    });
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const tree = await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });

  const commit = await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [latestCommitSha] }),
  });

  await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  return commit.sha;
}

function insertChangelogEntry(changelogText, bullet) {
  const marker = "### Added\n";
  const unreleasedIdx = changelogText.indexOf("## [Unreleased]");
  if (unreleasedIdx === -1) return changelogText;

  const addedIdx = changelogText.indexOf(marker, unreleasedIdx);
  const nextSectionIdx = changelogText.indexOf("\n## [", unreleasedIdx + 1);
  const searchLimit = nextSectionIdx === -1 ? changelogText.length : nextSectionIdx;

  if (addedIdx !== -1 && addedIdx < searchLimit) {
    const insertAt = addedIdx + marker.length;
    return `${changelogText.slice(0, insertAt)}- ${bullet}\n${changelogText.slice(insertAt)}`;
  }

  const insertAt = changelogText.indexOf("\n", unreleasedIdx) + 1;
  return `${changelogText.slice(0, insertAt)}\n### Added\n- ${bullet}\n${changelogText.slice(insertAt)}`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hasStoredToken() {
  return !!localStorage.getItem(TOKEN_STORAGE_KEY);
}

let lastCommits = [];
let activeView = "dashboard";
let dashboardSearch = "";

async function initAdmin() {
  renderLoginScreen();
}

function fjordLinesSvg() {
  return `
    <svg class="fjord-lines" viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M0 40 C 120 10, 260 80, 400 40 S 620 10, 640 50" />
      <path d="M0 90 C 130 60, 250 130, 400 90 S 610 60, 640 100" />
      <path d="M0 140 C 140 110, 260 180, 410 140 S 600 110, 640 150" />
      <path d="M0 190 C 150 160, 270 230, 420 190 S 590 160, 640 200" />
    </svg>`;
}

function renderLoginScreen() {
  const stored = hasStoredToken();
  app().innerHTML = `
    <div class="admin-login-screen">
      <div class="admin-login-brand">
        <div class="admin-login-brand-mark">
          <img src="assets/icons/favicon.svg" alt="">
          <span>SANDEFJORD SOFTWARE</span>
        </div>
        <div class="admin-login-brand-copy">
          <h1>Run the catalog from here.</h1>
          <p>Add software, curate what's featured, and publish edits straight to the live site — no server, just a signed commit.</p>
        </div>
        <div class="admin-login-brand-foot">patrickjaillet.github.io/sandefjord-software</div>
        ${fjordLinesSvg()}
      </div>
      <div class="admin-login-pane">
        <div class="admin-login-card">
          <a class="admin-login-back" href="index.html">&larr; Back to site</a>
          <h2>${stored ? "Unlock admin" : "Set up admin access"}</h2>
          <p class="field-hint">
            ${
              stored
                ? "Enter your passphrase to decrypt your stored GitHub token for this session."
                : "Paste a GitHub token (fine-grained, contents:write on this repo, or classic with the repo scope) and choose a passphrase. The token is encrypted and stored only in this browser."
            }
          </p>
          <form id="login-form">
            ${
              stored
                ? ""
                : `<div class="field">
                     <label for="pat-input">GitHub token</label>
                     <input type="password" id="pat-input" autocomplete="off" required>
                   </div>`
            }
            <div class="field">
              <label for="passphrase-input">Passphrase</label>
              <input type="password" id="passphrase-input" autocomplete="off" required>
            </div>
            <div class="form-actions" style="background:none;position:static;padding:0;">
              <button type="submit" class="button button-primary" id="login-submit">${stored ? "Unlock" : "Save & continue"}</button>
              ${stored ? `<button type="button" class="button button-secondary" id="reset-token">Use a different token</button>` : ""}
            </div>
          </form>
          <p id="login-error" class="admin-login-error"></p>
        </div>
      </div>
    </div>`;

  document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
  const resetBtn = document.getElementById("reset-token");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      renderLoginScreen();
    });
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");
  errorEl.textContent = "";
  const passphrase = document.getElementById("passphrase-input").value;
  const stored = hasStoredToken();

  submitBtn.disabled = true;
  submitBtn.textContent = "Verifying...";

  try {
    let token;
    if (stored) {
      const storedData = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY));
      token = await decryptToken(storedData, passphrase);
    } else {
      token = document.getElementById("pat-input").value.trim();
    }

    authToken = token;
    const user = await ghApi("/user");
    if (user.login !== ALLOWED_LOGIN) {
      authToken = null;
      errorEl.textContent = `This token belongs to "${user.login}", not "${ALLOWED_LOGIN}". Access denied.`;
      submitBtn.disabled = false;
      submitBtn.textContent = stored ? "Unlock" : "Save & continue";
      return;
    }
    authUser = user;

    if (!stored) {
      const encrypted = await encryptToken(token, passphrase);
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(encrypted));
    }

    await loadDashboard();
  } catch (error) {
    authToken = null;
    errorEl.textContent = stored
      ? "Wrong passphrase, or the stored token is no longer valid."
      : `Could not verify this token: ${error.message}`;
    submitBtn.disabled = false;
    submitBtn.textContent = stored ? "Unlock" : "Save & continue";
    console.error(error);
  }
}

async function loadDashboard() {
  app().innerHTML = `<div class="admin-boot"><img src="assets/icons/favicon.svg" alt=""><p>Loading catalog...</p></div>`;
  try {
    const [software, siteContent, commits] = await Promise.all([
      getFile(SOFTWARE_PATH),
      getFile(SITE_CONTENT_PATH),
      ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=8`).catch(() => []),
    ]);
    softwareFile = { sha: software.sha, data: JSON.parse(software.text) };
    siteContentFile = { sha: siteContent.sha, data: JSON.parse(siteContent.text) };
    lastCommits = commits;
    activeView = "dashboard";
    renderShell();
  } catch (error) {
    app().innerHTML = `<div class="admin-boot"><p>Failed to load catalog: ${escapeHtml(error.message)}</p></div>`;
    console.error(error);
  }
}

function initials(name) {
  return (name || "?").slice(0, 2).toUpperCase();
}

function renderShell() {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "&#8962;" },
    { id: "site-content", label: "Homepage text", icon: "&#9998;" },
  ];

  app().innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-brand">
          <img src="assets/icons/favicon.svg" alt="" width="24" height="24">
          <span>Admin</span>
        </div>
        <ul class="admin-nav">
          ${navItems
            .map(
              (item) =>
                `<li><button type="button" class="admin-nav-item${activeView === item.id ? " active" : ""}" data-view="${item.id}"><span class="admin-nav-icon">${item.icon}</span>${item.label}</button></li>`
            )
            .join("")}
        </ul>
        <div class="admin-sidebar-foot">
          <div class="admin-sidebar-user">
            <span class="admin-avatar">${escapeHtml(initials(authUser?.login))}</span>
            <span>${escapeHtml(authUser?.login ?? "")}</span>
          </div>
          <button type="button" class="admin-sidebar-link" id="view-site-link">View live site &#8599;</button>
          <button type="button" class="admin-sidebar-link" id="logout">Sign out</button>
        </div>
      </aside>
      <div class="admin-main" id="admin-main"></div>
    </div>
  `;

  document.querySelectorAll(".admin-nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeView = btn.dataset.view;
      renderShell();
    });
  });
  document.getElementById("logout").addEventListener("click", () => {
    authToken = null;
    authUser = null;
    renderLoginScreen();
  });
  document.getElementById("view-site-link").addEventListener("click", () => window.open("index.html", "_blank"));

  if (activeView === "dashboard") renderDashboardView();
  else if (activeView === "site-content") renderSiteContentView();
  else if (activeView === "edit") renderEditFormView(editingItemId);
}

function renderDashboardView() {
  const main = document.getElementById("admin-main");
  const all = softwareFile.data.software;
  const list = [...all]
    .filter((item) => {
      if (!dashboardSearch) return true;
      const haystack = `${item.name} ${item.id} ${item.category}`.toLowerCase();
      return haystack.includes(dashboardSearch.toLowerCase());
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));

  const visibleCount = all.filter((i) => !i.hidden).length;
  const hiddenCount = all.length - visibleCount;
  const syncedCount = all.filter((i) => i.githubRepoId).length;

  const rows = list.length
    ? list
        .map((item, index) => {
          const fullIndex = [...all].sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)).findIndex((e) => e.id === item.id);
          return `
        <tr>
          <td>
            <div class="admin-row-name">
              <img class="admin-row-icon" src="${item.icon}" alt="">
              <div>
                <div class="admin-row-title">${escapeHtml(item.name)}${item.hidden ? `<span class="badge-hidden">Hidden</span>` : ""}</div>
                <div class="admin-row-id">${escapeHtml(item.id)}</div>
              </div>
            </div>
          </td>
          <td><span class="category-pill">${escapeHtml(item.category)}</span></td>
          <td class="mono">v${escapeHtml(item.version)}</td>
          <td><span class="source-pill">${item.githubRepoId ? "&#128279; GitHub sync" : "&#9998; Manual"}</span></td>
          <td class="actions">
            <button class="icon-button" data-action="reorder-up" data-id="${item.id}" title="Move up" ${fullIndex === 0 ? "disabled" : ""}>&uarr;</button>
            <button class="icon-button" data-action="reorder-down" data-id="${item.id}" title="Move down" ${fullIndex === all.length - 1 ? "disabled" : ""}>&darr;</button>
            <button class="icon-button" data-action="edit" data-id="${item.id}" title="Edit">&#9998;</button>
            <button class="icon-button" data-action="toggle-hidden" data-id="${item.id}" title="${item.hidden ? "Show on site" : "Hide from site"}" style="width:auto;padding:0 0.5rem;font-size:var(--step--1);">${item.hidden ? "Show" : "Hide"}</button>
            <button class="icon-button danger" data-action="delete" data-id="${item.id}" title="Delete">&#128465;</button>
          </td>
        </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" class="admin-empty">No software matches.</td></tr>`;

  const activityHtml = lastCommits.length
    ? lastCommits
        .map(
          (commit) => `
        <li>
          <span class="activity-dot"></span>
          <div>
            <a href="${commit.html_url}" target="_blank" rel="noopener">${escapeHtml(commit.commit.message.split("\n")[0])}</a>
            <div class="activity-meta">${escapeHtml(commit.commit.author?.name ?? "unknown")} &middot; ${escapeHtml(new Date(commit.commit.author?.date ?? Date.now()).toLocaleString())}</div>
          </div>
        </li>`
        )
        .join("")
    : `<li class="admin-empty">No recent activity.</li>`;

  main.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Dashboard</h1>
        <div class="admin-topbar-sub">Writes commit directly to <code>main</code> and go live immediately.</div>
      </div>
      <div class="admin-topbar-actions">
        <button class="button button-secondary" id="force-sync">Force sync now</button>
        <button class="button button-primary" id="add-software">+ Add software</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">${all.length}</div><div class="stat-card-label">Total software</div></div>
      <div class="stat-card"><div class="stat-card-value">${visibleCount}</div><div class="stat-card-label">Visible</div></div>
      <div class="stat-card"><div class="stat-card-value">${hiddenCount}</div><div class="stat-card-label">Hidden</div></div>
      <div class="stat-card"><div class="stat-card-value">${syncedCount}</div><div class="stat-card-label">GitHub-synced</div></div>
    </div>

    <div class="admin-card">
      <div class="admin-toolbar">
        <input type="search" class="admin-search" id="dashboard-search" placeholder="Search software..." value="${escapeHtml(dashboardSearch)}">
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Software</th><th>Category</th><th>Version</th><th>Source</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div class="admin-card">
      <h2>Recent activity</h2>
      <ul class="activity-log">${activityHtml}</ul>
    </div>
  `;

  document.getElementById("add-software").addEventListener("click", () => {
    editingItemId = null;
    activeView = "edit";
    renderShell();
  });

  document.getElementById("force-sync").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Triggering...";
    try {
      await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/sync.yml/dispatches`, {
        method: "POST",
        body: JSON.stringify({ ref: BRANCH }),
      });
      showToast("Sync triggered — the catalog will refresh in a minute or two.");
    } catch (error) {
      showToast(`Failed to trigger sync: ${error.message}`, true);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  document.getElementById("dashboard-search").addEventListener("input", (event) => {
    dashboardSearch = event.target.value;
    renderDashboardView();
  });

  main.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleDashboardAction(button.dataset.action, button.dataset.id));
  });
}

async function handleDashboardAction(action, id) {
  const item = softwareFile.data.software.find((entry) => entry.id === id);
  if (!item) return;

  if (action === "edit") {
    editingItemId = id;
    activeView = "edit";
    renderShell();
    return;
  }

  if (action === "toggle-hidden") {
    item.hidden = !item.hidden;
    await saveCatalog(`${item.hidden ? "Hide" : "Show"} ${item.name} on the site`);
    return;
  }

  if (action === "delete") {
    const ok = await confirmModal(
      `Delete "${item.name}"?`,
      "This removes it from the catalog immediately. Uploaded assets stay in the repo but this cannot be undone from the admin panel."
    );
    if (!ok) return;
    softwareFile.data.software = softwareFile.data.software.filter((entry) => entry.id !== id);
    await saveCatalog(`Remove ${item.name} from the catalog`);
    return;
  }

  if (action === "reorder-up" || action === "reorder-down") {
    const list = [...softwareFile.data.software].sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)
    );
    const index = list.findIndex((entry) => entry.id === id);
    const swapWith = action === "reorder-up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    list.forEach((entry, i) => (entry.order = i));
    const a = list[index];
    const b = list[swapWith];
    [a.order, b.order] = [b.order, a.order];
    await saveCatalog(`Reorder ${a.name} and ${b.name}`);
  }
}

function confirmModal(title, message) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal-card">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button type="button" class="button button-secondary" id="modal-cancel">Cancel</button>
          <button type="button" class="button button-danger" id="modal-confirm">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    function close(result) {
      backdrop.remove();
      resolve(result);
    }

    backdrop.querySelector("#modal-cancel").addEventListener("click", () => close(false));
    backdrop.querySelector("#modal-confirm").addEventListener("click", () => close(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(false);
    });
  });
}

function showToast(message, isError) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.innerHTML = `<span>${isError ? "&#9888;" : "&#10003;"}</span><span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

async function saveCatalog(actionDescription) {
  try {
    const changelog = await getFile(CHANGELOG_PATH);
    const updatedChangelog = insertChangelogEntry(changelog.text, actionDescription);
    const softwareJson = `${JSON.stringify(softwareFile.data, null, 2)}\n`;

    await commitFiles(
      [
        { path: SOFTWARE_PATH, content: softwareJson },
        { path: `docs/${SOFTWARE_PATH}`, content: softwareJson },
        { path: CHANGELOG_PATH, content: updatedChangelog },
      ],
      `chore(admin): ${actionDescription.charAt(0).toLowerCase()}${actionDescription.slice(1)}`
    );

    showToast("Saved and published.");
    await loadDashboard();
  } catch (error) {
    showToast(`Failed to save: ${error.message}`, true);
    console.error(error);
  }
}

let editingItemId = null;

function emptySoftwareForm() {
  return {
    id: "",
    name: "",
    shortDescription: "",
    description: "",
    category: "Utilities",
    tags: [],
    hidden: false,
    order: softwareFile.data.software.length,
    icon: "assets/icons/default-app.svg",
    screenshots: [],
    systemRequirements: "Windows 10/11, 64-bit",
    downloadUrl: "",
    repositoryUrl: "",
    changelog: [],
    versionHistory: [],
    githubRepoId: null,
  };
}

function renderPreviewCard(state) {
  return `
    <a class="software-card admin-preview-card" href="#" onclick="return false;" style="box-shadow:none;">
      <div class="software-card-top">
        <img class="software-card-icon" src="${state.iconSrc}" alt="" loading="lazy">
        <div>
          <span class="software-card-category">${escapeHtml(state.category || "Category")}</span>
          <h2 class="software-card-title">${escapeHtml(state.name || "Untitled")}</h2>
        </div>
      </div>
      <p class="software-card-desc">${escapeHtml(state.shortDescription || "Short description goes here.")}</p>
      ${
        state.tags.length
          ? `<div class="software-card-tags">${state.tags.slice(0, 4).map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>`
          : ""
      }
      <div class="software-card-footer">
        <span class="version-tag">v${escapeHtml(state.version || "0.0.0")}</span>
        <span class="software-card-link">View details</span>
      </div>
    </a>`;
}

function renderEditFormView(id) {
  const main = document.getElementById("admin-main");
  const item = id ? softwareFile.data.software.find((entry) => entry.id === id) : null;
  const isNew = !item;
  const form = item ? { ...item } : emptySoftwareForm();

  pendingIconUpload = null;
  pendingScreenshotUploads = [];
  const currentScreenshots = [...(form.screenshots || [])];
  const latestChangelog = (form.changelog || [])[0];

  main.innerHTML = `
    <div class="admin-topbar">
      <div>
        <button class="button button-secondary button-small" id="back-to-dashboard">&larr; Back</button>
        <h1 style="margin-top:0.75rem;">${isNew ? "Add software" : `Edit ${escapeHtml(form.name)}`}</h1>
      </div>
    </div>

    <div class="admin-form-layout">
      <form id="software-form">
        <div class="admin-card">
          <h2>Basic info</h2>
          <div class="field-row">
            <div class="field">
              <label for="f-name">Name</label>
              <input type="text" id="f-name" value="${escapeHtml(form.name)}" required>
            </div>
            <div class="field">
              <label for="f-id">ID (slug, used in the URL)</label>
              <input type="text" id="f-id" value="${escapeHtml(form.id)}" ${isNew ? "" : "readonly"} required>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-category">Category</label>
              <input type="text" id="f-category" value="${escapeHtml(form.category)}">
            </div>
            <div class="field">
              <label for="f-tags">Tags (comma-separated)</label>
              <input type="text" id="f-tags" value="${escapeHtml((form.tags || []).join(", "))}">
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h2>Content</h2>
          <div class="field">
            <label for="f-short">Short description (card summary)</label>
            <textarea id="f-short" rows="2">${escapeHtml(form.shortDescription)}</textarea>
          </div>
          <div class="field">
            <label for="f-desc">Full description</label>
            <textarea id="f-desc" rows="6">${escapeHtml(form.description)}</textarea>
          </div>
          <div class="field">
            <label for="f-requirements">System requirements</label>
            <input type="text" id="f-requirements" value="${escapeHtml(form.systemRequirements)}">
          </div>
        </div>

        <div class="admin-card">
          <h2>Media</h2>
          <div class="field">
            <label>Icon</label>
            <div class="icon-preview">
              <img id="icon-preview-img" src="${form.icon}" alt="">
              <div class="upload-zone" style="flex:1;">
                <input type="file" id="f-icon" accept="image/*">
                <span class="upload-zone-hint">Click or drop an image to replace the icon</span>
              </div>
            </div>
          </div>
          <div class="field">
            <label>Screenshots</label>
            <div class="upload-zone">
              <input type="file" id="f-screenshots" accept="image/*" multiple>
              <span class="upload-zone-hint">Click or drop images to add screenshots — drag tiles to reorder</span>
            </div>
            <ul class="asset-grid" id="screenshot-list"></ul>
          </div>
        </div>

        <div class="admin-card">
          <h2>Publishing</h2>
          <div class="field">
            <label for="f-download">Download URL ${form.githubRepoId ? "(auto-managed from GitHub Releases)" : ""}</label>
            <input type="url" id="f-download" value="${escapeHtml(form.downloadUrl)}" ${form.githubRepoId ? "readonly" : ""}>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-order">Homepage order (lower shows first)</label>
              <input type="number" id="f-order" value="${form.order ?? 999}">
            </div>
          </div>
          <div class="field checkbox-field">
            <input type="checkbox" id="f-hidden" ${form.hidden ? "checked" : ""}>
            <label for="f-hidden">Hidden from homepage &amp; downloads listing</label>
          </div>
        </div>

        ${
          !isNew && latestChangelog
            ? `<div class="admin-card">
                 <h2>Changelog</h2>
                 <div class="field">
                   <label for="f-changelog-notes">Current version (v${escapeHtml(latestChangelog.version)}) — one bullet per line</label>
                   <textarea id="f-changelog-notes" rows="5">${escapeHtml((latestChangelog.notes || []).join("\n"))}</textarea>
                 </div>
               </div>`
            : ""
        }

        <div class="form-actions">
          <button type="submit" class="button button-primary">Commit changes</button>
          <button type="button" class="button button-secondary" id="cancel-edit">Cancel</button>
        </div>
      </form>

      <aside class="admin-preview">
        <div class="admin-card">
          <h2>Live preview</h2>
          <div id="preview-card"></div>
        </div>
      </aside>
    </div>
  `;

  const previewState = {
    name: form.name,
    shortDescription: form.shortDescription,
    category: form.category,
    tags: form.tags || [],
    version: form.version,
    iconSrc: form.icon,
  };

  function updatePreview() {
    previewState.name = document.getElementById("f-name").value;
    previewState.shortDescription = document.getElementById("f-short").value;
    previewState.category = document.getElementById("f-category").value;
    previewState.tags = document
      .getElementById("f-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    document.getElementById("preview-card").innerHTML = renderPreviewCard(previewState);
  }

  ["f-name", "f-short", "f-category", "f-tags"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updatePreview);
  });
  updatePreview();

  document.getElementById("f-name").addEventListener("input", (event) => {
    if (isNew) document.getElementById("f-id").value = slugify(event.target.value);
  });

  document.getElementById("back-to-dashboard").addEventListener("click", () => {
    activeView = "dashboard";
    renderShell();
  });
  document.getElementById("cancel-edit").addEventListener("click", () => {
    activeView = "dashboard";
    renderShell();
  });

  document.getElementById("f-icon").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const iconId = document.getElementById("f-id").value || "new-app";
    const base64 = await fileToBase64(file);
    pendingIconUpload = { path: `assets/icons/${iconId}.${ext}`, base64 };
    document.getElementById("icon-preview-img").src = `data:image/*;base64,${base64}`;
    previewState.iconSrc = `data:image/*;base64,${base64}`;
    updatePreview();
  });

  const screenshotPreviewByPath = {};
  const screenshotList = document.getElementById("screenshot-list");
  let screenshotDragIndex = null;

  function renderScreenshotTiles() {
    screenshotList.innerHTML = currentScreenshots
      .map((path, i) => {
        const preview = screenshotPreviewByPath[path];
        return `
        <li class="asset-tile" draggable="true" data-index="${i}">
          <img src="${preview || path}" alt="">
          ${preview ? `<span class="asset-tile-new">New</span>` : ""}
          <button type="button" class="asset-tile-remove" data-remove-screenshot="${i}" title="Remove">&times;</button>
        </li>`;
      })
      .join("");

    screenshotList.querySelectorAll("[data-remove-screenshot]").forEach((button) => {
      button.addEventListener("click", () => {
        currentScreenshots.splice(Number(button.dataset.removeScreenshot), 1);
        renderScreenshotTiles();
      });
    });

    screenshotList.querySelectorAll(".asset-tile").forEach((tile) => {
      tile.addEventListener("dragstart", () => {
        screenshotDragIndex = Number(tile.dataset.index);
        tile.classList.add("is-dragging");
      });
      tile.addEventListener("dragend", () => {
        tile.classList.remove("is-dragging");
      });
      tile.addEventListener("dragover", (event) => {
        event.preventDefault();
        tile.classList.add("is-drop-target");
      });
      tile.addEventListener("dragleave", () => {
        tile.classList.remove("is-drop-target");
      });
      tile.addEventListener("drop", (event) => {
        event.preventDefault();
        tile.classList.remove("is-drop-target");
        const dropIndex = Number(tile.dataset.index);
        if (screenshotDragIndex === null || screenshotDragIndex === dropIndex) return;
        const [moved] = currentScreenshots.splice(screenshotDragIndex, 1);
        currentScreenshots.splice(dropIndex, 0, moved);
        screenshotDragIndex = null;
        renderScreenshotTiles();
      });
    });
  }

  renderScreenshotTiles();

  document.getElementById("f-screenshots").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    const iconId = document.getElementById("f-id").value || "new-app";
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `assets/screenshots/${iconId}-${Date.now()}-${pendingScreenshotUploads.length}.${ext}`;
      const base64 = await fileToBase64(file);
      pendingScreenshotUploads.push({ path, base64 });
      screenshotPreviewByPath[path] = `data:image/*;base64,${base64}`;
      currentScreenshots.push(path);
    }
    renderScreenshotTiles();
  });

  document.getElementById("software-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("f-id").value.trim();
    if (!id) return;
    if (isNew && softwareFile.data.software.some((entry) => entry.id === id)) {
      showToast(`ID "${id}" already exists.`, true);
      return;
    }

    const tags = document
      .getElementById("f-tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const updated = {
      ...form,
      id,
      name: document.getElementById("f-name").value.trim(),
      shortDescription: document.getElementById("f-short").value.trim(),
      description: document.getElementById("f-desc").value.trim(),
      category: document.getElementById("f-category").value.trim() || "Utilities",
      tags,
      systemRequirements: document.getElementById("f-requirements").value.trim(),
      downloadUrl: document.getElementById("f-download").value.trim(),
      order: Number(document.getElementById("f-order").value) || 0,
      hidden: document.getElementById("f-hidden").checked,
      screenshots: currentScreenshots,
      icon: pendingIconUpload ? pendingIconUpload.path : form.icon,
    };

    const notesField = document.getElementById("f-changelog-notes");
    if (notesField && updated.changelog && updated.changelog[0]) {
      updated.changelog = [...updated.changelog];
      updated.changelog[0] = {
        ...updated.changelog[0],
        notes: notesField.value.split("\n").map((line) => line.trim()).filter(Boolean),
        manuallyEdited: true,
      };
    }

    if (isNew) {
      softwareFile.data.software.push(updated);
    } else {
      const index = softwareFile.data.software.findIndex((entry) => entry.id === item.id);
      softwareFile.data.software[index] = updated;
    }

    const submitBtn = event.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    await saveSoftwareWithAssets(isNew ? `Add ${updated.name} to the catalog` : `Update ${updated.name}`);
  });
}

async function saveSoftwareWithAssets(actionDescription) {
  const assetFiles = [];
  if (pendingIconUpload) assetFiles.push(pendingIconUpload, { ...pendingIconUpload, path: `docs/${pendingIconUpload.path}` });
  for (const upload of pendingScreenshotUploads) {
    assetFiles.push(upload, { ...upload, path: `docs/${upload.path}` });
  }

  try {
    const changelog = await getFile(CHANGELOG_PATH);
    const updatedChangelog = insertChangelogEntry(changelog.text, actionDescription);
    const softwareJson = `${JSON.stringify(softwareFile.data, null, 2)}\n`;

    await commitFiles(
      [
        { path: SOFTWARE_PATH, content: softwareJson },
        { path: `docs/${SOFTWARE_PATH}`, content: softwareJson },
        { path: CHANGELOG_PATH, content: updatedChangelog },
        ...assetFiles,
      ],
      `chore(admin): ${actionDescription.charAt(0).toLowerCase()}${actionDescription.slice(1)}`
    );

    showToast("Saved and published.");
    pendingIconUpload = null;
    pendingScreenshotUploads = [];
    await loadDashboard();
  } catch (error) {
    showToast(`Failed to save: ${error.message}`, true);
    console.error(error);
  }
}

function renderSiteContentView() {
  const main = document.getElementById("admin-main");
  const content = siteContentFile.data;

  main.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Homepage text</h1>
        <div class="admin-topbar-sub">Copyright, creator, and repository details on the About page are fixed identity/legal facts and are not editable here.</div>
      </div>
    </div>

    <div class="admin-card" style="max-width:640px;">
      <form id="site-content-form">
        <div class="field">
          <label for="sc-eyebrow">Eyebrow</label>
          <input type="text" id="sc-eyebrow" value="${escapeHtml(content.heroEyebrow ?? "")}">
        </div>
        <div class="field">
          <label for="sc-title">Title</label>
          <input type="text" id="sc-title" value="${escapeHtml(content.heroTitle ?? "")}">
        </div>
        <div class="field">
          <label for="sc-lede">Lede</label>
          <textarea id="sc-lede" rows="3">${escapeHtml(content.heroLede ?? "")}</textarea>
        </div>
        <div class="form-actions" style="position:static;background:none;padding:0;">
          <button type="submit" class="button button-primary">Commit changes</button>
          <button type="button" class="button button-secondary" id="cancel-site-content">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("cancel-site-content").addEventListener("click", () => {
    activeView = "dashboard";
    renderShell();
  });

  document.getElementById("site-content-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    siteContentFile.data = {
      heroEyebrow: document.getElementById("sc-eyebrow").value.trim(),
      heroTitle: document.getElementById("sc-title").value.trim(),
      heroLede: document.getElementById("sc-lede").value.trim(),
    };

    const submitBtn = event.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      const changelog = await getFile(CHANGELOG_PATH);
      const updatedChangelog = insertChangelogEntry(changelog.text, "Update homepage text");
      const siteContentJson = `${JSON.stringify(siteContentFile.data, null, 2)}\n`;
      await commitFiles(
        [
          { path: SITE_CONTENT_PATH, content: siteContentJson },
          { path: `docs/${SITE_CONTENT_PATH}`, content: siteContentJson },
          { path: CHANGELOG_PATH, content: updatedChangelog },
        ],
        "chore(admin): update homepage text"
      );
      showToast("Saved and published.");
      await loadDashboard();
    } catch (error) {
      showToast(`Failed to save: ${error.message}`, true);
      console.error(error);
      submitBtn.disabled = false;
      submitBtn.textContent = "Commit changes";
    }
  });
}
