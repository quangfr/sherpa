# 🔆 Spécification SHERPA — MVP v4.1 (full-width, types colorés, sans tendances)

## 1) Objectif
Mono-fichier **HTML/CSS/JS vanilla** pour suivre **Consultants**, **Activités**, **Objectifs**, **Dashboard**, **Sync GitHub** via 5 onglets :
**Dashboard / Activité / Objectif / Paramètres / Sync**  
Interface **pleine largeur** (full-width), compacte, accessible, données en **localStorage**, export/sync **data.json**.

---

## 2) Modèle de données
### 2.1 Consultant
- `id` (uuid)  
- `nom`*  
- `titre_mission`?  
- `date_fin`? *(= dispo)*  
- `url`?  
- `description`?  
- `created_at`, `updated_at`  
> ❌ **TJM absent**

### 2.2 Activité
- `id` (uuid)  
- `consultant_id`*  
- `type`* ∈ `ACTION_ST_BERNARD` | `NOTE` | `VERBATIM` | `AVIS` | `ALERTE`  
- `date_publication`* (ISO `YYYY-MM-DD`)  
- `description`*  
- `heures`? *(requis & visible **uniquement** si `type = ACTION_ST_BERNARD` ; **par défaut = 1**)*  
- `objectif_id`?  
- `created_at`, `updated_at`

### 2.3 Objectif
- `id` (uuid)  
- `titre`*  
- `description`?  
- `consultants` : liste d’objets `{ consultant_id, progression_pct (0–100) }`  
- `created_at`, `updated_at`  
> Un objectif **agrège** les activités **STB** des consultants associés.

### 2.4 Paramètres (éditables)
- `delai_alerte_jours = 7`  
- `fin_mission_sous_jours = 60`  
- `stb_recent_jours = 30`  
- `avis_manquant_depuis_jours = 60`  
- `objectif_recent_jours = 15` *(fenêtre pour “(+Yh)”)*  
- `github_repo_fullname` (ex. `quangfr/sherpa`)

### 2.5 Règles / validation / sécurité
- **Consultant** : `nom` requis  
- **Activité** : `type`, `date_publication`, `description` requis ; `heures` requis si STB  
- **Objectif** : `titre` requis ; ≥1 consultant associé  
- Échapper l’HTML à l’affichage (sécurité XSS)  
- Tri stable, dates au format ISO

---

## 3) Stockage
- **localStorage** : clé `SHERPA_STORE_V4` (dump complet)  
- **Sync GitHub** : export **data.json** (voir §9)

---

## 4) Navigation / layout
- Header à onglets `.tab.active`  
- Contenu en sections `.view` (une seule visible)  
- **Full-width** : conteneur `.wrap` = 100% largeur  
- Grilles responsive (4/3/2/1 colonnes selon la taille)

---

## 5) Dashboard 📊
- 4 cartes KPI en grille :
  - **🚨 En alerte** — consultants ayant une **ALERTE** ≤ `delai_alerte_jours`  
  - **⏳ Fin de mission < Xj** — `0 ≤ date_fin − aujourd’hui ≤ fin_mission_sous_jours`  
  - **🧰 Action STB ≤ Yj** — **liste des consultants SANS STB** dans les `stb_recent_jours` (à traiter)  
  - **🗣️ Sans avis > Zj** — pas de `AVIS` depuis `avis_manquant_depuis_jours`  
- Titres dynamiques affichant X/Y/Z (issus des paramètres)  
- Carte consultant = 2 lignes (Nom / Titre mission)  
- **Clic carte** ⇒ onglet **Activité** + filtre consultant  
- ❌ Pas d’affichage de la date de fin ici

---

## 6) Activité 🗂️
### 6.1 Panneau gauche — “Consultants”
- Entête **triable** : **Nom**, **Fin mission**  
- Ligne :  
  - Nom + Titre mission + pastille état (🟢/🟡/🔴)  
  - Date fin  
  - Actions : 🔗 (URL), ✏️ (éditer), **Filtrer**  
- **Clic Filtrer** ⇒ filtre Activités par consultant  
- Bouton “Réinitialiser filtres” (supprime le filtre consultant)

### 6.2 Panneau droit — “Activités”
- **Recherche texte** (plein-texte sur `description`) — ❌ **pas de tendances**  
- Boutons : “+ Nouvelle activité”, “Réinitialiser filtres”  
- **Tri** par défaut : plus récent → plus ancien  
- **Colonnes (exactement)** :
  1) **Consultant** (Nom + Titre sur 2 lignes)  
  2) **Type & Date** (2 lignes)  
     - **Type** = **badge coloré + emoji** :
       - `ACTION_ST_BERNARD` → **🧰** (vert) “Action STB”  
       - `NOTE` → **📝** (indigo) “Note”  
       - `VERBATIM` → **💬** (orange) “Verbatim”  
       - `AVIS` → **🗣️** (bleu) “Avis”  
       - `ALERTE` → **🚨** (rouge) “Alerte”  
     - **Date** = `YYYY-MM-DD` (ligne 2)  
  3) **Objectif & Description** (2 lignes)  
     - Ligne 1 : 🎯 **Titre objectif** (si lié, sinon “—”)  
     - Ligne 2 : **Description** (+ **heures** si STB : `— 2h`)  
  4) **Actions** : ✏️ / 🗑️

