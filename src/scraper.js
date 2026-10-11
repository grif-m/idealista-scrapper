const { chromium } = require("playwright");
const { parseArea, parseFloor, parsePrice, parsePriceByArea, parseRooms } = require("./parsing");

const MAX_PAGES = 100;

async function locatorText(locator) {
  if (await locator.count() === 0) return "";
  return (await locator.first().innerText()).trim();
}

async function extractListing(listing) {
  const priceText = await locatorText(listing.locator(".item-price"));
  const price = parsePrice(priceText);
  if (!price) return null;

  const detailTexts = (await listing.locator(".item-detail-char, .item-detail").allTextContents())
    .map((text) => text.trim())
    .filter(Boolean);
  const details = detailTexts.join(" ");
  const area = detailTexts.map(parseArea).find((value) => value !== null) ?? null;
  const priceByAreaText = await locatorText(listing.locator(".item-price-per-meter, .item-price-by-area"));
  const description = await locatorText(listing.locator(".item-description"));

  return {
    price: price.price,
    currency: price.currency,
    priceByArea: parsePriceByArea(priceByAreaText) ?? (area ? Math.round(price.price / area) : null),
    rooms: parseRooms(details),
    area,
    floor: parseFloor(detailTexts),
    description
  };
}

async function findNextPage(page, currentUrl) {
  const nextLink = page.locator('a[rel="next"], .pagination a.next').first();
  if (await nextLink.count() === 0) return null;

  const href = await nextLink.getAttribute("href");
  if (!href) return null;

  const nextUrl = new URL(href, currentUrl);
  if (nextUrl.hostname !== new URL(currentUrl).hostname) return null;
  return nextUrl.href;
}

async function scrapeListings({ baseUrl, maxResults }) {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const visitedPages = new Set();

  try {
    const page = await browser.newPage();
    let currentUrl = baseUrl;

    while (currentUrl && results.length < maxResults && visitedPages.size < MAX_PAGES) {
      if (visitedPages.has(currentUrl)) break;
      visitedPages.add(currentUrl);

      const response = await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (response && !response.ok()) {
        throw new Error(`Idealista returned HTTP ${response.status()}`);
      }
      await page.locator("article.item, .item-info-container").first()
        .waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
      const articleListings = page.locator("article.item");
      const listings = await articleListings.count() > 0
        ? articleListings
        : page.locator(".item-info-container");
      const count = await listings.count();
      if (count === 0 && results.length === 0) {
        throw new Error("No listings found. Idealista may have changed its page or blocked the request.");
      }

      for (let index = 0; index < count && results.length < maxResults; index += 1) {
        const listing = await extractListing(listings.nth(index));
        if (listing) results.push(listing);
      }

      currentUrl = results.length < maxResults ? await findNextPage(page, currentUrl) : null;
    }

    return results;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeListings };