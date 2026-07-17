# ROADMAP — Sandefjord Software Website

Site vitrine statique (GitHub Pages) pour diffuser les logiciels Windows de Sandefjord Software, dans l'esprit d'un site type Softpedia/MajorGeeks : simple, sobre, fonctionnel, sans fioritures 3D/Three.js.

---

## License and Copyright

**SANDEFJORD SOFTWARE**
Copyright © 2026 SANDEFJORD DEVELOPMENT — All rights reserved
Creator: Patrick JAILLET
Email: sandefjordsoftwaredevelopment@gmail.com
Website: https://github.com/Patrickjaillet
Official Repository: https://github.com/Patrickjaillet/sandefjord-software

---

## Conventions de développement

- [ ] General language only English
- [ ] Theme only White or system for application
- [ ] Source language entirely in English (variable names, functions, classes)
- [ ] No comments in the source code
- [ ] Strict Windows 10/11 compatibility only
- [ ] Every added feature must be reflected in this ROADMAP.md
- [ ] Automatic software version serialization for each Phase and each build
- [ ] Every modification must be reflected for the end-user in the CHANGELOG.md
- [ ] The README.md must be created and updated for the end-user with every modification and include a software screenshot
- [ ] Systematic synchronization with the https://github.com/Patrickjaillet/sandefjord-software repository upon every project modification
- [ ] Never integrate Claude AI into GitHub, the files, or the GitHub contributors list
- [ ] Creation of all files and documents required for the GitHub repository
- [ ] Integrate copyright / Creator / Email / Website information into an "About" tab
- [ ] Create icons for both the "Inno Setup" installer and the software
- [ ] MIT license

---

## Phase 0 — Cadrage du projet

