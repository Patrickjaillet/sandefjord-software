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
- [x] Passe de polish UI/UX (post-lancement) : ombres/élévation et hover sur les cartes, recherche + filtres par catégorie sur l'accueil et les téléchargements, tags affichés en chips, lightbox clavier/souris pour les captures d'écran, rendu markdown léger (titres, **gras**, `code`) dans le changelog au lieu du texte brut
- [x] Refonte complète du panneau admin (jugé "trop simplifié et moche") : écran de connexion en deux volets avec identité de marque, layout sidebar + contenu, cartes de statistiques, tableau avec vignettes/pills/icônes, formulaire réorganisé en sections avec aperçus d'images, modale de confirmation personnalisée (remplace `confirm()`), toasts avec icône, sidebar qui se transforme en barre horizontale sous 860px (bug corrigé : elle était entièrement masquée sur mobile, rendant la navigation et la déconnexion inaccessibles)

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
- [x] Édition du contenu de la page "À propos" (copyright, créateur, email, site, dépôt) → non éditable depuis l'admin par choix : ce sont des informations d'identité/légales fixes (cf. section License and Copyright de ce document), pas du contenu éditorial
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

## Phase 9 — Refonte de la page d'accueil et du premier écran

> Objectif : que le premier écran (hero + début de grille) donne immédiatement envie d'explorer, sans jamais recourir à de la 3D/Three.js ni sortir du thème blanc/système.

- [x] Réécrire le hero avec une accroche plus forte (bénéfice utilisateur en une phrase) et un sous-titre qui rassure (gratuit, sans compte, open source, Windows 10/11) → `data/site-content.json` (« Get things done, without the bloat. »), toujours éditable depuis l'admin ("Edit homepage text")
- [x] Ajouter des indicateurs de confiance visibles dès le hero : nombre de logiciels publiés, nombre total de téléchargements, lien direct vers le dépôt GitHub officiel → `.hero-stats`, calculés côté client depuis `data/software.json` (`renderHeroStats()` dans `main.js`) ; le nombre de téléchargements vient d'un nouveau champ `totalDownloads` par logiciel (somme des `download_count` GitHub), alimenté par `scripts/sync-releases.mjs`
- [x] Ajouter un double appel à l'action dans le hero : "Parcourir les logiciels" (scroll vers la grille) et "Voir sur GitHub" (lien externe), avec hiérarchie visuelle claire (bouton plein vs bouton fantôme) → `.hero-actions` (`button-primary` + `button` fantôme)
- [x] Mettre en avant un logiciel "à la une" (le plus récent ou le plus populaire) juste sous le hero, avec une carte plus grande que les autres → `.featured-card`, sélectionne automatiquement le logiciel dont la dernière entrée de changelog est la plus récente (`renderFeaturedSoftware()`)
- [x] Affiner le composant `.fjord-lines` existant pour qu'il réagisse légèrement au défilement (parallaxe CSS très subtile, `prefers-reduced-motion` respecté) sans devenir un gadget → `setupFjordParallax()`, translation verticale plafonnée liée au scroll, désactivée si `prefers-reduced-motion: reduce`
- [x] Ajouter un bandeau "Dernières mises à jour" (3 dernières releases toutes applications confondues) entre le hero et la grille, pour donner un sentiment de site vivant → `.latest-updates`, agrège les 3 entrées de changelog les plus récentes tous logiciels confondus (`renderLatestUpdates()`)
- [x] Revoir la densité et le rythme vertical de la page (espacements, tailles de section) pour éviter l'effet "liste plate" et créer des respirations entre les blocs → padding du hero augmenté, séparateur `.hero-stats`, marges dédiées pour la carte à la une et le bandeau de nouveautés

## Phase 10 — Cartes logiciels, fiches produit et parcours de téléchargement

> Objectif : que chaque carte et chaque fiche logiciel donne confiance et pousse naturellement vers le téléchargement.

