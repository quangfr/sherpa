🔆 Spécification SHERPA – MVP v3.1 (compact, thème clair)
1) Objectif

Mono-fichier HTML/CSS/JS vanilla pour suivre Consultants & Activités avec 3 onglets (Dashboard / Activité / Paramètres).
Interface compacte, accessible, stockée en localStorage.

2) Données (modèle & règles) 📦
Consultant

id (uuid)

nom*

titre_mission?

date_fin? (= dispo)

url?

description? (#tendances OK)

created_at, updated_at

❌ TJM absent

Activité

id (uuid)

consultant_id*

type* ∈ ACTION_ST_BERNARD | NOTE | VERBATIM | AVIS | ALERTE

date_publication* (ISO, YYYY-MM-DD)

description* (#tendances OK)

heures? (visible & requis uniquement si type = ACTION_ST_BERNARD)

created_at, updated_at

Tendances

id, slug, label, color?

Défaut (sans emojis) :
Le Cardinal, Robert Jr, Gutenberg, Indélébile, Protocop, Tarantino, Goal Digger, Promptzilla, Soulgorithm, PÔLÈNE

Paramètres (éditables)

delai_alerte_jours = 7

fin_mission_sous_jours = 60

stb_recent_jours = 30

avis_manquant_depuis_jours = 60

Seed initial

8 consultants (liste exemple)

10 activités / consultant (2 par type)

10 tendances par défaut

Règles de validation

Consultant : nom requis

Activité : type, date_publication, description requis ; heures requis si type = ACTION_ST_BERNARD

Échappement HTML à l’affichage des descriptions

3) Interface (UX compacte) 🎛️
Navigation & vues

Header : 3 boutons onglets → Dashboard, Activité, Paramètres

Commutation par classes .view/.active + hidden → garanti : une seule vue à la fois

Routing UI : hash/state interne (pas d’URL externe)

A) DASHBOARD 📊

Grille 4 colonnes responsive (4/3/2/1) avec 4 blocs :

En alerte (date_fin ≤ aujourd’hui + delai_alerte_jours)

Fin de mission < Xj (X = fin_mission_sous_jours)

Action STB ≤ Yj (Y = stb_recent_jours)

Sans avis > Zj (Z = avis_manquant_depuis_jours)

Titres dynamiques : X / Y / Z s’affichent selon les paramètres actuels

Carte consultant (2 lignes / même colonne) :

L1 : Nom

L2 : Titre de mission

Clic Nom ⇒ ouvre onglet ACTIVITÉ + applique filtre consultant

❌ Pas de date_fin affichée ici

B) ACTIVITÉ 🗂️

Layout deux panneaux :

Gauche “Consultants” (liste compacte)

Entête cliquable : Nom | Fin mission → tri ↑/↓ (chevron visuel)

Ligne (3 colonnes) :

Col 1 : Nom (L1) + Titre (L2) + pastille état (vert/jaune/rouge selon date_fin)

Col 2 : Date fin (ISO ou vide)

Col 3 : Actions → 🔗 (ouvre url si présent), ✏️ (ouvre modal Infos consultant)

Clic ligne ⇒ filtre les activités par consultant

Droite “Activités” (ouvert par défaut)

Barre filtres : 5 toggles de type (tous actifs), champ recherche (#tendance ou texte), bouton + Nouvelle activité

Liste triée du plus récent au plus ancien

Colonnes activités :

Col 0 : Consultant → Nom (L1) + Titre (L2)

Col 1 : Badge Type + Date

Col 2 : Description (échappée) + Heures (si STB)

Col 3 : Actions → ✏️ éditer, 🗑️ supprimer

Popup création/édition activité :

Select Consultant, Select Type, Date

Description pleine largeur, multi-lignes (≥160px), autocomplete # sur tendances

Heures affiché seulement si Type = STB

Boutons Enregistrer / Annuler

Modal “Infos consultant” :

Nom*, Titre mission, Date fin, URL

Description = textarea large (#tendances OK)

Enregistrer / Annuler

C) PARAMÈTRES ⚙️

Tendances : liste (#slug, label) + Ajouter / ✏️ / 🗑️

Seuils Dashboard : 4 champs numériques (jours) + Enregistrer / Réinitialiser

Import / Export JSON :

Export = dump complet

Import = merge ou replace

Micro-interactions & a11y

Toasters (succès), confirm à la suppression

Navigation clavier (Enter/Échap), contraste AA

Densité : 13–14px, hauteurs 36–40px, paddings réduits

4) Style 🎨

Thème clair : fond #FAFAFA, cartes #FFF, bordures #E0E0E0, texte #222

Badges type : STB 🟦, Note 🟩, Verbatim 🟨, Avis 🟪, Alerte 🟥

Liste consultants : pastille état

Vert : date_fin > 7j

Jaune : 0–7j

Rouge : dépassée

5) Technique 🧩

Mono-fichier : HTML + CSS + JS (modules internes si besoin)

Stockage : localStorage (clé SHERPA_STORE_V3)

Composants JS (logique) :

Store (CRUD, seed, import/export)

Dashboard (sélections calculées à la volée)

ConsultantsList (tri par header Nom/Fin)

ActivitiesList (filtres, recherche, modals)

TrendsManager, SettingsForm, JsonIO

Sécurité : échappement HTML des descriptions (XSS)

Perf : tri/filtre en mémoire ; pagination virtuelle si > 200 activités

Accessibilité : aria-live pour toasts, focus visibles, dialog natif

6) Logique Dashboard (sélections) 🧮

En alerte : date_fin ≤ today + delai_alerte_jours

Fin < Xj : 0 < (date_fin − today) ≤ X

STB ≤ Yj : dernière ACTION_ST_BERNARD dans les Y derniers jours

Sans avis > Zj : aucun AVIS dans les Z derniers jours (ou jamais)

Titres dynamiques : affichent X, Y, Z et le délai alerte actuels

7) Critères d’acceptation ✅

1 seule vue visible à la fois (Dashboard/Activité/Paramètres)

Dashboard : 4 blocs/4 colonnes, Nom + Titre par carte, clic ⇒ ouvre Activité + filtre consultant ; titres avec X/Y/Z dynamiques

Activité / gauche : Nom/Titre + Date fin + boutons 🔗 / ✏️ ; tri sur Nom ou Fin (↑/↓) ; pastille état

Activité / droite :

Colonnes : Consultant (col 0), Type+Date (col 1), Description (+ Heures si STB) (col 2), Actions (col 3)

Filtres : 5 types actifs par défaut ; recherche par texte ou #tendance

Popup activité : Description pleine largeur multi-lignes ; Heures visible seulement pour STB

CRUD complet (Consultant / Activité / Tendance)

Import/Export JSON : merge/replace fonctionnels

A11y : clavier OK, toasts lisibles (aria-live), confirm suppression

8) Changements vs v3 🔁

X/Y/Z dynamiques dans les titres du Dashboard

Description Consultant en textarea large

Liste Activités : colonne dédiée à gauche pour Nom/Titre du consultant

Système d’onglets : une seule vue affichée (via hidden)

9) Clés & valeurs par défaut 🔑

localStorage key : SHERPA_STORE_V3

Defaults :

delai_alerte_jours: 7

fin_mission_sous_jours: 60

stb_recent_jours: 30

avis_manquant_depuis_jours: 60

Seed : 8 consultants, 10 activités/consultant (2/type), 10 tendances