import fs from "fs";

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

for (const year of years) {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/DE`;
  const output = `data/holidays_sn_${year}.json`;

  console.log(`📅 Lade Feiertage für DE (${year}) …`);

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Feiertage API Fehler ${year}:`, res.status);
    continue;
  }

  const data = await res.json();

  // Sachsen-Feiertage filtern
  const holidays = data
    .filter(h =>
      h.counties === null || h.counties?.includes("DE-SN")
    )
    .map(h => ({
      date: h.date,       // z.B. "2025-04-21"
      name: h.localName   // z.B. "Ostermontag"
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

  console.log(`✅ Feiertage ${year} gespeichert: ${holidays.length}`);
}
