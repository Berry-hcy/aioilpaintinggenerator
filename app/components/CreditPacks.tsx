"use client";

import { useState } from "react";

type PackId = "starter" | "value";

export default function CreditPacks() {
  const [busyPack, setBusyPack] = useState<PackId | null>(null);
  const [error, setError] = useState("");

  async function buy(packId: PackId) {
    if (busyPack) return;
    setBusyPack(packId);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await response.json() as { checkoutUrl?: string; error?: string };
      if (response.status === 401) {
        window.location.assign("/login?next=%2F%23pricing");
        return;
      }
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Checkout is not ready yet.");
      window.location.assign(data.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not open checkout. Please try again.");
      setBusyPack(null);
    }
  }

  return (
    <div className="pricing-cards">
      <article className="price-card">
        <h3>Free</h3>
        <p className="price"><strong>$0</strong> <span>USD</span></p>
        <p className="price-blurb">See the magic on your own photo first.</p>
        <strong className="includes">Includes</strong>
        <ul><li>1 free image when you sign up</li><li>Standard-definition download</li></ul>
        <a className="button button-secondary" href="/login">Start for free <span aria-hidden="true">→</span></a>
        <p className="price-footnote">No credit card needed</p>
      </article>
      <article className="price-card">
        <h3>Starter Pack</h3>
        <p className="price"><strong>$4.99</strong> <span>USD</span></p>
        <p className="per-image">≈ $0.50 per image</p>
        <p className="price-blurb">Try it on a few favorite photos.</p>
        <strong className="includes">Includes</strong>
        <ul><li>10 images</li><li>HD downloads</li><li>Credits valid for 12 months</li></ul>
        <button className="button button-primary" type="button" disabled={busyPack !== null} onClick={() => void buy("starter")}>
          {busyPack === "starter" ? "Opening checkout…" : "Buy 10 credits"} <span aria-hidden="true">ϟ</span>
        </button>
        <p className="price-footnote">One-time payment, no auto-renewal</p>
      </article>
      <article className="price-card featured">
        <span className="best-value">Best value</span>
        <h3>Value Pack</h3>
        <p className="price"><strong>$14.99</strong> <span>USD</span></p>
        <p className="per-image">≈ $0.37 per image</p>
        <p className="price-blurb">For family photos, pets and gifts.</p>
        <strong className="includes">Includes</strong>
        <ul><li>40 images</li><li>HD downloads</li><li>Credits valid for 12 months</li></ul>
        <button className="button button-primary" type="button" disabled={busyPack !== null} onClick={() => void buy("value")}>
          {busyPack === "value" ? "Opening checkout…" : "Buy 40 credits"} <span aria-hidden="true">ϟ</span>
        </button>
        <p className="price-footnote">One-time payment, no auto-renewal</p>
      </article>
      {error && <p className="price-error" role="alert">{error}</p>}
      <p className="pricing-note">Paid credits are added after payment is confirmed and expire 12 months after purchase. One credit creates one HD painting. Your free signup credit creates one standard-definition painting.</p>
    </div>
  );
}
