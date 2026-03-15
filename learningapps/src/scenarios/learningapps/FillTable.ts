import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer un "Compléter/remplir un tableau" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.table (requis) : Tableau de données
 *     - rows : Tableau de lignes
 *       - cells : Tableau de cellules (colonnes)
 */
export default async function createFillTable(page: Page, params: ScenarioParams) {
  await initLearningAppsSession(page);

  // Naviguer vers la création d'un nouveau tableau (Template 551)
  await page.goto('https://learningapps.org/create?new=551');

  // Remplir le titre
  await page.locator('#LearningApp_title').fill(params.title as string);

  // Remplir la tâche
  if (params.task) {
    await page.locator('#LearningApp_task').fill(params.task as string);
  }

  const table = (params.table || { rows: (params as any).rows }) as {
    rows: Array<{ cells?: string[], items?: string[] }>;
  };

  if (table && table.rows && table.rows.length > 0) {
    // 1. Ajouter les lignes nécessaires (la première existe déjà)
    for (let rowNum = 2; rowNum <= table.rows.length; rowNum++) {
      await page.getByRole('button', { name: ' Ajouter une ligne' }).click();
      await page.waitForTimeout(400);
    }

    // 2. Pour CHAQUE ligne, ajouter les colonnes et remplir
    for (let rIndex = 0; rIndex < table.rows.length; rIndex++) {
      const rowNum = rIndex + 1;
      const rowData = table.rows[rIndex];
      const cells = rowData.cells || rowData.items || [];

      // Ajouter les colonnes pour CETTE ligne (la première colonne existe par défaut dans chaque ligne)
      for (let colNum = 2; colNum <= cells.length; colNum++) {
        const addColBtn = page.locator(`#addNewListElementBtn_Spalte${rowNum}`);
        // Scroll into view to ensure it's clickable
        await addColBtn.scrollIntoViewIfNeeded();
        await addColBtn.click();
        await page.waitForTimeout(300);
      }

      // Remplir les cellules de cette ligne
      for (let cIndex = 0; cIndex < cells.length; cIndex++) {
        const colNum = cIndex + 1;
        const cellText = cells[cIndex] || '';
        
        const cellLocator = page.locator(`#content_${rowNum}_${colNum}`);
        // Ensure textarea exists and is ready
        await cellLocator.scrollIntoViewIfNeeded();
        await cellLocator.fill(cellText);
      }
    }
  }

  // Réglages (Custom buttons toggling hidden inputs)
  const toggleSetting = async (inputId: string, btnId: string, desiredValue: boolean) => {
    try {
      const currentValue = await page.locator(inputId).inputValue();
      const isChecked = currentValue === 'true';
      if (isChecked !== desiredValue) {
        await page.locator(btnId).click();
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.warn(`[FillTable] Could not toggle setting ${btnId}`);
    }
  };

  // éléments à mettre ensemble en ligne (Défaut: true)
  await toggleSetting('#rowConnected', '#rowConnected_btn', params.rowConnected !== false);

  // Saisie sensible à la casse (Défaut: false)
  await toggleSetting('#casesense', '#casesense_btn', params.case_sensitive === true);

  // La saisie doit seulement contenir la réponse (Défaut: false)
  await toggleSetting('#partof', '#partof_btn', params.partialMatch === true);

  // la première ligne est pré-définie (Défaut: true)
  await toggleSetting('#fixedRow1', '#fixedRow1_btn', params.fixedRow1 !== false);

  // la deuxième ligne est pré-définie (Défaut: false)
  await toggleSetting('#fixedRow2', '#fixedRow2_btn', params.fixedRow2 === true);

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
    console.warn('[FillTable] Preview OK button not found or timed out.');
  }

  // Enregistrer
  await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

  // Attendre la redirection
  await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}

