# H5P & LearningApps Generator API

Ce projet expose une API simple pour générer des exercices interactifs H5P et LearningApps via l'IA.

## Base URL
`POST http://localhost:3000/api/generate`

---

## 1. Génération H5P

**Endpoint** : `/h5p`

**Body (JSON)**:
```json
{
  "type": "qcm",        // Type d'activité (voir liste ci-dessous)
  "prompt": "Capitales de l'Europe", // Sujet
  "count": 3            // Nombre d'activités à générer (optionnel, défaut: 1)
}
```

**Réponse (JSON)**:
```json
[
  {
    "lien": "https://h5p.sara.education/view/h5p-multi-choice/1769...",
    "id": "1769...",
    "titre": "Capitales de l'Europe"
  }
]
```

### Types H5P Supportés (Valeurs pour "type")

| Type Court (EN) | Librairie H5P Correspondante |
|-----------------|------------------------------|
| `multichoice` | H5P.MultiChoice |
| `truefalse` | H5P.TrueFalse |
| `blanks`, `fillblanks` | H5P.Blanks |
| `accordion` | H5P.Accordion |
| `essay` | H5P.Essay |
| `markthewords` | H5P.MarkTheWords |
| `dragtext` | H5P.DragText |
| `dialogcards` | H5P.Dialogcards |
| `summary` | H5P.Summary |
| `timeline` | H5P.Timeline |
| `guesstheanswer` | H5P.GuessTheAnswer |
| `questionset` | H5P.QuestionSet |
| `sortparagraphs` | H5P.SortParagraphs |
| `singlechoiceset` | H5P.SingleChoiceSet |
| `speakthewordsset` | H5P.SpeakTheWordsSet |
| `flashcards` | H5P.Flashcards |
| `questionnaire` | H5P.Questionnaire |

---

## 2. Génération LearningApps

**Endpoint** : `/learningapps`

**Body (JSON)**:
```json
{
  "type": "qcm",        // Type d'activité (voir liste ci-dessous)
  "prompt": "Mathématiques de base", // Sujet
  "count": 1            // Nombre d'activités (optionnel)
}
```

**Réponse (JSON)**:
```json
[
  {
    "lien": "https://learningapps.org/watch?v=...",
    "id": "...",
    "titre": "Mathématiques de base"
  }
]
```

### Types LearningApps Supportés (Valeurs pour "type")

| Code Type | Description |
|-----------|-------------|
| `qcm` | QCM / Quiz classique | ok 
| `fillblanks` | Texte à trous | ok 
| `pairmatching` | Jeu de paires | ko 
| `grouping` | Regroupement / Catégorisation | ok
| `ordering` | Classement / Ordre | ok
| `millionaire` | Qui veut gagner des millions | ok 
| `horserace` | Course de chevaux |
| `hangman` | Jeu du pendu |
| `writeanswercards` | Cartes de réponse |
| `filltable` | Tableau à compléter |
| `grillecorrespondance` | Grille de correspondance |
| `imageplacement` | Placement sur image |
| `sortingpuzzle` | Puzzle de tri |
| `textinputquiz` | Quiz avec saisie |
| `timelineaxis` | Axe chronologique |