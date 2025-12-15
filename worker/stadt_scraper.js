// worker/stadt_scraper.js
import fs from "fs/promises";
import path from "path";
import playwright from "playwright";

const URL = "https://www.leipzig.de/kultur-und-freizeit/veranstaltungen/hoehepunkte-2026";
const IMAGE_BASE = "https://www.leipzig.de";
const OUTPUT = path.join("data", "events_stadt.json");

// -----------------------------
// Location-Blacklist
// -----------------------------
const LOCATION_BLACKLIST = [
  "Leipziger Messe",
  "Grassimuseum"
];

function cleanLocation(loc) {
  if (!loc) return null;

  const normalized = loc.toLowerCase();
  for (const bad of LOCATION_BLACKLIST) {
    if (normalized.includes(bad.toLowerCase())) {
      return null;
    }
  }
  return loc;
}

// -----------------------------
// Datum parsen
// -----------------------------
function parseGermanDate(raw) {
  if (!raw) return { startDate: null, endDate: null, date: null };

  let cleaned = raw.split("·")[0].trim();
  const parts = cleaned.split("-").map(p => p.trim());

  const parseOne = d => {
    const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  };

  const start = parseOne(parts[0]);
  const end = parts[1] ? parseOne(parts[1]) : start;

  return { startDate: start, endDate: end, date: cleaned };
}

// -----------------------------
// MAIN
// -----------------------------
(async () => {
  console.log("🌆 Lade Stadtveranstaltungen …");

  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const events = await page.$$eval(
    'ul.list-unstyled.d-flex li[data-pid]',
    items => {
      return items.map(li => {
        const title =
          li.querySelector("h3.card-title")?.innerText.trim() || null;

        const spans = li.querySelectorAll(
          "div.d-flex.gap-2.flex-column span.icon-text span:nth-child(2)"
        );

        const rawDate = spans[0]?.innerText.trim() || null;
        const locationRaw = spans[1]?.innerText.trim() || null;

        let image = li.querySelector("div.card-image img")?.getAttribute("src") || null;
        if (image && !image.startsWith("http")) {
          image = IMAGE_BASE + image;
        }

        const link = li.querySelector("a")?.getAttribute("href") || null;

        return {
          title,
          rawDate,
          locationRaw,
          image,
          link
        };
      });
    }
  );

  await browser.close();

  // Nachbearbeitung
  const cleanedEvents = events.map(e => {
    const parsed = parseGermanDate(e.rawDate);

    return {
      title: e.title,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      date: parsed.date,
      location: cleanLocation(e.locationRaw),
      description: null,
      image: e.image,
      link: e.link,
      tags: ["stadt"]
    };
  }).sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  const payload = {
    source: "Stadt Leipzig",
    scraped_at: new Date().toISOString(),
    events: cleanedEvents
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`✅ FINAL: ${cleanedEvents.length} Stadt-Events gespeichert`);
})();
