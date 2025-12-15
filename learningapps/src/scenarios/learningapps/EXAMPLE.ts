// Exemple de scénario LearningApps enregistré avec Playwright Codegen
// 
// Pour enregistrer un nouveau scénario :
// 1. Lancer: npm run codegen:learningapps
// 2. Créer manuellement une activité sur https://learningapps.org/
// 3. Copier le code généré ici
// 4. Adapter le code pour accepter des paramètres (params.title, etc.)

import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer une activité QCM sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres du scénario (title, questions, etc.)
 */
export default async function createQCM(page: Page, params: ScenarioParams) {
  // Exemple de code généré par Playwright Codegen
  // À remplacer par le code réel enregistré
  
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);
  
  // 3. Sélectionner le type de module (QCM)
  await page.click('text=Quiz à choix multiples');
  
  // 4. Cliquer sur "Créer maintenant"
  await page.click('text=Créer maintenant');
  
  // 5. Remplir le titre (utiliser params.title)
  await page.fill('#LearningApp_title', params.title as string);
  
  // 6. Remplir les questions et réponses
  // ... (code généré par Playwright Codegen)
  
  // 7. Sauvegarder
  await page.click('button:has-text("Sauvegarder")');
  
  // 8. Attendre la redirection
  await page.waitForURL(/\/\d+$/);
}

