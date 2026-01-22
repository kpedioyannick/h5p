# Assistant Learn - Node.js

API pour générer des activités LearningApps via scénarios Playwright automatisés.

## 📚 Vue d'ensemble

Ce projet permet de créer automatiquement des activités LearningApps en utilisant des scénarios Playwright enregistrés. Chaque type d'activité (QCM, Texte à trous, etc.) est défini comme un scénario TypeScript qui automatise la création sur le site LearningApps.

## 🚀 Démarrage rapide

### Installation

```bash
npm install
```

### Configuration

Créez un fichier `.env` à partir de `env.example` :

```bash
cp env.example .env
```

Ajoutez les variables suivantes si nécessaire :

```bash
# Base URLs pour les iframes
LEARNINGAPPS_BASE_URL=https://learningapps.org
H5P_BASE_URL=http://localhost:8080
```

### Lancer le serveur

```bash
# Mode développement (avec rechargement automatique)
npm run dev

# Mode production
npm run build
npm start
```

Le serveur démarre sur `http://localhost:3000` par défaut.

## 📖 Documentation API

### Endpoints disponibles

#### 1. Lister les modules LearningApps disponibles

**GET** `/api/modules/learningapps`

Retourne la liste de tous les modules LearningApps disponibles (scénarios enregistrés).

**Réponse :**
```json
{
  "platform": "learningapps",
  "count": 16,
  "modules": [
    {
      "name": "Fillblanks",
      "label": "Fillblanks",
      "description": "Scénario enregistré pour Fillblanks"
    },
    {
      "name": "Qcm",
      "label": "Qcm",
      "description": "Scénario enregistré pour Qcm"
    }
  ]
}
```

#### 2. Créer une activité LearningApps

**POST** `/api/content/learningapps`

Crée une nouvelle activité LearningApps en exécutant le scénario correspondant.

**Corps de la requête :**
```json
{
  "module": "Fillblanks",
  "title": "Mon activité",
  "params": {
    // Paramètres spécifiques au module
  }
}
```

**Paramètres :**
- `module` (string, requis) : Nom du module (nom du fichier scénario sans extension, ex: `Fillblanks`, `Qcm`)
- `title` (string, requis) : Titre de l'activité
- `params` (object, optionnel) : Paramètres spécifiques au module selon le scénario

**Réponse en cas de succès :**
```json
{
  "success": true,
  "moduleType": "learningapps",
  "module": "Fillblanks",
  "title": "Mon activité",
  "iframeUrl": "https://learningapps.org/watch?v=123456",
  "embedCode": "<iframe src=\"https://learningapps.org/watch?v=123456\" width=\"100%\" height=\"600\" frameborder=\"0\" allowfullscreen></iframe>",
  "iframeUrl": "https://learningapps.org/display?v=123456",
  "embedCode": "<iframe src=\"https://learningapps.org/display?v=123456\" width=\"100%\" height=\"600\" frameborder=\"0\" allowfullscreen></iframe>",
  "appId": "123456"
}
```

#### Formats des URLs générées

- **LearningApps** : `https://learningapps.org/display?v=[ID]`
- **H5P** : `http://localhost:8080/view/[slug-librairie]/[ID]` (ex: `.../view/h5p-blanks/123456`)

**Réponse en cas d'erreur :**
```json
{
  "success": false,
  "error": "Content creation failed",
  "details": "Module 'Fillblanks' not found. Available modules: Qcm, Fillblanks, ..."
}
```

### Exemples d'utilisation

#### Exemple 1 : Créer un Texte à trous (Fillblanks)

```bash
curl -X POST http://localhost:3000/api/content/learningapps \
  -H "Content-Type: application/json" \
  -d '{
    "module": "Fillblanks",
    "title": "Grammaire française",
    "params": {
      "task": "Complétez les phrases",
      "clozetext": "Le chat -1- sur le -2-.",
      "clozes": [
        {
          "answer": "dort"
        },
        {
          "answer": "tapis"
        }
      ]
    }
  }'
```

#### Exemple 2 : Créer un QCM

