# SHERPA — MVP v4.9.8 • Spécification fonctionnelle (sans code)

> Objectif : permettre à **une nouvelle session ChatGPT** de **régénérer à l’identique** le prototype mono-fichier HTML/CSS/JS décrit ici.  
> Format : **plein écran** (full-width), **thème clair**, **UI compacte**, **stockage localStorage**, **sync manuelle via data.json**.

---

## 1) Contexte & Périmètre
- **Public** : pilotage d’un portefeuille de consultants, suivi d’activités horodatées, consolidation par objectifs.
- **Usage** : application **front-only** (aucun backend), données persistées côté navigateur (**localStorage**) avec **réinitialisation/seed** via un fichier **data.json** situé au même niveau que l’HTML.
- **Navigation** par **5 onglets** (persistence de l’onglet courant) :
  - Dashboard
  - 🗂️ Activités
  - 🎯 Objectifs
  - ⚙️ Paramètres
  - 🔃 Sync
- **Accents UX** :
  - Tables lisibles, colonnes fixes sur les identifiants, colonnes **Objectif + Description** plus larges.
  - **Pills colorés** par type d’activité (STB/Note/Verbatim/Avis/Alerte) + émojis.
  - **Barres de remplissage** (fond clair) sur les lignes consultants d’un objectif, **dimensionnées par heures**.
  - **Scrollbars masquées au repos** et visibles au survol (sans décalage de layout).
  - **Modales** pour créer/éditer Activité, Objectif, Consultant (avec règles d’annulation si champs requis vides).

---

## 2) Données (modèle & règles)

### 2.1 Entités
- **Consultant**
  - `id` (uuid)
  - `nom` *(requis)*
  - `titre_mission` *(optionnel)*
  - `date_fin` *(optionnel, YYYY-MM-DD ; “disponible après”)*
  - `url` *(optionnel, lien fiche)*
  - `description` *(optionnel)*
  - `created_at`, `updated_at` (ISO)
- **Activité**
  - `id` (uuid)
  - `consultant_id` *(requis)*
  - `type` *(requis)* ∈ `ACTION_ST_BERNARD` | `NOTE` | `VERBATIM` | `AVIS` | `ALERTE`
  - `date_publication` *(requis, YYYY-MM-DD)*
  - `description` *(requis)*
  - `objectif_id` *(optionnel)*
  - `heures` *(optionnel, **uniquement** si `type = ACTION_ST_BERNARD`; nombre > 0, pas de négatif)*
  - `created_at`, `updated_at` (ISO)
- **Objectif**
  - `id` (uuid)
  - `titre` *(requis)*
  - `description` *(optionnel)*
  - `consultants` : liste d’objets `{ consultant_id, progression_pct }`
    - `progression_pct` ∈ [0..100] (entier, arrondi si besoin)
  - `created_at`, `updated_at` (ISO)
- **Params** (avec valeurs par défaut)
  - `delai_alerte_jours` (7)
  - `fin_mission_sous_jours` (60)
  - `stb_recent_jours` (30)
  - `avis_manquant_depuis_jours` (60)
  - `objectif_recent_jours` (15)
  - `objectif_bar_max_heures` (10)

### 2.2 Dérivés & Règles de calcul
- **Statut consultant** (pastille verte/jaune/rouge) :
  - Rouge si `date_fin` < aujourd’hui **ou** s’il existe une **ALERTE** récente (≤ `delai_alerte_jours`).
  - Vert si présence **STB** récente (≤ `stb_recent_jours`) **ou** **AVIS** récent (≤ `avis_manquant_depuis_jours`) et pas de condition rouge.
  - Jaune sinon.
- **Dashboard (4 cartes)** :
  - 🚨 **En alerte** : consultants avec **ALERTE** récente (≤ `delai_alerte_jours`).
  - ⏳ **Fin de mission < X j** : `0 ≤ (date_fin - aujourd’hui) ≤ fin_mission_sous_jours`.
  - 🐕‍🦺 **Action STB > Y j** : **absence** d’Action STB depuis `stb_recent_jours`.
  - 🗣️ **Avis > Z j** : **absence** d’AVIS depuis `avis_manquant_depuis_jours`.
  - Chaque carte affiche **compteur** et **liste cliquable** (navigue vers Activités filtrées).
