import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const instant = false;

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount");

  let credits = 0;
  try {
    const { data } = await createAdminClient().rpc("get_available_generation_credits", { p_user_id: user.id });
    credits = Number(data ?? 0);
  } catch {
    credits = 0;
  }

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
          <strong>{credits}</strong>
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
