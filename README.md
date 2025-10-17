# 🔆 Spécification SHERPA — MVP v3.3 (compact, thème clair, Sync GitHub)

## 1) Objectif
Mono-fichier **HTML/CSS/JS vanilla** pour suivre **Consultants** & **Activités** avec **4 onglets** :
- **Dashboard** / **Activité** / **Paramètres** / **Sync**
Interface compacte, accessible, persistance **localStorage** + **synchronisation GitHub** vers `data.json`.

---

## 2) Données (modèle & règles) 📦

### 2.1 Consultant
- `id` (uuid)  
- `nom`*  
- `titre_mission`?  
- `date_fin`? *(= dispo)*  
- `url`?  
- `description`? *(#tendances OK)*  
- `created_at`, `updated_at`  

> ❌ **TJM absent**

### 2.2 Activité
- `id` (uuid)  
- `consultant_id`*  
- `type`* ∈ `ACTION_ST_BERNARD` | `NOTE` | `VERBATIM` | `AVIS` | `ALERTE`  
- `date_publication`* (ISO `YYYY-MM-DD`)  
- `description`* *(#tendances OK)*  
- `heures`? *(visible & requis **uniquement** si `type = ACTION_ST_BERNARD`)*  
- `created_at`, `updated_at`

### 2.3 Tendances
- `id`, `slug`, `label`, `color`?  
- **Défaut (sans emojis)** : Le Cardinal, Robert Jr, Gutenberg, Indélébile, Protocop, Tarantino, Goal Digger, Promptzilla, Soulgorithm, PÔLÈNE

### 2.4 Paramètres (éditables)
- `delai_alerte_jours = 7`  
- `fin_mission_sous_jours = 60`  
- `stb_recent_jours = 30`  
- `avis_manquant_depuis_jours = 60`

### 2.5 Seed initial
- **8 consultants** (exemple)  
- **10 activités/consultant** *(2 par type)*  
- **10 tendances** par défaut

### 2.6 Validation & sécurité
- **Consultant** : `nom` requis  
- **Activité** : `type`, `date_publication`, `description` requis ; `heures` requis si `type = ACTION_ST_BERNARD`  
- Échappement HTML à l’affichage des descriptions (XSS)

---

## 3) Stockage & clés 🔑
- **localStorage** : clé **`SHERPA_STORE_V3`**
- **Fichier GitHub** : `data.json` à la racine du dépôt `quangfr/sherpa`
- **Export/Import** : dump JSON complet (merge/replace)

---

## 4) Navigation & vues 🎛️
- **Header** : 4 boutons onglets → `Dashboard`, `Activité`, `Paramètres`, `Sync`
- Commutation via `.view/.active` + `hidden` → **1 seule vue à la fois**
- **Routing UI** : state interne (pas d’URL externe)

---

## 5) Dashboard 📊
- Grille **4 colonnes** (responsive 4/3/2/1) avec 4 blocs :
  1) **En alerte** : `date_fin ≤ today + delai_alerte_jours`
  2) **Fin de mission < Xj** : `0 < (date_fin − today) ≤ X` *(X = `fin_mission_sous_jours`)*
  3) **Action STB ≤ Yj** : dernière `ACTION_ST_BERNARD` ≤ Y jours *(Y = `stb_recent_jours`)*
  4) **Sans avis > Zj** : aucun `AVIS` dans Z derniers jours *(Z = `avis_manquant_depuis_jours`)*
- **Titres dynamiques** affichant X/Y/Z et délai actuel
- **Carte consultant** (2 lignes) : L1 **Nom**, L2 **Titre mission**
- **Clic carte** ⇒ ouvre **Activité** + filtre **consultant**
- ❌ Pas de `date_fin` affichée ici

---

## 6) Activité 🗂️
### 6.1 Panneau gauche — “Consultants”
- En-tête cliquable : **Nom** | **Fin mission** → tri ↑/↓ (chevrons)  
- Ligne (3 colonnes) :
  - Col 1 : **Nom (L1) + Titre (L2)** + pastille état (vert/jaune/rouge selon `date_fin`)
  - Col 2 : **Date fin** (ISO ou vide)
  - Col 3 : **Actions** → 🔗 (ouvre `url` si présent), ✏️ (modal **Infos consultant**)
- **Clic ligne** ⇒ filtre le panneau **Activités** par consultant