- **Objectifs (heures & progression)** :
  - **Heures totales** d’un objectif = somme des `heures` sur `ACTION_ST_BERNARD` rattachées à l’objectif.
  - **Heures récentes** = somme des mêmes `heures` restreinte à `objectif_recent_jours`.
  - **Affichage par consultant** dans une carte objectif :
    - **Barre de fond** (clair, largeur **proportionnelle** à `heures` du consultant **vs** `objectif_bar_max_heures`).
    - Badge progression (🟥 <30%, 🟨 30–69%, 🟩 ≥70%) + libellé `(% progression)`.
    - Totaux : `Xh` et `(+Yh)` en **vert** si Y > 0.

---

## 3) Interface & Comportements

### 3.1 Disposition générale
- **Header sticky** (hauteur constante), onglets en **pills**.
- **Main** : hauteur `100vh - header`, chaque onglet est une **view** (display toggle).  
- **Grilles** :
  - Dashboard : **4 cartes** en grille responsive (4→3→2→1 colonnes).
  - Objectifs : **cartes** en grille responsive idem (id `objectifs-grid`).

### 3.2 Onglet 🗂️ Activités
- **Split view** 2 colonnes :
  1) **Pane gauche – Consultants**
     - En-tête sticky + bouton **+Ajouter un consultant** + bouton **Réinitialiser** (filtre consultant).
     - **Table triable** sur `Nom` et `Fin` (clic entête alterne ▲/▼).
     - Ligne consultant :
       - Ligne primaire : pastille **statut** + **Nom** (gras).
       - Ligne secondaire : **Titre mission** (gris).
       - Colonne **Fin** (format texte YYYY-MM-DD ou —).
       - Colonne actions : **🔗** (URL si existante), **✏️** (éditer), **🎯** (voir ses objectifs).
       - **Clic ligne** (hors boutons) ⇒ **filtrer** les activités par ce consultant + focus onglet Activités.
  2) **Pane droite – Activités**
     - En-tête sticky avec :
       - Titre + badge **compteur** + bouton **+Ajouter une activité**.
       - Barre de filtres : **Réinitialiser**, **Type**, **Objectif**, **Date (Avant le)**.
     - **Table** colonnes : Type | Consultant | Date | Description + Objectif | Actions
       - **Type** : pill + émoji (STB/Note/Verbatim/Avis/Alerte).
       - **Consultant** : Nom (gras) + mission (gris, seconde ligne).
       - **Date** : texte seul.
       - **Description + Objectif** :
         - Ligne 1 : `🎯 <Titre objectif>` (gras) à gauche + `heures` (gras, seulement si STB) à droite.
         - Ligne 2 : **Description** clampée (3 lignes max), *title* au survol = texte complet.
       - **Actions** : **✏️** (éditer), **🗑️** (supprimer avec confirmation).
       - **Clic ligne** (hors boutons) ⇒ ouvrir la **modale Activité** en édition.

### 3.3 Onglet 🎯 Objectifs
- **Filtre consultant** (select) + bouton **Réinitialiser**.
- **Cartes Objectif** (ordre des consultants **triés par progression décroissante**, puis nom) :
  - En-tête : **Titre** (cliquable ⇒ ouvre Activités filtrées sur cet objectif) + bouton **✏️** (éditer objectif).
  - **Description** (gris).
  - **Récap** : `Total objectif : Xh (+Yh)` en **vert** si Y>0 + rappel `Barre max : Nh`.
  - **Liste des consultants** (seulement **ceux qui ont au moins une STB** sur cet objectif) :
    - **Barre de fond** proportionnelle à `heures / objectif_bar_max_heures`, **couleur** de fond en fonction de `progression_pct` (vert/jaune/rouge clair).
    - Libellé : **badge** progression (🟥/🟨/🟩) + **Nom** (souligné cliquable) + `(% progression)`.
    - Totaux à droite : `Xh` et `(+Yh)` en vert si Y>0.
    - **Clic sur Nom** ⇒ onglet Activités filtré par **consultant + objectif**.
- **Filtre “👤 Tous les consultants”** : si un consultant est sélectionné, n’afficher que les objectifs où **ce consultant** a au moins une STB et **réduire** la liste affichée à **3 entrées max** : le consultant sélectionné (surligné en gras dans la carte) + les **2 suivants** par progression.

