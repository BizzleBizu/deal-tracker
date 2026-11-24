"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PRIORITY_ORDER, type Item } from "@/lib/types";
import AddItemForm from "@/components/AddItemForm";
import ItemList from "@/components/ItemList";

type Profile = { display_name: string; role: string };

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("id, name, priority, target_price, status, item_links(id, store_links(id, url, store, current_price, last_checked, status))")
      .order("created_at", { ascending: false });
    if (error) {
      setError("Could not load your wishlist.");
      return;
    }
    const sorted = ((data ?? []) as unknown as Item[]).sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );
    setItems(sorted);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, role")
        .single();
      setProfile(data);
      await loadItems();
      setChecking(false);
    }
    load();
  }, [router, loadItems]);

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this product?")) return;
    setError(null);
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) {
      setError("Could not delete that product.");
      return;
    }
    await loadItems();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) {
    return <main className="p-6 text-gray-500">Loading...</main>;
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Deal tracker</h1>
            <p className="text-sm text-gray-500">
              {profile?.display_name ?? "Signed in"}
              {profile?.role === "owner" ? " (owner)" : ""}
            </p>
          </div>
          <button onClick={signOut} className="text-sm text-gray-600 underline">
            Sign out
          </button>
        </div>
        <AddItemForm onAdded={loadItems} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ItemList items={items} onDelete={deleteItem} onChanged={loadItems} />
      </div>
    </main>
  );
}