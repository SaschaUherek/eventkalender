const { chromium } = require('playwright');
const fs = require('fs');

// ---------------------------------------------
// Deutsches Kurzdatum → ISO (YYYY-MM-DD)
// erwartet z.B. "10.Jan"
// ---------------------------------------------
function parseMagdeburgDate(text) {
  if (!text) return null;

  const match = text.match(/(\d{1,2})\.(Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)/i);
  if (!match) return null;

  const day = match[1].padStart(2, '0');

  const monthMap = {
    Jan: '01',
    Feb: '02',
    Mär: '03',
    Apr: '04',
    Mai: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Okt: '10',
    Nov: '11',
    Dez: '12'
  };

  const month = monthMap[match[2]];
  if (!month) return null;

  const now = new Date();
  let year = now.getFullYear();

  // Wenn Monat schon vorbei ist → nächstes Jahr
  if (parseInt(month, 10) < (now.getMonth() + 1)) {
    year += 1;
  }

  return `${year}-${month}-${day}`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const allEvents = [];
  const maxPages = 20; // Sicherheitsbremse

  let pageIndex = 1;

  console.log('🌍 Starte Magdeburg Messe Scraper …');

  while (pageIndex <= maxPages) {
    const url =
      pageIndex === 1
        ? 'https://www.mvgm.de/de/events/'
        : `https://www.mvgm.de/de/events/?page_e589=${pageIndex}`;

    console.log(`📄 Lade Seite ${pageIndex}: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const eventsOnPage = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.event.event-tiles')).map(ev => {
        const title =
          ev.querySelector('.textbox h3')?.innerText?.trim() || null;

        const day =
          ev.querySelector('.date .day')?.innerText?.trim() || '';

        const month =
          ev.querySelector('.date .month')?.innerText?.trim() || '';

        const dateText = `${day}.${month}`;

        const location =
          ev.querySelector('.info.location')?.innerText?.trim() || null;

        const image =
          ev.querySelector('.image_container img')?.getAttribute('src') || null;

        const link =
          ev.querySelector('a')?.href || null;

        return {
          title,
          rawDate: dateText,
          location,
          image,
          link
        };
      }).filter(e => e.title);
    });

    if (eventsOnPage.length === 0) {
      console.log('⛔ Keine Events mehr gefunden – Abbruch');
      break;
    }

    console.log(`➕ ${eventsOnPage.length} Events gefunden`);

    for (const ev of eventsOnPage) {
      const isoDate = parseMagdeburgDate(ev.rawDate);

      allEvents.push({
        title: ev.title,
        date: ev.rawDate,              // fürs Frontend
        startDate: isoDate,            // maschinenlesbar
        endDate: isoDate,
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
    'data/events_magdeburg_messe.json',
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

  console.log(`✅ FINAL: ${allEvents.length} Magdeburg-Messe Events gespeichert`);
  await browser.close();
})();
