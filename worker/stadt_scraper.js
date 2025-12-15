import { chromium } from "playwright";
import fs from "fs";

const URL = "https://www.leipzig.de/kultur-und-freizeit/veranstaltungen/hoehepunkte-2026";

(async () => {
  console.log("🏙️ Öffne Stadt Leipzig – Veranstaltungshöhepunkte …");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });

  // Warten bis Liste da ist
  await page.waitForSelector('ul.list-unstyled.d-flex li[data-pid]');

  const events = await page.$$eval(
    'ul.list-unstyled.d-flex li[data-pid]',
    items => {
      return items.map(li => {
        const title =
          li.querySelector("h3.card-title")?.innerText.trim() || null;

        const infoSpans = li.querySelectorAll(
          "div.d-flex.gap-2.flex-column span.icon-text span:nth-child(2)"
        );

        const dateText = infoSpans[0]?.innerText.trim() || null;
        const location = infoSpans[1]?.innerText.trim() || null;

        const image =
          li.querySelector("div.card-image img")?.getAttribute("src") || null;

        const link =
          li.querySelector("a")?.getAttribute("href") || null;

        return {
          title,
          date_raw: dateText,
          startDate: null,
          endDate: null,
          location,
          description: null,
          image,
          link,
          tags: ["stadt"]
        };
      });
    }
  );

  await browser.close();

  const output = {
    source: "Stadt Leipzig – Veranstaltungshöhepunkte",
    scraped_at: new Date().toISOString(),
    events
  };

  fs.writeFileSync(
    "data/events_stadt.json",
    JSON.stringify(output, null, 2),
    "utf-8"
  );

  console.log(`✅ FINAL: ${events.length} Stadt-Events gespeichert`);
})();
