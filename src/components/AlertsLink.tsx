"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AlertsLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false)
      .then(({ count }) => setCount(count ?? 0));
  }, []);

  return (
    <Link href="/alerts" className="text-sm text-gray-600 underline">
      {count > 0 ? "Alerts (" + count + ")" : "Alerts"}
    </Link>
  );
}