# 🔆 Spécification SHERPA – V2 MVP (compact, thème clair)

## 1) Objectif
Mono-fichier **HTML/CSS/JS vanilla** pour suivre **Consultants** & **Activités** avec **3 onglets** (Dashboard / Activité / Paramètres).  
Interface compacte, accessible, stockée en **localStorage**.

---

## 2) Données (modèle & règles) 📦

### Consultant
- `id` (uuid)  
- `nom`*  
- `titre_mission`?  
- `date_fin`? *(= dispo)*  
- `url`?  
- `description`? *(#tendances OK)*  
- `created_at`, `updated_at`  
- ❌ **TJM absent**

### Activité
- `id` (uuid)  
- `consultant_id`*  
- `type`* ∈ `ACTION_ST_BERNARD` | `NOTE` | `VERBATIM` | `AVIS` | `ALERTE`  
- `date_publication`* (ISO `YYYY-MM-DD`)  
- `description`* *(#tendances OK)*  
- `heures`? *(visible & requis **uniquement** si `type = ACTION_ST_BERNARD`)*  
- `created_at`, `updated_at`

### Tendances
- `id`, `slug`, `label`, `color`?  
- **Défaut (sans emojis)** :  
  Le Cardinal, Robert Jr, Gutenberg, Indélébile, Protocop, Tarantino, Goal Digger, Promptzilla, Soulgorithm, PÔLÈNE

### Paramètres (éditables)
- `delai_alerte_jours = 7`  
- `fin_mission_sous_jours = 60`  
- `stb_recent_jours = 30`  
- `avis_manquant_depuis_jours = 60`

### Seed initial
- **8 consultants** (exemple)  
- **10 activités / consultant** *(2 par type)*  
- **10 tendances** par défaut

### Validation & sécurité
- **Consultant** : `nom` requis  
- **Activité** : `type`, `date_publication`, `description` requis ; `heures` requis si `type = ACTION_ST_BERNARD`  
- Échappement HTML à l’affichage des descriptions (XSS)

---

## 3) Interface (UX compacte) 🎛️

### Navigation & vues
- **Header** : 3 boutons → `Dashboard`, `Activité`, `Paramètres`  
- Commutation via `.view/.active` + `hidden` → **1 seule vue à la fois**  
- **Routing UI** : hash/state interne (pas d’URL externe)

### A) DASHBOARD 📊
- Grille **4 colonnes** responsive (4/3/2/1) avec **4 blocs** :
  1) **En alerte** *(date_fin ≤ aujourd’hui + `delai_alerte_jours`)*  
  2) **Fin de mission < Xj** *(X = `fin_mission_sous_jours`)*  
  3) **Action STB ≤ Yj** *(Y = `stb_recent_jours`)*  
  4) **Sans avis > Zj** *(Z = `avis_manquant_depuis_jours`)*  
- **Titres dynamiques** (X/Y/Z et délai)  
- **Carte consultant (2 lignes)** :  
  - L1 : **Nom**  
  - L2 : **Titre de mission**  
- **Clic carte** ⇒ ouvre **ACTIVITÉ** + filtre **consultant**  
- ❌ **Pas de `date_fin`** affichée ici

