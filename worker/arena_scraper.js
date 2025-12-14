const { chromium } = require('playwright');
const fs = require('fs');

// Hilfsfunktion: deutsches Datum → ISO-Format
function parseGermanDate(text) {
  // erwartet z.B. "Donnerstag, 18.12.2025" oder "18.12.2025"
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [_, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const allEvents = [];

  console.log('🌍 Öffne Arena-Events …');

  await page.goto(
    'https://www.quarterback-immobilien-arena.de/events-tickets/events',
    { waitUntil: 'domcontentloaded' }
  );

  let pageIndex = 1;

  while (true) {
    console.log(`📄 Lese Seite ${pageIndex}`);

    await page.waitForSelector('div.event', { timeout: 20000 });

    const eventsOnPage = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div.event')).map(ev => {
        const title =
          ev.querySelector('.title-area h2')?.innerText?.trim() || null;

        const dateText =
          ev.querySelector('.title-area div')?.innerText?.trim() || null;

        const image =
          ev.querySelector('.image img')?.getAttribute('src') || null;

        const link =
          ev.querySelector('a')?.href || null;

        return {
          rawDate: dateText,
          title,
          image,
          link
        };
      }).filter(e => e.title);
    });

    console.log(`➕ ${eventsOnPage.length} Events gefunden`);

    // Datum normalisieren
    for (const ev of eventsOnPage) {
      const isoDate = ev.rawDate ? parseGermanDate(ev.rawDate) : null;

      allEvents.push({
        title: ev.title,
        date: ev.rawDate,                     // fürs Frontend
        startDate: isoDate,                   // maschinenlesbar
        endDate: isoDate,                     // Arena hat 1-Tages-Events
        location: "Quarterback Immobilien Arena Leipzig",
        description: null,
        image: ev.image,
        link: ev.link,
        tags: []
      });
    }

    // Prüfen ob "weiter" existiert
    const nextButton = await page.$('li.next');

    if (!nextButton) {
      console.log('⛔ Keine weitere Seite');
      break;
    }

    console.log('➡️ Weiter zur nächsten Seite');
    await nextButton.click();

    // kurze Wartezeit für neuen Content
    await page.waitForTimeout(1500);
    pageIndex++;
  }

  fs.writeFileSync(
    'data/events_arena.json',
    JSON.stringify(
      {
        source: 'Quarterback Immobilien Arena Leipzig',
        scraped_at: new Date().toISOString(),
        events: allEvents
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ FINAL: ${allEvents.length} Arena-Events gespeichert`);
  await browser.close();
})();
