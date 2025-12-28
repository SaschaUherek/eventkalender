const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const allEvents = [];
  let pageIndex = 1;

  while (true) {
    const url =
      pageIndex === 1
        ? 'https://www.mvgm.de/de/events/'
        : `https://www.mvgm.de/de/events/?page_e589=${pageIndex}`;

    console.log(`📄 Lese Seite ${pageIndex}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const eventsOnPage = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('.event.event-tiles')
      ).map(ev => {
        const title =
          ev.querySelector('h3[itemprop="name"]')?.innerText?.trim() || null;

        const day =
          ev.querySelector('.date .day')?.innerText?.trim() || '';

        const month =
          ev.querySelector('.date .month')?.innerText?.trim() || '';

        const date = `${day} ${month}`.trim() || null;

        const location =
          ev.querySelector('.info.location')?.innerText?.trim() || null;

        const image =
          ev.querySelector('.image_container img')?.getAttribute('src') || null;

        return { title, date, location, image };
      }).filter(e => e.title);
    });

    console.log(`➕ ${eventsOnPage.length} Events gefunden`);

    if (eventsOnPage.length === 0) {
      console.log('⛔ Keine weiteren Events');
      break;
    }

    for (const ev of eventsOnPage) {
      allEvents.push({
        title: ev.title,
        date: ev.date,
        startDate: null,
        endDate: null,
        location: ev.location || 'Magdeburg',
        description: null,
        image: ev.image,
        link: null,
        tags: []
      });
    }

    pageIndex++;
  }

  fs.writeFileSync(
    'data/events_magdeburg_messe.json',
    JSON.stringify(
      {
        source: 'MVGM Magdeburg',
        scraped_at: new Date().toISOString(),
        events: allEvents
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ FINAL: ${allEvents.length} Magdeburg-Events gespeichert`);
  await browser.close();
})();