### B) ACTIVITÉ 🗂️
- **Deux panneaux** :
  - **Gauche “Consultants”**  
    - En-tête cliquable : *Nom | Fin mission* → tri ↑/↓ (chevrons)  
    - **Ligne (3 colonnes)** :  
      - Col 1 : **Nom (L1) + Titre (L2)** + pastille état (vert/jaune/rouge selon `date_fin`)  
      - Col 2 : **Date fin** (ISO ou vide)  
      - Col 3 : **Actions** → 🔗 (ouvre `url` si présent), ✏️ (modal **Infos consultant**)  
    - **Clic ligne** ⇒ filtre les activités par consultant
  - **Droite “Activités”**  
    - **Filtres** : 5 toggles **type** (tous actifs), **recherche** (#tendance ou texte), bouton **+ Nouvelle activité**  
    - **Tri** du plus récent → plus ancien  
    - **Colonnes** :  
      - **Col 0 : Consultant** → Nom (L1) + Titre (L2)  
      - **Col 1 : Badge Type + Date**  
      - **Col 2 : Description** (échappée) + *Heures* (si STB)  
      - **Col 3 : Actions** → ✏️ éditer, 🗑️ supprimer  
    - **Popup activité** :  
      - Select **Consultant**, Select **Type**, **Date**  
      - **Description** pleine largeur, multi-lignes (≥160px), **autocomplete `#`** sur tendances  
      - **Heures** visible **uniquement** si Type = STB  
      - **Enregistrer / Annuler**
- **Modal “Infos consultant”** :  
  - Nom*, Titre mission, Date fin, URL  
  - **Description = textarea large** *(#tendances OK)*  
  - **Enregistrer / Annuler**

### C) PARAMÈTRES ⚙️
- **Tendances** : liste (`#slug`, `label`) + **Ajouter / ✏️ / 🗑️**  
- **Seuils Dashboard** : 4 champs (jours) + **Enregistrer / Réinitialiser**  
- **Import / Export JSON** :  
  - Export = **dump complet**  
  - Import = **merge** ou **replace**

### Micro-interactions & a11y
- Toasters (succès), **confirm** à la suppression  
- Navigation clavier (Enter/Échap), contraste **AA**  
- Densité : **13–14px**, hauteurs **36–40px**, paddings réduits

---

## 4) Style 🎨
- Thème clair : fond **#FAFAFA**, cartes **#FFF**, bordures **#E0E0E0**, texte **#222**  
- Badges **type** : STB 🟦, Note 🟩, Verbatim 🟨, Avis 🟪, Alerte 🟥  
- Pastilles état (liste consultants) :  
  - **Vert** : `date_fin` > 7j  
  - **Jaune** : 0–7j  
  - **Rouge** : dépassée

---

## 5) Technique 🧩
- **Mono-fichier** : HTML + CSS + JS (vanilla)  
- **Stockage** : `localStorage` clé **`SHERPA_STORE_V3`**  
- **Composants** :  
  - **Store** (CRUD, seed, import/export)  
  - **Dashboard** (sélections live)  
  - **ConsultantsList** (tri Nom/Fin)  
  - **ActivitiesList** (filtres, recherche, modals)  
  - **TrendsManager**, **SettingsForm**, **JsonIO**  
- **Perf** : tri/filtre **en mémoire** ; **pagination virtuelle** si > 200 activités  
- **Accessibilité** : `aria-live` pour toasts, focus visibles, `dialog` natif

---

## 6) Logique Dashboard (sélections) 🧮
- **En alerte** : `date_fin ≤ today + delai_alerte_jours`  
- **Fin < Xj** : `0 < (date_fin − today) ≤ X`  
- **STB ≤ Yj** : dernière `ACTION_ST_BERNARD` dans les **Y** derniers jours  
- **Sans avis > Zj** : aucun `AVIS` dans les **Z** derniers jours *(ou jamais)*  
- **Titres dynamiques** : affichent **X**, **Y**, **Z** et le **délai** actuels

---

## 7) Critères d’acceptation ✅
- **1 seule vue** visible à la fois (Dashboard/Activité/Paramètres)  
- **Dashboard** : 4 blocs/4 colonnes ; carte = **Nom + Titre** ; **clic** ⇒ Activité + filtre consultant ; **titres dynamiques** (X/Y/Z/délai)  
- **Activité / gauche** : Nom/Titre + Date fin + 🔗/✏️ ; **tri** Nom/Fin (↑/↓) ; pastille état  
- **Activité / droite** : colonnes **Consultant / Type+Date / Description(+Heures si STB) / Actions** ; filtres types actifs par défaut ; **recherche** texte & `#tendance` ; **popup** conforme  
- **CRUD complet** (Consultant / Activité / Tendance)  
- **Import/Export JSON** : **merge/replace** OK  
- **A11y** : clavier OK, toasts lisibles (`aria-live`), confirm suppression

---

## 8) Changements vs v3 🔁
- **X/Y/Z dynamiques** sur les titres Dashboard  
- **Description Consultant** en **textarea large**  
- **Liste Activités** : **colonne dédiée** à gauche pour **Nom/Titre** du consultant  
- Système d’onglets : **une seule vue** via `hidden`

---

## 9) Defaults 🔑
- localStorage : **`SHERPA_STORE_V3`**  
- Paramètres : `7 / 60 / 30 / 60`  
- Seed : **8 consultants**, **10 activités/consultant** (2/type), **10 tendances**
