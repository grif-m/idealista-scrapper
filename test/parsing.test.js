const test = require("node:test");
const assert = require("node:assert/strict");
const { parseArea, parseFloor, parsePrice, parsePriceByArea, parseRooms } = require("../src/parsing");

test("parses Portuguese listing price and currency", () => {
  assert.deepEqual(parsePrice("385.000 €"), { price: 385000, currency: "€" });
});

test("parses area and localized decimal values", () => {
  assert.equal(parseArea("76 m²"), 76);
  assert.equal(parseArea("76,5 m²"), 76.5);
  assert.equal(parseArea("T2 76 m²"), 76);
});

test("parses listing room type and price per area", () => {
  assert.equal(parseRooms("T2, 76 m²"), "T2");
  assert.equal(parsePriceByArea("5.066 €/m²"), 5066);
});

test("selects the floor detail", () => {
  assert.equal(parseFloor(["T2", "76 m²", "2º andar sem elevador"]), "2º andar sem elevador");
});