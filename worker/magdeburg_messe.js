const { chromium } = require('playwright');
const fs = require('fs');

// Deutsches Datum → ISO (z.B. "18.12.2025")
function parseGermanDate(day, month, year) {
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allEvents = [];
  let pageIndex = 1;

  console.log('🌍 Starte Magdeburg Messe Scraper');

  while (true) {
    const url =
      pageIndex === 1
        ? 'https://www.mvgm.de/de/events/'
        : `https://www.mvgm.de/de/events/?page_e589=${pageIndex}`;

    console.log(`📄 Lade Seite ${pageIndex}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Warten, ob Events existieren
    const hasEvents = await page.$('.event.event-tiles');
    if (!hasEvents) {
      console.log('⛔ Keine weiteren Events gefunden');
      break;
    }

    const eventsOnPage = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.event.event-tiles'))
        .map(ev => {
          const title =
            ev.querySelector('h3[itemprop="name"]')?.innerText.trim() || null;

          const day =
            ev.querySelector('.date .day')?.innerText.trim() || null;

          const month =
            ev.querySelector('.date .month')?.innerText.trim() || null;

          const year = new Date().getFullYear().toString();

          const location =
            ev.querySelector('.info.location')?.innerText.trim() || null;

          const image =
            ev.querySelector('.image_container img')?.getAttribute('src') || null;

          const link =
            ev.querySelector('a')?.href || null;

          return {
            title,
            day,
            month,
            year,
            location,
            image,
            link
          };
        })
        .filter(e => e.title);
    });

    console.log(`➕ ${eventsOnPage.length} Events gefunden`);

    for (const ev of eventsOnPage) {
      const isoDate = parseGermanDate(ev.day, ev.month, ev.year);

      allEvents.push({
        title: ev.title,
        startDate: isoDate,
        endDate: isoDate,
        date: ev.day && ev.month ? `${ev.day}.${ev.month}.${ev.year}` : null,
        location: ev.location || 'Messe Magdeburg',
        description: null,
        image: ev.image,
        link: ev.link,
        tags: []
      });
    }

    pageIndex++;
  }

  fs.writeFileSync(
    'data/events_messe_magdeburg.json',
    JSON.stringify(
      {
        source: 'Messe Magdeburg (mvgm.de)',
        scraped_at: new Date().toISOString(),
        events: allEvents
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ FINAL: ${allEvents.length} Magdeburg Messe Events gespeichert`);
  await browser.close();
})();
