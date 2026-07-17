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

function showToast(message, isError) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
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

async function initAdmin() {
  renderLogin();
}

function renderLogin() {
  const stored = hasStoredToken();
  app().innerHTML = `
    <div class="admin-login">
      <h1>${stored ? "Unlock admin" : "Set up admin access"}</h1>
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
        <div class="form-actions">
          <button type="submit" class="button button-primary">${stored ? "Unlock" : "Save & continue"}</button>
          ${stored ? `<button type="button" class="button button-secondary" id="reset-token">Use a different token</button>` : ""}
        </div>
      </form>
      <p id="login-error" class="field-hint"></p>
    </div>`;

  document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
  const resetBtn = document.getElementById("reset-token");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      renderLogin();
    });
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  const passphrase = document.getElementById("passphrase-input").value;
  const stored = hasStoredToken();

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
    console.error(error);
  }
}

async function loadDashboard() {
  app().innerHTML = `<p class="loading-text">Loading catalog...</p>`;
  try {
    const [software, siteContent, commits] = await Promise.all([
      getFile(SOFTWARE_PATH),
      getFile(SITE_CONTENT_PATH),
      ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=8`).catch(() => []),
    ]);
    softwareFile = { sha: software.sha, data: JSON.parse(software.text) };
    siteContentFile = { sha: siteContent.sha, data: JSON.parse(siteContent.text) };
    renderDashboard(commits);
  } catch (error) {
    app().innerHTML = `<div class="empty-state"><p>Failed to load catalog: ${escapeHtml(error.message)}</p></div>`;
    console.error(error);
  }
}

function renderDashboard(commits) {
  const list = [...softwareFile.data.software].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)
  );

  const rows = list.length
    ? list
        .map(
          (item, index) => `
        <tr>
          <td>${escapeHtml(item.name)}${item.hidden ? ` <span class="badge-hidden">Hidden</span>` : ""}</td>
          <td>${escapeHtml(item.category)}</td>
          <td class="mono">v${escapeHtml(item.version)}</td>
          <td>${item.githubRepoId ? "GitHub sync" : "Manual"}</td>
          <td class="actions">
            <button class="button button-small" data-action="reorder-up" data-id="${item.id}" ${index === 0 ? "disabled" : ""}>&uarr;</button>
            <button class="button button-small" data-action="reorder-down" data-id="${item.id}" ${index === list.length - 1 ? "disabled" : ""}>&darr;</button>
            <button class="button button-small" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="button button-small button-secondary" data-action="toggle-hidden" data-id="${item.id}">${item.hidden ? "Show" : "Hide"}</button>
            <button class="button button-small button-danger" data-action="delete" data-id="${item.id}">Delete</button>
          </td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="5">No software yet.</td></tr>`;

  const activityHtml = commits.length
    ? commits
        .map(
          (commit) => `
        <li>
          <a href="${commit.html_url}" target="_blank" rel="noopener">${escapeHtml(commit.commit.message.split("\n")[0])}</a>
          <div class="activity-meta">${escapeHtml(commit.commit.author?.name ?? "unknown")} &middot; ${escapeHtml(new Date(commit.commit.author?.date ?? Date.now()).toLocaleString())}</div>
        </li>`
        )
        .join("")
    : `<li>No recent activity.</li>`;

  app().innerHTML = `
    <div class="admin-toolbar">
      <div>
        <span class="admin-badge">${escapeHtml(authUser?.login ?? "")}</span>
        <span class="field-hint">Signed in — writes commit directly to <code>main</code>.</span>
      </div>
      <div class="form-actions">
        <button class="button button-primary" id="add-software">+ Add software</button>
        <button class="button button-secondary" id="edit-site-content">Edit homepage text</button>
        <button class="button button-secondary" id="logout">Sign out</button>
      </div>
    </div>

    <section class="admin-section">
      <h2>Software (${list.length})</h2>
      <table class="admin-table">
        <thead>
          <tr><th>Name</th><th>Category</th><th>Version</th><th>Source</th><th>Actions</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    <section class="admin-section">
      <h2>Recent activity</h2>
      <ul class="activity-log">${activityHtml}</ul>
    </section>
  `;

  document.getElementById("add-software").addEventListener("click", () => renderEditForm(null));
  document.getElementById("edit-site-content").addEventListener("click", renderSiteContentForm);
  document.getElementById("logout").addEventListener("click", () => {
    authToken = null;
    authUser = null;
    renderLogin();
  });

  app().querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleDashboardAction(button.dataset.action, button.dataset.id));
  });
}

async function handleDashboardAction(action, id) {
  const item = softwareFile.data.software.find((entry) => entry.id === id);
  if (!item) return;

  if (action === "edit") {
    renderEditForm(item);
    return;
  }

  if (action === "toggle-hidden") {
    item.hidden = !item.hidden;
    await saveCatalog(`chore(admin): ${item.hidden ? "hide" : "show"} ${item.name}`);
    return;
  }

  if (action === "delete") {
    if (!confirm(`Delete "${item.name}" from the catalog? This cannot be undone from the admin panel.`)) return;
    softwareFile.data.software = softwareFile.data.software.filter((entry) => entry.id !== id);
    await saveCatalog(`chore(admin): remove ${item.name} from the catalog`);
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
    await saveCatalog(`chore(admin): reorder ${a.name} and ${b.name}`);
  }
}

async function saveCatalog(commitMessage) {
  try {
    const changelog = await getFile(CHANGELOG_PATH);
    const updatedChangelog = insertChangelogEntry(changelog.text, commitMessage.replace(/^chore\(admin\): /, ""));
    const softwareJson = `${JSON.stringify(softwareFile.data, null, 2)}\n`;

    await commitFiles(
      [
        { path: SOFTWARE_PATH, content: softwareJson },
        { path: `docs/${SOFTWARE_PATH}`, content: softwareJson },
        { path: CHANGELOG_PATH, content: updatedChangelog },
      ],
      commitMessage
    );

    showToast("Saved and published.");
    await loadDashboard();
  } catch (error) {
    showToast(`Failed to save: ${error.message}`, true);
    console.error(error);
  }
}

function renderEditForm(item) {
  const isNew = !item;
  const form = item ?? {
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

  pendingIconUpload = null;
  pendingScreenshotUploads = [];

  const latestChangelog = (form.changelog || [])[0];

  app().innerHTML = `
    <button class="button button-secondary" id="back-to-dashboard">&larr; Back</button>
    <h1>${isNew ? "Add software" : `Edit ${escapeHtml(form.name)}`}</h1>

    <div class="admin-form-layout">
      <form id="software-form">
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

        <div class="field">
          <label for="f-short">Short description (card summary)</label>
          <textarea id="f-short" rows="2">${escapeHtml(form.shortDescription)}</textarea>
        </div>

        <div class="field">
          <label for="f-desc">Full description</label>
          <textarea id="f-desc" rows="6">${escapeHtml(form.description)}</textarea>
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

        <div class="field">
          <label for="f-requirements">System requirements</label>
          <input type="text" id="f-requirements" value="${escapeHtml(form.systemRequirements)}">
        </div>

        <div class="field">
          <label for="f-download">Download URL ${form.githubRepoId ? "(auto-managed from GitHub Releases)" : ""}</label>
          <input type="url" id="f-download" value="${escapeHtml(form.downloadUrl)}" ${form.githubRepoId ? "readonly" : ""}>
        </div>

        ${
          !isNew && latestChangelog
            ? `<div class="field">
                 <label for="f-changelog-notes">Current version (v${escapeHtml(latestChangelog.version)}) changelog notes — one bullet per line</label>
                 <textarea id="f-changelog-notes" rows="4">${escapeHtml((latestChangelog.notes || []).join("\n"))}</textarea>
               </div>`
            : ""
        }

        <div class="field">
          <label for="f-order">Homepage order (lower shows first)</label>
          <input type="number" id="f-order" value="${form.order ?? 999}">
        </div>

        <div class="field checkbox-field">
          <input type="checkbox" id="f-hidden" ${form.hidden ? "checked" : ""}>
          <label for="f-hidden" style="margin:0;">Hidden from homepage &amp; downloads listing</label>
        </div>

        <div class="field">
          <label for="f-icon">Icon (replaces current)</label>
          <input type="file" id="f-icon" accept="image/*">
          <div class="field-hint">Current: <code>${escapeHtml(form.icon)}</code></div>
        </div>

        <div class="field">
          <label for="f-screenshots">Add screenshots</label>
          <input type="file" id="f-screenshots" accept="image/*" multiple>
          <ul class="asset-list" id="screenshot-list">
            ${(form.screenshots || [])
              .map(
                (src, i) =>
                  `<li><img src="${src}" alt=""><span>${escapeHtml(src.split("/").pop())}</span>
                     <button type="button" class="button button-small button-danger" data-remove-screenshot="${i}">&times;</button></li>`
              )
              .join("")}
          </ul>
        </div>

        <div class="form-actions">
          <button type="submit" class="button button-primary">Commit changes</button>
          <button type="button" class="button button-secondary" id="cancel-edit">Cancel</button>
        </div>
      </form>

      <aside class="admin-preview">
        <h2>Live preview</h2>
        <div id="preview-card"></div>
      </aside>
    </div>
  `;

  const currentScreenshots = [...(form.screenshots || [])];

  const previewState = { ...form };
  function updatePreview() {
    previewState.name = document.getElementById("f-name").value || "Untitled";
    previewState.shortDescription = document.getElementById("f-short").value;
    previewState.category = document.getElementById("f-category").value;
    previewState.version = form.version || "0.0.0";
    document.getElementById("preview-card").innerHTML = `
      <a class="software-card" href="#" onclick="return false;">
        <div class="software-card-top">
          <img class="software-card-icon" src="${form.icon}" alt="" loading="lazy">
          <div>
            <span class="software-card-category">${escapeHtml(previewState.category)}</span>
            <h2 class="software-card-title">${escapeHtml(previewState.name)}</h2>
          </div>
        </div>
        <p class="software-card-desc">${escapeHtml(previewState.shortDescription)}</p>
        <div class="software-card-footer">
          <span class="version-tag">v${escapeHtml(previewState.version)}</span>
          <span class="software-card-link">View details</span>
        </div>
      </a>`;
  }

  ["f-name", "f-short", "f-category"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updatePreview);
  });
  updatePreview();

  document.getElementById("f-name").addEventListener("input", (event) => {
    if (isNew) document.getElementById("f-id").value = slugify(event.target.value);
  });

  document.getElementById("back-to-dashboard").addEventListener("click", () => renderDashboard([]));
  document.getElementById("cancel-edit").addEventListener("click", loadDashboard);

  document.getElementById("f-icon").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const iconId = document.getElementById("f-id").value || "new-app";
    pendingIconUpload = { path: `assets/icons/${iconId}.${ext}`, base64: await fileToBase64(file) };
  });

  document.getElementById("f-screenshots").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    const iconId = document.getElementById("f-id").value || "new-app";
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `assets/screenshots/${iconId}-${Date.now()}-${pendingScreenshotUploads.length}.${ext}`;
      const base64 = await fileToBase64(file);
      pendingScreenshotUploads.push({ path, base64 });
      currentScreenshots.push(path);
      const list = document.getElementById("screenshot-list");
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(path.split("/").pop())}</span> <span class="field-hint">(new)</span>`;
      list.appendChild(li);
    }
  });

  app().querySelectorAll("[data-remove-screenshot]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeScreenshot);
      currentScreenshots.splice(index, 1);
      button.closest("li").remove();
    });
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

    await saveSoftwareWithAssets(
      isNew ? `feat(admin): add ${updated.name} to the catalog` : `chore(admin): update ${updated.name}`
    );
  });
}

