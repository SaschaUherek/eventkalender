const { chromium } = require('playwright');
const fs = require('fs');

// -------------------------------------
// Hilfsfunktion: Datum extrahieren
// -------------------------------------
function parseGermanDate(text) {
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [_, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const allEvents = [];
  let pageIndex = 1;
  const MAX_PAGES = 10; // Sicherheitsbremse

  console.log('🌍 Starte Magdeburg Messe Scraper');

  while (true) {
    const url = `https://www.mvgm.de/de/events/?page_e589=${pageIndex}`;
    console.log(`📄 Lade Seite ${pageIndex}: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Warten bis Event-Container ODER Seite leer
    await page.waitForTimeout(1500);

    const eventsOnPage = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.event.event-tiles'))
        .map(ev => {
          const title =
            ev.querySelector('.textbox h3')?.innerText?.trim() || null;

          const day =
            ev.querySelector('.date .day')?.innerText?.trim() || null;

          const month =
            ev.querySelector('.date .month')?.innerText?.trim() || null;

          const rawDate = day && month ? `${day}.${month}` : null;

          const location =
            ev.querySelector('.info.location')?.innerText?.trim() || null;

          const image =
            ev.querySelector('.image_container img')?.getAttribute('src') || null;

          return {
            title,
            rawDate,
            location,
            image
          };
        })
        .filter(e => e.title);
    });

    console.log(`➕ ${eventsOnPage.length} Events gefunden`);

    // 🛑 WICHTIG: Abbruch wenn keine Events mehr da sind
    if (eventsOnPage.length === 0) {
      console.log('⛔ Keine Events mehr – Pagination beendet');
      break;
    }

    for (const ev of eventsOnPage) {
      const isoDate = ev.rawDate ? parseGermanDate(ev.rawDate) : null;

      allEvents.push({
        title: ev.title,
        date: ev.rawDate,
        startDate: isoDate,
        endDate: isoDate,
        location: ev.location || 'Messe Magdeburg',
        description: null,
        image: ev.image,
        link: 'https://www.mvgm.de/de/events/',
        tags: ['messe']
      });
    }

    pageIndex++;

    // Sicherheitsbremse
    if (pageIndex > MAX_PAGES) {
      console.log('🛑 Sicherheitslimit erreicht – Abbruch');
      break;
    }
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

  console.log(`✅ FINAL: ${allEvents.length} Magdeburg Messe-Events gespeichert`);
  await browser.close();
})();
