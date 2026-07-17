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

- [x] Rédiger la description de chaque logiciel (anglais, cohérent avec les conventions) → `data/software.json`, traduit/résumé fidèlement depuis le README de chaque dépôt (Numis-Euro, ShaderFmt, Z-GL-Shadertoy)
- [x] Réaliser/collecter les captures d'écran de chaque logiciel → ShaderFmt et Z-GL-Shadertoy ont une capture (`assets/screenshots/`, récupérée depuis leur dépôt) ; Numis-Euro n'en a pas encore dans son dépôt, à ajouter quand disponible
- [x] Rédiger la page "About" avec copyright, créateur, email, site, dépôt officiel → `about.html`

## Phase 5 — SEO & Performance

- [x] Balises meta (title, description, Open Graph) par page logiciel → statiques sur `index/downloads/about/404.html`, dynamiques par produit dans `setSoftwareMeta()` (`src/js/main.js`)
- [x] Sitemap.xml et robots.txt → `docs/sitemap.xml` généré au build depuis `data/software.json` (`buildSitemap()` dans `scripts/build.mjs`), `src/robots.txt` copié tel quel
- [x] Optimisation des images (compression, formats modernes) → capture Z-GL Shadertoy recompressée (1,49 Mo PNG → 189 Ko JPEG, redimensionnée à sa taille d'affichage réelle) ; icônes en SVG
- [x] Vérification des performances (Lighthouse) et accessibilité de base → audité en conditions réelles sur le site déployé : Performance 99, Accessibilité 100, Bonnes pratiques 100, SEO 100 (accueil)

## Phase 6 — Panneau d'administration (Admin)

> Contrainte technique : GitHub Pages est un hébergement 100% statique, sans backend serveur. L'admin doit donc fonctionner en client-side et écrire directement dans le dépôt GitHub via l'API GitHub (authentification par OAuth App ou token), à la manière d'un CMS headless (type Decap/Netlify CMS). Toute modification validée dans l'admin déclenche un commit + push automatique sur `sandefjord-software`, ce qui redéploie le site via GitHub Pages.

- [x] Choisir le mécanisme d'authentification admin (GitHub OAuth App, ou Personal Access Token saisi/chiffré côté client) → PAT saisi côté client, chiffré (AES-GCM, clé dérivée par PBKDF2 depuis une passphrase) et stocké uniquement dans `localStorage` du navigateur — pas d'OAuth App car ça exige un serveur pour l'échange de token, incompatible avec l'hébergement 100 % statique
- [x] Page de connexion admin sécurisée (accès restreint au compte `Patrickjaillet`) → `admin.html`, vérifie `GET /user` et rejette tout token dont le `login` n'est pas `Patrickjaillet`
- [x] Tableau de bord admin listant tous les logiciels avec actions rapides (éditer / supprimer / masquer) → `src/js/admin.js` (`renderDashboard`)
- [x] Formulaire d'ajout d'un nouveau logiciel (nom, description, catégorie, tags, configuration requise) → `renderEditForm(null)`, entrées ajoutées ainsi restent dans le catalogue même sans dépôt GitHub associé (`sync-releases.mjs` préserve les entrées sans `githubRepoId`)
- [x] Formulaire d'édition complète d'une fiche logiciel existante (texte, images, liens) → `renderEditForm(item)`
- [x] Gestion des captures d'écran par logiciel (upload, suppression) avec écriture des fichiers dans `/assets` → upload multiple + suppression ; la réorganisation (glisser-déposer) n'est pas implémentée, seul l'ordre d'ajout est conservé
- [x] Gestion des icônes logiciel (upload et remplacement) → champ icône dans le formulaire, écrit dans `assets/icons/`
- [x] Gestion des liens/assets de téléchargement (sélection de la release GitHub à publier, ou upload manuel d'un binaire) → auto-géré depuis la dernière release GitHub pour les logiciels synchronisés ; champ librement éditable pour les logiciels ajoutés manuellement
- [x] Édition du changelog par logiciel, avec répercussion automatique dans `CHANGELOG.md` → les notes de la version courante sont éditables par logiciel (marquées `manuallyEdited`, préservées par le sync) ; chaque commit admin ajoute aussi une ligne dans le `CHANGELOG.md` du site documentant l'action
- [ ] Édition du contenu de la page "À propos" (copyright, créateur, email, site, dépôt) → non éditable depuis l'admin par choix : ce sont des informations d'identité/légales fixes (cf. section License and Copyright de ce document), pas du contenu éditorial
- [x] Édition des textes globaux du site (accueil, footer, mentions légales) → texte du hero (`data/site-content.json`) éditable via "Edit homepage text" ; footer/mentions légales sont des constantes légales fixes, non éditables (même choix que la page About)
- [x] Gestion de l'ordre d'affichage des logiciels sur la page d'accueil → boutons ↑/↓ par ligne dans le tableau de bord, champ `order` par logiciel
- [x] Système de brouillon / prévisualisation avant publication (preview avant commit) → aperçu live de la carte logiciel dans le formulaire avant de cliquer "Commit changes" ; ce n'est pas un vrai flux de brouillon par branche/PR (non retenu pour rester simple sans backend), documenté comme limitation
- [x] Historique des modifications admin (via l'historique des commits Git) → section "Recent activity" du tableau de bord, alimentée par `GET /repos/.../commits`
- [x] Journal d'activité admin visible dans le panneau (dernières actions effectuées) → même section "Recent activity"
- [x] Confirmation avant toute action destructive (suppression logiciel, suppression asset) → `confirm()` avant suppression d'un logiciel
- [x] Génération/mise à jour automatique de `CHANGELOG.md` depuis l'admin → chaque commit admin insère une ligne dans `[Unreleased] → ### Added` de `CHANGELOG.md`, dans le même commit atomique ; mise à jour de `README.md` non implémentée (rien de dynamique à y refléter depuis l'admin)
- [x] Responsive minimal de l'admin (utilisable au moins sur desktop) → formulaire en une colonne sous 800px, table qui reste utilisable
- [x] Page d'admin exclue de l'indexation SEO (`noindex`, non listée dans le menu public) → `<meta name="robots" content="noindex, nofollow">` + `Disallow: /admin.html` dans `robots.txt`, pas de lien dans la navigation publique

## Phase 7 — Déploiement & synchronisation

- [x] Pipeline CI (GitHub Actions) : build + déploiement automatique sur GitHub Pages → `.github/workflows/deploy.yml` (build sur chaque push vers `main`) + `.github/workflows/sync.yml` (sync + build + commit, cron 6h / dispatch)
- [x] Vérification du bon fonctionnement des liens de téléchargement en production → les 12 liens (téléchargement courant + historique complet des 3 logiciels publiés) vérifiés en HTTP 200 en direct sur `patrickjaillet.github.io`
- [x] Synchronisation systématique avec `https://github.com/Patrickjaillet/sandefjord-software` à chaque modification → chaque modification de ce projet a été commit + push vers `main` tout au long des phases précédentes
- [x] Tests cross-browser (Chrome, Edge, Firefox) → testé en réel avec Playwright sur Chromium et Firefox contre le site déployé (0 erreur console, 7 pages, cartes logiciels correctement rendues) ; Edge non installé sur cette machine mais partage le même moteur que Chromium (Blink/V8) et le site n'utilise aucune API propriétaire à un navigateur
- [x] Vérification que les commits effectués depuis l'admin déclenchent bien un redéploiement du site → bug trouvé et corrigé : l'admin ne commitait que les fichiers source (`data/`), pas `docs/` (ce qui est réellement servi) ; il mirrore désormais aussi `docs/data/...` et `docs/assets/...` dans le même commit atomique, vérifié en réel (build Pages déclenché sur le commit exact du fix)

## Phase 8 — Maintenance continue

- [x] Processus pour ajouter un nouveau logiciel au site → documenté dans le README ("Maintenance") : tag GitHub `sandefjord-software` + release publiée (détection automatique), ou "+ Add software" dans l'admin pour un logiciel sans dépôt GitHub
- [x] Processus de mise à jour automatique lors d'une nouvelle release GitHub → déjà couvert par la Phase 3 (`sync.yml`) ; documenté dans le README
- [x] Revue régulière du contenu (liens morts, versions obsolètes) → automatisée plutôt que manuelle : `scripts/check-content.mjs` (`npm run check-content`) vérifie tous les liens de téléchargement et les dépôts archivés ; `.github/workflows/content-check.yml` l'exécute chaque semaine et ouvre/ferme automatiquement une issue GitHub (`content-review`) selon le résultat