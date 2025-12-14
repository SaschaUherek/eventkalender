import fs from "fs";
import fetch from "node-fetch";

const SEASON = "2024"; // Saison anpassen, z.B. 2024/25
const API_URL = `https://api.openligadb.de/getmatchdata/bl1/${SEASON}`;
const OUTPUT = "data/events_rb.json";

console.log("⚽ Lade Bundesliga-Spiele von OpenLigaDB …");

const response = await fetch(API_URL);
const matches = await response.json();

const events = matches
  .filter(match =>
    match.team1?.teamName === "RB Leipzig" && match.location
  )
  .map(match => {
    const dt = new Date(match.matchDateTime);

    const dateISO = dt.toISOString().slice(0, 10);
    const time = dt.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });

    return {
      title: `RB Leipzig – ${match.team2.teamName}`,
      startDate: dateISO,
      endDate: dateISO,
      date: `${dt.toLocaleDateString("de-DE")} · ${time}`,
      location: match.location.locationStadium || "Red Bull Arena",
      description: "Bundesliga Heimspiel",
      image: null,
      link: "https://rbleipzig.com",
      tags: ["fußball", "heimspiel", "bundesliga"],
      source: "rb"
    };
  });

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(
    {
      source: "RB Leipzig Heimspiele (OpenLigaDB)",
      scraped_at: new Date().toISOString(),
      events
    },
    null,
    2
  )
);

console.log(`✅ FINAL: ${events.length} RB-Heimspiele gespeichert`);