### 3.4 Onglet ⚙️ Paramètres
- Champs numériques pour tous les paramètres.
- Bouton **Enregistrer** ⇒ met à jour `store.params`, recalcul immédiat du Dashboard, barres, titres ; **toast/alert** de confirmation.

### 3.5 Onglet 🔃 Sync
- Boutons : **🐈‍⬛ Réinitialiser** (à gauche), **📋 Copier JSON** (copie `store` formaté).
- **Aperçu JSON** en lecture seule (scrollable).
- **Import JSON local** :
  - Si le **fetch** de `data.json` échoue : **fallback** en ouvrant un **file picker**.
  - En cas d’import local : **remplace intégralement** le store (avec normalisation Params & Meta), affiche un **message de succès**.
- **Réinitialisation** : charge `data.json` depuis le même répertoire (no-store), sinon fallback file picker.

### 3.6 Modales (création/édition)
- **Activité** :
  - Champs : Consultant (select), Type (select), Date (date), Objectif (select), Heures (numérique **visible seulement** si STB, défaut 1), Description (textarea auto-hauteur, mémoire de hauteur max).
  - **Annulation automatique** : si **nouvelle** activité et **un champ requis** est vide ⇒ fermer sur “Annuler” (pas d’alerte).  
    En **édition**, si requis manquants ⇒ **alerte** bloque la sauvegarde.
- **Objectif** :
  - Champs : Titre (requis), Description (textarea auto-hauteur).
  - Bloc **“Progression (%) — consultants ayant au moins une 🐕‍🦺 STB”** :
    - Liste **auto-générée** des consultants éligibles (triée par progression décroissante).
    - Chaque ligne : nom + input numérique **0..100** (coloration rouge/jaune/vert selon la valeur).
  - Boutons : **Supprimer**, **Annuler**, **Enregistrer**.
- **Consultant** :
  - Champs : Nom (requis), Titre mission, Date fin, URL, Description (textarea auto-hauteur).
  - Boutons : **Supprimer** (supprime le consultant **sans** supprimer ses activités), **Annuler**, **Enregistrer**.
- Les **textareas** “Description” d’activité & consultant conservent la **plus grande hauteur** atteinte durant la session (auto-resize avec “mémoire”).

---

## 4) Règles de navigation & filtres
- **Persistance onglet** : clé `TAB_KEY = 'SHERPA_ACTIVE_TAB'` (valeur = id onglet) dans `localStorage`.
- **Ouverture par défaut** : **Activités** (si aucune persistance).
- **Clics contextuels** :
  - Dashboard → Activités filtrées (type/consultant selon carte).
  - Objectif (titre) → Activités filtrées par **objectif**.
  - Objectif (nom consultant) → Activités filtrées par **consultant + objectif**.
  - Liste Consultants (clic ligne) → Activités filtrées par **consultant**.
- **Réinitialiser filtres** :
  - Dans **Activités** : efface `consultant_id`, `type`, `before`, `objectif_id` + réinitialise les selects/inputs.
  - Dans **Consultants (gauche)** : réinitialise **uniquement** le filtre consultant actif.
  - Dans **Objectifs** : efface le select consultant.

---

## 5) Technique & stockage

### 5.1 Stockage & clés
- **Clé principale** : `LS_KEY = 'SHERPA_STORE_V4'`.
- **Structure `store`** :
  - `consultants: []`, `activities: []`, `objectifs: []`,
  - `params: { ...DEFAULT_PARAMS }`,
  - `meta: { version: 4.98, updated_at: <ISO> }`
- **Chargement initial** :
  - Au tout premier démarrage : si `LS_KEY` vide, **créer un store vide** puis **auto-bootstrap** :
    - Tente `fetch('./data.json', { cache: 'no-store' })`.
    - Si échec : **file picker** (JSON local).
- **Sauvegarde** : `updated_at` rafraîchi, re-rendu complet (consultants, filtres, activités, objectifs, params, dashboard, preview JSON).

