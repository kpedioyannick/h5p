import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Classement sur un axe" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.help (optionnel) : Texte d'aide
 *   - params.items (requis) : Tableau d'éléments à placer sur l'axe
 *     - text : Texte (si type='text')
 *     - hint : Indice
 *     - type : 'text' | 'image' | 'speech' | 'audio' | 'video'
 *     - image_url : URL de l'image (si type='image')
 *     - audio_url : URL de l'audio (si type='audio')
 *     - video_url : URL de la vidéo (si type='video')
 *     - position (requis) : Position numérique sur l'axe (ex: 1100, 1500, 1700)
 */
export default async function createTimelineAxis(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // Sélectionner "Classement sur un axe"
  await page.locator('div').filter({ hasText: 'Classement sur un axe' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir les éléments à placer sur l'axe
  const items = params.items as Array<{
    text?: string;
    hint?: string;
    type?: 'text' | 'image' | 'speech' | 'audio' | 'video';
    image_url?: string;
    audio_url?: string;
    video_url?: string;
    position: number | string; // Position sur l'axe
  }>;

  if (items && items.length > 0) {
    for (let iIndex = 0; iIndex < items.length; iIndex++) {
      const item = items[iIndex];
      const itemNum = iIndex + 1;

      // Si ce n'est pas le premier élément, ajouter un nouvel élément
      if (iIndex > 0) {
        await page.getByRole('button', { name: ' ajouter un élément' }).click();
        await page.waitForTimeout(500);
      }

      // Configurer le contenu de l'élément selon son type
      let itemText = item.text;
      let itemType = item.type || 'text';
      let itemImage = item.image_url;
      let itemAudio = item.audio_url;
      let itemVideo = item.video_url;
      let itemHint = item.hint;

      if (!itemText && (item as any).content) {
        if (typeof (item as any).content === 'string') {
          itemText = (item as any).content;
        } else if (typeof (item as any).content === 'object') {
          const contentObj = (item as any).content;
          itemText = contentObj.text;
          itemType = contentObj.type || itemType;
          itemImage = contentObj.image_url || itemImage;
          itemAudio = contentObj.audio_url || itemAudio;
          itemVideo = contentObj.video_url || itemVideo;
          itemHint = contentObj.hint || itemHint;
        }
      }

      await setContentElement(page, `v${itemNum}`, {
        type: itemType as any,
        text: itemText,
        hint: itemHint,
        image_url: itemImage,
        audio_url: itemAudio,
        video_url: itemVideo
      }, {
        useButtonText: true,
        buttonPrefix: `v${itemNum}_buttons`
      });

      // Remplir la position sur l'axe
      let position = item.position;
      if (position === undefined && (item as any).date) {
        // Fallback: use date as position if available
        // Try to extract year if it's a date string
        const dateStr = String((item as any).date);
        const yearMatch = dateStr.match(/-?\d+/);
        if (yearMatch) {
          position = yearMatch[0];
        } else {
          position = dateStr;
        }
      }

      if (position !== undefined) {
        await page.locator(`textarea[name="v${itemNum}_w"]`).fill(String(position));
      }
    }
  }

  // Remplir le texte d'aide si fourni
  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
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

