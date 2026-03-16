import { chromium } from 'playwright';

async function test() {
  console.log('🚀 Starting Playwright test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('🌐 Navigating...');
  try {
    await page.goto('https://learningapps.org/', { timeout: 30000 });
    console.log('✅ Page loaded:', page.url());
    const title = await page.title();
    console.log('📝 Title:', title);
  } catch (e) {
    console.error('❌ Goto failed:', e);
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
}

test().catch(console.error);
