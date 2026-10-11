const http = require("node:http");
const { scrapeListings } = require("./scraper");

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_RESULTS = 1000;

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let receivedBytes = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      if (tooLarge) return;
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw Object.assign(new Error("Request body must be a JSON object"), { statusCode: 400 });
  }
  if (typeof payload.baseUrl !== "string") {
    throw Object.assign(new Error("baseUrl must be a URL string"), { statusCode: 400 });
  }

  let url;
  try {
    url = new URL(payload.baseUrl);
  } catch {
    throw Object.assign(new Error("baseUrl must be a valid URL"), { statusCode: 400 });
  }
  if (url.protocol !== "https:" || !/(^|\.)idealista\.pt$/i.test(url.hostname)) {
    throw Object.assign(new Error("baseUrl must use HTTPS and an idealista.pt hostname"), { statusCode: 400 });
  }

  const maxResults = payload.maxResults ?? 200;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > MAX_RESULTS) {
    throw Object.assign(new Error(`maxResults must be an integer from 1 to ${MAX_RESULTS}`), { statusCode: 400 });
  }

  return { baseUrl: url.href, maxResults };
}

function createServer({ scrape = scrapeListings } = {}) {
  let activeScrapes = 0;

  return http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method !== "POST" || request.url !== "/scrap") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    try {
      const payload = validatePayload(await readJson(request));
      if (activeScrapes >= 2) {
        sendJson(response, 503, { error: "Scraper is busy; retry shortly" });
        return;
      }

      activeScrapes += 1;
      try {
        sendJson(response, 200, await scrape(payload));
      } finally {
        activeScrapes -= 1;
      }
    } catch (error) {
      const statusCode = error.statusCode ?? 502;
      if (statusCode === 502) console.error("Scraping failed:", error.message);
      sendJson(response, statusCode, { error: statusCode === 502 ? "Scraping failed" : error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 80);
  const server = createServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`Idealista scraper listening on port ${port}`);
  });
}

module.exports = { createServer, validatePayload };