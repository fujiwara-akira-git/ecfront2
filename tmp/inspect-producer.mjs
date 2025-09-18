import { chromium } from 'playwright';

(async ()=>{
  const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
  const TEST_PASSWORD = process.env.TEST_PASSWORD || 'pass';
  const BASE = process.env.BASE_URL || 'http://localhost:3000';
  const PRODUCER_ID = process.env.PRODUCER_ID || '1';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    try { console.log('BROWSER LOG:', msg.type(), msg.text()) } catch(e) {}
  })

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message)
  })

  try{
    await page.goto(`${BASE}/shop/auth/signin`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ url: '**/shop' }),
      page.click('button[type="submit"]')
    ]);
    console.log('Signed in, navigating to producer page');
    await page.goto(`${BASE}/shop/producer/${PRODUCER_ID}`, { waitUntil: 'networkidle' });

  // wait a bit longer for client hydration
  await page.waitForTimeout(5000);

    const buttons = await page.$$eval('button', els => els.map(b=>({text: b.innerText.trim(), aria: b.getAttribute('aria-label')})));
    console.log('Buttons:', buttons);

  const hasFav = await page.$$eval('button', els => els.some(b => /お気に入り/.test(b.innerText)) ).catch(()=>false);
  console.log('Has favorite button:', hasFav);

  // Playwright-friendly checks
  const favByText = await page.locator('text=/お気に入り/').count().catch(()=>0);
  const favButtonByRole = await page.locator('button:has-text("お気に入り")').count().catch(()=>0);
  console.log('Locator counts - text match:', favByText, 'button:has-text:', favButtonByRole);

    const html = await page.content();
    console.log('Page HTML snippet:', html.substring(0,2000));
  }catch(e){
    console.error('Error:', e);
  }finally{
    await browser.close();
  }
})();