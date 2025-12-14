import fs from "fs";

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;

// Bundesliga-Saisonlogik
const SEASON = month >= 7 ? String(year) : String(year - 1);

console.log(`📅 Verwende Bundesliga-Saison: ${SEASON}/${Number(SEASON) + 1}`);

const API_URL = `https://api.openligadb.de/getmatchdata/bl1/${SEASON}`;
const OUTPUT = "data/events_rb.json";

console.log("⚽ Lade Bundesliga-Spiele von OpenLigaDB …");

const response = await fetch(API_URL);
if (!response.ok) {
  throw new Error(`OpenLigaDB Fehler: ${response.status}`);
}

const matches = await response.json();

const events = matches
  .filter(match => {
    if (!match.matchDateTime) return false;

    const isRB =
      match.team1?.teamName === "RB Leipzig" ||
      match.team2?.teamName === "RB Leipzig";

    // Heimspiel-Heuristik:
    // Stadion bekannt ODER RB als team1 eingetragen
    const isHomeGame =
      match.location?.locationStadium?.toLowerCase().includes("leipzig") ||
      match.team1?.teamName === "RB Leipzig";

    return isRB && isHomeGame;
  })
  .map(match => {
    const dt = new Date(match.matchDateTime);

    const dateISO = dt.toISOString().slice(0, 10);
    const time = dt.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const opponent =
      match.team1?.teamName === "RB Leipzig"
        ? match.team2?.teamName
        : match.team1?.teamName;

    return {
      title: opponent
        ? `RB Leipzig – ${opponent}`
        : "RB Leipzig – Gegner offen",
      startDate: dateISO,
      endDate: dateISO,
      date: `${dt.toLocaleDateString("de-DE")} · ${time}`,
      location: match.location?.locationStadium || "Red Bull Arena (geplant)",
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
