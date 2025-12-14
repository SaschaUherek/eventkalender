import fs from "fs";

const year = new Date().getFullYear();
const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/DE`;
const output = `data/holidays_sn_${year}.json`;

console.log(`📅 Lade Feiertage für DE (${year}) …`);

const res = await fetch(url);
if (!res.ok) {
  console.error("❌ Feiertage API Fehler:", res.status);
  process.exit(1);
}

const data = await res.json();

// Sachsen-Feiertage filtern
const holidays = data
  .filter(h =>
    h.counties === null || h.counties.includes("DE-SN")
  )
  .map(h => ({
    date: h.date,
    name: h.localName
  }));

fs.writeFileSync(
  output,
  JSON.stringify(
    {
      region: "DE-SN",
      year,
      holidays
    },
    null,
    2
  )
);

console.log(`✅ Feiertage gespeichert: ${holidays.length}`);
