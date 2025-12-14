const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🌍 Öffne Messe-Seite …');

  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'domcontentloaded'
  });

  // Warten bis erste Cards da sind
  await page.waitForSelector('div.card.js-card', { timeout: 20000 });
  const initialCount = await page.$$eval(
    'div.card.js-card',
    els => els.length
  );

  console.log(`📦 Erste Seite: ${initialCount} Events`);

  // Button "Alle Einträge anzeigen" sauber klicken
  const button = page.locator('button.btn.btn--primary');

  if (await button.count() > 0) {
    console.log('🔘 Warte auf Button "Alle Einträge anzeigen"');
    await button.first().waitFor({ state: 'visible', timeout: 15000 });

    // in Sichtbereich scrollen
    await button.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    console.log('👉 Klicke Button');
    await button.first().click();

    // warten bis MEHR Events da sind
    await page.waitForFunction(
      (count) =>
        document.querySelectorAll('div.card.js-card').length > count,
      initialCount,
      { timeout: 20000 }
    );

    const newCount = await page.$$eval(
      'div.card.js-card',
      els => els.length
    );

    console.log(`📦 Nachladen erfolgreich: ${newCount} Events`);
  } else {
    console.log('ℹ️ Kein Button gefunden');
  }

  // Events einsammeln
  const events = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div.card.js-card'))
      .map(card => {
        return {
          title: card.querySelector('.card__title')?.innerText?.trim() || null,
          date: card.querySelector('.card__title-row__left')?.innerText?.trim() || null,
          description:
            card.querySelector('.card__content-row.flow p')?.innerText?.trim() || null,
          image:
            card.querySelector('.card__image-container img')?.getAttribute('src') || null,
          link: card.querySelector('a')?.href || null
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
