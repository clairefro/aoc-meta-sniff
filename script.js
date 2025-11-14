const cheerio = require("cheerio");

// Access argv outside the async function
const args = process.argv.slice(2);

async function main() {
  const yr = args[0];

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

  if (parseInt(yr) > 2024) {
    maxDays = 12;
  }

  function buildUrl(year, day) {
    return `https://adventofcode.com/${year}/day/${day}`;
  }

  async function fetchHTML(year, day) {
    const url = buildUrl(year, day);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return { status: response.status, html: null };
      }

      const html = await response.text();
      return { status: response.status, html };
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      return { status: null, html: null };
    }
  }

  function extractSpanTitles(html) {
    const $ = cheerio.load(html);
    const titles = [];

    $("span[title]").each((index, element) => {
      const title = $(element).attr("title");
      titles.push(title);
    });

    return titles;
  }

  async function process(year) {
    const allTitles = [];
    for (let i = 1; i <= maxDays; i++) {
      console.log(`Fetching ${year} day ${i}...`);

      const result = await fetchHTML(year, i);

      if (result.status === 404) {
        console.log(`Day ${i} not found (404). Stopping.`);
        break;
      }

      if (result.html) {
        console.log(`Fetched day ${i} (${result.html.length} chars)`);

        const titles = extractSpanTitles(result.html);
        console.log(`Found ${titles.length} spans with title attributes:`);

        allTitles.push(titles);
      }
    }

    if (!allTitles.length) {
      console.log("No hidden messages found :(");
      return;
    }

    console.log("------------");
    console.log("Found midden messages!");
    console.log("------------\n");
    allTitles.forEach((t, i) => {
      console.log(`Day ${i + 1}:\n`);
      console.log(t.join("\n\n"));
      console.log("-----------");
    });
    return;
  }

  await process(yr);
}

main().catch(console.error);
