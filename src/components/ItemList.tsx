import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  type Item,
} from "@/lib/types";
import ItemLinks from "@/components/ItemLinks";

function bestPrice(item: Item): number | null {
  const prices: number[] = [];
  for (const l of item.item_links) {
    const p = l.store_links?.current_price;
    if (p !== null && p !== undefined) prices.push(Number(p));
  }
  return prices.length ? Math.min(...prices) : null;
}

function PriceBadge({ item }: { item: Item }) {
  const best = bestPrice(item);
  if (best === null) {
    return (
      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
        No price yet
      </span>
    );
  }
  const target = item.target_price !== null ? Number(item.target_price) : null;
  if (target !== null && best <= target) {
    return (
      <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700">
        {"Target hit: $" + best.toFixed(2)}
      </span>
    );
  }
  if (target !== null) {
    return (
      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
        {"Best $" + best.toFixed(2) + " ($" + (best - target).toFixed(2) + " above)"}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
      {"Best $" + best.toFixed(2)}
    </span>
  );
}

export default function ItemList({
  items,
  onDelete,
  onChanged,
}: {
  items: Item[];
  onDelete: (id: string) => void;
  onChanged: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 text-sm font-medium">
        Wishlist ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">
          Nothing here yet. Add your first product above.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={"px-2 py-0.5 rounded-md " + PRIORITY_COLOR[item.priority]}>
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                    <span className="text-gray-500">
                      {item.target_price !== null
                        ? "Target $" + Number(item.target_price).toFixed(2)
                        : "No target set"}
                    </span>
                    <PriceBadge item={item} />
                  </div>
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-xs text-gray-500 underline shrink-0"
                >
                  Delete
                </button>
              </div>
              <ItemLinks
                itemId={item.id}
                links={item.item_links}
                onChanged={onChanged}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}