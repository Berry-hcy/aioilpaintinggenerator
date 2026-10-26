import { randomUUID } from "node:crypto";
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
    console.error("Waffo checkout session could not be created", error);
    return Response.json({ error: "We could not open checkout. Please try again in a moment." }, { status: 502 });
  }
}
