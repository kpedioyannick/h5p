import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

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
      const defaultType = params.speech ? 'speech' : 'text';
      let cardContent = card.content;
      if (!cardContent && card.question) {
        cardContent = { text: card.question, type: defaultType, hint: card.hint || card.question_hint };
      } else if (!cardContent) {
        cardContent = { type: defaultType, hint: card.hint || card.question_hint };
      } else if (cardContent && !cardContent.hint) {
        // Fallback for hint if not in nested content
        cardContent.hint = card.hint || card.question_hint;
      }

      await setContentElement(page, `content${cardNum}`, {
        type: (cardContent.type || defaultType) as any,
        text: cardContent.text,
        hint: cardContent.hint,
        image_url: cardContent.image_url,
        audio_url: cardContent.audio_url,
        video_url: cardContent.video_url
      }, {
        useButtonText: true,
        buttonPrefix: `content${cardNum}_buttons`
      });

      // Remplir la solution (réponse attendue)
      const solution = card.solution || card.answer;
      if (solution) {
        await page.locator(`#solution${cardNum}`).fill(solution);
      }
    }
  }

  // Gérer la casse
  if (params.case_sensitive === true) {
    await page.locator('#casesense_btn').click();
  }

  // Afficher l'aide
  if (params.showHelp === true) {
    await page.locator('#useHelp_btn').click();
  }

  // Remplir le feedback si fourni
  if (params.feedback) {
    await page.locator('#feedback').fill(params.feedback as string);
  }

  // Remplir l'indice (help) si fourni
  if (params.help || params.indice) {
    const helpText = (params.help || params.indice) as string;
    await page.locator('#LearningApp_help').fill(helpText);
  }

  // Afficher un aperçu
  await page.getByRole('button', { name: '  Afficher un aperçu' }).click();
  
  try {
    const previewFrame = page.locator('iframe').contentFrame();
    if (previewFrame) {
      const innerFrame = previewFrame.locator('#frame').contentFrame();
      if (innerFrame) {
        await innerFrame.getByRole('button', { name: 'OK' }).click({ timeout: 5000 });
      }
    }
  } catch (err) {
    console.warn('[WriteAnswerCards] Preview OK button not found or timed out, proceeding.');
  }

  // Sauvegarder
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Attendre la redirection vers la page de l'app créée
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

