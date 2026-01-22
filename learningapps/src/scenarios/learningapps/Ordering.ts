import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement, setSuccessMessage } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Ordre simple" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.help (optionnel) : Texte d'aide
 *   - params.successMessage (optionnel) : Message de succès (défaut: "Bravo, tu as trouvé la bonne solution !")
 *   - params.hideNumbers (optionnel) : Masquer les chiffres (défaut: false)
 *   - params.items (requis) : Tableau d'éléments à ordonner
 *     - text : Texte (si type='text')
 *     - hint : Indice
 *     - type : 'text' | 'image' | 'speech' | 'audio' | 'video'
 *     - image_url : URL de l'image (si type='image')
 *     - audio_url : URL de l'audio (si type='audio')
 *     - video_url : URL de la vidéo (si type='video')
 */
export default async function createOrdering(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // Sélectionner "Ordre simple"
  await page.locator('div').filter({ hasText: 'Ordre simple' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir les éléments à ordonner
  const items = params.items as Array<{
    text?: string;
    hint?: string;
    type?: 'text' | 'image' | 'speech' | 'audio' | 'video';
    image_url?: string;
    audio_url?: string;
    video_url?: string;
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
      // Supporte item.text, item.content (string) ou item.content (object)
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

      await setContentElement(page, `c_${itemNum}`, {
        type: itemType as any,
        text: itemText,
        hint: itemHint,
        image_url: itemImage,
        audio_url: itemAudio,
        video_url: itemVideo
      }, {
        useButtonText: true,
        buttonPrefix: `c_${itemNum}_buttons`
      });
    }
  }

  // Remplir le message de succès
  await setSuccessMessage(page, params.successMessage as string);

  // Remplir le texte d'aide si fourni
  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
  }

  // Masquer les chiffres si demandé
  if (params.hideNumbers === true) {
    await page.getByRole('button', { name: 'Masquer les chiffres' }).click();
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

