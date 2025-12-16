const { chromium } = require('playwright');
const path = require('path');

let browser;

async function init() {
    if (!browser) {
        console.log("Launching browser for GeoGebra...");
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Often needed in containerized envs
        });
    }
}

async function close() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

/**
 * @param {string[]} commands - Array of GeoGebra commands (e.g., ["A=(0,0)", "Circle(A, 1)"])
 * @param {Object} options - Configuration options
 * @param {boolean} [options.hideCommandZone=true] - Whether to hide the command zone (Algebra Input)
 * @returns {Promise<Buffer>} - PNG image buffer
 */
async function generate(commands, options = {}) {
    if (!browser) await init();

    const page = await browser.newPage();

    // Default options
    const hideCommandZone = options.hideCommandZone !== false; // Default to true if not specified, or respect input

    // Inject configuration options
    await page.addInitScript((opts) => {
        window.ggbOptions = {
            showAlgebraInput: !opts.hideCommandZone,
            // We can add more controls here if needed
        };
    }, { hideCommandZone });

    const htmlPath = path.join(__dirname, 'index.html');

    // Use file:// protocol to load local file
    await page.goto(`file://${htmlPath}`);

    // Wait for GeoGebra to be ready
    try {
        await page.waitForFunction(() => window.ggbApplet && typeof window.ggbApplet.evalCommand === 'function', { timeout: 10000 });
    } catch (e) {
        console.error("Timeout waiting for GeoGebra to load");
        await page.close();
        throw e;
    }

    // Wait for GeoGebra to be ready
    try {
        await page.waitForFunction(() => window.ggbApplet, { timeout: 10000 });
        // Add a fixed delay to ensure the GWT engine is fully loaded
        // "Scripting commands not loaded yet" error often happens if we are too fast
        await page.waitForTimeout(3000);
    } catch (e) {
        console.error("Timeout waiting for GeoGebra engine to initialize");
        await page.close();
        throw e;
    }

    // Execute commands
    await page.evaluate((cmds) => {
        cmds.forEach(cmd => {
            window.ggbApplet.evalCommand(cmd);
        });
    }, commands);

    // Wait a bit for rendering
    await page.waitForTimeout(1000);

    // Take screenshot of the applet container
    const element = await page.$('#ggb-element');
    if (!element) {
        throw new Error("GeoGebra element not found");
    }

    const buffer = await element.screenshot();

    await page.close();
    return buffer;
}

module.exports = { generate, close };
