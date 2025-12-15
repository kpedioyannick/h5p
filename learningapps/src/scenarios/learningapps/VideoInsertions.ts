import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setVideoFromUrl } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Vidéo avec insertions" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.help (optionnel) : Texte d'aide
 *   - params.video_url (requis) : URL de la vidéo
 *   - params.insertions (requis) : Tableau d'insertions
 *     - time : Temps en secondes où insérer l'activité
 *     - text : Texte à afficher
 *     - appTitle : Titre de l'appli LearningApps à insérer (optionnel)
 */
export default async function createVideoInsertions(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Vidéo avec insertions' }).nth(5).click();
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Configurer la vidéo
  if (params.video_url) {
    await page.locator('#videourl_btn2').click();
    await setVideoFromUrl(page, params.video_url as string);
  }

  const insertions = params.insertions as Array<{
    time: number;
    text: string;
    appTitle?: string;
  }>;

  if (insertions && insertions.length > 0) {
    for (let iIndex = 0; iIndex < insertions.length; iIndex++) {
      const insertion = insertions[iIndex];
      const insertionNum = iIndex + 1;

      if (iIndex > 0) {
        await page.getByRole('button', { name: ' ajouter un élément' }).click();
        await page.waitForTimeout(500);
      }

      // Remplir le temps
      if (insertion.time !== undefined) {
        await page.locator(`#time${insertionNum}`).fill(String(insertion.time));
      }

      // Remplir le texte
      if (insertion.text) {
        await page.locator(`#text${insertionNum}`).fill(insertion.text);
      }

      // Sélectionner l'appli si fournie
      if (insertion.appTitle) {
        await page.locator(`#app${insertionNum}_selectbtn`).click();
        await page.waitForTimeout(500);
        const appFrame = page.locator('#AppSelectionFrameI').contentFrame();
        if (appFrame) {
          await appFrame.getByTitle(insertion.appTitle).locator('img').click();
        }
      }
    }
  }

  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
  }

  // 11. Afficher un aperçu (optionnel)
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  const previewFrame = page.locator('iframe').contentFrame();
  if (previewFrame) {
    const innerFrame = previewFrame.locator('#frame').contentFrame();
    if (innerFrame) {
      await innerFrame.getByRole('button', { name: 'OK' }).click();
    }
  }

  // 12. Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // 13. Attendre la redirection vers la page de l'app créée
  // L'URL peut être soit /display?v=... soit /{id}
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

