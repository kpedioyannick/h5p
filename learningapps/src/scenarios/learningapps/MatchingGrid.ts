import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer une "Grille de correspondance" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.feedback (optionnel) : Message de succès
 *   - params.help (optionnel) : Indice global (alias: params.indice)
 *   - params.speech (optionnel) : Synthèse vocale globale (booléen)
 *   - params.rows (requis) : Tableau de lignes (chaque ligne est un tableau d'éléments, max 5)
 *     - Un élément peut être un string (texte) ou un objet content structure.
 *   - params.rowConnected (optionnel) : Éléments à mettre ensemble en ligne (défaut: true)
 *   - params.fixedRow1 (optionnel) : La première ligne est pré-définie (défaut: false)
 *   - params.fixedColumns (optionnel) : Tableau de colonnes pré-définies [1, 2, 3, 4, 5]
 */
export default async function createMatchingGrid(page: Page, params: ScenarioParams) {
  // Initialiser la session
  await initLearningAppsSession(page);

  // Sélectionner "Grille de correspondance"
  // Note: Dans le DOM il semble être au même niveau que les autres
  await page.locator('div').filter({ hasText: 'Grille de correspondance' }).nth(5).click();

  // Cliquer sur "Créer une nouvelle appli"
  await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  // Remplir les lignes
  const rows = params.rows as Array<any[]>;
  if (rows && rows.length > 0) {
    for (let rIndex = 0; rIndex < rows.length; rIndex++) {
      const row = rows[rIndex];
      const rowNum = rIndex + 1;

      // Ajouter une nouvelle ligne si nécessaire (la première existe déjà)
      if (rIndex > 0) {
        await page.locator('#addNewListElementBtn_Inhalte').click();
        await page.waitForTimeout(500);
      }

      // Remplir les colonnes (max 5)
      const numCols = Math.min(row.length, 5);
      for (let cIndex = 0; cIndex < numCols; cIndex++) {
        const cell = row[cIndex];
        const colNum = cIndex + 1;

        if (!cell) continue;

        let content: any = {};
        if (typeof cell === 'string') {
          content = { text: cell, type: params.speech ? 'speech' : 'text' };
        } else {
          content = cell;
          if (!content.type) content.type = params.speech ? 'speech' : 'text';
        }

        await setContentElement(page, `content_${rowNum}_${colNum}`, {
          type: content.type,
          text: content.text,
          hint: content.hint,
          image_url: content.image_url,
          audio_url: content.audio_url,
          video_url: content.video_url
        }, {
          useButtonText: true,
          buttonPrefix: `content_${rowNum}_${colNum}_buttons`
        });
      }
    }
  }

  // Réglages
  const toggleSetting = async (inputId: string, btnId: string, desiredValue: boolean) => {
    const currentValue = await page.locator(inputId).inputValue();
    const isChecked = currentValue === 'true';
    if (isChecked !== desiredValue) {
      await page.locator(btnId).click();
      await page.waitForTimeout(300);
    }
  };

  // éléments à mettre ensemble en ligne (Défaut: true)
  await toggleSetting('#rowConnected', '#rowConnected_btn', params.rowConnected !== false);

  // la première ligne est pré-définie (Défaut: true)
  await toggleSetting('#fixedRow1', '#fixedRow1_btn', params.fixedRow1 !== false);

  // Colonnes définies (Défaut: false pour toutes)
  for (let c = 1; c <= 5; c++) {
    let isFixed = false;
    if (Array.isArray(params.fixedColumns)) {
      isFixed = params.fixedColumns.includes(c) || params.fixedColumns.includes(c.toString());
    }
    await toggleSetting(`#fixedColumn${c}`, `#fixedColumn${c}_btn`, isFixed);
  }

  // Feedback
  if (params.feedback) {
    await page.locator('#feedback').fill(params.feedback as string);
  }

  // Aide (Indice global)
  if (params.help || params.indice) {
    const helpText = (params.help || params.indice) as string;
    await page.locator('#LearningApp_help').fill(helpText);
  }

  // Aperçu
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
    console.warn('[MatchingGrid] Preview OK button not found or timed out.');
  }

  // Enregistrer
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Attendre la redirection
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}
