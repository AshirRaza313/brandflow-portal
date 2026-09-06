import { chromium } from '@playwright/test';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const SHA = "0366121";
const BASE_URL = "http://localhost:3000";

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

async function capture(page, name) {
  await page.screenshot({ path: `evidence/${name}.png`, fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // SHA overlay
  await page.addInitScript((sha) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.8);color:white;padding:4px 8px;font-size:12px;z-index:99999';
    overlay.textContent = `SHA: ${sha} | URL: ${location.href}`;
    document.body.appendChild(overlay);
  }, SHA);

  console.log('Browser khul gaya hai. Kripya login karein, phir Enter press karein...');
  await page.goto(BASE_URL);
  const rl = readline.createInterface({ input, output });
  await rl.question('Login complete? Press Enter to continue...');
  rl.close();

  for (const [vpName, vp] of Object.entries(viewports)) {
    await page.setViewportSize(vp);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await capture(page, `dashboard-${vpName}`);
  }

  // Dark mode captures (English)
  await page.setViewportSize(viewports.desktop);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(BASE_URL);
  await page.waitForTimeout(1500);
  await capture(page, 'dashboard-dark-desktop');
  await page.emulateMedia({ colorScheme: 'light' });

  // Loading state: slow API
  await page.route('**/api/dashboard/stats**', route => {
    setTimeout(() => route.continue(), 3000);
  });
  await page.goto(BASE_URL);
  await page.waitForTimeout(800);
  await capture(page, 'loading');

  // Error state: abort API
  await page.route('**/api/dashboard/stats**', route => route.abort());
  await page.goto(BASE_URL);
  await page.waitForTimeout(1200);
  await capture(page, 'error');

  await browser.close();
})();