- [x] Définir le nom de domaine / sous-domaine GitHub Pages → `patrickjaillet.github.io/sandefjord-software` (pas de domaine personnalisé pour l'instant)
- [x] Choisir la stack technique → HTML/CSS/JS statique (vanilla), sans générateur, avec script Node.js pour la synchronisation GitHub Releases (Phase 3)
- [x] Créer le dépôt `sandefjord-software` s'il n'existe pas encore (à pousser sur GitHub — squelette local prêt)
- [x] Définir l'arborescence du dépôt (`/src`, `/docs`, `/assets`, `/data`, `/scripts`)
- [x] Configurer GitHub Pages (branche `main`, dossier `/docs`, workflow `.github/workflows/deploy.yml`)

## Phase 1 — Architecture de l'information

- [x] Page d'accueil (liste des logiciels avec vignette + résumé) → `index.html`, cartes générées depuis `data/software.json`
- [x] Page "Fiche logiciel" (description, captures d'écran, changelog, bouton téléchargement) → `software.html?id=...` (template unique, rendu client-side)
- [x] Page "À propos" (copyright / créateur / contact / dépôt officiel) → `about.html`
- [x] Page "Téléchargements" globale (tous les logiciels + versions) → `downloads.html`
- [x] Page 404 personnalisée → `404.html`
- [x] Footer commun (mentions légales, lien GitHub, licence MIT) → `src/partials/footer.html`, injecté par `scripts/build.mjs` sur toutes les pages

## Phase 2 — Design UI/UX

- [x] Choisir une palette sobre (thème clair par défaut, cohérent avec la contrainte "Thème blanc ou système") → blanc pur + accent fjord teal `#0B4F62`, voir tokens dans `src/css/style.css`
- [x] Définir la typographie (lisible, professionnelle, pas de police fantaisiste) → polices système pour titres/texte, monospace (Cascadia Code/Consolas) réservé aux données (versions, dates)
- [x] Créer une grille de cartes logiciels (icône, nom, courte description, tag version) → `.software-grid` / `.software-card`
- [x] Concevoir le template de fiche logiciel (galerie captures d'écran, specs, configuration requise Windows 10/11) → layout 2 colonnes (`software.html`), aside technique sticky + changelog en timeline
- [x] Design responsive (desktop prioritaire, mobile correct) → grilles en `auto-fill`, breakpoints `@media (max-width: 800px / 640px / 560px)`
- [x] Pas d'animation 3D / Three.js — interactions CSS simples uniquement → aucune dépendance JS d'animation, `prefers-reduced-motion` respecté

## Phase 3 — Intégration GitHub Releases & mise à jour automatique

> Objectif : le site doit se synchroniser tout seul avec GitHub, sans action manuelle — aussi bien quand un nouveau logiciel est créé que lorsqu'une release existante est mise à jour.

- [x] Définir la source des données (fichier JSON statique généré, ou appel GitHub API au build/runtime) → `data/software.json` généré par `scripts/sync-releases.mjs` à partir de l'API GitHub
- [x] Script de récupération automatique des releases GitHub (nom, version, date, changelog, assets .exe/.zip) → `scripts/sync-releases.mjs`
- [x] Génération automatique des boutons de téléchargement pointant vers les assets de release → `downloadUrl` (asset primaire) + `versionHistory[].assets`
- [x] Affichage du numéro de version courant par logiciel sur la fiche produit → `item.version` sur `software.html`/`index.html`/`downloads.html`
- [x] Historique des versions téléchargeables (archives des anciennes releases) → section "Version history" sur `software.html`, alimentée par `versionHistory`
- [x] Convention de détection des dépôts logiciels (ex: topic GitHub `sandefjord-software`, ou organisation/compte dédié) pour repérer automatiquement les nouveaux projets → topic GitHub `sandefjord-software` sur le compte `Patrickjaillet`
- [x] Script de scan de tous les dépôts du compte correspondant à cette convention, avec extraction des métadonnées (nom, description, dernière release) → `findSoftwareRepos()` dans `scripts/sync-releases.mjs`
- [x] Ajout automatique d'un nouveau logiciel sur le site dès qu'un dépôt correspondant à la convention est créé/publié (sans passer par l'admin) → tout repo taggé apparaît au prochain sync dès sa première release publiée
- [x] Mise à jour automatique de la fiche logiciel dès qu'une nouvelle release est publiée sur son dépôt (version, changelog, assets) → `buildEntry()` régénère version/changelog/versionHistory à chaque sync
- [x] Workflow GitHub Actions déclenché par webhook/`repository_dispatch` à chaque publication de release sur un dépôt logiciel → `.github/workflows/sync.yml` (`repository_dispatch: release-published`) + `templates/notify-sandefjord-software.yml` à copier dans chaque dépôt logiciel
- [x] Workflow GitHub Actions planifié (cron, ex. toutes les X heures) en filet de sécurité pour resynchroniser l'ensemble des logiciels → `sync.yml`, cron toutes les 6h
- [x] Régénération automatique des données du site (JSON) + redéploiement GitHub Pages après chaque synchronisation → `sync.yml` exécute sync + build + commit/push de `data/` et `docs/`
- [x] Génération/mise à jour automatique du `CHANGELOG.md` de chaque logiciel à partir des notes de release GitHub → `changelog[]` par logiciel dans `data/software.json`, généré depuis `release.body`, affiché sur `software.html`
- [x] Gestion des cas limites : dépôt archivé, release en pré-version (pre-release), release supprimée, dépôt renommé → dépôts archivés exclus, pré-releases marquées (`prerelease`, badge UI), releases supprimées disparaissent au sync suivant, renommages suivis via `githubRepoId` stable ; garde-fou : un sync à 0 résultat ne vide jamais un catalogue existant

## Phase 4 — Contenu & assets

- [ ] Rédiger la description de chaque logiciel (anglais, cohérent avec les conventions)
- [ ] Réaliser/collecter les captures d'écran de chaque logiciel
- [ ] Rédiger la page "About" avec copyright, créateur, email, site, dépôt officiel

## Phase 5 — SEO & Performance

- [ ] Balises meta (title, description, Open Graph) par page logiciel
- [ ] Sitemap.xml et robots.txt
- [ ] Optimisation des images (compression, formats modernes)
- [ ] Vérification des performances (Lighthouse) et accessibilité de base

## Phase 6 — Panneau d'administration (Admin)

> Contrainte technique : GitHub Pages est un hébergement 100% statique, sans backend serveur. L'admin doit donc fonctionner en client-side et écrire directement dans le dépôt GitHub via l'API GitHub (authentification par OAuth App ou token), à la manière d'un CMS headless (type Decap/Netlify CMS). Toute modification validée dans l'admin déclenche un commit + push automatique sur `sandefjord-software`, ce qui redéploie le site via GitHub Pages.

- [ ] Choisir le mécanisme d'authentification admin (GitHub OAuth App, ou Personal Access Token saisi/chiffré côté client)
- [ ] Page de connexion admin sécurisée (accès restreint au compte `Patrickjaillet`)
- [ ] Tableau de bord admin listant tous les logiciels avec actions rapides (éditer / supprimer / masquer)
- [ ] Formulaire d'ajout d'un nouveau logiciel (nom, description, catégorie, tags, configuration requise)
- [ ] Formulaire d'édition complète d'une fiche logiciel existante (texte, images, liens)
- [ ] Gestion des captures d'écran par logiciel (upload, réorganisation, suppression) avec écriture des fichiers dans `/assets`
- [ ] Gestion des icônes logiciel + icône installeur Inno Setup (upload et remplacement)
- [ ] Gestion des liens/assets de téléchargement (sélection de la release GitHub à publier, ou upload manuel d'un binaire)
- [ ] Édition du changelog par logiciel, avec répercussion automatique dans `CHANGELOG.md`
- [ ] Édition du contenu de la page "À propos" (copyright, créateur, email, site, dépôt)
- [ ] Édition des textes globaux du site (accueil, footer, mentions légales)
- [ ] Gestion de l'ordre d'affichage des logiciels sur la page d'accueil
- [ ] Système de brouillon / prévisualisation avant publication (preview avant commit)
- [ ] Historique des modifications admin (via l'historique des commits Git)
- [ ] Journal d'activité admin visible dans le panneau (dernières actions effectuées)
- [ ] Confirmation avant toute action destructive (suppression logiciel, suppression asset)
- [ ] Génération/mise à jour automatique de `README.md` et `CHANGELOG.md` depuis l'admin
- [ ] Responsive minimal de l'admin (utilisable au moins sur desktop)
- [ ] Page d'admin exclue de l'indexation SEO (`noindex`, non listée dans le menu public)

## Phase 7 — Déploiement & synchronisation

- [ ] Pipeline CI (GitHub Actions) : build + déploiement automatique sur GitHub Pages
- [ ] Vérification du bon fonctionnement des liens de téléchargement en production
- [ ] Synchronisation systématique avec `https://github.com/Patrickjaillet/sandefjord-software` à chaque modification
- [ ] Tests cross-browser (Chrome, Edge, Firefox)
- [ ] Vérification que les commits effectués depuis l'admin déclenchent bien un redéploiement du site

## Phase 8 — Maintenance continue

- [ ] Processus pour ajouter un nouveau logiciel au site
- [ ] Processus de mise à jour automatique lors d'une nouvelle release GitHub
- [ ] Revue régulière du contenu (liens morts, versions obsolètes)