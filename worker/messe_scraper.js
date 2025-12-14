const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let apiEvents = [];

  // API-Response abfangen
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/search') && response.status() === 200) {
      try {
        const data = await response.json();
        if (data?.results) {
          apiEvents = data.results.map(item => {
            const o = item.wrappedObject || {};
            return {
              title: o.name || null,
              date: o.startDate && o.endDate
                ? `${o.startDate} – ${o.endDate}`
                : o.startDate || null,
              description: o.description || null,
              image: o.logoUrl || null,
              location: o.location || null,
              link: o.linkUrl || null,
              tags: o.tagList || []
            };
          });
          console.log(`📡 API-Events empfangen: ${apiEvents.length}`);
        }
      } catch (e) {
        console.log('⚠️ API-Response konnte nicht gelesen werden');
      }
    }
  });

  console.log('🌍 Öffne Messe-Seite …');
  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'domcontentloaded'
  });

  // Button klicken (triggert den API-Call!)
  const button = page.locator('button.btn.btn--primary');
  if (await button.count() > 0) {
    console.log('🔘 Klicke "Alle Einträge anzeigen"');
    await button.first().scrollIntoViewIfNeeded();
    await button.first().click();
  }

  // Warten bis API-Events da sind
  await page.waitForFunction(
    () => window.performance.getEntriesByType('resource')
      .some(r => r.name.includes('/api/search')),
    { timeout: 20000 }
  );

  // kleine Sicherheitswartezeit
  await page.waitForTimeout(2000);

  fs.writeFileSync(
    'data/events_messe.json',
    JSON.stringify(
      {
        source: 'Leipziger Messe (API via Playwright)',
        scraped_at: new Date().toISOString(),
        events: apiEvents
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ FINAL: ${apiEvents.length} Events gespeichert`);
  await browser.close();
})();
