import { chromium } from '@playwright/test';

const SHA = "0366121";
const BASE_URL = "http://localhost:3000";
const USER_DATA_DIR = "C:/Users/Aashir/AppData/Local/Google/Chrome/User Data";

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

async function capture(page, name) {
  await page.screenshot({ path: `evidence/${name}.png`, fullPage: true });
}

(async () => {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: null,
  });
  const page = context.pages()[0] || await context.newPage();

  // SHA overlay
  await page.addInitScript((sha) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.8);color:white;padding:4px 8px;font-size:12px;z-index:99999';
    overlay.textContent = `SHA: ${sha} | URL: ${location.href}`;
    document.body.appendChild(overlay);
  }, SHA);

  for (const [vpName, vp] of Object.entries(viewports)) {
    await page.setViewportSize(vp);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await capture(page, `dashboard-${vpName}`);

    // Dark mode emulate
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForTimeout(1500);
    await capture(page, `dashboard-dark-${vpName}`);
    await page.emulateMedia({ colorScheme: 'light' });
  }

  await context.close();
})();
