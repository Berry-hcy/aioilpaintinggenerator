import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const redirectOrigin = process.env.SITE_URL || origin;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.redirect(new URL("/login?error=setup", origin));
  }
  const requestedNext = searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${redirectOrigin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }

  return NextResponse.redirect(data.url);
}
