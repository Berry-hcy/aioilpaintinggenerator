import { randomUUID } from "node:crypto";
import { WaffoPancakeError } from "@waffo/pancake-ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_PACKS, isCreditPackId, WAFFO_MERCHANT_ID } from "@/lib/waffo/catalog";
import { createWaffoClient } from "@/lib/waffo/client";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && process.env.SITE_URL && origin !== new URL(process.env.SITE_URL).origin) {
    return Response.json({ error: "Checkout request was not from this site." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in with Google before buying credits." }, { status: 401 });

  let body: { packId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Choose a credit pack and try again." }, { status: 400 });
  }
  if (!isCreditPackId(body.packId)) return Response.json({ error: "That credit pack is not available." }, { status: 400 });

  const pack = CREDIT_PACKS[body.packId];
  const productId = pack.productId;
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl || !(process.env.WAFFO_MERCHANT_ID || WAFFO_MERCHANT_ID) || !process.env.WAFFO_PRIVATE_KEY) {
    return Response.json({ error: "Checkout is being configured. Please try again later." }, { status: 503 });
  }

  const externalId = `canvasly_${randomUUID()}`;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "The account service is not available yet." }, { status: 503 });
  }

  const { error: insertError } = await admin.from("waffo_orders").insert({
    external_id: externalId,
    user_id: user.id,
    pack_id: body.packId,
    product_id: productId,
    price: pack.price,
    credits: pack.credits,
  });
  if (insertError) {
    console.error("Could not create pending checkout order", insertError);
    return Response.json({ error: "We could not start checkout. Please try again." }, { status: 503 });
  }

  try {
    const client = createWaffoClient();
    const checkout = await client.checkout.authenticated.create({
      productId,
      currency: "USD",
      buyerIdentity: user.id,
      buyerEmail: user.email,
      successUrl: new URL("/payment/success", siteUrl).toString(),
      metadata: { canvaslyPackId: body.packId },
      orderMerchantExternalId: externalId,
    });
    return Response.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    await admin.from("waffo_orders").update({ status: "failed" }).eq("external_id", externalId);
    if (error instanceof WaffoPancakeError) {
      console.error("Waffo checkout session could not be created", { status: error.status, errors: error.errors });
      if (error.status === 401) {
        return Response.json({ error: "Waffo rejected the production API key. Check that the production private key matches this merchant." }, { status: 502 });
      }
      if (error.status === 403) {
        return Response.json({ error: "Waffo has not enabled production checkout for this merchant or product. Check production approval and product access in Waffo." }, { status: 502 });
      }
      if (error.status === 404) {
        return Response.json({ error: "Waffo could not find this product in production. Check that the product ID is published in the production store." }, { status: 502 });
      }
      if (error.status === 400) {
        return Response.json({ error: "Waffo rejected the checkout details. Check that this is an active, published one-time USD product in the production store." }, { status: 502 });
      }
      if (error.status === 429) {
        return Response.json({ error: "Waffo is receiving too many requests. Please wait a moment and try again." }, { status: 502 });
      }
    } else {
      console.error("Waffo checkout session could not be created", error instanceof Error ? error.name : "Unknown error");
      if (error instanceof Error && /private key/i.test(error.message)) {
        return Response.json({ error: "The Waffo private key could not be read. Check that Vercel contains the complete production key, including its BEGIN and END lines." }, { status: 502 });
      }
    }
    return Response.json({ error: "We could not open checkout. Please try again in a moment." }, { status: 502 });
  }
}
