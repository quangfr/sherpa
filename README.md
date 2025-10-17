# Spécification fonctionnelle & technique — **SHERPA — MVP v4.9.3**
*(Contexte • Données • Interface • Règles/Logique • Technique/Implémentation)*

---

## 1) 🎯 Contexte & objectifs
- **But** : mono-fichier **HTML/CSS/JS vanilla** pour piloter un portefeuille de **Consultants**, **Activités**, **Objectifs**, avec 5 onglets : **Dashboard / Activités / Objectifs / Paramètres / Sync**.
- **Stockage** : **localStorage** (clé `SHERPA_STORE_V4`) + import/export **data.json** (GitHub Actions via issue).
- **Périmètre v4.9.3** :
  - Scrollbars **invisibles au repos / visibles au survol**, sans décalage de layout.
  - **Activités** : filtres (type, objectif, **date “Avant le”**, recherche texte) + **badge compteur**.
  - **Objectifs** : cartes par objectif, **consultants affichés uniquement s’ils ont ≥1 🐕‍🦺 Action STB liée** ; **tri par progression décroissante** ; édition progression **0–100** (sans checkbox) ; clic consultant ⇒ onglet **Activités** filtré (consultant + objectif).
  - **Dashboard** : 4 indicateurs paramétrables (délais en jours) reflétant les **Paramètres**.
  - **Sync** : copier JSON, ouvrir issue **[SYNC]**, télécharger, réinitialiser depuis `data.json` ou fichier local.

---

## 2) 📦 Données (modèle & contraintes)

### 2.1 Schéma `store`
Objet racine persisté dans `localStorage` :
- `consultants`: `Consultant[]`
- `activities`: `Activity[]`
- `objectifs`: `Objectif[]`
- `params`: `Params`
- `meta`: `{ version:number, updated_at:ISO8601 }`

**Consultant**
- `id`: `uuid` (obligatoire)
- `nom`: `string` (obligatoire)
- `titre_mission`?: `string`
- `date_fin`?: `YYYY-MM-DD`
- `url`?: `string (https)`
- `description`?: `string`
- `created_at`, `updated_at`: `ISO8601`

**Activity**
- `id`: `uuid` (obligatoire)
- `consultant_id`: `uuid` (FK Consultant)
- `type`: `enum` ∈ {`ACTION_ST_BERNARD`,`NOTE`,`VERBATIM`,`AVIS`,`ALERTE`} (obligatoire)
- `date_publication`: `YYYY-MM-DD` (obligatoire)
- `description`: `string` (obligatoire)
- `heures`?: `number` — **requis** si `type="ACTION_ST_BERNARD"` (min 0.25)
- `objectif_id`?: `uuid` (FK Objectif)
- `created_at`, `updated_at`: `ISO8601`

**Objectif**
- `id`: `uuid` (obligatoire)
- `titre`: `string` (obligatoire)
- `description`?: `string`
- `consultants`: `{ consultant_id:uuid, progression_pct:0..100 }[]`
- `created_at`, `updated_at`: `ISO8601`

**Params**
- `delai_alerte_jours`: `int` > 0
- `fin_mission_sous_jours`: `int` > 0
- `stb_recent_jours`: `int` > 0
- `avis_manquant_depuis_jours`: `int` > 0
- `objectif_recent_jours`: `int` > 0
- `github_repo_fullname`?: `owner/repo`

**Meta / Seed**
- Si `store` absent/non JSON, seed minimal : 3 consultants, 5 activités (variées), 1 objectif, `params` par défaut :
  - `{ delai_alerte_jours:7, fin_mission_sous_jours:60, stb_recent_jours:30, avis_manquant_depuis_jours:60, objectif_recent_jours:15, github_repo_fullname:'quangfr/sherpa' }`
  - `meta.version = 4.93`, `meta.updated_at = nowISO()`.

---

## 3) 🖥️ Interface (UX/UI)

