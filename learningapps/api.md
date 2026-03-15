# Documentation de l'API LearningApps

Cette API permet de générer des activités pédagogiques interactives pour LearningApps via des scénarios Playwright automatisés.

## 📦 Points d'entrée (Endpoints)

### Liste des modules disponibles
**GET** `/api/modules/learningapps`

Retourne la liste des scénarios disponibles.

**Réponse :**
```json
{
  "platform": "learningapps",
  "count": 18,
  "modules": [
    { "name": "Qcm", "label": "Qcm" },
    { "name": "Ordering", "label": "Ordering" },
    { "name": "Pairmatching", "label": "Pairmatching" },
    ...
  ]
}
```

### Créer une activité
**POST** `/api/content/learningapps`

**Corps de la requête :**
```json
{
  "module": "string",
  "title": "string",
  "params": {
    "feedback": "string (Bravo !)",
    "indice": "string (Aide contextuelle)",
    ... "paramètres spécifiques (voir ci-dessous)"
  }
}
```

---

## 🛠️ Structures des paramètres par module

### 1. QCM (Qcm)
Quiz à choix multiples.
```json
{
  "module": "Qcm",
  "title": "Quiz Fruits",
  "params": {
    "questions": [
      {
        "question_text": "Lequel est un fruit ?",
        "answers": [
          { "answer_text": "Pomme", "is_correct": true },
          { "answer_text": "Carotte", "is_correct": false }
        ]
      }
    ]
  }
}
```

### 2. Ordre simple (Ordering)
Classer des éléments dans le bon ordre.
```json
{
  "module": "Ordering",
  "title": "Nombres",
  "params": {
    "items": [
      { "text": "Un" },
      { "text": "Deux" },
      { "text": "Trois" }
    ]
  }
}
```

### 3. Classer par paire (Pairmatching)
Associer deux éléments.
```json
{
  "module": "Pairmatching",
  "title": "Capitales",
  "params": {
    "pairs": [
      { "v1": { "text": "France" }, "v2": { "text": "Paris" } },
      { "v1": { "text": "Italie" }, "v2": { "text": "Rome" } }
    ]
  }
}
```

### 4. Regroupement (Grouping)
Placer des éléments dans des catégories.
```json
{
  "module": "Grouping",
  "title": "Tri",
  "params": {
    "clusters": [
      {
        "name": "Fruits",
        "items": ["Pomme", "Banane"]
      },
      {
        "name": "Légumes",
        "items": ["Poireau", "Chou"]
      }
    ]
  }
}
```

### 5. Cartes avec réponses à écrire (WriteAnswerCards)
Une carte s'affiche, l'utilisateur écrit la réponse.
```json
{
  "module": "WriteAnswerCards",
  "title": "Vocabulaire",
  "params": {
    "cards": [
      { "question": "The Red fruit", "solution": "Apple" },
      { "question": "The Yellow fruit", "solution": "Banana" }
    ]
  }
}
```

### 6. Course de chevaux (HorseRace)
Quiz compétitif à deux réponses.
```json
{
  "module": "HorseRace",
  "title": "Calcul",
  "params": {
    "questions": [
      {
        "question": "2 + 2 ?",
        "answers": [
          { "content": { "text": "4" }, "is_correct": true },
          { "content": { "text": "5" }, "is_correct": false }
        ]
      }
    ]
  }
}
```

### 7. Grille de correspondance (MatchingGrid)
Tableau où il faut associer tous les éléments d'une ligne.
```json
{
  "module": "MatchingGrid",
  "title": "Conjugaison",
  "params": {
    "rows": [
      ["Sujet", "Être", "Avoir"],
      ["Je", "suis", "ai"]
    ],
    "fixedRow1": true,
    "fixedColumns": [1]
  }
}
```

### 8. Compléter un tableau (FillTable)
Tableau avec des trous à remplir.
```json
{
  "module": "FillTable",
  "title": "Verbes",
  "params": {
    "rows": [
      { "cells": ["Infinitif", "Présent"] },
      { "cells": ["Manger", "Mange"] }
    ],
    "fixedRow1": true
  }
}
```

### 9. Quiz avec saisie de texte (TextInputQuiz)
Questions classiques avec champ de texte.
```json
{
  "module": "TextInputQuiz",
  "title": "Histoire",
  "params": {
    "questions": [
      { "question": { "text": "Qui a découvert l'Amérique ?" }, "answer": "Christophe Colomb" }
    ]
  }
}
```
