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

const SORT_OPTIONS = {
  default: { label: "Recommended order", compare: null },
  recent: {
    label: "Recently updated",
    compare: (a, b) => latestReleaseDate(b) - latestReleaseDate(a),
  },
  downloads: {
    label: "Most downloaded",
    compare: (a, b) => (b.totalDownloads || 0) - (a.totalDownloads || 0),
  },
  name: {
    label: "Name (A-Z)",
    compare: (a, b) => a.name.localeCompare(b.name),
  },
};

function sortSoftware(software, sortKey) {
  const option = SORT_OPTIONS[sortKey];
  if (!option || !option.compare) return software;
  return [...software].sort(option.compare);
}

function setupSearchShortcut(searchInput) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/") return;
    const target = event.target;
    const isTyping =
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (isTyping) return;
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  });
}

function setupCatalogToolbar(software, onChange) {
  const searchInput = document.getElementById("catalog-search");
  const filtersEl = document.getElementById("category-filters");
  const sortEl = document.getElementById("catalog-sort");
  if (!searchInput || !filtersEl) {
    onChange("", "All", "default");
    return;
  }

  const categories = ["All", ...new Set(software.map((item) => item.category))].sort(
    (a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b))
  );

  let activeCategory = "All";
  let activeSort = "default";

  filtersEl.innerHTML = categories
    .map(
      (category, i) =>
        `<button type="button" class="category-filter-btn${i === 0 ? " active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    )
    .join("");

  if (sortEl) {
    sortEl.innerHTML = Object.entries(SORT_OPTIONS)
      .map(([key, { label }]) => `<option value="${key}">${escapeHtml(label)}</option>`)
      .join("");
  }

  function triggerChange() {
    onChange(searchInput.value.trim(), activeCategory, activeSort);
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

  if (sortEl) {
    sortEl.addEventListener("change", () => {
      activeSort = sortEl.value;
      triggerChange();
    });
  }

  setupSearchShortcut(searchInput);
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

async function renderAboutPage() {
  try {
    const response = await fetch(SITE_CONTENT_URL);
    if (!response.ok) return;
    const content = await response.json();
    const sponsorsLink = document.getElementById("sponsors-link");
    if (sponsorsLink && content.hasSponsorsProfile) sponsorsLink.hidden = false;
  } catch (error) {
    console.error(error);
  }
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
            (entry, i) => `
          <a class="software-card" style="--card-i: ${i}" href="software.html?id=${encodeURIComponent(entry.id)}">
            <div class="software-card-top">
              <img class="software-card-icon" src="${entry.icon}" alt="" loading="lazy">
              <div>
                <span class="software-card-category">${categoryBadge(entry.category)}</span>
                <h3 class="software-card-title">${escapeHtml(entry.name)}</h3>
              </div>
            </div>
            <p class="software-card-desc">${escapeHtml(entry.shortDescription)}</p>
            ${renderEngagementBadge(entry) ? `<div class="software-card-meta">${renderEngagementBadge(entry)}</div>` : ""}
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

function renderChecksumBlock(item) {
  if (!item.downloadSha256) return "";
  return `
    <div class="checksum-block">
      <span class="checksum-label">SHA-256 checksum</span>
      <code class="checksum-value" data-checksum-value>${escapeHtml(item.downloadSha256)}</code>
      <button type="button" class="button button-small button-secondary" data-copy-checksum>
        ${COPY_ICON_SVG}<span data-copy-checksum-label>Copy</span>
      </button>
      <p class="checksum-hint">Compare this value against the hash of the file you downloaded to confirm it wasn't altered or corrupted.</p>
    </div>
  `;
}

function setupChecksumCopy(container) {
  const button = container.querySelector("[data-copy-checksum]");
  const value = container.querySelector("[data-checksum-value]");
  if (!button || !value) return;
  button.addEventListener("click", async () => {
    const label = button.querySelector("[data-copy-checksum-label]");
    try {
      await navigator.clipboard.writeText(value.textContent.trim());
      if (label) {
        const original = label.textContent;
        label.textContent = "Copied!";
        window.setTimeout(() => {
          label.textContent = original;
        }, 2000);
      }
    } catch (error) {
      console.error(error);
    }
  });
}

const SHARE_ICON_ATTRS = `viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const COPY_ICON_SVG = `<svg ${SHARE_ICON_ATTRS}><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>`;
const SHARE_ICON_SVG = `<svg ${SHARE_ICON_ATTRS}><circle cx="15" cy="5" r="2"/><circle cx="5" cy="10" r="2"/><circle cx="15" cy="15" r="2"/><path d="M6.7 9 13.3 5.9M6.7 11l6.6 3.1"/></svg>`;
const X_ICON_SVG = `<svg ${SHARE_ICON_ATTRS}><path d="M5 5l10 10M15 5 5 15"/></svg>`;
const EMAIL_ICON_SVG = `<svg ${SHARE_ICON_ATTRS}><rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="M3 6l7 5 7-5"/></svg>`;
const REDDIT_ICON_SVG = `<svg ${SHARE_ICON_ATTRS}><circle cx="10" cy="12" r="6"/><circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M7 14.5c1 .8 5 .8 6 0"/><path d="M10 6V3.5M10 3.5h2.5M14 8l1.5-1"/></svg>`;
const LINKEDIN_ICON_SVG = `<svg ${SHARE_ICON_ATTRS}><rect x="3" y="3" width="14" height="14" rx="2"/><line x1="7" y1="9" x2="7" y2="14"/><circle cx="7" cy="6.3" r="0.9" fill="currentColor" stroke="none"/><path d="M10.5 14V9M10.5 11c0-1.1.9-2 2-2s2 .9 2 2v3"/></svg>`;
const LIKE_ICON_SVG = `<svg ${SHARE_ICON_ATTRS} width="14" height="14"><path d="M8 17H4V9h4m0 8 2.5-9h4.4c1 0 1.7.9 1.4 1.8L14.5 15c-.2.6-.7 1-1.3 1H8Z"/></svg>`;
const COMMENT_ICON_SVG = `<svg ${SHARE_ICON_ATTRS} width="14" height="14"><path d="M3 4h14v9H8l-3 3v-3H3Z"/></svg>`;

function shareUrl(item) {
  return `${SITE_URL}/software.html?id=${encodeURIComponent(item.id)}`;
}

function setupShareButtons(container, item) {
  const copyButton = container.querySelector("[data-copy-link]");
  if (copyButton) {
    const label = copyButton.querySelector("[data-copy-label]");
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrl(item));
        if (label) {
          const original = label.textContent;
          label.textContent = "Copied!";
          window.setTimeout(() => {
            label.textContent = original;
          }, 2000);
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  const nativeButton = container.querySelector("[data-native-share]");
  if (nativeButton && navigator.share) {
    nativeButton.hidden = false;
    container.querySelectorAll("[data-static-share]").forEach((el) => {
      el.hidden = true;
    });
    nativeButton.addEventListener("click", () => {
      navigator.share({ title: item.name, text: item.shortDescription, url: shareUrl(item) }).catch(() => {});
    });
  }
}

// Comments are powered by giscus (https://giscus.app), backed by GitHub
// Discussions on this repo (enabled, using the built-in "General"
// category). The giscus GitHub App still needs to be installed on the
// repo before this actually works — see README.md.
const GISCUS_REPO = "Patrickjaillet/sandefjord-software";
const GISCUS_REPO_ID = "R_kgDOTb6Q8w";
const GISCUS_CATEGORY = "General";
const GISCUS_CATEGORY_ID = "DIC_kwDOTb6Q884DBdIi";

function setupComments(container, item) {
  const button = container.querySelector("[data-show-comments]");
  const mount = container.querySelector("[data-comments-mount]");
  if (!button || !mount) return;

  button.addEventListener(
    "click",
    () => {
      button.setAttribute("aria-expanded", "true");
      button.hidden = true;
      mount.hidden = false;

      const script = document.createElement("script");
      script.src = "https://giscus.app/client.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute("data-repo", GISCUS_REPO);
      script.setAttribute("data-repo-id", GISCUS_REPO_ID);
      script.setAttribute("data-category", GISCUS_CATEGORY);
      script.setAttribute("data-category-id", GISCUS_CATEGORY_ID);
      script.setAttribute("data-mapping", "specific");
      script.setAttribute("data-term", item.id);
      script.setAttribute("data-reactions-enabled", "1");
      script.setAttribute("data-emit-metadata", "0");
      script.setAttribute("data-theme", "light");
      script.setAttribute("data-lang", "en");
      mount.appendChild(script);
    },
    { once: true }
  );
}

const CATEGORY_ICON_ATTRS = `viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const CATEGORY_ICONS = {
  "Developer Tools": `<svg ${CATEGORY_ICON_ATTRS}><path d="M5 4 1 8l4 4M11 4l4 4-4 4"/></svg>`,
  Collectibles: `<svg ${CATEGORY_ICON_ATTRS}><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.25"/></svg>`,
  Utilities: `<svg ${CATEGORY_ICON_ATTRS}><line x1="3" y1="4" x2="13" y2="4"/><circle cx="9.5" cy="4" r="1.4"/><line x1="3" y1="8" x2="13" y2="8"/><circle cx="6.5" cy="8" r="1.4"/><line x1="3" y1="12" x2="13" y2="12"/><circle cx="10.5" cy="12" r="1.4"/></svg>`,
};

const EMPTY_ICON_ATTRS = `viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const EMPTY_ICONS = {
  search: `<svg ${EMPTY_ICON_ATTRS}><circle cx="17" cy="17" r="10"/><line x1="24.5" y1="24.5" x2="33" y2="33"/></svg>`,
  image: `<svg ${EMPTY_ICON_ATTRS}><rect x="4" y="7" width="32" height="26" rx="2"/><circle cx="14" cy="16" r="3"/><path d="M4 27 14 18l7 6 5-4 10 9"/></svg>`,
  box: `<svg ${EMPTY_ICON_ATTRS}><path d="M4 13 20 6l16 7-16 7-16-7Z"/><path d="M4 13v14l16 7 16-7V13"/><path d="M20 20v14"/></svg>`,
  warning: `<svg ${EMPTY_ICON_ATTRS}><path d="M20 6 36 33H4Z"/><line x1="20" y1="17" x2="20" y2="24"/><circle cx="20" cy="28.5" r="0.75" fill="currentColor"/></svg>`,
};

function emptyState({ icon, title, message, action }) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${EMPTY_ICONS[icon] || EMPTY_ICONS.box}</div>
      <p class="empty-state-title">${escapeHtml(title)}</p>
      <p class="empty-state-message">${escapeHtml(message)}</p>
      ${action || ""}
    </div>
  `;
}