async function saveSoftwareWithAssets(commitMessage) {
  const assetFiles = [];
  if (pendingIconUpload) assetFiles.push(pendingIconUpload, { ...pendingIconUpload, path: `docs/${pendingIconUpload.path}` });
  for (const upload of pendingScreenshotUploads) {
    assetFiles.push(upload, { ...upload, path: `docs/${upload.path}` });
  }

  try {
    const changelog = await getFile(CHANGELOG_PATH);
    const updatedChangelog = insertChangelogEntry(changelog.text, commitMessage.replace(/^\w+\(admin\): /, ""));
    const softwareJson = `${JSON.stringify(softwareFile.data, null, 2)}\n`;

    await commitFiles(
      [
        { path: SOFTWARE_PATH, content: softwareJson },
        { path: `docs/${SOFTWARE_PATH}`, content: softwareJson },
        { path: CHANGELOG_PATH, content: updatedChangelog },
        ...assetFiles,
      ],
      commitMessage
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

function renderSiteContentForm() {
  const content = siteContentFile.data;

  app().innerHTML = `
    <button class="button button-secondary" id="back-to-dashboard">&larr; Back</button>
    <h1>Homepage text</h1>
    <p class="field-hint">Copyright, creator, and repository details on the About page are fixed identity/legal facts and are not editable here.</p>

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
      <div class="form-actions">
        <button type="submit" class="button button-primary">Commit changes</button>
        <button type="button" class="button button-secondary" id="cancel-site-content">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById("back-to-dashboard").addEventListener("click", () => renderDashboard([]));
  document.getElementById("cancel-site-content").addEventListener("click", loadDashboard);

  document.getElementById("site-content-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    siteContentFile.data = {
      heroEyebrow: document.getElementById("sc-eyebrow").value.trim(),
      heroTitle: document.getElementById("sc-title").value.trim(),
      heroLede: document.getElementById("sc-lede").value.trim(),
    };

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
    }
  });
}
