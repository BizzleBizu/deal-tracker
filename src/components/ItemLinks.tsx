"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseStoreLink } from "@/lib/stores";
import type { ItemLink } from "@/lib/types";

export default function ItemLinks({
  itemId,
  links,
  onChanged,
}: {
  itemId: string;
  links: ItemLink[];
  onChanged: () => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseStoreLink(url);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    let linkId: string | null = null;
    const existing = await supabase
      .from("store_links")
      .select("id")
      .eq("url", parsed.url)
      .maybeSingle();
    if (existing.data) {
      linkId = existing.data.id;
    } else {
      const created = await supabase
        .from("store_links")
        .insert({ url: parsed.url, store: parsed.store })
        .select("id")
        .single();
      if (created.error || !created.data) {
        setBusy(false);
        setError("Could not save that link.");
        return;
      }
      linkId = created.data.id;
    }
    const { error } = await supabase
      .from("item_links")
      .insert({ item_id: itemId, link_id: linkId });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "That link is already on this product."
          : "Could not attach that link."
      );
      return;
    }
    setUrl("");
    onChanged();
  }

  async function removeLink(id: string) {
    setError(null);
    const { error } = await supabase.from("item_links").delete().eq("id", id);
    if (error) {
      setError("Could not remove that link.");
      return;
    }
    onChanged();
  }

  async function savePrice(linkId: string) {
    setError(null);
    const price = Number(priceInput);
    if (Number.isNaN(price) || price <= 0) {
      setError("Enter a price above zero.");
      return;
    }
    const { error } = await supabase.rpc("submit_manual_price", {
      p_link_id: linkId,
      p_price: price,
    });
    if (error) {
      setError("Could not save that price.");
      return;
    }
    setEditing(null);
    setPriceInput("");
    onChanged();
  }

  return (
    <div className="mt-3 space-y-2">
      {links.map((l) => {
        const s = l.store_links;
        if (!s) return null;
        return (
          <div key={l.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-800 underline"
              >
                {s.store}
              </a>
              <span className="text-gray-700">
                {s.current_price !== null
                  ? "$" + Number(s.current_price).toFixed(2)
                  : "No price yet"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-gray-500">
              <button
                className="underline"
                onClick={() => {
                  setEditing(editing === s.id ? null : s.id);
                  setPriceInput("");
                }}
              >
                Enter price
              </button>
              <button className="underline" onClick={() => removeLink(l.id)}>
                Remove
              </button>
            </div>
            {editing === s.id && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Price ($)"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                />
                <button
                  onClick={() => savePrice(s.id)}
                  className="rounded bg-gray-900 px-3 py-1 text-xs text-white"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        );
      })}
      <form onSubmit={addLink} className="flex gap-2">
        <input
          type="url"
          required
          placeholder="Paste a store link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-gray-300 px-3 py-1 text-xs disabled:opacity-50"
        >
          {busy ? "Adding..." : "Add link"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}