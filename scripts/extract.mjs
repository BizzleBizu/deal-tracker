// Reads a price from a product page's built-in structured data (JSON-LD).
function findPrices(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => findPrices(n, out));
    return;
  }
  if (node.price !== undefined || node.lowPrice !== undefined) {
    out.push(node.price ?? node.lowPrice);
  }
  for (const key of Object.keys(node)) {
    if (typeof node[key] === "object") findPrices(node[key], out);
  }
}

export function extractPrice(html) {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const prices = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      findPrices(JSON.parse(m[1]), prices);
    } catch {
      // ignore pages with broken JSON
    }
  }
  for (const p of prices) {
    const n = Number(String(p).replace(/[^0-9.]/g, ""));
    if (n > 0 && n < 100000) return n;
  }
  return null;
}