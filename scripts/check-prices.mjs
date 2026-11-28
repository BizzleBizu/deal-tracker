import { createClient } from "@supabase/supabase-js";
import { extractPrice } from "./extract.mjs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const SKIP = ["Amazon", "Best Buy"]; // handled separately
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPrice(link) {
  const res = await fetch(link.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PersonalDealTracker/1.0)",
      Accept: "text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return extractPrice(await res.text());
}

const { data: links, error } = await db
  .from("store_links")
  .select("id, url, store, current_price");
if (error) {
  console.error("Could not load links:", error.message);
  process.exit(1);
}

for (const link of links) {
  if (SKIP.includes(link.store)) {
    console.log("skip", link.store);
    continue;
  }
  try {
    const price = await fetchPrice(link);
    if (price === null) throw new Error("no price found");
     const oldPrice =
      link.current_price === null ? null : Number(link.current_price);
    const changed = price !== oldPrice;
    if (changed) {
      await db
        .from("price_history")
        .insert({ link_id: link.id, price, source: "auto" });
    }
    await db
      .from("store_links")
      .update({
        current_price: price,
        last_checked: new Date().toISOString(),
        status: "ok",
      })
      .eq("id", link.id);
    console.log("ok", link.store, price);
        if (changed) {
      const { data: made, error: alertError } = await db.rpc(
        "notify_price_change",
        { p_link_id: link.id, p_old: oldPrice, p_new: price }
      );
      if (alertError) {
        console.log("alert error:", alertError.message);
      } else {
        console.log("alerts created:", (made ?? []).length);
      }
    }
  } catch (e) {
    await db.from("store_links").update({ status: "stale" }).eq("id", link.id);
    console.log("stale", link.store, e.message);
  }
  await sleep(2000);
}