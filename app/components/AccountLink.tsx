"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountLink() {
  const [email, setEmail] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let active = true;

    async function refresh(userId: string | null, userEmail: string | null) {
      if (!active) return;
      setEmail(userEmail);
      if (!userId) {
        setCredits(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("generation_credits")
        .eq("id", userId)
        .maybeSingle();
      if (active) setCredits(data?.generation_credits ?? 0);
    }

    void supabase.auth.getUser().then(({ data }) => refresh(data.user?.id ?? null, data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void refresh(session?.user.id ?? null, session?.user.email ?? null);
    });
    const onCreditsUpdated = () => {
      void supabase.auth.getUser().then(({ data }) => refresh(data.user?.id ?? null, data.user?.email ?? null));
    };
    window.addEventListener("credits-updated", onCreditsUpdated);

    return () => {
      active = false;
      window.removeEventListener("credits-updated", onCreditsUpdated);
      subscription.unsubscribe();
    };
  }, []);

  return email ? (
    <Link className="account-link" href="/account">
      <span>{credits === null ? "Account" : `${credits} ${credits === 1 ? "credit" : "credits"}`}</span>
      <span className="account-link-email">{email}</span>
    </Link>
  ) : (
    <Link className="account-link" href="/login">Sign in</Link>
  );
}
