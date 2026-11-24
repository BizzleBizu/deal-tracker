const STORES: { name: string; domains: string[] }[] = [
  { name: "Amazon", domains: ["amazon.com"] },
  { name: "Best Buy", domains: ["bestbuy.com"] },
  { name: "B&H", domains: ["bhphotovideo.com"] },
  { name: "Micro Center", domains: ["microcenter.com"] },
  { name: "Unifi Store", domains: ["store.ui.com"] },
  { name: "Dell", domains: ["dell.com"] },
];

const TRACKING_PARAMS = ["gclid", "fbclid", "msclkid", "cmpid", "icid"];

export const STORE_NAMES = STORES.map((s) => s.name);

export type ParsedLink = { url: string; store: string };

export function parseStoreLink(raw: string): ParsedLink | { error: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { error: "That doesn't look like a valid link." };
  }
  if (u.protocol !== "https:") {
    return { error: "Links must start with https://" };
  }
  const host = u.hostname.toLowerCase();
  const store = STORES.find((s) =>
    s.domains.some((d) => host === d || host.endsWith("." + d))
  );
  if (!store) {
    return { error: "Supported stores: " + STORE_NAMES.join(", ") + "." };
  }
  u.hash = "";
  u.username = "";
  u.password = "";
  if (store.name === "Amazon") {
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (m) {
      return {
        url: "https://www.amazon.com/dp/" + m[1].toUpperCase(),
        store: store.name,
      };
    }
  }
  for (const k of Array.from(u.searchParams.keys())) {
    const key = k.toLowerCase();
    if (key.startsWith("utm_") || TRACKING_PARAMS.includes(key)) {
      u.searchParams.delete(k);
    }
  }
  return { url: u.toString(), store: store.name };
}