```bash
curl -X POST http://localhost:3000/api/content/learningapps \
  -H "Content-Type: application/json" \
  -d '{
    "module": "Qcm",
    "title": "Quiz de géographie",
    "params": {
      "questions": [
        {
          "question": "Quelle est la capitale de la France ?",
          "answers": ["Paris", "Londres", "Berlin"],
          "correct": 0
        }
      ]
    }
  }'
```

## 🔄 Ré-enregistrer un module existant

Si un module ne fonctionne pas correctement, vous pouvez le ré-enregistrer avec Playwright Codegen.

### Méthode rapide

```bash
# Lancer Playwright Codegen
npm run codegen:learningapps

# Ou utiliser le script interactif
node record_all_modules.js
```

### Étapes détaillées

1. **Lancer Playwright Codegen** : `npm run codegen:learningapps`
2. **Se connecter** à LearningApps dans le navigateur ouvert
3. **Créer l'activité manuellement** pour le module concerné
4. **Copier le code** généré depuis Playwright Inspector
5. **Sauvegarder** dans `src/scenarios/learningapps/[NomModule].ts`
6. **Adapter le code** pour utiliser les paramètres (voir section ci-dessous)
7. **Tester** avec l'API

📚 **Voir** : `RECORDING_GUIDE.md` pour un guide complet et `RECORDING_CHECKLIST.md` pour suivre la progression.

## 🛠️ Créer un nouveau module LearningApps

### Workflow de création

Pour ajouter un nouveau type d'activité LearningApps, suivez ces étapes :

#### 1. Enregistrer un scénario avec Playwright Codegen

```bash
npm run codegen:learningapps
```

Cette commande ouvre Playwright Codegen qui enregistre vos actions sur le site LearningApps.

#### 2. Créer manuellement une activité sur LearningApps

1. Allez sur https://learningapps.org/
2. Connectez-vous (si nécessaire)
3. Créez manuellement une activité du type souhaité
4. Pendant la création, Playwright Codegen enregistre toutes vos actions

#### 3. Sauvegarder le scénario

Copiez le code généré par Playwright Codegen et créez un nouveau fichier dans `src/scenarios/learningapps/[NomDuModule].ts`.

#### 4. Adapter le code pour accepter des paramètres

Transformez le code enregistré pour qu'il accepte des paramètres dynamiques via l'objet `params`.

### Structure d'un scénario

Voici la structure de base d'un scénario :

```typescript
import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer une activité [Nom du module] sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres du scénario
 *   - params.title (requis) : Titre de l'activité
 *   - params.[autres] : Autres paramètres spécifiques au module
 */
export default async function create[NomDuModule](page: Page, params: ScenarioParams) {
  // 1. Initialiser la session LearningApps
  await initLearningAppsSession(page);
  
  // 2. Sélectionner le type de module
  await page.click('text=[Nom du type]');
  
  // 3. Cliquer sur "Créer maintenant" ou "Créer une nouvelle appli"
  await page.click('text=Créer maintenant');
  
  // 4. Remplir le titre (utiliser params.title)
  await page.fill('#LearningApp_title', params.title as string);
  
  // 5. Remplir les autres champs avec les paramètres
  // ... (code adapté depuis Playwright Codegen)
  
  // 6. Sauvegarder
  await page.click('button:has-text("Sauvegarder")');
  
  // 7. Attendre la redirection vers la page de l'activité créée
  await page.waitForURL(/\/\d+$/);
}
```

### Exemple complet : Scénario Fillblanks

