const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🌍 Öffne Messe-Seite …');

  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'domcontentloaded'
  });

  // Button "Alle Einträge anzeigen" klicken (falls vorhanden)
  const showAllButton = await page.$('button.btn.btn--primary');
  if (showAllButton) {
    console.log('🔘 Klicke auf "Alle Einträge anzeigen"');
    await showAllButton.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('ℹ️ Kein "Alle Einträge anzeigen"-Button gefunden');
  }

  // Warten, bis Event-Karten gerendert sind
  await page.waitForSelector('div.card.js-card', {
    timeout: 20000
  });

  console.log('📦 Event-Karten gefunden');

  // Events auslesen
  const events = await page.evaluate(() => {
    const items = document.querySelectorAll('div.card.js-card');
    return Array.from(items).map(el => {
      const title = el.querySelector('h3, h2')?.innerText?.trim();
      const date  = el.querySelector('time')?.innerText?.trim();
      const link  = el.querySelector('a')?.href;

      return { title, date, link };
    }).filter(e => e.title);
  });

  fs.writeFileSync(
    'data/events_messe.json',
    JSON.stringify({
      source: 'Leipziger Messe',
      scraped_at: new Date().toISOString(),
      events
    }, null, 2),
    'utf8'
  );

  console.log(`✅ ${events.length} Events gespeichert`);
  await browser.close();
})();
