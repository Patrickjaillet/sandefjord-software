# Sandefjord Software — Website

Static showcase website for Windows applications published by Sandefjord Software.

Live site: https://patrickjaillet.github.io/sandefjord-software/

![Homepage screenshot](./screenshot.png)

## Project structure

```
src/            Source files (HTML, CSS, JS)
src/partials/   Shared header/footer, injected at build time
docs/           Build output served by GitHub Pages
assets/         Icons and screenshots
data/           Generated software catalog (software.json)
scripts/        Build and GitHub release sync scripts
templates/      Workflow template for software repositories (release notification)
```

## Pages

- `index.html` — homepage, software listed as cards
- `software.html?id=<software-id>` — software detail template (description, screenshots, changelog, download)
- `downloads.html` — all software and their current versions
- `about.html` — copyright, creator, contact, official repository
- `404.html` — custom not found page
- `admin.html` — client-side admin panel (not linked publicly, `noindex`), see below

## Stack

Static HTML/CSS/JS, no framework. A Node.js script synchronizes the software
catalog from GitHub Releases (see `scripts/sync-releases.mjs`) and regenerates
`data/software.json`. Running `npm run build` injects the shared header/footer
partials into every page and outputs the final site into `docs/` for GitHub Pages.

`data/site-content.json` holds the editable homepage hero text, fetched at
runtime the same way as the software catalog.

## Automatic sync with GitHub Releases

Any repository owned by `Patrickjaillet` tagged with the GitHub topic
`sandefjord-software` is treated as a product and picked up automatically —
no manual admin step required to add a new app to the site.

- `npm run sync` (`scripts/sync-releases.mjs`) lists matching repositories,
  reads their published releases, and rebuilds `data/software.json`: current
  version, full changelog, and a downloadable version history with release
  assets. Editorial fields (name, description, category, icon, screenshots,
  system requirements) are preserved across runs once set; only
  release-derived fields are refreshed. Repos are matched across renames by
  their stable GitHub repo id, archived repos are skipped, and repos without
  any published release yet are skipped until their first release.
- `.github/workflows/sync.yml` runs this automatically: on a 6-hour cron
  safety net, on `workflow_dispatch`, and on a `repository_dispatch` event
  named `release-published` for instant updates. It syncs, rebuilds `docs/`,
  and commits/pushes both — GitHub Pages redeploys from the updated `docs/`
  on that push.
- `templates/notify-sandefjord-software.yml` is a workflow to copy into each
  software repository so it pings this repo the moment it publishes a
  release, instead of waiting for the cron safety net. It needs a
  `SITE_DISPATCH_TOKEN` secret (PAT with `contents:write` on this repo) set
  on the software repository.

## Admin panel

`admin.html` is a client-side CMS: GitHub Pages has no backend, so it
authenticates with a GitHub token (fine-grained, `contents:write` on this
repo, or a classic token with the `repo` scope) pasted in by hand and
encrypted at rest in the browser's `localStorage` with a passphrase
(PBKDF2 + AES-GCM — the token never leaves the browser except to call the
GitHub API directly). Access is hard-restricted to the `Patrickjaillet`
account via `GET /user`.

From the dashboard you can add, edit, hide, reorder, and delete software,
upload icons/screenshots, edit the current version's changelog notes, and
edit the homepage hero text. Every save previews the change client-side
first, then commits atomically (via the Git Data API, one commit for every
changed file) straight to `main` — which also appends a line to
`CHANGELOG.md` in the same commit and redeploys the site through GitHub
Pages. A "Recent activity" panel on the dashboard reads the actual Git
commit history.

The page is not linked from the public navigation, is marked `noindex`, and
is disallowed in `robots.txt`. It's still a public URL on a public repo:
treat the token passphrase as the only thing standing between the page and
write access to this repo, and revoke the token from GitHub if you ever
suspect it leaked.

## Design

White theme, one accent color, no decoration beyond what's needed:

- **Color** — background `#FFFFFF`, text `#16232A`, accent (fjord teal) `#0B4F62`
- **Type** — system UI fonts for headings/body; monospace (Cascadia Code / Consolas)
  reserved for factual data: version numbers, dates, requirements
- **Signature** — a quiet fjord contour-line illustration in the homepage hero,
  the only deliberate visual flourish on the site
- No 3D, no animation libraries; transitions respect `prefers-reduced-motion`

Full token list in `src/css/style.css`.

## License

MIT — see [LICENSE](./LICENSE).

## About

**SANDEFJORD SOFTWARE**
Copyright © 2026 SANDEFJORD DEVELOPMENT — All rights reserved
Creator: Patrick JAILLET
Email: sandefjordsoftwaredevelopment@gmail.com
Website: https://github.com/Patrickjaillet
Official Repository: https://github.com/Patrickjaillet/sandefjord-software
