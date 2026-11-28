"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Alert = {
  id: string;
  type: "target_hit" | "price_drop" | "check_failed";
  message: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_LABEL: Record<Alert["type"], string> = {
  target_hit: "Target hit",
  price_drop: "Price drop",
  check_failed: "Check failed",
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("alerts")
      .select("id, type, message, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setError("Could not load alerts.");
      return;
    }
    setAlerts((data ?? []) as Alert[]);
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      await load();
      setLoading(false);
    }
    init();
  }, [router, load]);

  async function markAllRead() {
    setError(null);
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("is_read", false);
    if (error) {
      setError("Could not mark alerts as read.");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    setError(null);
    const { error } = await supabase.from("alerts").delete().eq("id", id);
    if (error) {
      setError("Could not delete that alert.");
      return;
    }
    await load();
  }

  if (loading) {
    return <main className="p-6 text-gray-500">Loading...</main>;
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Alerts</h1>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={markAllRead} className="text-gray-600 underline">
              Mark all read
            </button>
            <Link href="/" className="text-gray-600 underline">
              Back
            </Link>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="bg-white rounded-xl border border-gray-200">
          {alerts.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No alerts yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={"p-4 " + (a.is_read ? "" : "bg-blue-50")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-600">
                        {TYPE_LABEL[a.type]}
                      </div>
                      <div className="text-sm mt-0.5">{a.message}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(a.id)}
                      className="text-xs text-gray-500 underline shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}