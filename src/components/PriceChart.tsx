"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

type Point = { link_id: string; price: number; recorded_at: string };

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];

export default function PriceChart({ item }: { item: Item }) {
  const [points, setPoints] = useState<Point[] | null>(null);

  const links = item.item_links
    .map((l) => l.store_links)
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const linkKey = links.map((l) => l.id).join(",");

  useEffect(() => {
    if (!linkKey) {
      setPoints([]);
      return;
    }
    supabase
      .from("price_history")
      .select("link_id, price, recorded_at")
      .in("link_id", linkKey.split(","))
      .order("recorded_at", { ascending: true })
      .limit(500)
      .then(({ data }) => setPoints((data ?? []) as Point[]));
  }, [linkKey]);

  if (points === null) {
    return <p className="text-xs text-gray-500">Loading history...</p>;
  }
  if (points.length < 2) {
    return <p className="text-xs text-gray-500">Not enough history yet.</p>;
  }

  const target = item.target_price !== null ? Number(item.target_price) : null;
  const times = points.map((p) => new Date(p.recorded_at).getTime());
  const prices = points.map((p) => Number(p.price));
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  let minP = Math.min(...prices);
  let maxP = Math.max(...prices);
  if (target !== null) {
    minP = Math.min(minP, target);
    maxP = Math.max(maxP, target);
  }
  if (minP === maxP) {
    minP = minP - 1;
    maxP = maxP + 1;
  }

  const W = 320;
  const H = 120;
  const PAD = 8;
  const x = (t: number) =>
    maxT === minT ? W / 2 : PAD + ((t - minT) / (maxT - minT)) * (W - PAD * 2);
  const y = (p: number) => H - PAD - ((p - minP) / (maxP - minP)) * (H - PAD * 2);

  return (
    <div className="space-y-2">
      <svg viewBox={"0 0 " + W + " " + H} className="w-full h-28" role="img" aria-label="Price history">
        {target !== null && (
          <line
            x1={PAD}
            x2={W - PAD}
            y1={y(target)}
            y2={y(target)}
            stroke="#9ca3af"
            strokeDasharray="4 4"
          />
        )}
        {links.map((l, i) => {
          const own = points.filter((p) => p.link_id === l.id);
          if (own.length === 0) return null;
          const color = COLORS[i % COLORS.length];
          const path = own
            .map((p) => x(new Date(p.recorded_at).getTime()) + "," + y(Number(p.price)))
            .join(" ");
          const last = own[own.length - 1];
          return (
            <g key={l.id}>
              {own.length > 1 && (
                <polyline points={path} fill="none" stroke={color} strokeWidth="2" />
              )}
              <circle
                cx={x(new Date(last.recorded_at).getTime())}
                cy={y(Number(last.price))}
                r="3"
                fill={color}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        {links.map((l, i) => (
          <span key={l.id} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {l.store}
          </span>
        ))}
        {target !== null && (
          <span className="text-gray-500">
            Dashed line: target ${target.toFixed(2)}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500">
        {"Range: $" + Math.min(...prices).toFixed(2) + " to $" + Math.max(...prices).toFixed(2)}
      </div>
    </div>
  );
}