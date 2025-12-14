const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🌍 Initialisiere Session …');
  await page.goto('https://www.leipziger-messe.de/de/kalender/', {
    waitUntil: 'domcontentloaded'
  });

  console.log('📡 Rufe Messe-API direkt auf …');

  const response = await page.request.post(
    'https://www.leipziger-messe.de/api/search',
    {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        queryString: "",
        offset: 0,
        limit: 999999,
        filters: [
          {
            type: "DATE_FROM",
            value: "2025-12-11"
          },
          {
            type: "TYPE",
            value: "FAIR"
          }
        ],
        sortClauses: [
          {
            fieldName: "startDate",
            order: "ASC"
          }
        ]
      }
    }
  );

  if (!response.ok()) {
    console.error('❌ API-Request fehlgeschlagen:', response.status());
    await browser.close();
    process.exit(1);
  }

  const json = await response.json();
  const results = json.results || [];

  console.log(`📦 API liefert ${results.length} Events`);

  const events = results.map(item => {
    const o = item.wrappedObject || {};
    return {
      title: o.name || null,
      startDate: o.startDate || null,
      endDate: o.endDate || null,
      date:
        o.startDate && o.endDate
          ? `${o.startDate} – ${o.endDate}`
          : o.startDate || null,
      location: o.location || null,
      description: o.description || null,
      image: o.logoUrl || null,
      link: o.linkUrl || null,
      tags: o.tagList || []
    };
  });

  fs.writeFileSync(
    'data/events_messe.json',
    JSON.stringify(
      {
        source: 'Leipziger Messe (API direkt via Playwright)',
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
