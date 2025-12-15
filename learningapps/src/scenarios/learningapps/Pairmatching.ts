import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Classer par paire" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.pairs (requis) : Tableau de paires
 *     - v1 : Premier élément de la paire
 *       - text : Texte (si type='text')
 *       - hint : Indice
 *       - type : 'text' | 'image' | 'speech' | 'audio' | 'video'
 *       - image_url : URL de l'image (si type='image')
 *     - v2 : Deuxième élément de la paire (même structure que v1)
 */
export default async function createPairmatching(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // Sélectionner "Classer par paire"
  await page.locator('div').filter({ hasText: 'Classer par paire' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir les paires
  const pairs = params.pairs as Array<{
    v1: { text?: string; hint?: string; type?: string; image_url?: string; audio_url?: string; video_url?: string };
    v2: { text?: string; hint?: string; type?: string; image_url?: string; audio_url?: string; video_url?: string };
  }>;

  if (pairs && pairs.length > 0) {
    for (let pIndex = 0; pIndex < pairs.length; pIndex++) {
      const pair = pairs[pIndex];
      const pairNum = pIndex + 1;

      // Si ce n'est pas la première paire, ajouter une nouvelle paire
      if (pIndex > 0) {
        await page.locator('#addNewListElementBtn_pairs').click();
        await page.waitForTimeout(500);
      }

      // Helper to process content
      const processContent = (item: any) => {
        if (!item) return undefined;
        let content = item;
        if ((item as any).content) {
          if (typeof (item as any).content === 'string') {
            content = { ...item, text: (item as any).content };
          } else {
            content = { ...item, ...(item as any).content };
          }
        }
        return content;
      };

      // Remplir v1 (premier élément)
      if (pair.v1) {
        const v1Content = processContent(pair.v1);
        await setContentElement(page, `v1_${pairNum}`, {
          type: (v1Content.type || 'text') as any,
          text: v1Content.text,
          hint: v1Content.hint,
          image_url: v1Content.image_url,
          audio_url: v1Content.audio_url,
          video_url: v1Content.video_url
        }, {
          useButtonText: true,
          buttonPrefix: `v1_${pairNum}_buttons`
        });
      }

      // Remplir v2 (deuxième élément)
      if (pair.v2) {
        const v2Content = processContent(pair.v2);
        await setContentElement(page, `v2_${pairNum}`, {
          type: (v2Content.type || 'text') as any,
          text: v2Content.text,
          hint: v2Content.hint,
          image_url: v2Content.image_url,
          audio_url: v2Content.audio_url,
          video_url: v2Content.video_url
        }, {
          useButtonText: true,
          buttonPrefix: `v2_${pairNum}_buttons`
        });
      }
    }
  }

  // Afficher un aperçu
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  const previewFrame = page.locator('iframe').contentFrame();
  if (previewFrame) {
    const innerFrame = previewFrame.locator('#frame').contentFrame();
    if (innerFrame) {
      await innerFrame.getByRole('button', { name: 'OK' }).click();
    }
  }

  // Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Attendre la redirection vers la page de l'app créée
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

