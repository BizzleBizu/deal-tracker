"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = { display_name: string; role: string };

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

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
      setChecking(false);
    }
    load();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) {
    return <main className="p-6 text-gray-500">Loading...</main>;
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Deal tracker</h1>
          <button onClick={signOut} className="text-sm text-gray-600 underline">
            Sign out
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          Signed in as <strong>{profile?.display_name ?? "unknown"}</strong>
          {profile?.role ? ` (${profile.role})` : ""}.
        </div>
      </div>
    </main>
  );
}