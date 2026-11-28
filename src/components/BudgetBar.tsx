"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

function bestPrice(item: Item): number | null {
  const prices: number[] = [];
  for (const l of item.item_links) {
    const p = l.store_links?.current_price;
    if (p !== null && p !== undefined) prices.push(Number(p));
  }
  return prices.length ? Math.min(...prices) : null;
}

function money(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function BudgetBar({ items }: { items: Item[] }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [budget, setBudget] = useState(0);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("budget")
        .single();
      if (data) setBudget(Number(data.budget));
    }
    load();
  }, []);

  const watching = items.filter((i) => i.status === "watching");
  let total = 0;
  let missing = 0;
  for (const item of watching) {
    const best = bestPrice(item);
    if (best === null) missing++;
    else total += best;
  }
  const remaining = budget - total;
  const over = budget > 0 && total > budget;
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  async function save() {
    setError(null);
    const value = Number(input);
    if (Number.isNaN(value) || value < 0) {
      setError("Enter a budget of zero or more.");
      return;
    }
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ budget: value })
      .eq("id", userId);
    if (error) {
      setError("Could not save your budget.");
      return;
    }
    setBudget(value);
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Budget</div>
          <div className="text-lg font-semibold">{money(budget)}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Best prices</div>
          <div className="text-lg font-semibold">{money(total)}</div>
        </div>
        <div className={"rounded-lg p-3 " + (over ? "bg-red-50" : "bg-green-50")}>
          <div className={"text-xs " + (over ? "text-red-700" : "text-green-700")}>
            {over ? "Over by" : "Remaining"}
          </div>
          <div className={"text-lg font-semibold " + (over ? "text-red-700" : "text-green-700")}>
                        {budget > 0 ? money(Math.abs(remaining)) : "—"}
          </div>
        </div>
      </div>
      <div className="h-2 rounded bg-gray-100">
        <div
          className={"h-2 rounded " + (over ? "bg-red-500" : "bg-blue-500")}
          style={{ width: pct + "%" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {missing > 0
            ? missing + " watched product" + (missing > 1 ? "s" : "") + " with no price yet"
            : "All watched products have a price"}
        </span>
        {!editing && (
          <button
            className="underline"
            onClick={() => {
              setEditing(true);
              setInput(budget > 0 ? String(budget) : "");
            }}
          >
            Edit budget
          </button>
        )}
      </div>
      {editing && (
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="Total budget ($)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            onClick={save}
            className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}