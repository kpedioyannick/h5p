import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Puzzle de classement" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.groups (requis) : Tableau de groupes
 *     - name : Nom du groupe
 *     - items : Tableau d'éléments dans ce groupe
 */
export default async function createSortingPuzzle(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Puzzle de classement' }).nth(5).click();
  
  // Gérer la popup si elle apparaît
  try {
    const popupFrame = page.locator('iframe').contentFrame();
    if (popupFrame) {
      const innerPopupFrame = popupFrame.locator('#frame').contentFrame();
      if (innerPopupFrame) {
        await innerPopupFrame.getByRole('button', { name: 'OK' }).click({ timeout: 3000 });
      }
    }
  } catch {
    // Popup non présente, continuer
  }

  // Gérer le clic sur 'i' si nécessaire
  try {
    await page.locator('i').nth(5).click({ timeout: 2000 });
  } catch {
    // Ignorer si l'élément n'existe pas
  }

  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // TODO: Implémenter la logique de création du puzzle de classement
  // Ce module nécessite une analyse plus approfondie de l'interface
  console.log('SortingPuzzle module - Implementation à compléter');

  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

