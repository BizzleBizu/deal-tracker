"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Priority } from "@/lib/types";

export default function AddItemForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<Priority>("nice_to_have");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const price = target.trim() === "" ? null : Number(target);
    if (price !== null && (Number.isNaN(price) || price <= 0)) {
      setError("Target price must be a positive number.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("wishlist_items")
      .insert({ name: trimmed, priority, target_price: price });
    setSaving(false);
    if (error) {
      setError("Could not add that product.");
      return;
    }
    setName("");
    setTarget("");
    setPriority("nice_to_have");
    onAdded();
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
    >
      <h2 className="text-sm font-medium">Add a product</h2>
      <input
        type="text"
        required
        maxLength={200}
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-3">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          <option value="must_have">Must-have</option>
          <option value="nice_to_have">Nice-to-have</option>
          <option value="only_if_cheap">Only if cheap</option>
        </select>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="Target price ($)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Adding..." : "Add product"}
      </button>
    </form>
  );
}