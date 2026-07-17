# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
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
- Admin panel writes now also commit to `docs/` (what GitHub Pages actually serves), not just the `data/` source files — previously an admin change wouldn't appear on the live site until the next scheduled sync

### Changed
- Compressed the Z-GL Shadertoy screenshot from a 1.49 MB PNG to a 189 KB JPEG resized to its actual display width