### 3.1 Layout & style
- **Full-width** (`max-width:none`), thème clair, compact.
- **Header sticky** (44px) + **tabs** en haut.
- **Views** : une seule `.view.active` visible à la fois.
- **Grid g4** : 4/3/2/1 colonnes selon largeur.
- **Scrollbars** : `.hover-scroll` (invisible au repos, visibles au survol, `scrollbar-gutter: stable both-edges`).

### 3.2 Onglet **Dashboard**
4 cartes avec compteur + liste :
- **🚨 En alerte** : consultants ayant une `ALERTE` récente (`≤ delai_alerte_jours`).
- **⏳ Fin de mission < Xj** : 0 ≤ `date_fin - today` ≤ `fin_mission_sous_jours`.
- **🐕‍🦺 Action STB > Yj** : consultants **sans** STB récente (`stb_recent_jours`).
- **🗣️ Avis > Zj** : consultants **sans** AVIS récent (`avis_manquant_depuis_jours`).
Affichage d’une ligne : pastille **état** (`g/y/r`) + **Nom** (cliquable) + **Mission** (gris).
Clic **Nom** ⇒ onglet **Activités** filtré par consultant.

### 3.3 Onglet **Activités**
**Split 2 panneaux** :

**Gauche — Consultants**
- Header : **+ Consultant** / **Réinitialiser**, recherche (nom + titre mission).
- Tableau :
  - Col 1 : **Nom** (ligne primaire) + **Titre mission** (sous-ligne), pastille état.
  - Col 2 : **Date fin** (small/grey).
  - Col 3 : Actions : `🔗` (URL si dispo), `✏️` (éditer), `🎯` (voir objectifs du consultant).
- **Tri** : clic entête **Nom** ou **Fin** (toggle asc/desc).
- Clic ligne (hors boutons) ⇒ applique filtre `consultant_id` et ouvre **Activités**.

**Droite — Activités**
- Barre : Titre + **badge compteur**, **Recherche texte**, **Filtre type**, **Filtre objectif**, **“Avant le” (date)**, **+ Nouvelle activité**, **Réinitialiser**.
- Tableau :
  - **Type** : pill colorée + émoji.
  - **Consultant** : nom + mission.
  - **Date** : `YYYY-MM-DD`.
  - **Description + Objectif** :
    - Ligne 1 : `🎯 <titre objectif>` (clamp 1 ligne) à gauche, **heures** à droite si STB (gras).
    - Ligne 2 : description (clamp 3 lignes).
  - **Actions** : `✏️` / `🗑️`.

### 3.4 Onglet **Objectifs**
- Barre : **Recherche** (titre + description), **Filtre consultant** (limite aux objectifs où ce consultant a **≥1 STB liée**), **+ Nouvel objectif**.
- Cartes :
  - Header : **Titre** + `✏️`.
  - Description (gris).
  - **Total objectif** : somme heures STB **toutes personnes** + **(+heures récentes)** en **vert** (`objectif_recent_jours`).
  - **Consultants listés** : **uniquement** ceux ayant **au moins une STB liée** à l’objectif ; **tri par progression décroissante** puis nom A→Z.
    - Affichage par ligne : **badge progression** (🟥 <30 / 🟨 30–69 / 🟩 ≥70), **Nom (lien)**, `(x%)` ; à droite : **Total heures** et **(+récents)** en **vert**.
  - Clic **Nom** ⇒ onglet **Activités** avec filtres `consultant_id` + `objectif_id` appliqués.

### 3.5 Onglet **Paramètres**
- Champs numériques (jours) : `delai_alerte_jours`, `fin_mission_sous_jours`, `stb_recent_jours`, `avis_manquant_depuis_jours`, `objectif_recent_jours`.
- Champ repo : `github_repo_fullname` (aussi éditable en **Sync**).
- Bouton **Enregistrer** : met à jour `params`, `meta.updated_at`, rafraîchit les vues (les titres Dashboard X/Y/Z reflètent immédiatement les valeurs).