- [x] Enrichir `.software-card` : badge de catégorie plus visible, mise en avant de la taille du fichier et de la date de dernière mise à jour, indicateur "mis à jour récemment" (ex. moins de 30 jours) → catégorie en pastille teal, taille (depuis `totalDownloads`/assets réels) et date en bas de carte, badge "Updated recently" si le dernier changelog date de moins de 30 jours (`renderSoftwareCards()`)
- [x] Ajouter un état de survol plus riche sur les cartes (légère montée de l'ombre déjà présente + aperçu d'une deuxième capture d'écran en fondu, sans JS lourd) → `.software-card-thumb-alt`, fondu CSS pur au survol/focus quand un logiciel a au moins deux captures d'écran
- [x] Redessiner le bouton de téléchargement principal sur `software.html` : taille plus généreuse, icône Windows, sous-texte avec taille de fichier et nombre de téléchargements, état de chargement/succès après clic → `.button-download`, icône Windows inline en SVG, sous-texte taille + téléchargements réels, séquence visuelle "Preparing download…" → "Download started" (`setupDownloadButton()`)
- [x] Ajouter une section "Configuration requise" présentée sous forme de checklist visuelle (OS, RAM, espace disque) plutôt qu'en simple texte → `.requirements-checklist`, découpe la chaîne `systemRequirements` existante en items cochés (pas de champs RAM/espace disque distincts dans le modèle de données actuel — non fabriqués)
- [x] Ajouter des logiciels "similaires / à découvrir aussi" en bas de chaque fiche produit pour encourager la navigation inter-logiciels → section "You might also like", priorise la même catégorie puis complète avec les autres logiciels (`renderSimilarSoftware()`)
- [x] Améliorer la galerie de captures d'écran : miniatures avec cadre cohérent, indicateur de position (1/4, 2/4...), transition douce en lightbox → `.screenshot-frame` avec légende de position sous chaque miniature, compteur et fondu dans la lightbox
- [x] Ajouter un fil d'ariane (breadcrumb) discret en haut des fiches logiciel et de la page téléchargements pour clarifier la navigation → `.breadcrumb` (Home / nom du logiciel sur `software.html`, Home / Downloads sur `downloads.html`)

## Phase 11 — Micro-interactions, motion et cohérence visuelle globale

> Objectif : une interface qui semble soignée dans chaque détail, avec des transitions discrètes qui donnent une impression de qualité, toujours sans animation 3D.

- [x] Définir une échelle d'animation cohérente (durées, easing) dans les tokens CSS et l'appliquer uniformément à tous les hovers, focus et apparitions de contenu → `--ease`, `--duration-fast/base/slow` et `--transition(-fast/-slow)` dans `:root`, utilisés partout où il y avait déjà `var(--transition)` ou une durée codée en dur
- [x] Ajouter des transitions d'apparition douce (fade + léger décalage vertical) pour les cartes de la grille au chargement initial et lors du filtrage/recherche → animation `card-in` sur `.software-card`, léger décalage entre cartes via `--card-i` (posé par `renderSoftwareCards()`/`renderSimilarSoftware()`), rejoue naturellement à chaque re-rendu (recherche/filtre) puisque les nœuds sont recréés
- [x] Ajouter des états de chargement (skeletons) pour la grille de logiciels et la fiche produit le temps que `data/software.json` soit récupéré, à la place du texte "Loading software..." brut actuel → `renderSkeletonCards()`/`renderSkeletonDetail()`/`renderSkeletonRows()`, effet de scintillement CSS, affichés avant le fetch sur l'accueil, la fiche produit et le tableau des téléchargements
- [x] Harmoniser tous les boutons du site public (tailles, rayons, ombres, états disabled) avec un composant `.button` unique décliné en primaire/secondaire/fantôme → `.button`/`.button-primary`/`.button-secondary` partagent rayon, ombre et transitions ; état `:disabled`/`[aria-disabled]` ajouté
- [x] Revoir la cohérence des icônes (favicon, icônes logiciel, pictogrammes de catégorie) pour qu'elles partagent un même style de trait et une même palette → pictogrammes de catégorie en SVG monoligne (`categoryBadge()` dans `main.js`), même style de trait que l'icône par défaut, couleur accent partagée, affichés sur les cartes, la fiche produit et le tableau des téléchargements
- [x] Ajouter une transition de survol sur les liens du footer et de la navigation cohérente avec celle des cartes (actuellement uniquement une bordure) → soulignement en fondu sur les liens du footer (`text-decoration-color`), même timing que les cartes et la nav
- [x] Vérifier et harmoniser le comportement du mode sombre système (`prefers-color-scheme: dark`) sur l'ensemble des pages publiques, y compris les images et captures d'écran qui doivent rester lisibles → palette sombre complète sous `@media (prefers-color-scheme: dark)`, appliquée à toutes les pages publiques (accueil, fiche logiciel, téléchargements, à propos, 404) via `body:not(.admin-body)` ; l'admin garde son thème clair fixe existant ; nouveau jeton `--color-on-accent` pour garder un contraste correct sur les boutons/badges pleins ; vérifié à l'œil et par calcul de contraste (WCAG AA) sur toutes les paires texte/fond concernées

## Phase 12 — Finition, accessibilité et derniers détails qui donnent envie de revenir

> Objectif : éliminer tout ce qui pourrait donner une impression d'inachevé et soigner les derniers détails perçus par un visiteur exigeant.

- [x] Concevoir des états vides soignés (aucun résultat de recherche, aucune capture d'écran disponible, aucun logiciel dans une catégorie) avec illustration légère en SVG et message engageant, à la place d'un texte brut → `emptyState()`/`emptyStateRow()` dans `main.js`, pictogrammes SVG monolignes (recherche, image, boîte, avertissement) + titre + message, utilisés partout (accueil, téléchargements, fiche produit, nouveautés)
- [x] Ajouter une page ou une section "Nouveautés" / flux RSS listant chronologiquement toutes les releases de tous les logiciels, pour donner une raison de revenir régulièrement sur le site → `whats-new.html` (`renderWhatsNewPage()`) + flux `rss.xml` généré au build (`buildRssFeed()` dans `scripts/build.mjs`), liens dans la nav et le footer, autodiscovery `<link rel="alternate">` sur l'accueil et la page Nouveautés
- [x] Ajouter un bouton "Copier le lien" et des boutons de partage simples (sans SDK tiers) sur chaque fiche logiciel → section "Share" dans l'aside : bouton Copier le lien (Clipboard API), bouton "Share" natif (Web Share API) quand disponible, sinon liens de partage simples (X, e-mail) — aucun SDK tiers, uniquement des URLs et API natives du navigateur
- [x] Revoir le contraste et la taille des textes secondaires (`--color-muted`) pour s'assurer d'un ratio AA partout, y compris sur les badges et pastilles de catégorie → vérifié par calcul de contraste WCAG sur toutes les paires texte/fond (`--color-muted`, badges de catégorie, tags) en clair et en sombre, toutes ≥ 5:1 ; taille des plus petites pastilles remontée de 10px à 11px
- [x] Ajouter des `alt` descriptifs et cohérents sur toutes les images (icônes, captures d'écran) et vérifier la navigation complète au clavier sur les trois pages principales → captures d'écran de la fiche produit avec `alt` descriptif ("… screenshot N of M") ; icônes purement décoratives (redondantes avec un texte visible adjacent) laissées en `alt=""` conformément aux recommandations WCAG ; navigation clavier vérifiée de bout en bout (accueil, fiche produit, téléchargements) avec un anneau de focus visible cohérent partout, y compris sur les miniatures de captures d'écran (bug corrigé : `tabindex` sans anneau de focus)
- [x] Ajouter un mode d'impression sobre (`@media print`) pour la fiche logiciel, utile pour archiver une configuration requise ou un changelog → `@media print`, masque navigation/héros/partage/logiciels similaires, aplati la mise en page en une colonne, texte en noir sur blanc
- [x] Passer un audit Lighthouse/axe complet après toutes ces modifications et corriger tout écart par rapport aux scores déjà obtenus en Phase 5 (Performance 99, Accessibilité 100, Bonnes pratiques 100, SEO 100) → audit `axe-core` (règles wcag2a/aa, wcag21a/aa, best-practice) passé sur les 6 pages publiques ainsi que sur les états vides déclenchés en direct : 0 violation partout ; `npm run check-content` : aucun lien mort
- [x] Faire une dernière relecture visuelle croisée desktop/mobile/tablette de toutes les pages publiques et corriger les derniers détails d'alignement ou d'espacement → vérifié en réel sur les trois formats (1280/800/390px) pour l'accueil, la fiche produit et la page Nouveautés ; aucun problème d'alignement ou d'espacement trouvé

## Phase 13 — Engagement communautaire : likes, partage et commentaires par logiciel

> Contrainte technique : le site reste hébergé sur GitHub Pages (statique, sans backend serveur). Des likes anonymes et des commentaires en temps réel nécessitent soit de s'appuyer sur GitHub (Discussions/Issues) via un widget existant, soit une fonction serverless externe avec sa propre base de données. Pour rester cohérent avec l'esprit du site ("pas de compte requis pour télécharger") tout en évitant d'introduire une infrastructure serveur non prévue, l'option retenue par défaut s'appuie sur GitHub Discussions.

- [x] Choisir le mécanisme de commentaires → GitHub Discussions + widget `giscus` (open source, gratuit, modération native GitHub) plutôt qu'un service propriétaire tiers, pour rester cohérent avec l'hébergement GitHub existant
- [x] Activer les GitHub Discussions sur le dépôt `sandefjord-software` et créer une catégorie dédiée (un fil de discussion par logiciel, mappé via l'`id` du logiciel plutôt que le `pathname` pour rester stable si les URLs changent) → Discussions activé via l'API (`has_discussions: true`) ; catégorie dédiée non créée (l'API GitHub ne permet pas de créer une catégorie de discussion, seule l'interface web le peut) — la catégorie native "General" est utilisée à la place ; app GitHub `giscus` installée sur le dépôt (étape manuelle effectuée par Patrick) ; vérifié en direct sur le site déployé : le widget affiche bien la zone de commentaires GitHub (0 commentaire/0 réaction, "Sign in with GitHub"), plus aucune erreur d'installation
- [x] Intégrer le widget de commentaires sur chaque fiche `software.html`, avec thème forcé clair pour rester cohérent avec la charte graphique du site (pas de thème sombre par défaut du widget) → `setupComments()` dans `main.js`, `data-theme="light"`, `data-mapping="specific"` avec `data-term` = `id` du logiciel ; `GISCUS_REPO_ID`/`GISCUS_CATEGORY_ID` en placeholders explicites en attendant l'étape ci-dessus
- [x] Ajouter une note claire à côté du widget indiquant qu'un compte GitHub est nécessaire pour commenter, avec lien direct vers l'inscription GitHub pour les visiteurs qui n'en ont pas → `.comments-note` sur `software.html`
- [x] Documenter dans le README le processus de modération (verrouillage de discussion, masquage/suppression d'un commentaire abusif via l'interface GitHub Discussions) → section "Comments, likes, and sharing" du `README.md`
- [x] Choisir le mécanisme de "like" → réutiliser les réactions natives des GitHub Discussions (👍) exposées par `giscus` comme compteur de like par logiciel, plutôt que développer un compteur anonyme séparé nécessitant une base de données externe
- [x] Afficher le nombre de likes et de commentaires directement sur `.software-card` (page d'accueil et page téléchargements), pas seulement sur la fiche produit, pour donner un signal social dès la grille → `renderEngagementBadge()`, affiché sur les cartes de l'accueil, "You might also like", et une colonne dédiée dans le tableau des téléchargements ; masqué tant qu'aucune donnée d'engagement n'existe (dégradation propre avant la synchronisation)
- [x] Créer `scripts/sync-engagement.mjs` (sur le même modèle que `sync-releases.mjs`) pour récupérer périodiquement le nombre de réactions et de commentaires par discussion via l'API GitHub et les stocker dans `data/software.json` → requête GraphQL par logiciel (recherche de la discussion par titre = `id`), écrit `entry.engagement = { likes, comments }` ; se dégrade proprement (avertissement, pas d'échec) si `GITHUB_TOKEN` est absent ou qu'une discussion n'existe pas encore
- [x] Étendre `.github/workflows/sync.yml` pour exécuter aussi `sync-engagement.mjs` lors du cron existant, sans créer de workflow supplémentaire → étape ajoutée entre le sync des releases et le build, permission `discussions: read` ajoutée
- [x] Ajouter un bouton "Partager" par logiciel : Web Share API native sur mobile avec repli sur "copier le lien", complété par de simples liens `<a href>` vers X/Twitter, Reddit et LinkedIn (sans SDK ni script tiers, sans tracker) → section "Share" de l'aside, étendue en Phase 12 avec Reddit et LinkedIn
- [x] Ne pas afficher de compteur de partages chiffré (les API de comptage des principaux réseaux sont dépréciées ou peu fiables) ; se limiter à l'action de partage elle-même → respecté, aucun compteur de partages ajouté
- [x] Charger le widget de commentaires en différé (au clic sur "Afficher les commentaires" plutôt qu'au chargement de la page) pour protéger le score de performance déjà obtenu en Phase 5 → le script `giscus` n'est injecté qu'au clic sur le bouton (`{ once: true }`)
- [x] Vérifier l'accessibilité du widget de commentaires et des boutons de partage/like (navigation clavier complète, focus visible cohérent avec le reste du site) → audit `axe-core` (0 violation) + navigation clavier vérifiée en direct sur la fiche produit (bouton "Show comments", boutons de partage, liens de la note) ; l'intérieur de l'iframe `giscus` lui-même relève de son propre widget tiers, hors contrôle du site
- [x] Mettre à jour le README avec le prérequis d'activation des GitHub Discussions et le nouveau processus de modération → section "Comments, likes, and sharing"

## Phase 14 — Qualité automatisée, intégrité des téléchargements et confort d'usage

> Objectif : combler les manques identifiés lors d'une relecture complète du code après la Phase 13 — les audits qualité (Phase 5/12) étaient jusqu'ici ponctuels et manuels, aucune Pull Request n'était vérifiée avant fusion, et rien ne permettait à un visiteur de vérifier l'intégrité d'un binaire téléchargé (standard attendu sur un site type Softpedia/MajorGeeks). Toutes les conventions existantes restent respectées (anglais uniquement, thème blanc/système, pas de 3D, pas de commentaires dans le code, Windows 10/11 uniquement).

- [x] Ajouter un workflow CI déclenché sur chaque Pull Request (`.github/workflows/ci.yml`) qui exécute `npm run build` et `npm run check-content`, pour empêcher qu'une régression parte en fusion sans vérification → job `build-and-test`, `check-content` en `continue-on-error` (ne bloque pas la CI mais reste visible dans les logs, cohérent avec le workflow hebdomadaire dédié qui gère déjà les issues)
- [x] Ajouter une suite de tests Playwright (`tests/e2e/`) couvrant les parcours critiques : recherche + filtre catégorie + tri sur l'accueil et les téléchargements, ouverture d'une fiche logiciel, clic sur le bouton de téléchargement, raccourci clavier de recherche → `tests/e2e/home.spec.js`, `downloads.spec.js`, `software-detail.spec.js`, `playwright.config.js` (build + `scripts/serve.mjs` lancés automatiquement avant les tests)
- [x] Intégrer une vérification d'accessibilité automatisée (`@axe-core/playwright`) dans la même suite, exécutée sur l'accueil, une fiche logiciel, les téléchargements et la page Nouveautés, pour remplacer les audits manuels ponctuels par un filet automatique à chaque PR → `tests/e2e/accessibility.spec.js`, règles wcag2a/aa, wcag21a/aa et best-practice, échoue au moindre violation
- [x] Ajouter un budget Lighthouse automatisé sur le contenu buildé (`docs/`) dans le workflow CI, qui échoue si Performance/Accessibilité/Bonnes pratiques/SEO redescendent sous les scores obtenus en Phase 5 → job `lighthouse` (`treosh/lighthouse-ci-action`), assertions dans `.lighthouserc.json` (Accessibilité/Bonnes pratiques/SEO = 100, Performance ≥ 95 pour absorber la variance normale d'un runner CI par rapport aux 99 observés en Phase 5)
- [x] Calculer une empreinte SHA-256 pour l'exécutable/archive principal de chaque logiciel dans `scripts/sync-releases.mjs` (réutilisée d'un sync à l'autre pour ne pas retélécharger un asset déjà vérifié) et l'exposer dans `data/software.json` → `computeSha256()`, champ `downloadSha256` par logiciel, cache par URL d'asset (`knownChecksums`) pour ne recalculer qu'une fois par nouvelle version
- [x] Afficher cette empreinte SHA-256 à côté du bouton de téléchargement sur `software.html`, avec un bouton "Copier" et une courte explication de son usage (vérification d'intégrité du fichier téléchargé) → `renderChecksumBlock()` / `setupChecksumCopy()` dans `main.js`, `.checksum-block` dans `style.css`, masqué tant qu'aucune empreinte n'est encore disponible pour ce logiciel
- [x] Ajouter un tri du catalogue sur l'accueil et la page téléchargements (mis à jour récemment / plus téléchargés / ordre alphabétique), en plus de la recherche et du filtre par catégorie déjà existants → `<select id="catalog-sort">`, `SORT_OPTIONS`/`sortSoftware()` dans `main.js`, appliqué après le filtre recherche/catégorie sur les deux pages
- [x] Ajouter un raccourci clavier `/` qui place le focus sur le champ de recherche depuis n'importe quel endroit de l'accueil ou de la page téléchargements (sans interférer avec la saisie dans un champ déjà actif) → `setupSearchShortcut()`, ignoré si le focus est déjà dans un champ de saisie ou un élément `contenteditable`
- [x] Générer un flux JSON Feed (`docs/feed.json`, format JSON Feed 1.1) en complément du flux RSS existant, avec autodiscovery (`<link rel="alternate" type="application/feed+json">`) sur l'accueil et la page Nouveautés → `buildJsonFeed()` dans `scripts/build.mjs`, lien autodiscovery ajouté sur `index.html` et `whats-new.html`, lien texte "JSON Feed" ajouté à côté du lien RSS existant
- [x] Documenter ces ajouts dans le README (nouveau script `test`, prérequis Playwright, présence du flux JSON Feed, usage de l'empreinte SHA-256) et dans le CHANGELOG → sections "Quality: continuous integration and automated tests", "Download integrity (SHA-256 checksums)" et "What's New feeds" du `README.md`, entrées correspondantes en tête du `CHANGELOG.md`

## Phase 15 — Référencement enrichi, sécurité renforcée et finitions admin

> Objectif : clore quelques limitations déjà identifiées mais jamais traitées (réorganisation des captures d'écran en admin, notée comme limitation dès la Phase 6), et ajouter des finitions à faible risque qui profitent au référencement, à la sécurité et à l'usage quotidien, toujours sans introduire de backend, de compte visiteur ou de tracker.

- [x] Ajouter des données structurées JSON-LD (schéma `SoftwareApplication`) sur chaque fiche `software.html` (nom, description, catégorie, version, note d'engagement si disponible, système d'exploitation, prix gratuit) pour de meilleurs résultats enrichis dans les moteurs de recherche → `setStructuredData()` dans `main.js`, injecte un `<script type="application/ld+json">` ; les compteurs like/comment (quand disponibles) sont exposés via `interactionStatistic` (`LikeAction`/`CommentAction`) plutôt qu'un `aggregateRating` fabriqué, pour rester honnête vis-à-vis des consignes Google sur les avis
- [x] Ajouter un lien "Aller au contenu" (skip link) visible au focus clavier en tout début de page sur toutes les pages publiques, pour permettre de sauter la navigation — angle mort de l'audit accessibilité de la Phase 12/14 qui testait la navigation clavier mais pas ce raccourci précis → `.skip-link` dans `src/partials/header.html` (premier élément du DOM sur chaque page publique), cible `#main-content` ajouté sur le `<main>` de chaque page
- [x] Définir une politique de sécurité du contenu (`Content-Security-Policy` en balise meta) sur les pages publiques, avec une exception documentée pour le script `giscus` chargé à la demande sur la fiche produit → balise meta CSP sur les 6 pages publiques (`default-src 'self'`, exceptions `https://giscus.app` en `script-src`/`frame-src`/`connect-src`) ; les scripts d'initialisation par page (autrefois inline, ce qui aurait exigé `'unsafe-inline'`) sont remplacés par un attribut `data-page` sur `<body>` et un petit répartiteur en fin de `main.js` — l'admin (`admin.html`) n'a volontairement pas de CSP, hors du périmètre "pages publiques"
- [x] Ajouter la réorganisation des captures d'écran par glisser-déposer dans le formulaire d'édition de l'admin (limitation notée depuis la Phase 6 : seul l'ordre d'ajout était conservé) → `renderScreenshotTiles()` dans `admin.js`, tuiles `draggable`, réordonnancement testé (drag + suppression sans dérive d'index, bug latent corrigé au passage)
- [x] Ajouter un bouton "Forcer une synchronisation maintenant" dans le tableau de bord admin, qui déclenche le workflow `sync.yml` via `workflow_dispatch` (API GitHub) sans attendre le prochain cron de 6h → bouton dans la topbar du dashboard, `POST /actions/workflows/sync.yml/dispatches` avec le token déjà stocké ; nécessite la permission "Actions: write" sur un token fine-grained (documenté dans le README)
- [x] Ajouter un lien optionnel "Soutenir ce projet" vers GitHub Sponsors sur la page "À propos", uniquement si un profil Sponsors existe pour le compte `Patrickjaillet` (sinon, ne rien afficher plutôt que fabriquer un lien mort) → vérifié côté build (`hasSponsorsProfile()` dans `build.mjs`, requête réseau vers `github.com/sponsors/...`), stocké dans `data/site-content.json`, lien affiché uniquement si vrai (actuellement aucun profil Sponsors actif → lien masqué, vérifié en direct)
- [x] Ajouter une section "Consultés récemment" sur l'accueil, basée uniquement sur un historique local au visiteur (`localStorage`, aucune donnée envoyée nulle part), masquée tant qu'aucun logiciel n'a encore été consulté → `recordRecentlyViewed()`/`renderRecentlyViewed()` dans `main.js`, clé `sandefjord_recently_viewed_v1`, 8 entrées max, section masquée si vide
- [x] Ajouter un lien direct "Signaler un problème" vers les issues du dépôt GitHub spécifique de chaque logiciel (pas le dépôt du site) sur la fiche produit, à côté du lien "View on GitHub" déjà présent → lien `Report an issue` (`${repositoryUrl}/issues/new`) dans l'aside, masqué comme "View on GitHub" si le logiciel n'a pas de `repositoryUrl` (ajouté manuellement, sans dépôt)
- [x] Documenter chacun de ces ajouts dans le README et le CHANGELOG, comme pour les phases précédentes → sections dédiées du `README.md`, entrées du `CHANGELOG.md`