function emptyStateRow(colspan, args) {
  return `<tr><td colspan="${colspan}">${emptyState(args)}</td></tr>`;
}
const DEFAULT_CATEGORY_ICON = `<svg ${CATEGORY_ICON_ATTRS}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>`;

function categoryBadge(category) {
  const icon = CATEGORY_ICONS[category] || DEFAULT_CATEGORY_ICON;
  return `${icon}<span>${escapeHtml(category)}</span>`;
}

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

const RECENTLY_VIEWED_KEY = "sandefjord_recently_viewed_v1";
const RECENTLY_VIEWED_MAX = 8;

function recordRecentlyViewed(id) {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
    const next = [id, ...stored.filter((existingId) => existingId !== id)].slice(0, RECENTLY_VIEWED_MAX);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch (error) {
    console.error(error);
  }
}

function getRecentlyViewedIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
  } catch {
    return [];
  }
}

function renderRecentlyViewed(software) {
  const container = document.getElementById("recently-viewed");
  if (!container) return;

  const items = getRecentlyViewedIds()
    .map((id) => software.find((entry) => entry.id === id))
    .filter(Boolean)
    .slice(0, 4);

  if (!items.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <span class="eyebrow">Recently viewed</span>
    <div class="software-grid recently-viewed-grid">
      ${items
        .map(
          (item, i) => `
        <a class="software-card" style="--card-i: ${i}" href="software.html?id=${encodeURIComponent(item.id)}">
          <div class="software-card-top">
            <img class="software-card-icon" src="${item.icon}" alt="" loading="lazy">
            <div>
              <span class="software-card-category">${categoryBadge(item.category)}</span>
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
        .join("")}
    </div>
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

const SCHEMA_APPLICATION_CATEGORY = {
  "Developer Tools": "DeveloperApplication",
  Utilities: "UtilitiesApplication",
};

function setStructuredData(item) {
  const url = `${SITE_URL}/software.html?id=${encodeURIComponent(item.id)}`;
  const image = item.screenshots && item.screenshots.length
    ? `${SITE_URL}/${item.screenshots[0]}`
    : `${SITE_URL}/assets/social-preview.png`;

  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: item.name,
    description: item.shortDescription || item.description,
    applicationCategory: SCHEMA_APPLICATION_CATEGORY[item.category] || item.category,
    operatingSystem: "Windows",
    softwareVersion: item.version,
    url,
    image,
    downloadUrl: item.downloadUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  if (item.engagement) {
    data.interactionStatistic = [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: item.engagement.likes,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: item.engagement.comments,
      },
    ];
  }

  let script = document.getElementById("structured-data");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "structured-data";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function renderEngagementBadge(item) {
  const engagement = item.engagement;
  if (!engagement) return "";
  return `<span class="engagement-badge" title="${engagement.likes} likes, ${engagement.comments} comments">${LIKE_ICON_SVG}${formatCompactNumber(engagement.likes)}${COMMENT_ICON_SVG}${formatCompactNumber(engagement.comments)}</span>`;
}

function renderSoftwareCards(container, software) {
  if (!software.length) {
    container.innerHTML = emptyState({
      icon: "search",
      title: "No software matches",
      message: "Try a different search term or category filter.",
    });
    return;
  }
  container.innerHTML = software
    .map((item, i) => {
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
      <a class="software-card" style="--card-i: ${i}" href="software.html?id=${encodeURIComponent(item.id)}">
        ${thumbHtml}
        <div class="software-card-top">
          <img class="software-card-icon" src="${item.icon}" alt="" loading="lazy">
          <div>
            <span class="software-card-category">${categoryBadge(item.category)}</span>
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
          ${renderEngagementBadge(item)}
        </div>
        <div class="software-card-footer">
          <span class="version-tag">v${escapeHtml(item.version)}</span>
          <span class="software-card-link">View details</span>
        </div>
      </a>`;
    })
    .join("");
}

function renderSkeletonCards(container, count) {
  container.innerHTML = Array.from({ length: count })
    .map(
      () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-thumb"></div>
        <div class="software-card-top">
          <div class="skeleton skeleton-icon"></div>
          <div class="skeleton-lines">
            <div class="skeleton skeleton-line" style="width: 40%; height: 0.55rem;"></div>
            <div class="skeleton skeleton-line" style="width: 70%; height: 0.9rem;"></div>
          </div>
        </div>
        <div class="skeleton skeleton-line" style="width: 100%;"></div>
        <div class="skeleton skeleton-line" style="width: 82%;"></div>
      </div>`
    )
    .join("");
}

async function renderHomepage() {
  const container = document.getElementById("software-list");
  renderSkeletonCards(container, 6);
  try {
    const data = await fetchSoftwareCatalog();
    const software = visibleSoftware(data);
    renderHeroStats(software);
    if (!software.length) {
      container.innerHTML = emptyState({
        icon: "box",
        title: "No software published yet",
        message: "New applications appear here automatically as soon as they are released.",
      });
      return;
    }
    renderFeaturedSoftware(software);
    renderLatestUpdates(software);
    renderRecentlyViewed(software);
    renderSoftwareCards(container, software);
    setupCatalogToolbar(software, (search, category, sortKey) => {
      const filtered = software.filter((item) => matchesFilters(item, search, category));
      renderSoftwareCards(container, sortSoftware(filtered, sortKey));
    });
  } catch (error) {
    container.innerHTML = emptyState({
      icon: "warning",
      title: "Unable to load the software list",
      message: "Something went wrong fetching the catalog. Please try refreshing the page.",
    });
    console.error(error);
  }
}

function renderSkeletonDetail(container) {
  container.innerHTML = `
    <div class="software-detail-layout" aria-hidden="true">
      <div class="software-detail-main">
        <div class="skeleton skeleton-line" style="width: 6rem; height: 0.7rem;"></div>
        <div class="software-detail-header">
          <div class="skeleton skeleton-icon" style="width: 56px; height: 56px;"></div>
          <div class="skeleton-lines" style="flex: 1;">
            <div class="skeleton skeleton-line" style="width: 45%; height: 1.4rem;"></div>
            <div class="skeleton skeleton-line" style="width: 20%; height: 0.9rem;"></div>
          </div>
        </div>
        <div class="skeleton skeleton-line" style="width: 100%;"></div>
        <div class="skeleton skeleton-line" style="width: 95%;"></div>
        <div class="skeleton skeleton-line" style="width: 70%; margin-bottom: 1.5rem;"></div>
        <div class="skeleton skeleton-thumb" style="width: 280px; margin: 0;"></div>
      </div>
      <div class="skeleton skeleton-aside"></div>
    </div>
  `;
}

async function renderSoftwareDetail() {
  const container = document.getElementById("main-content");
  const id = getQueryParam("id");
  renderSkeletonDetail(container);
  try {
    const data = await fetchSoftwareCatalog();
    const item = data.software.find((entry) => entry.id === id);
    if (!item) {
      container.innerHTML = emptyState({
        icon: "search",
        title: "Software not found",
        message: "This software may have been removed or the link is incorrect.",
        action: `<a class="button button-primary" href="index.html">Back to homepage</a>`,
      });
      return;
    }

    recordRecentlyViewed(item.id);

    const screenshots = item.screenshots || [];
    const screenshotsHtml = screenshots.length
      ? screenshots
          .map(
            (src, i) => `
            <figure class="screenshot-frame" tabindex="0" data-lightbox-index="${i}">
              <img class="screenshot" src="${src}" alt="${escapeHtml(item.name)} screenshot ${i + 1} of ${screenshots.length}" loading="lazy">
              ${screenshots.length > 1 ? `<figcaption class="screenshot-position">${i + 1} / ${screenshots.length}</figcaption>` : ""}
            </figure>`
          )
          .join("")
      : emptyState({
          icon: "image",
          title: "Screenshots coming soon",
          message: "This software doesn't have any screenshots published yet.",
        });

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
    setStructuredData(item);

    const asset = primaryAsset(item);
    const assetSize = formatFileSize(asset ? asset.size : null);
    const assetDownloads = asset ? asset.downloadCount : null;
    const downloadSubtextParts = [assetSize, typeof assetDownloads === "number" ? `${formatCompactNumber(assetDownloads)} downloads` : null].filter(Boolean);

    const similarSoftwareHtml = renderSimilarSoftware(item, visibleSoftware(data));

    container.innerHTML = `
      ${renderBreadcrumb([{ label: "Home", href: "index.html" }, { label: item.name }])}
      <div class="software-detail-layout">
        <div class="software-detail-main">
          <span class="eyebrow">${categoryBadge(item.category)}</span>
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
          ${renderChecksumBlock(item)}
          <dl>
            <dt>Current version</dt>
            <dd>${escapeHtml(item.version)}</dd>
            <dt>Category</dt>
            <dd>${categoryBadge(item.category)}</dd>
            ${(item.tags || []).length ? `<dt>Tags</dt><dd>${item.tags.map(escapeHtml).join(", ")}</dd>` : ""}
            ${
              item.repositoryUrl
                ? `<dt>Repository</dt>
            <dd><a href="${item.repositoryUrl}" target="_blank" rel="noopener">View on GitHub</a></dd>
            <dt>Support</dt>
            <dd><a href="${item.repositoryUrl}/issues/new" target="_blank" rel="noopener">Report an issue</a></dd>`
                : ""
            }
          </dl>

          <div class="share-section">
            <span class="eyebrow">Share</span>
            <div class="share-row">
              <button type="button" class="share-icon-button" data-copy-link aria-label="Copy link to this page">
                ${COPY_ICON_SVG}<span data-copy-label>Copy link</span>
              </button>
              <button type="button" class="share-icon-button" data-native-share hidden aria-label="Share this page">
                ${SHARE_ICON_SVG}<span>Share</span>
              </button>
              <a class="share-icon-button" data-static-share href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl(item))}&text=${encodeURIComponent(`${item.name} — ${item.shortDescription}`)}" target="_blank" rel="noopener" aria-label="Share on X">
                ${X_ICON_SVG}
              </a>
              <a class="share-icon-button" data-static-share href="https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl(item))}&title=${encodeURIComponent(item.name)}" target="_blank" rel="noopener" aria-label="Share on Reddit">
                ${REDDIT_ICON_SVG}
              </a>
              <a class="share-icon-button" data-static-share href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl(item))}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">
                ${LINKEDIN_ICON_SVG}
              </a>
              <a class="share-icon-button" data-static-share href="mailto:?subject=${encodeURIComponent(item.name)}&body=${encodeURIComponent(`${item.shortDescription}\n\n${shareUrl(item)}`)}" aria-label="Share by email">
                ${EMAIL_ICON_SVG}
              </a>
            </div>
          </div>
        </aside>
      </div>

      <section class="comments-section">
        <h2>Comments</h2>
        <p class="comments-note">Comments are powered by <a href="https://github.com/Patrickjaillet/sandefjord-software/discussions" target="_blank" rel="noopener">GitHub Discussions</a>. A GitHub account is required to post — <a href="https://github.com/signup" target="_blank" rel="noopener">sign up for free</a> if you don't have one.</p>
        <button type="button" class="button button-secondary" data-show-comments aria-expanded="false">Show comments</button>
        <div class="giscus" data-comments-mount hidden></div>
      </section>

      ${similarSoftwareHtml}
    `;

    setupLightbox(container, screenshots, item.name);
    setupDownloadButton(container);
    setupChecksumCopy(container);
    setupShareButtons(container, item);
    setupComments(container, item);
  } catch (error) {
    container.innerHTML = emptyState({
      icon: "warning",
      title: "Unable to load software details",
      message: "Something went wrong fetching this software. Please try refreshing the page.",
    });
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
    tbody.innerHTML = emptyStateRow(6, {
      icon: "search",
      title: "No software matches",
      message: "Try a different search term or category filter.",
    });
    return;
  }
  tbody.innerHTML = software
    .map(
      (item) => `
      <tr>
        <td><a href="software.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a></td>
        <td class="downloads-category">${categoryBadge(item.category)}</td>
        <td class="mono"><span class="version-tag">v${escapeHtml(item.version)}</span></td>
        <td>${escapeHtml(item.systemRequirements)}</td>
        <td>${renderEngagementBadge(item)}</td>
        <td><a class="button" href="${item.downloadUrl}" target="_blank" rel="noopener">Download</a></td>
      </tr>`
    )
    .join("");
}

function renderSkeletonRows(tbody, count) {
  tbody.innerHTML = Array.from({ length: count })
    .map(
      () => `
      <tr aria-hidden="true">
        <td><span class="skeleton skeleton-line" style="width: 70%;"></span></td>
        <td><span class="skeleton skeleton-line" style="width: 60%;"></span></td>
        <td><span class="skeleton skeleton-line" style="width: 3rem;"></span></td>
        <td><span class="skeleton skeleton-line" style="width: 80%;"></span></td>
        <td><span class="skeleton skeleton-line" style="width: 3.5rem;"></span></td>
        <td><span class="skeleton skeleton-line" style="width: 4.5rem;"></span></td>
      </tr>`
    )
    .join("");
}

async function renderDownloadsPage() {
  const tbody = document.querySelector("#downloads-table tbody");
  renderSkeletonRows(tbody, 6);
  try {
    const data = await fetchSoftwareCatalog();
    const software = visibleSoftware(data);
    if (!software.length) {
      tbody.innerHTML = emptyStateRow(6, {
        icon: "box",
        title: "No software published yet",
        message: "New applications appear here automatically as soon as they are released.",
      });
      return;
    }
    renderDownloadsRows(tbody, software);
    setupCatalogToolbar(software, (search, category, sortKey) => {
      const filtered = software.filter((item) => matchesFilters(item, search, category));
      renderDownloadsRows(tbody, sortSoftware(filtered, sortKey));
    });
  } catch (error) {
    tbody.innerHTML = emptyStateRow(6, {
      icon: "warning",
      title: "Unable to load downloads",
      message: "Something went wrong fetching the catalog. Please try refreshing the page.",
    });
    console.error(error);
  }
}

function allReleasesChronological(software) {
  return software
    .flatMap((item) => (item.changelog || []).map((entry) => ({ item, entry })))
    .sort((a, b) => new Date(b.entry.date) - new Date(a.entry.date));
}

function renderWhatsNewRows(container, releases) {
  if (!releases.length) {
    container.innerHTML = emptyState({
      icon: "box",
      title: "No releases yet",
      message: "New releases from every application will show up here as soon as they're published.",
    });
    return;
  }
  container.innerHTML = releases
    .map(
      ({ item, entry }) => `
      <li class="whats-new-entry">
        <span class="whats-new-meta">
          <a href="software.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a>
          <span class="version-tag">v${escapeHtml(entry.version)}</span>
          ${entry.prerelease ? `<span class="badge-prerelease">Pre-release</span>` : ""}
          <span class="whats-new-date">${formatDisplayDate(entry.date)}</span>
        </span>
        <ul>${renderChangelogNotes(entry.notes)}</ul>
      </li>`
    )
    .join("");
}

async function renderWhatsNewPage() {
  const container = document.getElementById("whats-new-list");
  try {
    const data = await fetchSoftwareCatalog();
    const software = visibleSoftware(data);
    renderWhatsNewRows(container, allReleasesChronological(software));
  } catch (error) {
    container.innerHTML = emptyState({
      icon: "warning",
      title: "Unable to load releases",
      message: "Something went wrong fetching the release history. Please try refreshing the page.",
    });
    console.error(error);
  }
}

const PAGE_INIT = {
  home: () => {
    renderHomepage();
    renderHero();
  },
  "software-detail": renderSoftwareDetail,
  downloads: renderDownloadsPage,
  "whats-new": renderWhatsNewPage,
  about: renderAboutPage,
};

const pageInit = PAGE_INIT[document.body.dataset.page];
if (pageInit) pageInit();
