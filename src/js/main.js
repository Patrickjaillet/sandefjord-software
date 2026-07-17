const DATA_URL = "data/software.json";

async function fetchSoftwareCatalog() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error("Unable to load software catalog");
  }
  return response.json();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function renderHomepage() {
  const container = document.getElementById("software-list");
  try {
    const data = await fetchSoftwareCatalog();
    if (!data.software.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No software published yet. New applications appear here automatically as soon as they are released.</p>
        </div>`;
      return;
    }
    container.innerHTML = data.software
      .map(
        (item) => `
        <a class="software-card" href="software.html?id=${encodeURIComponent(item.id)}">
          <div class="software-card-top">
            <img class="software-card-icon" src="${item.icon}" alt="" loading="lazy">
            <div>
              <span class="software-card-category">${escapeHtml(item.category)}</span>
              <h2 class="software-card-title">${escapeHtml(item.name)}</h2>
            </div>
          </div>
          <p class="software-card-desc">${escapeHtml(item.shortDescription)}</p>
          <div class="software-card-footer">
            <span class="version-tag">v${escapeHtml(item.version)}</span>
            <span class="software-card-link">View details</span>
          </div>
        </a>`
      )
      .join("");
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><p>Unable to load the software list right now.</p></div>`;
    console.error(error);
  }
}

async function renderSoftwareDetail() {
  const container = document.getElementById("software-detail");
  const id = getQueryParam("id");
  try {
    const data = await fetchSoftwareCatalog();
    const item = data.software.find((entry) => entry.id === id);
    if (!item) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Software not found.</p>
          <p><a href="index.html">Back to homepage</a></p>
        </div>`;
      return;
    }

    const screenshotsHtml = (item.screenshots || []).length
      ? (item.screenshots)
          .map((src) => `<img class="screenshot" src="${src}" alt="${escapeHtml(item.name)} screenshot" loading="lazy">`)
          .join("")
      : `<div class="empty-state"><p>Screenshots will be added soon.</p></div>`;

    const changelog = item.changelog || [];
    const changelogHtml = changelog.length
      ? changelog
          .map(
            (entry) => `
            <li class="changelog-entry">
              <span class="changelog-meta">v${escapeHtml(entry.version)} &middot; ${escapeHtml(entry.date)}</span>
              <ul>${entry.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
            </li>`
          )
          .join("")
      : `<li class="changelog-entry"><span class="changelog-meta">No changelog entries yet</span></li>`;

    const versionHistory = item.versionHistory || [];
    const versionHistoryHtml = versionHistory.length
      ? versionHistory
          .map((entry) => {
            const assets = entry.assets || [];
            const assetsHtml = assets.length
              ? assets
                  .map(
                    (asset) =>
                      `<a class="button button-small" href="${asset.url}" target="_blank" rel="noopener">${escapeHtml(asset.name)}</a>`
                  )
                  .join("")
              : `<span class="version-history-noassets">No downloadable assets</span>`;
            return `
            <li class="version-history-entry">
              <div class="version-history-meta">
                <span class="version-tag">v${escapeHtml(entry.version)}</span>
                ${entry.prerelease ? `<span class="badge-prerelease">Pre-release</span>` : ""}
                <span class="version-history-date">${escapeHtml(entry.date)}</span>
              </div>
              <div class="version-history-assets">${assetsHtml}</div>
            </li>`;
          })
          .join("")
      : `<li class="version-history-entry"><span class="version-history-date">No archived versions yet</span></li>`;

    document.title = `${item.name} — Sandefjord Software`;

    container.innerHTML = `
      <div class="software-detail-layout">
        <div class="software-detail-main">
          <span class="eyebrow">${escapeHtml(item.category)}</span>
          <div class="software-detail-header">
            <img class="software-detail-icon" src="${item.icon}" alt="">
            <div>
              <h1>${escapeHtml(item.name)}</h1>
              <span class="version-tag">v${escapeHtml(item.version)}</span>
              ${item.prerelease ? `<span class="badge-prerelease">Pre-release</span>` : ""}
            </div>
          </div>

          <p class="software-detail-description">${escapeHtml(item.description)}</p>

          <section>
            <h2>Screenshots</h2>
            <div class="screenshot-gallery">${screenshotsHtml}</div>
          </section>

          <section>
            <h2>Changelog</h2>
            <ul class="changelog-list">${changelogHtml}</ul>
          </section>

          <section>
            <h2>Version history</h2>
            <ul class="version-history-list">${versionHistoryHtml}</ul>
          </section>
        </div>

        <aside class="detail-aside">
          <a class="button button-primary button-block" href="${item.downloadUrl}" target="_blank" rel="noopener">Download v${escapeHtml(item.version)}</a>
          <dl>
            <dt>Current version</dt>
            <dd>${escapeHtml(item.version)}</dd>
            <dt>Requirements</dt>
            <dd>${escapeHtml(item.systemRequirements)}</dd>
            <dt>Category</dt>
            <dd>${escapeHtml(item.category)}</dd>
            <dt>Repository</dt>
            <dd><a href="${item.repositoryUrl}" target="_blank" rel="noopener">View on GitHub</a></dd>
          </dl>
        </aside>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><p>Unable to load software details right now.</p></div>`;
    console.error(error);
  }
}

async function renderDownloadsPage() {
  const tbody = document.querySelector("#downloads-table tbody");
  try {
    const data = await fetchSoftwareCatalog();
    if (!data.software.length) {
      tbody.innerHTML = `<tr><td colspan="5">No software published yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.software
      .map(
        (item) => `
        <tr>
          <td><a href="software.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a></td>
          <td>${escapeHtml(item.category)}</td>
          <td class="mono"><span class="version-tag">v${escapeHtml(item.version)}</span></td>
          <td>${escapeHtml(item.systemRequirements)}</td>
          <td><a class="button" href="${item.downloadUrl}" target="_blank" rel="noopener">Download</a></td>
        </tr>`
      )
      .join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">Unable to load downloads right now.</td></tr>`;
    console.error(error);
  }
}
