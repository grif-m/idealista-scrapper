function parseLocalizedNumber(value) {
  const cleaned = value.replace(/\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : ".";
  const separatorIndex = Math.max(lastComma, lastDot);

  if (separatorIndex === -1) return Number(cleaned);

  const decimals = cleaned.length - separatorIndex - 1;
  const isThousandsSeparator = decimals === 3 || (cleaned.includes(",") && cleaned.includes("."));
  if (isThousandsSeparator && decimals === 3) {
    return Number(cleaned.replace(/[.,]/g, ""));
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    return Number(cleaned.split(thousandsSeparator).join("").replace(decimalSeparator, "."));
  }

  return Number(cleaned.replace(decimalSeparator, "."));
}

function findNumber(text) {
  const match = text.match(/\d[\d.,\s]*/);
  if (!match) return null;

  const value = parseLocalizedNumber(match[0].trim());
  return Number.isFinite(value) ? value : null;
}

function parsePrice(text) {
  const amount = findNumber(text);
  if (amount === null) return null;

  const currencyMatch = text.match(/[€$£]/);
  return {
    price: amount,
    currency: currencyMatch?.[0] ?? "€"
  };
}

function parseArea(text) {
  const match = text.match(/(\d[\d.,]*)\s*(?:m²|m2|sqm)(?![a-z])/i);
  if (!match) return null;
  return parseLocalizedNumber(match[1].trim());
}

function parseRooms(text) {
  const typeMatch = text.match(/\bT\s*(\d+)\b/i);
  if (typeMatch) return `T${typeMatch[1]}`;

  const bedroomMatch = text.match(/\b(\d+)\s*(?:quartos?|bedrooms?)\b/i);
  return bedroomMatch ? `T${bedroomMatch[1]}` : null;
}

function parsePriceByArea(text) {
  return findNumber(text);
}

function parseFloor(texts) {
  return texts.find((text) => /andar|piso|rés do chão|r\/c|floor/i.test(text)) ?? null;
}

module.exports = { parseArea, parseFloor, parsePrice, parsePriceByArea, parseRooms };