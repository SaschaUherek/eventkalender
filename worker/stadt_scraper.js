// worker/stadt_scraper.js
// ------------------------------------------------------
// Leipzig Stadtveranstaltungen scrapen
// ------------------------------------------------------

import fs from "fs/promises";
import path from "path";
import playwright from "playwright";

// Ziel-URL
const URL = "https://www.leipzig.de/kultur-und-freizeit/veranstaltungen/hoehepunkte-2026";

// Basis-URL für Bilder
const IMAGE_BASE = "https://www.leipzig.de";

// Datei, in die wir speichern
const OUTPUT = path.join("data", "events_stadt.json");

// --------------------------------------------
// Helper: Datum aus deutschem Format parsen
// --------------------------------------------
function parseGermanDate(raw) {
  if (!raw) return { startDate: null, endDate: null, date: null };

  // Nur den linken Teil vor evtl. Uhrzeiten nehmen ("·")
  let cleaned = raw.split("·")[0].trim();

  // Bereich trennen: "31.01.2026 - 08.02.2026"
  const parts = cleaned.split("-").map(p => p.trim());

  // Einzelnes Datum parsen
  const parseOne = d => {
    const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`; // YYYY-MM-DD
  };

  const start = parseOne(parts[0]);
  const end = parts[1] ? parseOne(parts[1]) : start;

  return {
    startDate: start,
    endDate: end,
    date: cleaned
  };
}

// ------------------------------------------------------
// MAIN
// ------------------------------------------------------
(async () => {
  console.log("🌆 Lade Stadtveranstaltungen …");

  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // ------------------------------------------------------
  // Extract Events
  // ------------------------------------------------------
  const events = await page.$$eval(
    'ul.list-unstyled.d-flex li[data-pid]',
    items => {
      const parseGermanDateInner = (dateStr) => {
        if (!dateStr) return { startDate: null, endDate: null, date: null };

        let cleaned = dateStr.split("·")[0].trim();
        const parts = cleaned.split("-").map(p => p.trim());

        const parseOne = d => {
          const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/);
          if (!m) return null;
          return `${m[3]}-${m[2]}-${m[1]}`;
        };

        const start = parseOne(parts[0]);
        const end = parts[1] ? parseOne(parts[1]) : start;

        return {
          startDate: start,
          endDate: end,
          date: cleaned
        };
      };

      return items.map(li => {
        const title =
          li.querySelector("h3.card-title")?.innerText.trim() || null;

        const infoSpans = li.querySelectorAll(
          "div.d-flex.gap-2.flex-column span.icon-text span:nth-child(2)"
        );

        const rawDate = infoSpans[0]?.innerText.trim() || null;
        const parsed = parseGermanDateInner(rawDate);

        const location = infoSpans[1]?.innerText.trim() || null;

        let image = li.querySelector("div.card-image img")?.getAttribute("src") || null;
        if (image && !image.startsWith("http")) {
          image = IMAGE_BASE + image;
        }

        const link = li.querySelector("a")?.getAttribute("href") || null;

        return {
          title,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          date: parsed.date,
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

  console.log(`📦 Gefunden: ${events.length} Stadt-Events`);

  // ------------------------------------------------------
  // Nach Datum sortieren
  // ------------------------------------------------------
  events.sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  // ------------------------------------------------------
  // JSON speichern
  // ------------------------------------------------------
  const payload = {
    source: "Stadt Leipzig",
    scraped_at: new Date().toISOString(),
    events
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`✅ FINAL: ${events.length} Stadt-Events gespeichert → ${OUTPUT}`);
})();
