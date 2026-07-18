const DATA_URL = "data/software.json";
const SITE_CONTENT_URL = "data/site-content.json";
const SITE_URL = "https://patrickjaillet.github.io/sandefjord-software";

async function fetchSoftwareCatalog() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error("Unable to load software catalog");
  }
  return response.json();
}

function visibleSoftware(data) {
  return data.software
    .filter((item) => !item.hidden)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
}

function matchesFilters(item, search, category) {
  if (category !== "All" && item.category !== category) return false;
  if (!search) return true;
  const haystack = `${item.name} ${item.shortDescription} ${(item.tags || []).join(" ")}`.toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function setupCatalogToolbar(software, onChange) {
  const searchInput = document.getElementById("catalog-search");
  const filtersEl = document.getElementById("category-filters");
  if (!searchInput || !filtersEl) {
    onChange("", "All");
    return;
  }

  const categories = ["All", ...new Set(software.map((item) => item.category))].sort(
    (a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b))
  );

  let activeCategory = "All";

  filtersEl.innerHTML = categories
    .map(
      (category, i) =>
        `<button type="button" class="category-filter-btn${i === 0 ? " active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    )
    .join("");

  function triggerChange() {
    onChange(searchInput.value.trim(), activeCategory);
  }

  filtersEl.querySelectorAll(".category-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      filtersEl.querySelectorAll(".category-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.category;
      triggerChange();
    });
  });

  searchInput.addEventListener("input", triggerChange);
}

async function renderHero() {
  try {
    const response = await fetch(SITE_CONTENT_URL);
    if (!response.ok) return;
    const content = await response.json();
    const eyebrow = document.getElementById("hero-eyebrow");
    const title = document.getElementById("hero-title");
    const lede = document.getElementById("hero-lede");
    if (eyebrow && content.heroEyebrow) eyebrow.textContent = content.heroEyebrow;
    if (title && content.heroTitle) title.textContent = content.heroTitle;
    if (lede && content.heroLede) lede.textContent = content.heroLede;
  } catch (error) {
    console.error(error);
  }

  setupFjordParallax();
}

function setupFjordParallax() {
  const svg = document.getElementById("fjord-lines");
  if (!svg) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  function update() {
    const offset = Math.min(window.scrollY, 300) * 0.06;
    svg.style.transform = `translateY(${offset}px)`;
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  update();
}

function formatCompactNumber(value) {
  if (value >= 1000) return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
  return value.toLocaleString("en-US");
}

function formatDisplayDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderHeroStats(software) {
  const list = document.getElementById("hero-stats");
  if (!list) return;
  const totalDownloads = software.reduce((sum, item) => sum + (item.totalDownloads || 0), 0);
  list.innerHTML = `
    <li><strong>${formatCompactNumber(software.length)}</strong><span>Windows apps published</span></li>
    <li><strong>${formatCompactNumber(totalDownloads)}</strong><span>Total downloads</span></li>
    <li><strong><a href="https://github.com/Patrickjaillet" target="_blank" rel="noopener">GitHub</a></strong><span>Official repositories</span></li>
  `;
}

function latestReleaseDate(item) {
  const entry = (item.changelog || [])[0];
  return entry ? new Date(entry.date).getTime() : 0;
}

function latestReleaseDateString(item) {
  const entry = (item.changelog || [])[0];
  return entry ? entry.date : null;
}

function isRecentlyUpdated(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = (Date.now() - date.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= 30;
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function primaryAsset(item) {
  const latest = (item.versionHistory || [])[0];
  if (!latest) return null;
  const assets = latest.assets || [];
  return assets.find((asset) => asset.url === item.downloadUrl) || assets[0] || null;
}

function renderRequirementsChecklist(requirements) {
  const items = (requirements || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!items.length) return "";
  return `
    <ul class="requirements-checklist">
      ${items.map((req) => `<li>${escapeHtml(req)}</li>`).join("")}
    </ul>
  `;
}

function similarSoftware(item, software) {
  const others = software.filter((entry) => entry.id !== item.id);
  const sameCategory = others.filter((entry) => entry.category === item.category);
  const rest = others.filter((entry) => entry.category !== item.category);
  return [...sameCategory, ...rest].slice(0, 3);
}

function renderSimilarSoftware(item, software) {
  const similar = similarSoftware(item, software);
  if (!similar.length) return "";
  return `
    <section class="similar-software">
      <h2>You might also like</h2>
      <div class="software-grid similar-software-grid">
        ${similar
          .map(
            (entry) => `
          <a class="software-card" href="software.html?id=${encodeURIComponent(entry.id)}">
            <div class="software-card-top">
              <img class="software-card-icon" src="${entry.icon}" alt="" loading="lazy">
              <div>
                <span class="software-card-category">${escapeHtml(entry.category)}</span>
                <h3 class="software-card-title">${escapeHtml(entry.name)}</h3>
              </div>
            </div>
            <p class="software-card-desc">${escapeHtml(entry.shortDescription)}</p>
            <div class="software-card-footer">
              <span class="version-tag">v${escapeHtml(entry.version)}</span>
              <span class="software-card-link">View details</span>
            </div>
          </a>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function setupDownloadButton(container) {
  const button = container.querySelector("[data-download-button]");
  if (!button) return;
  button.addEventListener("click", () => {
    const label = button.querySelector(".download-button-label");
    if (!label) return;
    const originalText = label.textContent;
    button.classList.add("is-downloading");
    label.textContent = "Preparing download...";
    window.setTimeout(() => {
      button.classList.remove("is-downloading");
      button.classList.add("is-downloaded");
      label.textContent = "Download started";
      window.setTimeout(() => {
        button.classList.remove("is-downloaded");
        label.textContent = originalText;
      }, 2000);
    }, 900);
  });
}

const WINDOWS_ICON_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 5.5 10.5 4.4v7.1H3V5.5zm8.5-1.3L21 3v8.5h-9.5V4.2zM3 12.5h7.5v7.1L3 18.5v-6zm8.5 0H21V21l-9.5-1.3v-7.2z"/></svg>`;

function renderBreadcrumb(items) {
  return `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      ${items
        .map((crumb, i) =>
          i === items.length - 1
            ? `<span aria-current="page">${escapeHtml(crumb.label)}</span>`
            : `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a><span class="breadcrumb-sep" aria-hidden="true">/</span>`
        )
        .join("")}
    </nav>
  `;
}

function renderFeaturedSoftware(software) {
  const container = document.getElementById("featured-software");
  if (!container || !software.length) return;

  const featured = [...software].sort((a, b) => latestReleaseDate(b) - latestReleaseDate(a))[0];

  container.innerHTML = `
    <a class="featured-card" href="software.html?id=${encodeURIComponent(featured.id)}">
      ${
        (featured.screenshots || []).length
          ? `<img class="featured-card-thumb" src="${featured.screenshots[0]}" alt="" loading="lazy">`
          : `<div class="featured-card-thumb featured-card-thumb-empty"></div>`
      }
      <div class="featured-card-body">
        <span class="eyebrow">Latest release</span>
        <h2 class="featured-card-title">${escapeHtml(featured.name)}</h2>
        <p class="featured-card-desc">${escapeHtml(featured.shortDescription)}</p>
        <div class="featured-card-footer">
          <span class="version-tag">v${escapeHtml(featured.version)}</span>
          <span class="software-card-link">View details</span>
        </div>
      </div>
    </a>
  `;
}

function renderLatestUpdates(software) {
  const container = document.getElementById("latest-updates");
  if (!container) return;

  const updates = software
    .flatMap((item) => (item.changelog || []).map((entry) => ({ item, entry })))
    .sort((a, b) => new Date(b.entry.date) - new Date(a.entry.date))
    .slice(0, 3);

  if (!updates.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <span class="eyebrow">Latest updates</span>
    <ul class="latest-updates-list">
      ${updates
        .map(
          ({ item, entry }) => `
        <li>
          <a href="software.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a>
          <span class="version-tag">v${escapeHtml(entry.version)}</span>
          <span class="latest-updates-date">${formatDisplayDate(entry.date)}</span>
        </li>`
        )
        .join("")}
    </ul>
  `;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderChangelogNotes(notes) {
  return notes
    .map((note) => {
      const heading = note.match(/^#{2,4}\s+(.*)/) || note.match(/^\*([^*]+)\*\*$/);
      if (heading) return `<li class="changelog-note-heading">${formatInlineMarkdown(heading[1])}</li>`;
      return `<li>${formatInlineMarkdown(note)}</li>`;
    })
    .join("");
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function setSoftwareMeta(item) {
  const description = (item.shortDescription || item.description || "").slice(0, 160);
  const url = `${SITE_URL}/software.html?id=${encodeURIComponent(item.id)}`;
  const image = item.screenshots && item.screenshots.length
    ? `${SITE_URL}/${item.screenshots[0]}`
    : `${SITE_URL}/assets/social-preview.png`;

  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:title"]', "content", `${item.name} — Sandefjord Software`);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:image"]', "content", image);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute("content", url);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
}

function renderSoftwareCards(container, software) {
  if (!software.length) {
    container.innerHTML = `<div class="empty-state"><p>No software matches your search.</p></div>`;
    return;
  }
  container.innerHTML = software
    .map((item) => {
      const screenshots = item.screenshots || [];
      const updatedDate = latestReleaseDateString(item);
      const recent = isRecentlyUpdated(updatedDate);
      const size = formatFileSize((primaryAsset(item) || {}).size);

      let thumbHtml = "";
      if (screenshots.length > 1) {
        thumbHtml = `
          <div class="software-card-thumb-wrap">
            <img class="software-card-thumb" src="${screenshots[0]}" alt="" loading="lazy">
            <img class="software-card-thumb software-card-thumb-alt" src="${screenshots[1]}" alt="" loading="lazy">
          </div>`;
      } else if (screenshots.length === 1) {
        thumbHtml = `
          <div class="software-card-thumb-wrap">
            <img class="software-card-thumb" src="${screenshots[0]}" alt="" loading="lazy">
          </div>`;
      }

      return `
      <a class="software-card" href="software.html?id=${encodeURIComponent(item.id)}">
        ${thumbHtml}
        <div class="software-card-top">
          <img class="software-card-icon" src="${item.icon}" alt="" loading="lazy">
          <div>
            <span class="software-card-category">${escapeHtml(item.category)}</span>
            <h2 class="software-card-title">${escapeHtml(item.name)}</h2>
          </div>
        </div>
        <p class="software-card-desc">${escapeHtml(item.shortDescription)}</p>
        ${
          (item.tags || []).length
            ? `<div class="software-card-tags">${item.tags.slice(0, 4).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>`
            : ""
        }
        <div class="software-card-meta">
          ${size ? `<span class="software-card-size">${size}</span>` : ""}
          ${updatedDate ? `<span class="software-card-updated">Updated ${formatDisplayDate(updatedDate)}</span>` : ""}
          ${recent ? `<span class="software-card-recent-badge">Updated recently</span>` : ""}
        </div>
        <div class="software-card-footer">
          <span class="version-tag">v${escapeHtml(item.version)}</span>
          <span class="software-card-link">View details</span>
        </div>
      </a>`;
    })
    .join("");
}

async function renderHomepage() {
  const container = document.getElementById("software-list");
  try {
    const data = await fetchSoftwareCatalog();
    const software = visibleSoftware(data);
    renderHeroStats(software);
    if (!software.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No software published yet. New applications appear here automatically as soon as they are released.</p>
        </div>`;
      return;
    }
    renderFeaturedSoftware(software);
    renderLatestUpdates(software);
    renderSoftwareCards(container, software);
    setupCatalogToolbar(software, (search, category) => {
      renderSoftwareCards(container, software.filter((item) => matchesFilters(item, search, category)));
    });
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

    const screenshots = item.screenshots || [];
    const screenshotsHtml = screenshots.length
      ? screenshots
          .map(
            (src, i) => `
            <figure class="screenshot-frame" tabindex="0" data-lightbox-index="${i}">
              <img class="screenshot" src="${src}" alt="${escapeHtml(item.name)} screenshot" loading="lazy">
              ${screenshots.length > 1 ? `<figcaption class="screenshot-position">${i + 1} / ${screenshots.length}</figcaption>` : ""}
            </figure>`
          )
          .join("")
      : `<div class="empty-state"><p>Screenshots will be added soon.</p></div>`;

    const changelog = item.changelog || [];
    const changelogHtml = changelog.length
      ? changelog
          .map(
            (entry) => `
            <li class="changelog-entry">
              <span class="changelog-meta">v${escapeHtml(entry.version)} &middot; ${escapeHtml(entry.date)}</span>
              <ul>${renderChangelogNotes(entry.notes)}</ul>
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
    setSoftwareMeta(item);

    const asset = primaryAsset(item);
    const assetSize = formatFileSize(asset ? asset.size : null);
    const assetDownloads = asset ? asset.downloadCount : null;
    const downloadSubtextParts = [assetSize, typeof assetDownloads === "number" ? `${formatCompactNumber(assetDownloads)} downloads` : null].filter(Boolean);

    const similarSoftwareHtml = renderSimilarSoftware(item, visibleSoftware(data));

    container.innerHTML = `
      ${renderBreadcrumb([{ label: "Home", href: "index.html" }, { label: item.name }])}
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
            <h2>System requirements</h2>
            ${renderRequirementsChecklist(item.systemRequirements)}
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
          <a class="button button-primary button-block button-download" href="${item.downloadUrl}" target="_blank" rel="noopener" data-download-button>
            ${WINDOWS_ICON_SVG}
            <span class="download-button-text">
              <span class="download-button-label">Download v${escapeHtml(item.version)}</span>
              ${downloadSubtextParts.length ? `<span class="download-button-subtext">${escapeHtml(downloadSubtextParts.join(" · "))}</span>` : ""}
            </span>
          </a>
          <dl>
            <dt>Current version</dt>
            <dd>${escapeHtml(item.version)}</dd>
            <dt>Category</dt>
            <dd>${escapeHtml(item.category)}</dd>
            ${(item.tags || []).length ? `<dt>Tags</dt><dd>${item.tags.map(escapeHtml).join(", ")}</dd>` : ""}
            <dt>Repository</dt>
            <dd><a href="${item.repositoryUrl}" target="_blank" rel="noopener">View on GitHub</a></dd>
          </dl>
        </aside>
      </div>

      ${similarSoftwareHtml}
    `;

    setupLightbox(container, screenshots, item.name);
    setupDownloadButton(container);
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><p>Unable to load software details right now.</p></div>`;
    console.error(error);
  }
}

function setupLightbox(container, screenshots, name) {
  if (!screenshots.length) return;

  let overlay = document.getElementById("lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous screenshot">&larr;</button>
      <img class="lightbox-image" alt="">
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Next screenshot">&rarr;</button>
      <span class="lightbox-counter"></span>
    `;
    document.body.appendChild(overlay);
  }

  const image = overlay.querySelector(".lightbox-image");
  const counter = overlay.querySelector(".lightbox-counter");
  let currentIndex = 0;

  function show(index) {
    currentIndex = (index + screenshots.length) % screenshots.length;
    image.classList.remove("is-visible");
    window.setTimeout(() => {
      image.src = screenshots[currentIndex];
      image.alt = `${name} screenshot ${currentIndex + 1}`;
      image.classList.add("is-visible");
    }, 100);
    if (counter) counter.textContent = `${currentIndex + 1} / ${screenshots.length}`;
  }

  function open(index) {
    show(index);
    overlay.classList.add("open");
    document.addEventListener("keydown", onKeydown);
  }

  function close() {
    overlay.classList.remove("open");
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(currentIndex - 1);
    if (event.key === "ArrowRight") show(currentIndex + 1);
  }

  overlay.querySelector(".lightbox-close").onclick = close;
  overlay.querySelector(".lightbox-prev").onclick = () => show(currentIndex - 1);
  overlay.querySelector(".lightbox-next").onclick = () => show(currentIndex + 1);
  overlay.onclick = (event) => {
    if (event.target === overlay) close();
  };

  container.querySelectorAll("[data-lightbox-index]").forEach((el) => {
    el.style.cursor = "zoom-in";
    el.addEventListener("click", () => open(Number(el.dataset.lightboxIndex)));
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(Number(el.dataset.lightboxIndex));
      }
    });
  });
}

function renderDownloadsRows(tbody, software) {
  if (!software.length) {
    tbody.innerHTML = `<tr><td colspan="5">No software matches your search.</td></tr>`;
    return;
  }
  tbody.innerHTML = software
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
}

async function renderDownloadsPage() {
  const tbody = document.querySelector("#downloads-table tbody");
  try {
    const data = await fetchSoftwareCatalog();
    const software = visibleSoftware(data);
    if (!software.length) {
      tbody.innerHTML = `<tr><td colspan="5">No software published yet.</td></tr>`;
      return;
    }
    renderDownloadsRows(tbody, software);
    setupCatalogToolbar(software, (search, category) => {
      renderDownloadsRows(tbody, software.filter((item) => matchesFilters(item, search, category)));
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">Unable to load downloads right now.</td></tr>`;
    console.error(error);
  }
}
