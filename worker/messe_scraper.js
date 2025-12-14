const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'networkidle'
  });

  // warten bis Events da sind
  await page.waitForSelector('article', { timeout: 15000 });

  // "Alle Einträge anzeigen" Button klicken (falls vorhanden)
  const showAllButton = await page.$('button.btn.btn--primary');
  if (showAllButton) {
    console.log('🔘 Klicke auf "Alle Einträge anzeigen"');
    await showAllButton.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('ℹ️ Kein "Alle Einträge anzeigen"-Button gefunden');
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
