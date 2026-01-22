import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement, setSuccessMessage } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Pendu" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.words (requis) : Tableau de mots à deviner
 *     - hint : Indice pour le mot (avec type: 'text' | 'image' | 'speech' | 'audio' | 'video')
 *       - text : Texte de l'indice
 *       - type : Type de contenu
 *       - image_url : URL de l'image (si type='image')
 *     - word : Mot à deviner
 */
export default async function createHangman(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  await page.locator('div').filter({ hasText: 'Pendu' }).nth(5).click();
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  await page.locator('#LearningApp_title').fill(params.title as string);

  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  const words = params.words as Array<{
    hint: { text?: string; type?: string; image_url?: string };
    word: string;
  }>;

  if (words && words.length > 0) {
    for (let wIndex = 0; wIndex < words.length; wIndex++) {
      const word = words[wIndex];
      const wordNum = wIndex + 1;

      if (wIndex > 0) {
        await page.getByRole('button', { name: ' ajouter un élément' }).click();
        await page.waitForTimeout(500);
      }

      // Remplir l'indice
      if (word.hint) {
        const hintType = word.hint.type || 'text';
        await setContentElement(page, `h${wordNum}`, {
          type: hintType as any,
          text: word.hint.text,
          image_url: word.hint.image_url
        }, {
          useButtonText: true,
          buttonPrefix: `h${wordNum}_buttons`
        });

        // Pour le type texte, utiliser mediacontent
        if (hintType === 'text' && word.hint.text) {
          await page.locator(`#h${wordNum}_mediacontent`).getByRole('textbox').fill(word.hint.text);
        }
      }

      // Remplir le mot à deviner
      if (word.word) {
        await page.locator(`textarea[name="b${wordNum}"]`).fill(word.word);
      }
    }
  }

  // Remplir le message de succès
  await setSuccessMessage(page, params.successMessage as string);

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

