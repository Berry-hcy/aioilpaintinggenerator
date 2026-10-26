import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Payment Update | Canvasly",
  robots: { index: false, follow: true },
};

export default function PaymentSuccessPage() {
  return (
    <main className="auth-page">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-icon" aria-hidden="true">✳</span><span>canvasly</span></Link>
        <Link className="header-link" href="/account">Your account <span aria-hidden="true">↗</span></Link>
      </header>
      <section className="account-card">
        <div className="eyebrow"><span /> PAYMENT UPDATE</div>
        <h1>Thank you for your order.</h1>
        <p>Your payment is being confirmed. Credits appear in your account after Waffo securely notifies us, which can take a short moment.</p>
        <Link className="button button-primary" href="/account">Check my credits <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
