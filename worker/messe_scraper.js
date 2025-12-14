const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'networkidle'
  });

  // Warten bis erste Events da sind
  await page.waitForSelector('article', { timeout: 15000 });

  // "Mehr laden" so lange klicken, wie es den Button gibt
  while (true) {
    const loadMore = await page.$('button:has-text("Mehr laden")');
    if (!loadMore) break;
    await loadMore.click();
    await page.waitForTimeout(1200);
  }

  // Events auslesen
  const events = await page.evaluate(() => {
    const items = document.querySelectorAll('article');
    return Array.from(items).map(el => {
      const title = el.querySelector('h3, h2')?.innerText?.trim();
      const date  = el.querySelector('time')?.innerText?.trim();
      const link  = el.querySelector('a')?.href;
      return { title, date, link };
    }).filter(e => e.title);
  });

  // JSON schreiben
  fs.writeFileSync(
    'data/events_messe.json',
    JSON.stringify({
      source: 'Leipziger Messe',
      scraped_at: new Date().toISOString(),
      events
    }, null, 2),
    'utf8'
  );

  console.log(`✔ ${events.length} Events gespeichert`);
  await browser.close();
})();