### 6.3 Modal activité (CRUD)
- Select **Consultant** (requis)  
- Select **Type** (requis)  
- Select **Objectif** *(si le consultant est lié à ≥1 objectif)*  
- Date (requis), Description (requis)  
- **Heures** (visible + requis si `type=ACTION_ST_BERNARD`, **défaut = 1**)  
- Boutons **Enregistrer / Annuler**  
- Validation côté client (messages clairs)

---

## 7) Objectif 🎯
### 7.1 Vue
- Grille **4 colonnes** responsive  
- **Carte Objectif** :
  - Titre (L1)  
  - Description (L2)  
  - **Total objectif** : `XXh (+Yh)` où **(+Yh)** = heures récentes **en vert**  
  - Liste des **consultants associés** :
    - **Nom (cliquable)** → ouvre **Activité** filtrée **consultant + objectif**  
    - **Progression** : “80% ✅”  
    - **Heures** STB totales sur cet objectif : `12h`  
    - **Heures récentes** (sur `objectif_recent_jours`) : `(+4h)` **en vert**

### 7.2 Calculs
- **Par consultant & objectif** :  
  - `total_heures` = somme `heures` des activités `STB` liées à l’objectif et au consultant  
  - `heures_recentes` = somme sur `date_publication ≥ today − objectif_recent_jours`  
- **Par objectif** (tous consultants) : `total` & `recent` (mêmes règles)

### 7.3 Interactions / CRUD
- **Clic nom consultant** ⇒ Activité filtrée `consultant_id` + `objectif_id`  
- **✏️** sur carte ⇒ modal d’édition de l’objectif :
  - Titre, Description, associer/dissocier des consultants, **progression_pct** par consultant  
- **Créer / Modifier / Supprimer** objectifs

---

## 8) États / couleurs
- Pastille état consultant :
  - 🔴 : `date_fin` passée **ou** ALERTE récente (≤ `delai_alerte_jours`)  
  - 🟡 : `date_fin` dans `fin_mission_sous_jours` **ou** **pas de STB** dans `stb_recent_jours`  
  - 🟢 : sinon  
- **Badges type** = emoji + couleur dédiée (voir §6.2)

---

## 9) Sync GitHub 🔁
### 9.1 Onglet **Sync**
- **🐈‍⬛ Réinitialiser** (récupère './data.json', no-store puis remplace localStorage ; si échec → ouvrir import JSON local)
- **📋 Copier JSON** (dump complet du store)  
- **🐙 Ouvrir Issue `[SYNC]`** (préremplie avec le JSON)  
- **⬇️ Télécharger `data.json`**  
- Champ **Repo** (`owner/repo`) ; si vide, utiliser `params.github_repo_fullname`  
- Prévisualisation `<pre>` du JSON

### 9.2 Workflow (côté dépôt)
- Fichier attendu : `.github/workflows/sync-data-from-issue.yml`  
- Déclenché sur issue contenant `[SYNC]` ; met à jour `data.json` depuis le corps de l’issue

---

## 10) Accessibilité / UX
- Focus visible, boutons clavier-navigables  
- Labels associés aux champs, `aria` sur dialogues si nécessaire  
- Dialogs natifs `<dialog>` ; fermeture `Esc`

---

## 11) Performances & robustesse
- **Aucune dépendance** externe (vanilla)  
- Rendus par lot (DOM minimal), tri client  
- Sauvegarde **atomique** (maj `updated_at`)  
- **Échappement** HTML systématique des textes  
- Comportement déterministe sans réseau (offline-first)

---

## 12) Seed (exemple embarqué)
- 3 consultants (ex. Livier, Samuel, Léonard)  
- 1 objectif (“Lancer sprints MAESTRO”) avec 2 consultants  
- 5 activités (dont 2 **STB**) datées du jour

---

## 13) Critères d’acceptation ✅
- Plein écran + 5 onglets fonctionnels (switch 1 vue à la fois)  
- Dashboard calcule et liste correctement les 4 catégories  
- Activité : **layout colonnes conforme** + types **emoji/couleur**  
- Création/édition/suppression : **Consultant / Activité / Objectif** OK, validations OK  
- Objectif : calcul **total** et **(+récent)** juste (paramétrable)  
- Paramètres persistés et **répercutés** dans les titres Dashboard  
- Sync : **copie**, **issue**, **download** opérationnels

---