### 5.2 Performances & UX
- **Tri** côté client, filtres en chaîne (consultant → type → objectif → date).
- **Clamp** texte (Description) : 3 lignes max avec *title* au survol (pour lecture complète).
- **Scrollbars** :
  - Invisibles au repos, visibles au **hover**, sans modifier la largeur des colonnes.
  - Utiliser `scrollbar-gutter: stable both-edges` pour éviter le “layout shift”.
- **Tables** : `table-layout: fixed` + `colgroup` pour **largeurs stables** :
  - Activités : `Type` (≈130px), `Consultant` (≈200px), `Date` (≈110px), `Description+Objectif` (flex), `Actions` (≈84px).
  - Consultants : `Nom` (flex), `Fin` (≈86px), `Act.` (≈78px).
- **Responsive** :
  - Grilles : 4→3 (≤1300px) →2 (≤980px) →1 (≤660px).
  - Split view : passe en **stack** (1 colonne) ≤980px.

### 5.3 Conventions UI
- **Type → émoji + pill** :
  - STB 🐕‍🦺 (fond vert clair), NOTE 📝 (violet clair), VERBATIM 💬 (orange clair), AVIS 🗣️ (bleu clair), ALERTE 🚨 (rouge clair).
- **Badges progression** : 🟥 <30, 🟨 30–69, 🟩 ≥70.
- **Couleurs barres** :
  - Fond de barre **proportion** aux **heures** (vs `objectif_bar_max_heures`).
  - Teinte du fond selon progression (vert/jaune/rouge clair).
- **Actions standardisées** : ✏️ éditer, 🗑️ supprimer (confirm), 🔗 lien externe, 🎯 focus objectifs.
- **Toasts/alerts** minimalistes : confirmations (params sauvegardés, reset OK, import OK) et erreurs (JSON invalide).

---

## 6) États limites & Validations
- **Création** :
  - Activité/Consultant/Objectif : si **nouvelle** entité **et** champ(s) requis manquant(s) ⇒ **fermeture silencieuse** (Annuler).
- **Édition** :
  - Si requis manquants ⇒ **alerte** et **blocage** de la sauvegarde.
- **Suppression** :
  - Consultant : supprime **uniquement** la fiche consultant (les activités **restent**).
  - Objectif/Activité : suppression **définitive** après confirmation.
- **Import** :
  - Doit contenir **toutes** les clés `consultants`, `activities`, `objectifs`, `params` (sinon erreur).
  - `params` fusionnés avec **DEFAULTS** ; `meta.version` conservée/normalisée ; `meta.updated_at` rafraîchi.

---

## 7) Accessibilité & Micro-interactions
- Taille de police **compacte** (~14px) avec contrastes **suffisants**.
- **Focus** clavier sur boutons/inputs/selects ; éléments cliquables ont un **curseur main** et un *hover state*.
- **Titles** sur contenus clampés (Descriptions, Objectifs) pour lecture complète.
- **Boutons** “Réinitialiser” **visibles** près des filtres concernés.

---

## 8) Critères d’acceptation (extraits)
1) Changer `stb_recent_jours` en Paramètres **modifie immédiatement** le compteur “Action STB > Yj” du Dashboard.  
2) Clic sur “🎯 Objectif A” dans une carte ⇒ onglet Activités s’ouvre avec filtre **Objectif A** actif.  
3) Dans **Objectifs**, sélectionner **Consultant X** ⇒ n’afficher que les objectifs où X a des STB et, pour chaque carte, **3 lignes max** (X en premier, en gras).  
4) Nouvelle activité **STB** sans heures ⇒ **bloquée** en édition (alerte) / **annulée** en création si requis manquants.  
5) **Reset** charge `data.json` si disponible ; sinon propose un **fichier local** ; après import, le JSON **aperçu** reflète les nouvelles données.

---

## 9) Paramétrage par défaut (rappel)
- `delai_alerte_jours = 7`
- `fin_mission_sous_jours = 60`
- `stb_recent_jours = 30`
- `avis_manquant_depuis_jours = 60`
- `objectif_recent_jours = 15`
- `objectif_bar_max_heures = 10`

---

## 10) Glossaire rapides 🧭
- **STB** = “Action Saint-Bernard” (action d’aide/relance mesurée en **heures**).
- **Heures récentes** = somme des heures STB ≤ `objectif_recent_jours`.
- **Barre max heures** = seuil visuel de 100% pour la largeur de barre.

