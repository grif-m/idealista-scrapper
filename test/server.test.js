const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../src/server");

async function withServer(run, options) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health endpoint reports service status", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("scrap endpoint validates input and passes it to the scraper", async () => {
  const expected = [{ price: 385000, currency: "€" }];
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/scrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseUrl: "https://www.idealista.pt/en/", maxResults: 12 })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
  }, {
    scrape: async (input) => {
      assert.deepEqual(input, { baseUrl: "https://www.idealista.pt/en/", maxResults: 12 });
      return expected;
    }
  });
});

test("scrap endpoint rejects URLs outside Idealista Portugal", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/scrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseUrl: "http://localhost/private", maxResults: 1 })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /idealista\.pt/);
  });
});