### 3.6 Onglet **Sync**
- Actions : **📋 Copier JSON**, **🐙 Ouvrir Issue [SYNC]**, **⬇️ Télécharger data.json**, **🐈‍⬛ Réinitialiser**.
- Zone **prévisualisation JSON** (read-only, scrollable).
- **Repo** : champ `owner/repo` (utilisé par “Ouvrir Issue” si vide dans `params`).
- **Réinitialiser** : tente `fetch('./data.json')` ; en cas d’échec → file picker local (validation JSON).

### 3.7 Modales
**Activité**
- `Consultant` (select, requis), `Type` (select, requis), `Date`, `Objectif` (optionnel), `Heures (STB)` (visible uniquement si `Type="ACTION_ST_BERNARD"`, min 0.25, défaut 1), `Description` (textarea auto-resize, requis).
- Soumission : crée/édite l’activité → `save()` ; suppression via bouton `🗑️` dans tableau.

**Objectif**
- `Titre` (requis), `Description` (textarea auto-resize).
- **Bloc progression** : **affiche uniquement** les consultants ayant **≥1 STB liée** ; pour chacun : input `number` **0..100** (coloration rouge/jaune/vert dynamique). **Aucune checkbox.**
- Actions : **Supprimer** (confirm), **Annuler**, **Enregistrer**.

**Consultant**
- `Nom` (requis), `Titre mission`, `Date fin`, `URL`, `Description`.
- Actions : **Supprimer** (ne supprime **pas** ses activités), **Annuler**, **Enregistrer**.

---

## 4) 🧠 Règles métiers & logique

### 4.1 Statut consultant (`statusOf`)
- **Rouge (`r`)** si `date_fin` passée **ou** présence d’une `ALERTE` récente (`≤ delai_alerte_jours`).
- Sinon **Vert (`g`)** si **au moins une** `ACTION_ST_BERNARD` **ou** un `AVIS` récent (fenêtres `stb_recent_jours` / `avis_manquant_depuis_jours`).
- Sinon **Jaune (`y`)**.

### 4.2 Filtres Activités (ET logique)
- `consultant_id` (panneau gauche / carte Objectif).
- `q` (texte) : recherche **dans `description`** (case-insensitive).
- `type` : égalité stricte.
- `objectif_id` : égalité stricte.
- `before` : inclut `date_publication` **≤** date choisie.
- **Tri** par défaut : `date_publication` décroissante (comparaison string `YYYY-MM-DD`).

### 4.3 Objectifs — agrégations
- **Heures totales** d’un objectif = somme `heures` des **activités `ACTION_ST_BERNARD`** avec `objectif_id` égal.
- **Heures récentes** : même somme sur fenêtre `objectif_recent_jours`.
- **Consultants affichés** = ensemble des `consultant_id` **trouvés dans les STB liées** à l’objectif (indépendant de `objectif.consultants`).
- **Progression affichée** : si entrée dans `objectif.consultants` ⇒ `progression_pct`, sinon `0`.
- **Tri** : `progression_pct` décroissant, puis `nom` A→Z.

### 4.4 Validation & sécurité
- **Activité STB** : `heures` > 0 **requis**.
- **Progression** : clamp **0..100**, coloration (rouge/jaune/vert).
- **Escaping** : `esc()` sur toute donnée utilisateur injectée dans le DOM.
- **Suppressions** : `confirm()` (activité/objectif/consultant).
- **Consultant supprimé** : **les activités restent**.

### 4.5 Dashboard — fenêtres
- **Alerte** : existe une `ALERTE` avec `date_publication` ≥ `today - delai_alerte_jours`.
- **Fin de mission < Xj** : `0 ≤ daysDiff(date_fin, today) ≤ fin_mission_sous_jours`.
- **STB > Yj** : **aucune** STB récente.
- **Avis > Zj** : **aucun** AVIS récent.

---

## 5) 🛠️ Technique & implémentation

### 5.1 Tech stack & organisation
- **Mono-fichier** : balises `<style>` et `<script>` intégrées, aucune dépendance externe.
- **Utils** : `nowISO()`, `todayStr()`, `uid()`, `esc()`, `parseDate()`, `daysDiff()`, `addDays()`, `clamp01()`, `progBadge()`, `autoSize()`.

