"use client";

import { useState } from "react";
import PriceChart from "@/components/PriceChart";
import type { Item } from "@/lib/types";

export default function HistoryToggle({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  if (item.item_links.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-500 underline"
      >
        {open ? "Hide history" : "Price history"}
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-gray-50 p-3">
          <PriceChart item={item} />
        </div>
      )}
    </div>
  );
}