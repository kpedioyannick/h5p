// Fonctions helper communes pour les scénarios LearningApps

import { Page } from 'playwright';
const LEARNINGAPPS_BASE_URL = process.env.LEARNINGAPPS_BASE_URL || 'https://learningapps.org/';

/**
 * Navigue vers la page d'accueil de LearningApps.
 *
 * @param page - Page Playwright
 */
export async function loginToLearningApps(page: Page): Promise<void> {
  // Aller sur la page d'accueil
  await page.goto(LEARNINGAPPS_BASE_URL);
}

/**
 * Initialise la session LearningApps : navigation, connexion, et ouverture de la page de création
 *
 * @param page - Page Playwright
 */
export async function initLearningAppsSession(page: Page): Promise<void> {
  // 1. Aller sur LearningApps
  await page.goto(LEARNINGAPPS_BASE_URL);

  // 2. Se connecter avec les identifiants du .env
  const email = process.env.LEARNINGAPPS_EMAIL;
  const password = process.env.LEARNINGAPPS_PASSWORD;

  if (email && password) {
    await page.getByRole('link', { name: ' Se connecter' }).click();

    const loginFrame = page.locator('#LoginFrameI').contentFrame();
    if (loginFrame) {
      await loginFrame.getByRole('textbox', { name: 'e-mail' }).fill(email);
      await loginFrame.getByRole('textbox', { name: 'Mot de passe' }).fill(password);
      await loginFrame.getByRole('checkbox', { name: 'Se souvenir de moi (sur cet' }).check();
      await loginFrame.getByRole('button', { name: 'Connexion' }).click();

      // Gérer la popup "Ne plus montrer cette boite" si elle apparaît
      try {
        await loginFrame.getByRole('link', { name: 'Ne plus montrer cette boite' }).click({ timeout: 3000 });
      } catch {
        // Popup non présente, continuer
      }
    }
  }

  // 3. Cliquer sur "Créer une appli"
  await page.getByRole('link', { name: ' Créer une appli' }).click();
}

/**
 * Configure un élément de type image via URL
 * 
 * @param page - Page Playwright
 * @param imageUrl - URL de l'image
 */
export async function setImageFromUrl(page: Page, imageUrl: string): Promise<void> {
  const imageFrame = page.locator('#ImageSelectionFrameI').contentFrame();
  if (imageFrame) {
    await imageFrame.getByRole('textbox', { name: 'URL' }).fill(imageUrl);
    await imageFrame.getByRole('link', { name: 'Utiliser un Image' }).click();
    await page.waitForTimeout(500); // Attendre que l'image soit chargée
  }
}

/**
 * Configure un élément de type audio via URL
 * 
 * @param page - Page Playwright
 * @param audioUrl - URL de l'audio
 */
export async function setAudioFromUrl(page: Page, audioUrl: string): Promise<void> {
  // LearningApps utilise probablement un iframe similaire pour l'audio
  // Si l'iframe a un ID différent, il faudra l'adapter
  const audioFrame = page.locator('#AudioSelectionFrameI, #MediaSelectionFrameI').contentFrame();
  if (audioFrame) {
    try {
      await audioFrame.getByRole('textbox', { name: 'URL' }).fill(audioUrl);
      await audioFrame.getByRole('link', { name: /Utiliser|OK|Valider/i }).click();
      await page.waitForTimeout(500);
    } catch {
      // Si l'iframe audio n'existe pas, essayer avec un sélecteur générique
      console.warn('Audio iframe not found, trying alternative method');
      // TODO: Implémenter une méthode alternative si nécessaire
    }
  }
}

/**
 * Configure un élément de type vidéo via URL
 * 
 * @param page - Page Playwright
 * @param videoUrl - URL de la vidéo
 */
export async function setVideoFromUrl(page: Page, videoUrl: string): Promise<void> {
  // LearningApps utilise un iframe #VideoSelectionFrameI pour la vidéo
  const videoFrame = page.locator('#VideoSelectionFrameI').contentFrame();
  if (videoFrame) {
    try {
      await videoFrame.getByRole('textbox', { name: 'URL' }).fill(videoUrl);
      // Le bouton peut être "» Utiliser un Vidéo" ou "Utiliser un Vidéo"
      await videoFrame.getByRole('link', { name: /Utiliser un Vidéo|Utiliser|OK|Valider/i }).click();
      await page.waitForTimeout(500);
    } catch (error) {
      console.warn(`Video iframe error: ${error}`);
      // Essayer avec un sélecteur alternatif
      try {
        const altFrame = page.locator('#MediaSelectionFrameI').contentFrame();
        if (altFrame) {
          await altFrame.getByRole('textbox', { name: 'URL' }).fill(videoUrl);
          await altFrame.getByRole('link', { name: /Utiliser|OK|Valider/i }).click();
          await page.waitForTimeout(500);
        }
      } catch {
        console.warn('Alternative video iframe method also failed');
      }
    }
  }
}

