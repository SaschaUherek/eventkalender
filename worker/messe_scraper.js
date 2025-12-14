const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🌍 Öffne Messe-Seite …');

  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'domcontentloaded'
  });

  // "Alle Einträge anzeigen" klicken (falls vorhanden)
  const showAllButton = await page.$('button.btn.btn--primary');
  if (showAllButton) {
    console.log('🔘 Klicke auf "Alle Einträge anzeigen"');
    await showAllButton.click();
    await page.waitForTimeout(3000);
  }

  // Warten, bis Event-Karten da sind
  await page.waitForSelector('div.card.js-card', { timeout: 20000 });
  console.log('📦 Event-Karten gefunden');

  const events = await page.evaluate(() => {
    const cards = document.querySelectorAll('div.card.js-card');

    return Array.from(cards).map(card => {
      const title =
        card.querySelector('.card__title')?.innerText?.trim() || null;

      const date =
        card.querySelector('.card__title-row__left')?.innerText?.trim() || null;

      const description =
        card.querySelector('.card__content-row.flow p')?.innerText?.trim() || null;

      const image =
        card.querySelector('.card__image-container img')?.getAttribute('src') || null;

      const link =
        card.querySelector('a')?.href || null;

      return {
        title,
        date,
        description,
        image,
        link
      };
    }).filter(e => e.title);
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

  console.log(`✅ ${events.length} Events gespeichert`);
  await browser.close();
})();
