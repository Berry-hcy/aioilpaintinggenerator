import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount");

  const { data: profile } = await supabase
    .from("profiles")
    .select("generation_credits")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="auth-page">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-icon" aria-hidden="true">✳</span>
          <span>canvasly</span>
        </Link>
        <Link className="header-link" href="/">Back to generator <span aria-hidden="true">↗</span></Link>
      </header>
      <section className="account-card">
        <div className="eyebrow"><span /> YOUR ACCOUNT</div>
        <h1>Welcome to Canvasly</h1>
        <p className="account-email">{user.email}</p>
        <div className="credits-panel">
          <span>Available paintings</span>
          <strong>{profile?.generation_credits ?? 0}</strong>
        </div>
        <p>Your first credit is added automatically when you create an account. A credit is used only when a painting is successfully created.</p>
        <Link className="button button-primary" href="/">Create a painting <span aria-hidden="true">✳</span></Link>
        <form action="/auth/signout" method="post" className="signout-form">
          <button type="submit" className="text-button">Sign out</button>
        </form>
      </section>
    </main>
  );
}
