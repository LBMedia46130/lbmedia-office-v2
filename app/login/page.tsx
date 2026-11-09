"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [supabase] = useState(() => url && key ? createBrowserClient(url, key) : null);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setChecking(false);
      return;
    }
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (!authError && data.user) {
        router.replace("/");
        router.refresh();
      } else {
        setChecking(false);
      }
    }).catch(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [router, supabase]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase) { setError("Configuration Supabase manquante."); return; }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (authError) throw authError;
      if (!data.user) throw new Error("Supabase n'a pas retourné d'utilisateur.");
      setPassword("");
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">LBMedia Office</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Connexion</h1>
        <p className="mt-3 text-sm text-slate-600">Accès réservé à LBMedia.</p>
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {checking ? <p className="mt-6 text-sm text-slate-600">Vérification de la session…</p> : (
          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label htmlFor="office-email" className="mb-2 block text-sm font-semibold text-slate-700">Adresse e-mail</label>
              <input id="office-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900" />
            </div>
            <div>
              <label htmlFor="office-password" className="mb-2 block text-sm font-semibold text-slate-700">Mot de passe</label>
              <input id="office-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900" />
            </div>
            <button disabled={loading} type="submit" className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{loading ? "Connexion…" : "Se connecter"}</button>
          </form>
        )}
      </div>
    </section>
  );
}