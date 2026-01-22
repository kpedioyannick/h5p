import { Page } from 'playwright';
import { ScenarioParams } from '../../types/index.js';
import { initLearningAppsSession, setContentElement, setSuccessMessage } from '../../services/learningapps/helpers.js';

/**
 * Scénario pour créer une "Grille de correspondance" sur LearningApps
 * 
 * @param page - Page Playwright
 * @param params - Paramètres :
 *   - params.title (requis) : Titre de l'activité
 *   - params.task (optionnel) : Description de la tâche
 *   - params.rows (requis) : Tableau de lignes (chaque ligne est un tableau d'éléments)
 *     - Chaque élément : { type?: 'text'|'image'..., text?: string, image_url?: string, ... }
 */
export default async function createGrilleCorrespondance(page: Page, params: ScenarioParams) {
    await initLearningAppsSession(page);

    // Sélectionner "Grille de correspondance"
    // Note: Le sélecteur exact dépend de la langue et de l'interface. 
    // On utilise le texte qui est le plus fiable dans la version française forcée.
    await page.locator('div').filter({ hasText: /^Grille de correspondance$/ }).first().click().catch(async () => {
        // Fallback: essayer une correspondance partielle si le regex strict échoue
        await page.locator('div').filter({ hasText: 'Grille de correspondance' }).nth(5).click();
    });

    await page.getByRole('link', { name: ' Créer une nouvelle appli' }).click();

    // Remplir le titre
    await page.locator('#LearningApp_title').fill(params.title as string);

    // Remplir la tâche
    if (params.task) {
        await page.locator('#LearningApp_task').fill(params.task as string);
    }

    // Remplir les lignes
    const rows = params.rows as Array<Array<{
        type?: 'text' | 'image' | 'speech' | 'audio' | 'video';
        text?: string;
        image_url?: string;
        audio_url?: string;
        video_url?: string;
        hint?: string;
    }>>;

    if (rows && rows.length > 0) {
        for (let rIndex = 0; rIndex < rows.length; rIndex++) {
            const rowNum = rIndex + 1;
            const rowItems = rows[rIndex];

            // Ajouter une nouvelle ligne si ce n'est pas la première (qui existe déjà par défaut ?)
            // Note: LearningApps initialise souvent avec 1 ligne ou 2. 
            // Le bouton "Ajouter un élément" (#addNewListElementBtn_Inhalte) ajoute une ligne ?
            // D'après l'inspection: "Ajouter un élément" semble ajouter une ligne.
            // Vérifions si la ligne 1 existe déjà. Oui, content_1_1 existe.

            if (rIndex > 0) {
                await page.locator('#addNewListElementBtn_Inhalte').click();
                await page.waitForTimeout(500); // Petite pause pour l'animation DOM
            }

            // Remplir les colonnes de la ligne
            if (rowItems && rowItems.length > 0) {
                for (let cIndex = 0; cIndex < rowItems.length; cIndex++) {
                    const colNum = cIndex + 1;
                    const item = rowItems[cIndex];

                    // ID pattern: content_{row}_{col}
                    // setContentElement gérera le clic sur btnX et le remplissage du texte/url

                    try {
                        await setContentElement(page, `content_${rowNum}_${colNum}`, item);
                    } catch (err) {
                        console.warn(`Erreur lors du remplissage de la cellule ${rowNum}:${colNum}`, err);
                    }
                }
            }
        }
    }

    // Remplir le message de succès
    await setSuccessMessage(page, params.successMessage as string);

    // Afficher un aperçu
    await page.getByRole('button', { name: 'Afficher un aperçu' }).click().catch(() => {
        return page.getByRole('button', { name: /Afficher un aperçu/i }).click();
    });

    const previewFrame = page.locator('iframe').contentFrame();
    if (previewFrame) {
        try {
            const innerFrame = previewFrame.locator('#frame').contentFrame();
            if (innerFrame) {
                await innerFrame.getByRole('button', { name: 'OK' }).click({ timeout: 2000 }).catch(() => { });
            }
        } catch (e) { /* ignore */ }
    }

    // Sauvegarder
    await page.getByRole('button', { name: ' Enregistrer l\'appli' }).click();

    // Attendre la redirection
    await page.waitForURL(/\/display\?v=|learningapps\.org\/\d+$/, { timeout: 15000 });
}