```typescript
import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

export default async function createFillblanks(page: Page, params: ScenarioParams) {
  // Initialiser la session
  await initLearningAppsSession(page);

  // Sélectionner "Texte à trous"
  await page.locator('div').filter({ hasText: 'Texte à trous' }).nth(5).click();

  // Créer une nouvelle appli
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir le texte avec trous (utiliser -1-, -2-, etc. pour les trous)
  if (params.clozetext) {
    await page.locator('#LearningApp_clozetext').fill(params.clozetext as string);
  }

  // Remplir les réponses pour chaque trou
  if (params.clozes && Array.isArray(params.clozes)) {
    for (let i = 0; i < params.clozes.length; i++) {
      const cloze = params.clozes[i] as { answer: string };
      await page.locator(`#LearningApp_clozes_${i}_answer`).fill(cloze.answer);
    }
  }

  // Sauvegarder
  await page.click('button:has-text("Sauvegarder")');
  
  // Attendre la redirection
  await page.waitForURL(/\/\d+$/);
}
```

### Helpers disponibles

Le projet fournit des helpers pour simplifier les scénarios :

#### `initLearningAppsSession(page: Page)`

Initialise une session LearningApps :
- Navigue vers https://learningapps.org/
- Se connecte (si nécessaire)
- Va sur la page de création d'activité

#### `setContentElement(page: Page, fieldName: string, content: {...})`

Configure un élément de contenu (texte, image, audio, vidéo) dans un formulaire LearningApps.

**Exemple :**
```typescript
await setContentElement(page, 'titel', {
  type: 'text',
  text: 'Mon titre',
  hint: 'Indice optionnel'
});
```

## 📁 Structure du projet

```
assistant-learn-node/
├── src/
│   ├── scenarios/
│   │   └── learningapps/      # Scénarios Playwright pour chaque type d'activité
│   │       ├── EXAMPLE.ts     # Exemple de scénario
│   │       ├── Fillblanks.ts  # Scénario pour "Texte à trous"
│   │       ├── Qcm.ts         # Scénario pour QCM
│   │       └── ...
│   ├── services/
│   │   ├── learningapps/
│   │   │   └── helpers.ts     # Helpers pour LearningApps
│   │   ├── ScenarioLoader.ts  # Charge les scénarios depuis les fichiers
│   │   └── ScenarioExecutor.ts # Exécute les scénarios Playwright
│   ├── routes/
│   │   ├── content.ts         # Routes pour créer du contenu
│   │   └── modules.ts          # Routes pour lister les modules
│   └── index.ts                # Point d'entrée du serveur
├── package.json
└── README.md
```

## 🔧 Scripts npm

- `npm run dev` : Lance le serveur en mode développement avec rechargement automatique
- `npm run build` : Compile TypeScript en JavaScript
- `npm run start` : Lance le serveur en mode production
- `npm run codegen:learningapps` : Ouvre Playwright Codegen pour enregistrer un nouveau scénario
- `npm test` : Lance les tests

## 📝 Notes importantes

1. **Nommage des fichiers** : Le nom du fichier scénario (sans extension) doit correspondre au nom du module utilisé dans l'API (ex: `Fillblanks.ts` → `module: "Fillblanks"`)

2. **Export par défaut** : Chaque scénario doit exporter une fonction par défaut avec la signature :
   ```typescript
   (page: Page, params: ScenarioParams) => Promise<void>
   ```

3. **Attente de redirection** : À la fin du scénario, attendez toujours la redirection vers la page de l'activité créée :
   ```typescript
   await page.waitForURL(/\/\d+$/);
   ```

4. **Mode navigateur** : Le navigateur s'exécute en mode `headed` (visible) pour faciliter le débogage. Vous pouvez le modifier dans `ScenarioExecutor.ts`.

5. **Gestion des erreurs** : Les erreurs sont automatiquement capturées et retournées dans la réponse API.

## 🎯 Modules disponibles

Les modules suivants sont actuellement disponibles :

- **Fillblanks** : Texte à trous
- **Qcm** : Quiz à choix multiples
- **FillTable** : Tableau à compléter
- **Grouping** : Groupement
- **Hangman** : Pendu
- **HorseRace** : Course de chevaux
- **ImagePlacement** : Placement d'images
- **Millionaire** : Qui veut gagner des millions
- **Ordering** : Ordre
- **Pairmatching** : Appariement
- **SortingPuzzle** : Puzzle de tri
- **TextInputQuiz** : Quiz avec saisie de texte
- **TimelineAxis** : Axe chronologique
- **VideoInsertions** : Insertions vidéo
- **WriteAnswerCards** : Cartes de réponse

## 🤝 Contribution

Pour ajouter un nouveau module :

1. Suivez le workflow de création décrit ci-dessus
2. Testez votre scénario avec l'API
3. Documentez les paramètres attendus dans un commentaire en haut du fichier
4. Ajoutez un exemple d'utilisation dans ce README si nécessaire

## 📄 Licence

ISC
