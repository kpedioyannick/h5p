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

  await page.locator('div').filter({ hasText: 'Placement sur images' }).nth(5).click();
  
  // Gérer le clic sur 'i' si nécessaire (fermer une popup ou changer de vue)
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

  // TODO: Implémenter l'upload de l'image de fond et le placement des étiquettes
  // Ce module nécessite une interaction plus complexe avec l'interface de placement
  console.log('ImagePlacement module - Implementation à compléter avec upload d\'image et placement interactif');

  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