### 6.2 Panneau droit — “Activités”
- **Filtres** : 5 toggles type (tous actifs), **recherche** (#tendance ou texte), bouton **+ Nouvelle activité**
- **Tri** : plus récent → plus ancien
- **Colonnes** :
  - **Col 0 : Consultant** → **Nom (L1) + Titre (L2)**
  - **Col 1 : Badge Type + Date**
  - **Col 2 : Description** (échappée) + **Heures** (si STB)
  - **Col 3 : Actions** → ✏️ éditer, 🗑️ supprimer
- **Modal activité** :
  - Select **Consultant**, Select **Type**, **Date**
  - **Description** pleine largeur, multi-lignes (≥160px), **autocomplete `#`** tendances
  - **Heures** visible **uniquement** si Type = STB
  - **Enregistrer / Annuler**

### 6.3 Modal “Infos consultant”
- Nom*, Titre mission, Date fin, URL  
- **Description = textarea large** *(#tendances OK)*
- **Enregistrer / Annuler**

---

## 7) Paramètres ⚙️
- **Tendances** : liste (`#slug`, `label`) + **Ajouter / ✏️ / 🗑️**
- **Seuils Dashboard** : 4 champs (jours) + **Enregistrer / Réinitialiser**
- **Import / Export JSON** : Export dump complet ; Import **merge** ou **replace**

---

## 8) Sync GitHub 🔁
### 8.1 Principe (sans jeton côté front)
- Onglet **Sync** avec 3 boutons :  
  1) **📋 Copier JSON** (état complet : consultants/activités/tendances/paramètres)  
  2) **🐙 Ouvrir l’issue `[SYNC]`** dans `quangfr/sherpa` (page New Issue pré-remplie)  
  3) **⬇️ Télécharger `data.json`** (fichier local)
- L’utilisateur **colle** le JSON dans un bloc ```json de l’issue `[SYNC]`.  
- Une **GitHub Action** valide et **remplace** `data.json` à la racine.

### 8.2 Workflow Actions (repo `quangfr/sherpa`)
- Fichier : `.github/workflows/sync-data-from-issue.yml`
- Déclencheur : `issues` (opened/edited/reopened/labeled)
- Condition : titre contient `[SYNC]` ou label `sync`
- Étapes : checkout → extraction du bloc ```json → **validation JSON** → `data.json` (replace) → commit/push → commentaire + **fermeture** de l’issue si succès
- Permissions : **contents: write**, **issues: write**
- Paramétrage **Actions → General → Workflow permissions → Read and write**

---

## 9) Accessibilité & micro-interactions ♿
- **Toasts** (`aria-live`) pour succès
- **Confirm** à la suppression
- **Navigation clavier** (Enter/Échap)
- Contraste **AA**, focus visible
- Densité : **13–14px**, hauteurs **36–40px**, paddings réduits

---

## 10) Style 🎨
- Thème clair : fond **#FAFAFA**, cartes **#FFF**, bordures **#E0E0E0**, texte **#222**
- Badges **type** : STB 🟦, Note 🟩, Verbatim 🟨, Avis 🟪, Alerte 🟥
- Pastilles état (liste consultants) :
  - **Vert** : `date_fin` > 7j
  - **Jaune** : 0–7j
  - **Rouge** : dépassée

---

## 11) Performance 🚀
- Tri/filtre **en mémoire**
- **Pagination virtuelle** si > 200 activités (bouton “Charger plus”)
- DOM léger, pas de framework

---

## 12) Critères d’acceptation ✅
- **Une seule vue** visible (Dashboard/Activité/Paramètres/Sync)
- **Dashboard** :
  - 4 blocs/4 colonnes, **titres dynamiques** X/Y/Z/délai
  - Carte **Nom + Titre**, clic ⇒ Activité + filtre consultant
- **Activité / gauche** :
  - Tri **Nom/Fin** (↑/↓), pastille état
  - Actions 🔗/✏️, clic ligne ⇒ filtre
- **Activité / droite** :
  - Colonnes **Consultant / Type+Date / Description(+Heures si STB) / Actions**
  - Filtres types actifs par défaut, **recherche** texte & `#tendance`
  - **Modal** activité conforme (heures seulement si STB)
- **Paramètres** : CRUD tendances + seuils + import/export (merge/replace)
- **Sync** :
  - Boutons **Copier JSON / Ouvrir issue `[SYNC]` / Télécharger**
  - Workflow **remplace** `data.json` au merge
- **CRUD complet** (Consultant / Activité / Tendance)
- **A11y** : clavier OK, toasts lisibles, confirm suppression
- **Sécurité** : descriptions échappées
