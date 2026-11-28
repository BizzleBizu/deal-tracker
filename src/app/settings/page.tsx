"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }
      setUserId(u.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .single();
      if (data) setName(data.display_name);
      setLoading(false);
    }
    init();
  }, [router]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60 || !userId) {
      setNameMsg("Enter a name up to 60 characters.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);
    setNameMsg(error ? "Could not save your name." : "Name saved.");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (password.length < 12) {
      setPwMsg("Use at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setPwMsg("The two passwords don't match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPwMsg("Could not change your password. Try a longer or different one.");
      return;
    }
    setPassword("");
    setConfirm("");
    setPwMsg("Password changed.");
  }

  if (loading) {
    return <main className="p-6 text-gray-500">Loading...</main>;
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link href="/" className="text-sm text-gray-600 underline">
            Back
          </Link>
        </div>

        <form
          onSubmit={saveName}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-medium">Display name</h2>
          <input
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm"
          >
            Save name
          </button>
          {nameMsg && <p className="text-sm text-gray-600">{nameMsg}</p>}
        </form>

        <form
          onSubmit={savePassword}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-medium">Change password</h2>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (12+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm"
          >
            Change password
          </button>
          {pwMsg && <p className="text-sm text-gray-600">{pwMsg}</p>}
        </form>
      </div>
    </main>
  );
}