### 5.2 État & rendu
```js
state = {
  sortCol: 'nom',
  sortDir: 1,
  filters: { q:'', consultant_id:'', type:'', before:'', objectif_id:'' },
  consultants_q: '',
  objectifs_q: '',
  objectifs_consultant_id: ''
}
```
- **Rendu** orchestré par `refreshAll()` : `renderConsultants()`, `renderActivityFiltersOptions()`, `renderActivities()`, `renderObjectifs()`, `renderParams()`, `dashboard()`.
- **Navigation** : `TABS[]` → boutons ; `openTab(id)` applique `.active` et rafraîchit la preview Sync si besoin.
- **Init** : `openTab('dashboard')` puis `refreshAll()`.

### 5.3 Persistance
- **load()** : lit `localStorage[LS_KEY]`, sinon **seed** (§2).
- **save()** : met `store.meta.updated_at`, persiste, puis `refreshAll()`.
- **applyIncomingStore(incoming, sourceLabel)** :
  - Vérifie les clés requises : `consultants`, `activities`, `objectifs`, `params`.
  - Conserve `meta.version` (sinon `4.93`), met `meta.updated_at = nowISO()`.
  - Remplace `store`, persiste, `refreshAll()`.

### 5.4 Sync GitHub
- **Copier JSON** : `navigator.clipboard.writeText(JSON.stringify(store, null, 2))`.
- **Ouvrir Issue [SYNC]** :
  - URL : `https://github.com/${repo}/issues/new?title=[SYNC] data.json&body=```json\n<store>\n````
- **Télécharger** : Blob → `a.download = 'data.json'`.
- **Réinitialiser** :
  - `fetch('./data.json', { cache:'no-store' })` ; si échec ⇒ file picker.
  - Validation JSON avec `try/catch`.

### 5.5 Accessibilité & responsive
- **Header sticky**, tailles lisibles, `title` descriptifs sur boutons.
- **Colonnes fixes** (Activités/Consultants) pour stabilité.
- **Clamp** : `.clamp-1` (objectif), `.clamp-3` (description).
- **Textareas** auto-resize (`autoSize()`).

### 5.6 Styles (design tokens)
- Variables CSS : `--bg`, `--fg`, `--muted`, `--card`, `--border`, `--accent`, `--green`, `--yellow`, `--red`, `--hover`, ainsi que `--stb`, `--note`, `--verb`, `--avis`, `--alerte` et leurs variantes `*-f`.
- **Pills** par type : `.pill.stb|note|verb|avis|alerte` avec émojis.

### 5.7 Algorithmes clés (résumé)
- `statusOf(c)` : calcule `g/y/r` selon dates et activités récentes (cf. §4.1).
- `hoursForObjective(objId, byConsultantId?, recentDays?)` : somme `heures` sur `ACTION_ST_BERNARD` filtrées.
- `consultantsWithSTBForObjective(objId)` : ensemble des `consultant_id` avec au moins 1 STB liée.
- Tri des consultants dans une carte Objectif : `desc(progression_pct)` puis `asc(nom)`.

### 5.8 Sécurité & robustesse
- **Échappement** systématique (`esc`) de tout texte utilisateur.
- **Validations** : champs requis, bornes numériques (0..100), `heures` STB > 0.
- **UUID** : fallback `Math.random` si `crypto.randomUUID` indisponible.
- Cibles : navigateurs modernes (Chrome/Edge/Firefox).

---

## 6) ✅ Critères d’acceptation (exemples)
- Scrollbars au survol : **aucun shift** de layout.
- Dans **Objectifs**, un consultant **sans STB liée** à l’objectif **n’apparaît pas** (ni carte, ni modale progression).
- Progression **sans checkbox**, éditable **0..100**, coloration dynamique.
- Clic **Nom** d’une carte Objectif ⇒ **Activités** filtrées (consultant + objectif).
- **Dashboard** reflète les valeurs de **Paramètres**.
- Bouton **Réinitialiser** des Activités **vide tous les filtres** (type, objectif, date, texte).
- **Sync** “Ouvrir Issue” préremplit le corps avec le JSON encodé.
