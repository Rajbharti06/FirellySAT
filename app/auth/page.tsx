"use client";

import { FormEvent, useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { getSupabaseBrowserClient, hasSupabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Use demo mode or connect Supabase env vars.");

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const onSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setMessage("Sign in simulated. Configure Supabase keys to enable real auth.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Signed in successfully.");
  };

  const onSignUp = async () => {
    if (!supabase) {
      setMessage("Sign up simulated. Configure Supabase keys to enable real auth.");
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : "Signed up successfully.");
  };

  return (
    <SiteShell
      title="Authentication"
      subtitle="Email/password authentication with Supabase-backed or demo fallback flows."
    >
      <form onSubmit={onSignIn} className="max-w-md space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm dark:border-slate-700"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm dark:border-slate-700"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              void onSignUp();
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Sign up
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      {!hasSupabase && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to activate backend auth.
        </p>
      )}
    </SiteShell>
  );
}
