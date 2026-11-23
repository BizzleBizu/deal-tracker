import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  type Item,
} from "@/lib/types";

export default function ItemList({
  items,
  onDelete,
}: {
  items: Item[];
  onDelete: (id: string) => void;
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
            <li key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-md ${PRIORITY_COLOR[item.priority]}`}>
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                  <span className="text-gray-500">
                    {item.target_price !== null
                      ? `Target $${Number(item.target_price).toFixed(2)}`
                      : "No target set"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="text-xs text-gray-500 underline shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}