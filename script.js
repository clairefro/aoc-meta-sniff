const cheerio = require("cheerio");

const args = process.argv.slice(2);

function parseArgs(arr) {
  const opts = { positional: [] };
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (a === "--") continue;
    if (a === "--help" || a === "-h") {
      opts.help = true;
    } else {
      opts.positional.push(a);
    }
  }
  return opts;
}

async function main() {
  const parsed = parseArgs(args);

  if (parsed.help) {
    console.log("Usage: node script.js <target>");
    console.log("       npm run sniff -- <target>");
    console.log("\nWhere <target> is:");
    console.log("  YYYY        — fetch all days in that year");
    console.log(
      "  YYYY-DD     — fetch only that single day (DD will be zero-padded in output)"
    );
    console.log("\nFlags:");
    console.log("  -h, --help   Show this help");
    return;
  }

  // Determine target: positional only
  let yr = parsed.positional[0];
  let singleDay = null;

  // if first positional is in YYYY-DD format, split it.
  if (yr && /^\d{4}-\d{1,2}$/.test(String(yr))) {
    const [y, d] = String(yr).split("-");
    yr = y;
    singleDay = d;
  } else if (parsed.positional.length > 1) {
    // support `2017 3` as well
    singleDay = parsed.positional[1];
  }

  // validation
  if (!yr) {
    console.log(
      "Err: missing arg. Please supply year. ex: `npm run sniff 2017`"
    );
    return;
  } else if (!Number.isInteger(Number(yr))) {
    console.log(
      "Err: invalid year arg. Please supply valid year. ex: `npm run sniff 2017`"
    );
    return;
  } else if (Number(yr) < 2015 || Number(yr) > 2025) {
    console.log(
      "Err: No puzzle exists for that year. Use valid year. ex: `npm run sniff 2017`"
    );
    return;
  }

  let maxDays = 25;
  if (Number(yr) > 2024) maxDays = 12;

  function buildUrl(year, day) {
    return `https://adventofcode.com/${year}/day/${day}`;
  }

  async function fetchHTML(year, day) {
    const url = buildUrl(year, day);
    try {
      const response = await fetch(url);
      if (!response.ok) return { status: response.status, html: null };
      const html = await response.text();
      return { status: response.status, html };
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      return { status: null, html: null };
    }
  }

  function extractSpanTitles(html) {
    const $ = cheerio.load(html);
    const results = [];
    $("span[title]").each((index, element) => {
      const title = $(element).attr("title");
      const text = $(element).text().trim();
      results.push({ text, title });
    });
    return results;
  }

  // shared: process an array of days
  async function processDays(year, days, { stopOn404 = true } = {}) {
    const allResults = [];
    for (const d of days) {
      const padded = String(d).padStart(2, "0");
      console.log(`Fetching ${year}-${padded}...`);

      const result = await fetchHTML(year, d);

      if (result.status === 404) {
        console.log(`Day ${padded} not found (404).`);
        if (stopOn404) break;
        allResults.push({ day: d, titles: [] });
        continue;
      }

      if (!result.html) {
        console.log(`No HTML returned for ${year}-${padded}.`);
        allResults.push({ day: d, titles: [] });
        continue;
      }

      console.log(`Fetched ${year}-${padded} (${result.html.length} chars)`);
      const titles = extractSpanTitles(result.html);
      console.log(`Found ${titles.length} spans with title attributes:`);
      allResults.push({ day: d, titles });
    }
    return allResults;
  }

  function displayResults(results) {
    if (!results.length) return;
    console.log("------------");
    console.log("Found hidden messages!");
    console.log("------------\n");
    results.forEach((entry) => {
      const padded = String(entry.day).padStart(2, "0");
      if (!entry.titles || !entry.titles.length) return;
      console.log(`Day ${padded}:\n`);
      entry.titles.forEach((result) => {
        console.log(`"${result.text}"`);
        console.log(`${result.title}`);
        console.log("");
      });
      console.log("-----------");
    });
  }

  if (singleDay) {
    if (!Number.isInteger(Number(singleDay))) {
      console.log("Err: invalid day. Supply a numeric day (e.g. 3 or 03).");
      return;
    }
    const day = Number(singleDay);
    if (day < 1 || day > maxDays) {
      console.log(`Err: day must be between 1 and ${maxDays}`);
      return;
    }

    const results = await processDays(yr, [day]);
    if (!results.length) {
      console.log("No hidden messages found :(");
      return;
    }
    displayResults(results);
  } else {
    const days = Array.from({ length: maxDays }, (_, i) => i + 1);
    const results = await processDays(yr, days);
    if (!results.length) {
      console.log("No hidden messages found :(");
      return;
    }
    displayResults(results);
  }
}

main().catch(console.error);
