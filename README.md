[Lien Application](https://quangfr.github.io/sherpa-mobile/app.html)

# Spécifications complètes — Application **SHERPA** (v6.x)

## 1) Contexte
- **But** : cockpit local-first pour suivre des **Consultants**, leurs **Activités** (STB, Notes, Verbatims, Avis, Alertes), des **Guidées** et la configuration métier (paramètres, prompts IA, sauvegardes JSON).
- **Périmètre** :
  - Visualisation des signaux clés (alertes, fins de mission, absence d’actions/avis) et pilotage des jalons guidée/STB.
  - Filtrage, création, édition des activités/guidées et gestion des prompts IA associés.
  - Paramétrage des seuils, gestion des hashtags, import/export JSON et synchronisation Firestore.
- **Public** : PM/PO, coachs, managers.
- **Principes** :
  - Application mono-page (HTML/CSS/JS) + persistance **localStorage** (`SHERPA_STORE_V6`) avec synchronisation Firestore optionnelle.
  - Expérience compacte, responsive, sans dépendance externe hors Firebase/OpenAI proxy.
  - UI régénérable : tokens CSS, grilles et composants stables.

---

## 2) Données
### 2.1 Modèle de stockage (localStorage JSON)
- **Clé** : `SHERPA_STORE_V6`; **meta** contient `version`, `updated_at`, `updated_at_iso`, `last_writer`, `last_reason`.
- **params** (seuils & UI) — valeurs par défaut :
  - `sync_interval_minutes`, `delai_alerte_jours`, `fin_mission_sous_jours`, `stb_recent_jours`,
    `avis_manquant_depuis_jours`, `activites_recent_jours`, `activites_a_venir_jours`,
    `hashtags_catalog`, `openai_prompts` (prompts IA par type d’activité + guidée + consultant).
- **thematiques** : `{ id, nom, emoji, color }`, IDs normalisés et complétés au chargement.
- **consultants** :
  - `{ id, nom, titre_mission, date_fin?, boond_id?, description?, created_at, updated_at }` (sans `url`).
- **guidees** :
  - `{ id, consultant_id, nom, description, date_debut, date_fin?, thematique_id, created_at, updated_at }`.
- **activities** :
  - `{ id, consultant_id, type, date_publication, title, description, heures?, guidee_id?, beneficiaires?, created_at, updated_at }`.
  - Types : `ACTION_ST_BERNARD`, `CORDEE`, `NOTE`, `VERBATIM`, `AVIS`, `ALERTE`.
- **openai_prompts** :
  - `activities` (clé = type) + `guidee` + `consultant`, tous surchargeables individuellement.

### 2.2 Règles de migration / cohérence
- Merge des `params` par défaut, normalisation des thématiques, purge des champs obsolètes (`url`, `objectif*`, anciens prompts).
- Nettoyage des activités (`title` trim, fallback première ligne de description) et mise à jour meta (`version` = 6.0).
- Synchronisation Firestore : diff calculé côté client, metadata (`last_writer`, `last_reason`) poussée à chaque écriture.

---

## 3) Interface
### 3.1 Navigation
- **Tabs** persistés (`SHERPA_ACTIVE_TAB`) : `🧭 Sherpa`, `📌`, `🗺️`, `⚙️ Paramètres` (desktop) / icônes seules en mobile.
- Header sticky : bouton statut sync (`✔️/⌛/⚠️`), actions d’auth (login, logout).

### 3.2 Dashboard (🧭 Sherpa)
- Cartes indicateurs :
  - `🚨 En alerte < W j`, `⏳ Fin de mission < X j`, `🐕‍🦺 Sans action STB > Y j`, `🗣️ Sans avis > Z j`.
- Bloc “Actions en cours” / “Actions à venir” : liste des guidées avec STB à 0h, affichant consultant + badge heures + date (préfixée `•`).
- Bouton global “Ajouter un consultant”.

### 3.3 Activités (📌)
- Barre d’outils : compteur, `Ajouter`, `Réinitialiser`, filtres (`consultant`, `type`, `#️⃣`, `month`).
- Tableau : colonnes `Type`, `Actions`, `Consultant`, `Titre & détails`.
  - Lignes affichent badge heures avant le titre, meta (`activité-meta`) avec hashtags & date.
  - Description clampée; guidee associée affichée uniquement pour la ligne sélectionnée (bloc `activity-guidee` sous la description).
- Format des dates : passé proche (`Aujourd'hui/Hier/Avant-hier/Il y a X j`), futur (`Dans X semaines` si ≤9 semaines sinon `Dans X mois`), date exacte sur élément sélectionné.
- Actions rapides : édition, duplication, suppression, accès consultant/guidée, génération IA (description & titre avec emoji requis).

### 3.4 Guidées (🗺️)
- Barre : `Créer`, `Éditer`, `Réinitialiser`, filtres (`consultant`, `guidée`), progression (% + heures cumulées).
- Timeline verticale :
  - Encadrés style cartes activités (ombre, survol, sélection colorée).
  - Métadonnées avec badge heures devant le titre activité + séparateur `•` avant la date.
  - Événements `start/end` sans emoji ni nom de guidée, texte “Démarrage/Fin de la guidée”.
  - Date affichée selon sélection (exacte si sélectionnée, relatif sinon).
  - Boutons inline `✏️` pour éditer activité/guidée, clic = sélection + focus.

### 3.5 Paramètres (⚙️ Paramètres)
- Carte **Paramètres** : inputs numériques pour seuils, textarea hashtags, bouton `Enregistrer`.
- Bloc **Backup** : boutons `📤 Importer la donnée en JSON`, `📥 Exporter la donnée en JSON` (FileReader + Blob).
- Carte **🤖 Prompts IA** : sélecteur de type (activités par nature, guidée, consultant), textarea éditable, boutons `Réinitialiser` / `Enregistrer`.
- Placeholders description modales = `#Team #Tech #Data #Customer #Design #Product` (barre de suggestions uniquement).

### 3.6 Styles & tokens
- Tokens : variables CSS (fond cartes, bordures, pills, ombres), badges heures `.hours-badge`, meta `.activity-meta`, `.activity-guidee`.
- Layout : `.grid` responsives (4→3→2→1), `.pane` + `.timeline` avec scroll survol, `.view` avec `margin:20px 0` pour le dashboard.
- Boutons : variantes `primary`, `ghost`, `danger`, `small`; modales `<dialog>` stylées; tabs responsive.

---

## 4) Règles (métier + UX)
### 4.1 Calculs & listes Dashboard
- Alerte : activité `ALERTE` dans `delai_alerte_jours`.
- Fin de mission : `0 ≤ jours_avant_fin ≤ fin_mission_sous_jours`.
- STB manquante : aucune `ACTION_ST_BERNARD` dans `stb_recent_jours`.
- Avis manquant : aucune `AVIS` dans `avis_manquant_depuis_jours`.
- Actions en cours/à venir : STB `heures ≤ 0`, trié par date (dernière / prochaine) avec dé-duplication par guidée.

### 4.2 Filtres & tri Activités
- Filtres cumulables (consultant, type, hashtag via parsing description, mois `YYYY-MM`).
- Tri par date décroissante, regroupement par consultant via lien cliquable.
- Surlignage ligne sélectionnée : montre date exacte + lien guidée en pied de carte.

### 4.3 Guidées & timeline
- Sélection automatique : événement courant (le plus proche d’aujourd’hui) ou futur le plus proche.
- Statut couleur : bordure/ombre selon état (passé/futur/présent) et couleur thématique.
- Progression : calcul % = jours écoulés / durée guidée, heures cumulées = somme STB ≤ événement sélectionné.
- Format futur : `Dans X semaines` (≤63 j) sinon `Dans X mois`; sélection = date exacte.

### 4.4 Accessibilité & responsive
- Navigation clavier : lignes dashboard & timeline focusables (`tabIndex=0`), actions accessible `Enter/Space`.
- Tabs adaptatifs (texte complet desktop, icônes mobile), header sticky.
- Media queries pour grilles, tables scrollables (`hover-scroll`), text clamp multi-lignes.

---

## 5) Technique
### 5.1 Pile & structure
- Fichiers : `app.html` (structure + modales), `app.css` (tokens, layout, timeline), `app.js` (logique, Firebase, OpenAI helpers), `data.json` (jeu de données).
- Tabs définis via `TABS` (labels long/court), persistance `openTab()` + `applyTabLabels()`.
- Utilitaires : `nowISO`, `todayStr`, `uid`, `esc`, `parseDate`, `daysDiff`, `addDays`, `formatActivityDate`, DOM helpers `$`, `$$`, `$$all`.

### 5.2 Cycle de vie données
- `load()` lit LS, `migrateStore()` nettoie & met à niveau, sinon bootstrap store vide.
- `save()` met à jour `meta.updated_at`, persiste LS, marque diff Firestore (`markRemoteDirty`) puis `refreshAll()`.
- Diff calculé via `computeSessionDiff` / `ensureSessionDiff`, synchronisation Firestore (`saveStoreToFirestore`, `loadRemoteStore`) avec indicateur (`✔️/⌛/⚠️`).
- Backup : boutons import/export déclenchent FileReader / Blob pour JSON complet.

### 5.3 UI rendering
- `renderActivities()` construit lignes + état sélection, badges heures, meta, guidee.
- `renderGuideeTimeline()` compose événements (début, activités, fin) avec tri, statut, scroll auto.
- `renderPromptEditor()` gère sélecteur de prompt, reset vers `cloneDefaultPrompts()`.
- Autres rendus : filtres (consultants/guidées/hashtags), dashboard métriques, paramètres.

### 5.4 Performance & robustesse
- Vanilla JS, rendu à la volée sans framework; calculs en mémoire.
- Échappement systématique des champs libres via `esc()`.
- Synchronisation asynchrone Firestore avec debouncing (`scheduleAutoSync`) et statut visuel.
- Gestion erreurs import/export et AI (alerts utilisateur).

### 5.5 Intégrations
- **Firebase** (Auth + Firestore) : login email/mot de passe, auto-sync périodique configurable (`sync_interval_minutes`).
- **OpenAI** : endpoints `fgOpenAI` / `fcOpenAI` + prompts personnalisables (modèle `gpt-5-nano`).
- Aucun lien GitHub / diff automatique (supprimé au profit du backup JSON).

---

## 6) Non-objectifs (v6.x)
- Pas de multi-utilisateurs simultanés (hors compte Firebase unique).
- Pas de workflow d’approbation ni d’automatisation externe.
- Pas de génération automatique des données sans action utilisateur (AI déclenchée manuellement).
