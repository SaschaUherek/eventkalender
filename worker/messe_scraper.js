const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🌍 Öffne Messe-Kalender (ALLE Einträge)…');

  // WICHTIG: direkt mit Parameter öffnen
  await page.goto(
    'https://www.leipziger-messe.de/de/kalender/?showAll=true',
    { waitUntil: 'domcontentloaded' }
  );

  // Warten, bis ALLE Cards da sind
  await page.waitForSelector('div.card.js-card', { timeout: 30000 });

  // kurze Extra-Wartezeit für Re-Render
  await page.waitForTimeout(3000);

  const count = await page.$$eval(
    'div.card.js-card',
    els => els.length
  );

  console.log(`📦 Gefundene Events: ${count}`);

  const events = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div.card.js-card'))
      .map(card => {
        return {
          title:
            card.querySelector('.card__title')?.innerText?.trim() || null,
          date:
            card.querySelector('.card__title-row__left')?.innerText?.trim() ||
            null,
          description:
            card.querySelector('.card__content-row.flow p')?.innerText?.trim() ||
            null,
          image:
            card
              .querySelector('.card__image-container img')
              ?.getAttribute('src') || null,
          link:
            card.querySelector('a')?.href || null
        };
      })
      .filter(e => e.title);
  });

  fs.writeFileSync(
    'data/events_messe.json',
    JSON.stringify(
      {
        source: 'Leipziger Messe',
        scraped_at: new Date().toISOString(),
        events
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ FINAL: ${events.length} Events gespeichert`);
  await browser.close();
})();