/**
 * Configure un élément selon son type (texte, image, synthèse vocale, audio, vidéo)
 * 
 * @param page - Page Playwright
 * @param elementId - ID de base de l'élément (ex: "question1", "answer1_1", "v1_1")
 * @param content - Contenu à configurer
 * @param options - Options supplémentaires
 */
export async function setContentElement(
  page: Page,
  elementId: string,
  content: {
    type?: 'text' | 'image' | 'speech' | 'audio' | 'video';
    text?: string;
    hint?: string;
    image_url?: string;
    audio_url?: string;
    video_url?: string;
  },
  options?: {
    useButtonText?: boolean; // Si true, utilise les boutons texte au lieu des IDs btn3, etc.
    buttonPrefix?: string; // Préfixe pour les boutons (ex: "v1_1_buttons")
  }
): Promise<void> {
  const contentType = content.type || 'text';

  // Mapping des types vers les boutons (IDs)
  const typeButtons: Record<string, string> = {
    'text': 'btn3',
    'image': 'btn1',
    'speech': 'btn5',
    'audio': 'btn4',
    'video': 'btn6'
  };

  // Mapping des types vers les boutons (texte)
  const typeButtonTexts: Record<string, string> = {
    'text': 'Texte',
    'image': 'Image',
    'speech': 'Synthèse vocale',
    'audio': 'Audio',
    'video': 'Video'
  };

  // Sélectionner le type de contenu
  if (options?.useButtonText && options?.buttonPrefix) {
    const buttonText = typeButtonTexts[contentType] || 'Texte';
    const buttonContainer = page.locator(`#${options.buttonPrefix}`);
    await buttonContainer.waitFor({ state: 'visible' });
    console.log(`Clicking button '${buttonText}' in ${options.buttonPrefix}`);
    await buttonContainer.getByText(buttonText).click();
  } else {
    const btn = typeButtons[contentType] || 'btn3';
    console.log(`Clicking button ID #${elementId}_${btn}`);
    await page.locator(`#${elementId}_${btn}`).click();
  }

  // Attendre que la zone de saisie apparaisse
  console.log(`Waiting for input for type ${contentType}...`);

  // Remplir le contenu selon le type
  if (contentType === 'text') {
    const textInput = page.locator(`#${elementId}_text`);
    await textInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`Input #${elementId}_text visible. Filling with: ${content.text}`);

    if (content.text) {
      await textInput.click(); // Click to focus
      await textInput.fill(content.text);
      // await textInput.blur(); // Try blur to save?
    }
    if (content.hint) {
      await page.locator(`#${elementId}_text_hint`).fill(content.hint);
    }
  } else if (contentType === 'speech') {
    const speechInput = page.locator(`#${elementId}_speech`);
    await speechInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`Input #${elementId}_speech visible. Filling with: ${content.text}`);

    if (content.text) {
      await speechInput.click();
      await speechInput.fill(content.text);
    }
    if (content.hint) {
      await page.locator(`#${elementId}_speech_hint`).fill(content.hint);
    }
  } else if (contentType === 'image' && content.image_url) {
    console.log(`Setting image from URL: ${content.image_url}`);
    await setImageFromUrl(page, content.image_url);
  } else if (contentType === 'audio' && content.audio_url) {
    await setAudioFromUrl(page, content.audio_url);
  } else if (contentType === 'video' && content.video_url) {
    await setVideoFromUrl(page, content.video_url);
  }
}

/**
 * Définit le message de succès / feedback
 */
export async function setSuccessMessage(page: Page, message: string): Promise<void> {
  if (!message) return;

  // Essayer l'ID standard
  const standardInput = page.locator('#LearningApp_feedback');
  if (await standardInput.count() > 0 && await standardInput.isVisible()) {
    console.log(`Setting success message via #LearningApp_feedback: "${message}"`);
    await standardInput.fill(message);
    return;
  }

  // Fallback: chercher par texte approximatif (Regex)
  const defaultPatterns = [
    /Bravo/,
    /Super/,
    /Félicitations/i,
    /Feedback/i,
    /Rétroaction/i,
    /Correct/i
  ];

  for (const pattern of defaultPatterns) {
    // On cherche un élément (input/textarea) qui contient ce texte (valeur par défaut)
    // OU un label qui contient ce texte

    // 1. Chercher si un textarea contient déjà ce texte (valeur par défaut)
    try {
      const textAreas = page.locator('textarea, input[type="text"]');
      const count = await textAreas.count();
      for (let i = 0; i < count; i++) {
        const val = await textAreas.nth(i).inputValue();
        if (pattern.test(val)) {
          console.log(`Found input with default text matching ${pattern}. Filling...`);
          await textAreas.nth(i).fill(message);
          return;
        }
      }
    } catch (e) { /* ignore */ }

    // 2. Chercher un label/div et son champ associé
    // TODO if needed
  }

  console.warn(`Could not set success message: input not found for message "${message}"`);
}
