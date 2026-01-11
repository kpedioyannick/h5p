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

## 4. Génération de Contenu LearningApps (Microservice)

Ce microservice (port 3001) permet de générer des activités sur le site `learningapps.org` via automatisation browser (Playwright).

### `POST /api/content/learningapps`
Génère manuellement une application LearningApps.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `module` | String | Type de jeu (ex: "Qcm", "Fillblanks", "Grouping", "Millionaire") |
| `title` | String | Titre de l'activité |
| `params` | Object | Paramètres spécifiques au module (structure JSON LearningApps) |

**Sortie (JSON) :**
```json
{
  "success": true,
  "iframeUrl": "https://learningapps.org/watch?v=...",
  "embedCode": "<iframe ...></iframe>",
  "appId": "p2i7qp7k325"
}
```

### `POST /api/content/learningapps/ai`
Génère une ou plusieurs activités LearningApps via l'IA.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `module` | String | Type de jeu (ex: "Qcm", "Millionaire") |
| `topic` | String | Sujet de l'activité |
| `count` | Number | Nombre d'activités à générer (défaut: 5) |
type | String | Type d'activité h5p ou learningapps 

**Sortie (JSON) :**
```json
{
  "success": true,
  "count": 1,
  "results": [
    {
      "success": true,
      "appId": "...",
      "iframeUrl": "...",
      "aiParams": { ... }
    }
  ]
}
```

---

## 5. Génération par Lot (Batch API)

Cet endpoint permet de générer plusieurs modules (H5P et LearningApps) en un seul appel et de les assembler automatiquement.

### `POST /api/generate-batch`

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `modules` | Array | Tableau d'objets (voir ci-dessous) |
| `forceGeneratePath` | Boolean | (Optionnel) Si `true`, crée un parcours Interactive Book |
| `title` | String | (Optionnel) Titre du parcours généré |

**Structure d'un objet dans `modules` :**
```json
{
  "type": "h5p" | "learningapps",
  "module": "Nom du module (ex: 'H5P.MultiChoice 1.16' ou 'Qcm')",
  "topic": "Sujet de l'activité",
  "count": 1 // Nombre de questions par module (défaut: 1)
}
```

**Sortie (JSON) :**
```json
{
  "success": true,
  "results": [
    { "type": "h5p", "success": true, "id": "...", "url": "...", "title": "..." },
    { "type": "learningapps", "success": true, "id": "...", "url": "...", "title": "..." }
  ],
  "parcours": {
    "id": "...",
    "url": "...",
    "type": "interactivebook"
  }
}
```

---

## 6. Planification d'Apprentissage (AI)

### `POST /api/planning`
Génère une séquence de modules (H5P ou LearningApps) basée sur une requête textuelle et des métadonnées optionnelles.

**Entrée (JSON) :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `request` | String | **(Obligatoire)** La demande textuelle de l'utilisateur. |
| `count` | Number | (Optionnel) Nombre de modules à générer (défaut: 4 à 6) |
| `classroom` | String | (Optionnel) Niveau de la classe |
| `subject` | String | (Optionnel) Matière |
| `chapter` | String | (Optionnel) Chapitre |
| `subChapter` | String | (Optionnel) Sous-chapitre |
| `type` | String | (Optionnel) Type d'activité (revision, exercise, exam, course) |
| `forceGeneratePath` | Boolean | (Optionnel) Si `true`, génère réellement les modules et un parcours Interactive Book. |

**Sortie (JSON) :**
Note: Si `forceGeneratePath` est `true`, l'objet `parcours` est ajouté.
```json
{
  "title": "Titre du plan d'étude",
  "modules": [
    {
      "type": "h5p",
      "library": "H5P.MultiChoice 1.16",
      "title": "Titre du module",
      "prompt": "Prompt détaillé pour générer le contenu",
      "difficulty": "medium",
      "category": "exercise"
    }
  ],
  "contexte": {
    "subject": "...",
    "level": "...",
    "lang": "fr"
  },
  "parcours": {
    "id": "1767077949261",
    "url": "http://...",
    "type": "interactivebook",
    "modules": [
        { "type": "h5p", "id": "...", "title": "..." }
    ]
  }
}
```

---

## 7. Parcours d'Apprentissage (Viewer)

### `GET /parcours`
Génère une présentation Reveal.js regroupant plusieurs modules existants.

**Paramètres URL :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `modules` | String | Liste séparée par virgules (ex: `h5p:ID1,learningapps:ID2`) |
| `format` | String | (Optionnel) `revealjs` (défaut) ou `interactivebook` |
| `res` | String | (Optionnel) `html` (défaut) ou `json` pour obtenir une réponse structurée |

**Sortie JSON (si `res=json`) :**
```json
{
  "success": true,
  "id": "...", // Si format=interactivebook
  "url": "...", // URL vers le module généré
  "html": "...", // HTML RevealJS si format=revealjs
  "modules": [...] // Liste des modules validés
}
```

---

## 8. Données Brutes

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


