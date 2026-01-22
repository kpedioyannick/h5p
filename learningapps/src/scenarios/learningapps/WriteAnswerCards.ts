import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement, setSuccessMessage } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Cartes avec réponses à écrire" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.help (optionnel) : Texte d'aide
 *   - params.cards (requis) : Tableau de cartes
 *     - content : Contenu de la carte (question/indice)
 *       - text : Texte (si type='text')
 *       - hint : Indice
 *       - type : 'text' | 'image' | 'speech' | 'audio' | 'video'
 *       - image_url : URL de l'image (si type='image')
 *       - audio_url : URL de l'audio (si type='audio')
 *       - video_url : URL de la vidéo (si type='video')
 *     - solution (requis) : Réponse attendue (texte à écrire)
 */
export default async function createWriteAnswerCards(page: Page, params: ScenarioParams) {
  // Initialiser la session LearningApps (navigation, connexion, page de création)
  await initLearningAppsSession(page);

  // Sélectionner "Cartes avec réponses à écrire"
  await page.locator('div').filter({ hasText: 'Cartes avec réponses à écrire' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche si fournie
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir les cartes
  const cards = params.cards as Array<{
    content?: {
      text?: string;
      hint?: string;
      type?: 'text' | 'image' | 'speech' | 'audio' | 'video';
      image_url?: string;
      audio_url?: string;
      video_url?: string;
    };
    question?: string; // Alias pour content.text
    solution?: string; // Réponse attendue
    answer?: string; // Alias pour solution
  }>;

  if (cards && cards.length > 0) {
    for (let cIndex = 0; cIndex < cards.length; cIndex++) {
      const card = cards[cIndex];
      const cardNum = cIndex + 1;

      // Si ce n'est pas la première carte, ajouter une nouvelle carte
      if (cIndex > 0) {
        await page.getByRole('button', { name: ' ajouter un élément' }).click();
        await page.waitForTimeout(500);
      }

      // Configurer le contenu de la carte selon son type
      let cardContent = card.content;
      if (!cardContent && card.question) {
        cardContent = { text: card.question, type: 'text' };
      } else if (cardContent && (cardContent as any).content) {
        // Handle nested content object if present
        if (typeof (cardContent as any).content === 'string') {
          cardContent = { ...cardContent, text: (cardContent as any).content };
        } else {
          cardContent = { ...cardContent, ...(cardContent as any).content };
        }
      }

      if (cardContent) {
        // Note: Pour ce module, les boutons utilisent btn3 (texte), btn1 (image), btn2 (vidéo)
        // Mais on peut utiliser setContentElement qui gère automatiquement les mappings
        const contentType = (cardContent as any).type || 'text';

        // Mapping spécifique pour ce module (btn2 pour vidéo au lieu de btn6)
        const typeButtons: Record<string, string> = {
          'text': 'btn3',
          'image': 'btn1',
          'speech': 'btn5',
          'audio': 'btn4',
          'video': 'btn2' // Ce module utilise btn2 pour la vidéo
        };

        const btn = typeButtons[contentType] || 'btn3';
        await page.locator(`#content${cardNum}_${btn}`).click();
        await page.waitForTimeout(300);

        // Remplir le contenu selon le type
        if (contentType === 'text') {
          if ((cardContent as any).text) {
            await page.locator(`#content${cardNum}_text`).fill((cardContent as any).text);
          }
          if ((cardContent as any).hint) {
            await page.locator(`#content${cardNum}_text_hint`).fill((cardContent as any).hint);
          }
        } else if (contentType === 'speech') {
          if ((cardContent as any).text) {
            await page.locator(`#content${cardNum}_speech`).fill((cardContent as any).text);
          }
          if ((cardContent as any).hint) {
            await page.locator(`#content${cardNum}_speech_hint`).fill((cardContent as any).hint);
          }
        } else if (contentType === 'image' && (cardContent as any).image_url) {
          const imageFrame = page.locator('#ImageSelectionFrameI').contentFrame();
          if (imageFrame) {
            await imageFrame.getByRole('textbox', { name: 'URL' }).fill((cardContent as any).image_url);
            await imageFrame.getByRole('link', { name: 'Utiliser un Image' }).click();
            await page.waitForTimeout(500);
          }
        } else if (contentType === 'video' && (cardContent as any).video_url) {
          const videoFrame = page.locator('#VideoSelectionFrameI').contentFrame();
          if (videoFrame) {
            await videoFrame.getByRole('textbox', { name: 'URL' }).fill((cardContent as any).video_url);
            await videoFrame.getByRole('link', { name: /Utiliser un Vidéo|Utiliser|OK|Valider/i }).click();
            await page.waitForTimeout(500);
          }
        } else if (contentType === 'audio' && (cardContent as any).audio_url) {
          // TODO: Gérer l'audio si nécessaire
          console.log(`Audio URL fournie pour carte ${cardNum}: ${(cardContent as any).audio_url} - Upload à implémenter`);
        }
      }

      // Remplir la solution (réponse attendue)
      const solution = card.solution || card.answer;
      if (solution) {
        await page.locator(`#solution${cardNum}`).fill(solution);
      }
    }
  }

  // Remplir le texte d'aide si fourni
  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
  }

  if (params.help) {
    await page.locator('#LearningApp_help').fill(params.help as string);
  }

  // Remplir le message de succès
  await setSuccessMessage(page, params.successMessage as string);

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

