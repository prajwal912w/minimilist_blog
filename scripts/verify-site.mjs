import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const routes = ['/', '/projects', '/notes', '/notes/anomaly-detection', '/notes/useful-ai-projects', '/about'];
const expected = [
  'https://github.com/prajwal912w', 'https://github.com/prajwal912w/anomaly-ids-ai',
  'https://www.linkedin.com/in/prajwal-shinde-912ps/', 'https://x.com/Prajwalshindee', 'mailto:shindeprajwal912@gmail.com'
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true });
try {
  for (const viewport of [{ width: 1280, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    for (const route of routes) {
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      assert(response?.ok(), `${route} returned ${response?.status()}`);
      assert.equal(await page.locator('h1').textContent(), 'Prajwal Shinde');
      const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(bodyWidth <= viewport.width, `${route} overflows at ${viewport.name}: ${bodyWidth}px`);
    }
    assert.deepEqual(errors, [], `Browser errors at ${viewport.name}: ${errors.join('; ')}`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  for (const label of ['Home', 'Projects', 'Notes', 'About']) {
    await page.getByRole('link', { name: label, exact: true }).first().click();
    await page.waitForLoadState('networkidle');
  }
  await page.goto(base + '/projects');
  await page.getByRole('link', { name: 'Read the build note' }).click();
  assert.equal(new URL(page.url()).pathname, '/notes/anomaly-detection');
  await page.goto(base + '/notes');
  await page.getByRole('link', { name: /useful AI project/ }).click();
  assert.equal(new URL(page.url()).pathname, '/notes/useful-ai-projects');
  const hrefs = new Set();
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    for (const href of await page.locator('a').evaluateAll(as => as.map(a => a.href))) hrefs.add(href);
  }
  for (const href of expected) assert(hrefs.has(href), `Missing expected link: ${href}`);
  console.log(`Verified ${routes.length} routes at desktop and 390px mobile; navigation, note links, overflow, browser errors, and ${expected.length} external/contact destinations passed.`);
} finally { await browser.close(); }
