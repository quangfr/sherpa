# 🔆 Spécification SHERPA – MVP v3.1 (compact, thème clair)

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
- `date_publication`* (ISO `YYYY-MM*_
