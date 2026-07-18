# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Continuous integration on every Pull Request (`.github/workflows/ci.yml`): build + `check-content`, a Playwright test suite (`tests/e2e/`) covering homepage search/filter/sort and the `/` search shortcut, the downloads table, and a software detail page, an automated accessibility scan (`@axe-core/playwright`) on every main public page, and a Lighthouse CI budget (`.lighthouserc.json`) asserting on the same categories audited in Phase 5
- SHA-256 checksum for each software's current download, computed and cached by `scripts/sync-releases.mjs` (`downloadSha256`), shown next to the download button on the product page with a "Copy" button
- Sort control (recently updated / most downloaded / name A-Z) on the homepage and downloads page, alongside the existing search and category filter
- Keyboard shortcut: pressing `/` anywhere on the homepage or downloads page focuses the search field
- JSON Feed 1.1 (`docs/feed.json`, `buildJsonFeed()` in `scripts/build.mjs`) alongside the existing RSS feed, with autodiscovery on the homepage and What's New page
- Community engagement: a lazy-loaded comments widget per software (giscus, backed by GitHub Discussions — no separate backend), reusing 👍 reactions as a like count; like/comment counts now show on software cards (homepage, "You might also like") and a new column in the downloads table; share buttons extended with Reddit and LinkedIn alongside X and email; `scripts/sync-engagement.mjs` fetches the counts on the existing 6-hour cron. GitHub Discussions is enabled (using the built-in "General" category — the API has no way to create a custom one), the giscus GitHub App is installed, and the comments widget is live and verified on the deployed site
- "What's New" page (`whats-new.html`) listing every release from every application chronologically, plus an RSS feed (`rss.xml`, generated at build time) with feed autodiscovery on the homepage and the new page; linked from the main nav and the footer
- "Copy link" and share buttons on the product page: clipboard copy, the native Web Share API where supported, and simple fallback links (X, email) with no third-party SDK
- Polished empty states (search returns nothing, no screenshots yet, empty catalog, load errors) with a small SVG illustration and an engaging message, replacing plain "No results" text everywhere it appeared (homepage, downloads, product page, What's New)
- A sober print stylesheet (`@media print`) for the product page: navigation, hero, share section, and similar-software are hidden, the layout flattens to one column, and text prints in black on white — useful for archiving a software's requirements or changelog
- System dark mode (`prefers-color-scheme: dark`) across all public pages, with a dedicated fjord-teal dark palette and a `--color-on-accent` token to keep solid buttons/badges readable in both themes; the admin panel keeps its existing fixed light theme
- A shared animation scale (one easing curve, three durations) applied consistently to every hover/focus/appearance transition site-wide
- Fade-and-rise entrance animation for grid cards on initial load and when filtering/searching
- Skeleton loading states (shimmering placeholders) for the homepage grid, the product page, and the downloads table, replacing the plain "Loading..." text
- Consistent monoline category pictograms next to every category badge (cards, product page, downloads table)
- A `.button-secondary` variant and a shared disabled state for the public-site button component; footer links now get the same fade-in underline transition as the nav on hover
- Real screenshots for AIPrompt (dark/light theme, from the repo's `assets/screenshots`) and GLSL-Hyper-Golfer (from the repo's `docs/screenshot.png`)
- Software cards: a more visible category pill, real file size and "Updated <date>" pulled from the catalog, an "Updated recently" badge for releases under 30 days old, and a second-screenshot cross-fade on hover/focus when a software has more than one screenshot
- Software detail page: a breadcrumb (also added to the downloads page), a redesigned primary download button (bigger, Windows icon, real file size and download count subtext, a "Preparing download..." → "Download started" transient state), system requirements shown as a checklist instead of plain text, a "You might also like" section (same-category software first), and a screenshot gallery with a consistent frame, a position caption per thumbnail, and a fade transition plus position counter in the lightbox
- Homepage hero redesign: stronger benefit-driven headline and reassuring subtitle, trust indicators (apps published, total downloads, link to the official GitHub account) computed live from the catalog, a dual call-to-action ("Browse software" / "View on GitHub"), a "Latest release" featured card, a "Latest updates" banner surfacing the 3 most recent releases across all software, and a subtle scroll parallax on the fjord contour-line graphic (`prefers-reduced-motion` respected)
- Real per-release download counts (`totalDownloads` per software, `downloadCount` per asset) captured by `scripts/sync-releases.mjs` from the GitHub Releases API, powering the homepage trust indicators
- Homepage and downloads page: live search and category filter pills over the software catalog
- Tag chips on software cards and the software detail page
- Click-to-enlarge screenshot lightbox (keyboard and mouse navigation) on the software detail page
- Lightweight changelog markdown rendering (`##`/`###` headers, `**bold**`, `` `code` ``) instead of showing raw release-note syntax as plain text
- Automated weekly content review (`scripts/check-content.mjs`, `.github/workflows/content-check.yml`): checks every software entry's download links (current version and latest release assets) and whether its linked repository was archived, opening or updating a `content-review`-labeled GitHub issue when problems are found and closing it automatically once resolved
- Client-side admin panel (`admin.html`) for managing the catalog without a backend: GitHub token login (encrypted at rest in the browser with a passphrase, restricted to the `Patrickjaillet` account), a dashboard to add/edit/hide/delete/reorder software, icon and screenshot uploads, per-version changelog note editing, homepage hero text editing, a live preview before publishing, a recent-activity log from the Git commit history, and confirmation prompts before destructive actions; every write commits atomically (via the Git Data API) to `data/software.json` and appends a line to `CHANGELOG.md` in the same commit, which redeploys the site
- `hidden`, `order`, and `tags` fields on software entries, and support for software added manually (without a linked GitHub repo) that the release sync now preserves instead of dropping
- SEO: title/description/Open Graph meta tags on every page (static on `index`/`downloads`/`about`/`404`, dynamic per product on `software.html`), a build-time `sitemap.xml` covering every software entry, `robots.txt`, and a site favicon
- Real content for the first three published products (Numis-Euro, ShaderFmt, Z-GL-Shadertoy): English descriptions summarized from each repository's README, categories, and screenshots where available
- Automatic GitHub Releases sync (`scripts/sync-releases.mjs`): discovers repositories tagged with the `sandefjord-software` GitHub topic, reads their published releases, and regenerates `data/software.json` (version, per-release changelog, downloadable version history with release assets); editorial fields are preserved across runs, archived repos are skipped, pre-releases are flagged, renamed repos are tracked via stable GitHub repo id, and a zero-result run never wipes an existing catalog
- Scheduled + event-driven sync workflow (`.github/workflows/sync.yml`): 6-hour cron safety net, manual `workflow_dispatch`, and instant `repository_dispatch` trigger; syncs, rebuilds `docs/`, and commits/pushes so GitHub Pages redeploys automatically
- `templates/notify-sandefjord-software.yml`: workflow template to copy into each software repository so it pings this site the moment it publishes a release
- "Version history" section on the software detail page listing every archived release with its downloadable assets, and a pre-release badge on the current version and in the changelog
- Default placeholder icon (`assets/icons/default-app.svg`) for newly discovered software before a custom icon is set
- Full visual identity: white theme, deep fjord-teal accent (`#0B4F62`), system typography with monospace reserved for factual data (versions, dates) — design tokens in `src/css/style.css`
- Signature hero graphic: subtle fjord contour-line illustration (SVG, static, no 3D/Three.js)
- Redesigned software cards (icon, category, name, description, version tag, "View details" link) with hover/focus states
- Redesigned software detail page: two-column layout with sticky technical aside (version, requirements, category, repository link) and a real changelog timeline
- Redesigned About page as a definition list (creator, email, website, repository, license, copyright)
- Refined downloads table with category column and monospace version tags
- On-brand 404 copy ("This page has drifted.")
- Accessible focus states (`:focus-visible`) and `prefers-reduced-motion` support
- Placeholder monogram icons for sample software entries; graceful empty state when no screenshots are available yet
- Homepage listing all software as cards (icon, name, short description, version) — `index.html`
- Software detail template with description, screenshots gallery, changelog and download button — `software.html?id=...`
- Global downloads page listing every software and its current version — `downloads.html`
- About page with copyright, creator, contact and official repository — `about.html`
- Custom 404 page — `404.html`
- Shared header/footer partials, injected at build time by `scripts/build.mjs` (mentions légales, GitHub link, MIT license)
- Sample placeholder entries in `data/software.json` (to be replaced with real content in Phase 4)
- Project scaffolding: repository structure (`src`, `docs`, `assets`, `data`, `scripts`)
- MIT License
- Base `README.md` and `CHANGELOG.md`

### Fixed
- Keyboard focus on screenshot thumbnails (and any other `tabindex`-only element) fell back to the browser's default focus ring instead of the site's teal outline — the global focus-visible rule only covered `a`/`button`; extended it to `input` and any `[tabindex]` element
- The hidden native "Share" button on the product page stayed visible regardless of `navigator.share` support, because `.share-icon-button { display: inline-flex }` overrode the browser's default `[hidden]` rule — added an explicit `[hidden] { display: none }` override
- AIPrompt and GLSL-Hyper-Golfer descriptions were pulled from their GitHub repo description field in French; rewritten in English from each project's README, consistent with the "English only" convention
- Admin panel writes now also commit to `docs/` (what GitHub Pages actually serves), not just the `data/` source files — previously an admin change wouldn't appear on the live site until the next scheduled sync
- Two admin CSS media queries (login branding panel, sidebar-to-topbar collapse) were silently overridden by an unconditional rule later in the stylesheet, so nothing actually collapsed below the breakpoint; on mobile this hid the sidebar entirely with no way to switch views or sign out — reordered the rules and turned the sidebar into a horizontal top bar below 860px instead of hiding it

### Changed
- Compressed the Z-GL Shadertoy screenshot from a 1.49 MB PNG to a 189 KB JPEG resized to its actual display width
- Redesigned the admin panel: split-screen branded login, sidebar + main layout, dashboard stat cards, a table with icon thumbnails/category pills/source badges, edit forms reorganized into sections with icon and screenshot preview thumbnails, a custom confirmation modal in place of the browser's `confirm()`, and toasts with a status icon
- Software cards gained elevation/hover lift and a subtle border on the icon; screenshots lift on hover as an affordance for the new lightbox
