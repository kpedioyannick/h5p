# Documentation de l'API PVI (Professeur Virtuel Intelligent)

Ce document répertorie les points de terminaison de l'API disponibles, leurs paramètres d'entrée et leurs formats de sortie.

---

## 1. Génération de Cours (Reveal.js + AI)

### `POST /course/generate`
Génère un cours pédagogique complet sous forme de présentation Reveal.js en utilisant l'IA.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `classroom` | String | Niveau de la classe (ex: "CM2", "3ème") |
| `subject` | String | Matière (ex: "Mathématiques", "SVT") |
| `chapter` | String | Titre du chapitre |
| `subChapter` | String | Titre du sous-chapitre |
| `type` | String | Type de contenu (ex: "Cours", "Révision") |
| `contexte` | String | (Optionnel) Contexte supplémentaire pour l'IA |

**Sortie (JSON) :**
```json
{
  "success": true,
  "courseId": "1767077949261",
  "title": "Titre du Cours",
  "url": "/course/view/1767077949261"
}
```

---

## 2. Visualisation de Cours

### `GET /course/view/:id`
Affiche le viewer Reveal.js pour un cours spécifique.

**Paramètres URL :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique du cours |
| `view` | String | (Optionnel) `slides` pour le mode présentation, `scroll` (défaut) pour mobile |
| `autoslide` | Boolean | (Optionnel) `true` pour activer le défilement automatique |

---

## 3. Génération de Contenu H5P

### `POST /api/h5p/generate`
Génère manuellement un module H5P à partir de paramètres structurés.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `library` | String | Nom de la librairie avec version (ex: "H5P.MultiChoice 1.16") |
| `params` | Object | Paramètres `content.json` spécifiques à la librairie H5P |

**Sortie (JSON) :**
```json
{
  "success": true,
  "path": "/absolute/path/to/content",
  "folder": "1767077949261",
  "id": "1767077949261"
}
```

### `POST /api/h5p/generate-ai`
Génère un module H5P automatiquement en utilisant l'IA sur un sujet donné.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `library` | String | Librairie cible (ex: "H5P.MultiChoice 1.16") |
| `topic` | String | Sujet du quiz (ex: "Les fractions") |
| `count` | Number | (Optionnel) Nombre de questions (défaut: 3) |

**Sortie (JSON) :**
```json
{
  "success": true,
  "id": "1767077949261",
  "aiParams": { ... } // Paramètres générés par l'IA
}
```

---

## 4. Planification d'Apprentissage (AI)

### `POST /api/planning`
Génère une séquence de modules (H5P ou LearningApps) pour un chapitre donné.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `classroom` | String | Niveau de la classe |
| `subject` | String | Matière |
| `chapter` | String | Chapitre |
| `subChapter` | String | (Optionnel) Sous-chapitre |
| `type` | String | Type d'activité (revision, exercise, exam) |

**Sortie (JSON) :**
```json
{
  "modules": [
    {
      "type": "h5p",
      "title": "Quiz...",
      "description": "...",
      "difficulty": "easy",
      "params": { "library": "...", "topic": "..." }
    }
  ]
}
```

---

## 5. Parcours d'Apprentissage (Viewer)

### `GET /parcours`
Génère une présentation Reveal.js regroupant plusieurs modules existants.

**Paramètres URL :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `modules` | String | Liste séparée par virgules (ex: `h5p:ID1,learningapps:ID2`) |
| `format` | String | (Optionnel) `revealjs` (défaut) ou `interactivebook` |

---

## 6. Données Brutes

### `GET /course/data/:id`
Récupère le JSON brut d'un cours généré.

**Sortie (JSON) :**
```json
{
  "title": "...",
  "slides": [
    {
      "content": "...",
      "autoAnimate": true,
      "autoSlide": 5000,
      "notes": "..."
    }
  ]
}
```
