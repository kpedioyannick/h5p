import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Placement sur images" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.image_url (requis) : URL de l'image de fond
 *   - params.placements (requis) : Tableau de placements
 *     - label : Étiquette à placer
 *     - x : Position X (en pourcentage ou pixels)
 *     - y : Position Y (en pourcentage ou pixels)
 */
export default async function createImagePlacement(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  // Navigation directe pour éviter les problèmes de UI
  const learningAppsUrl = process.env.LEARNINGAPPS_BASE_URL || 'https://learningapps.org';
  await page.goto(`${learningAppsUrl}/create?new=83`);

  // Wait for the "Create new App" template page IF we are redirected there, OR check if we are directly in editor?
  // Usually /create?new=83 opens the editor directly?
  // Let's check if we see the Title input.
  try {
    await page.locator('#LearningApp_title').waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    // If title not visible, maybe we are on the "Examples" page (Template page)
    // Then we need to click "Create new App"
    console.log('DEBUG: Title not found immediately, looking for Create App button...');
    await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();
  }

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // TODO: Implémenter l'upload de l'image de fond et le placement des étiquettes
  // Ce module nécessite une interaction plus complexe avec l'interface de placement
  console.log('ImagePlacement module - Implementation à compléter avec upload d\'image et placement interactif');

  // Note: La navigation et l'upload de base ont été explorés mais l'implémentation complète des placements reste à faire.

  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}
