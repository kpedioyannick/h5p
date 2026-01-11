# Liste Officielle des Modules Disponibles (Génération AI)

Ce document liste tous les types de contenus que vous pouvez demander à l'IA de générer, classés par groupe.

## 1. Groupe H5P (Interactifs & Évaluations)
Ces modules sont intégrés nativement. L'IA peut générer leur contenu pédagogique complet.

| Module | Version | Description |
| :--- | :--- | :--- |
| **H5P.MultiChoice** | 1.16 | Questionnaire à choix multiples (QCM). |
| **H5P.TrueFalse** | 1.8 | Question Vrai ou Faux simple. |
| **H5P.Blanks** | 1.12 | Texte à trous (Fill in the blanks). |
| **H5P.DragText** | 1.10 | Glisser-déposer de mots dans un texte. |
| **H5P.MarkTheWords** | 1.11 | Cliquer sur les mots corrects dans un bloc de texte. |
| **H5P.Flashcards** | 1.5 | Cartes avec une question d'un côté et une réponse de l'autre. |
| **H5P.Dialogcards** | 1.9 | Cartes de dialogue pour apprendre des définitions ou du vocabulaire. |
| **H5P.QuestionSet** | 1.20 | Quiz complet regroupant plusieurs types de questions. |
| **H5P.SingleChoiceSet** | 1.11 | Suite de questions à réponse unique immédiate. |
| **H5P.Essay** | 1.2 | Rédaction libre avec auto-correction basée sur des mots-clés. |
| **H5P.Timeline** | 1.1 | Frise chronologique interactive avec dates et médias. |
| **H5P.SortParagraphs** | 0.11 | Remettre des paragraphes dans le bon ordre. |
| **H5P.Dictation** | 1.0 | Exercice de dictée (Note: nécessite souvent un audio). |
| **H5P.SpeakTheWordsSet**| 1.3 | Reconnaissance vocale (l'élève doit prononcer la réponse). |

---

## 2. Groupe LearningApps (Jeux Pédagogiques)
Ces modules sont générés via le micro-service LearningApps.

| Nom interne | Nom Public | Description |
| :--- | :--- | :--- |
| **Qcm** | QCM | Questionnaire à choix multiples ludique. |
| **Fillblanks** | Texte à trous | Remplissage de zones de texte. |
| **Grouping** | Regroupement | Classer des éléments dans les bonnes colonnes/groupes. |
| **Pairmatching** | Paires | Associer deux éléments correspondants (ex: mot et image). |
| **Ordering** | Classement | Mettre des éléments dans l'ordre croissant/décroissant. |
| **Hangman** | Pendu | Le célèbre jeu pour découvrir un mot lettre par lettre. |
| **HorseRace** | Course de chevaux | Quiz de rapidité sous forme de course. |
| **Millionaire** | Le Millionnaire | Quiz progressif type "Qui veut gagner des millions". |
| **WriteAnswerCards** | Cartes éclairs | Cartes où il faut taper la réponse au clavier. |
| **TextInputQuiz** | Quiz texte | Questionnaire nécessitant une saisie textuelle. |

---

## 3. Modules de Structure (Containers)
*   **Interactive Book** (`H5P.InteractiveBook 1.11`) : Permet de regrouper tous les modules ci-dessus dans un livre avec sommaire.
*   **Course / Reveal.js** : Génération de diapositives de cours magistral avec une mise en page moderne.
