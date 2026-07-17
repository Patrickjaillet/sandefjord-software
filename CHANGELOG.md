# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
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
