import { WebhookEventType, verifyWebhook, type WebhookEventData } from "@waffo/pancake-ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { WAFFO_STORE_ID } from "@/lib/waffo/catalog";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event;
  try {
    event = verifyWebhook<WebhookEventData>(rawBody, request.headers.get("x-waffo-signature"), { environment: "prod" });
  } catch {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  if (event.mode !== "prod" || event.storeId !== (process.env.WAFFO_STORE_ID || WAFFO_STORE_ID)) {
    return new Response("Unexpected Waffo environment or store", { status: 400 });
  }
  const isCompleted = event.eventType === WebhookEventType.OrderCompleted;
  const isRefund = event.eventType === WebhookEventType.RefundSucceeded;
  if (!isCompleted && !isRefund) return new Response("OK");

  const externalId = event.data.orderMerchantExternalId;
  if (!externalId || !event.data.orderId) return new Response("Missing order reference", { status: 400 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Waffo webhook received before Supabase is configured", error);
    return new Response("Account service unavailable", { status: 503 });
  }

  const { data: order, error: orderError } = await admin
    .from("waffo_orders")
    .select("external_id,user_id,product_id,price,status,pack_id,waffo_order_id")
    .eq("external_id", externalId)
    .maybeSingle();
  if (orderError) {
    console.error("Could not find Waffo order", orderError);
    return new Response("Order lookup failed", { status: 503 });
  }
  if (!order) return new Response("Unknown order", { status: 404 });

  if (isCompleted) {
    if (order.status === "refunded") return new Response("OK");
    const listedPrice = Number(event.data.listPrice?.subtotal ?? event.data.amount);
    if (
      event.data.currency !== "USD" ||
      !Number.isFinite(listedPrice) ||
      Math.abs(listedPrice - Number(order.price)) > 0.001 ||
      event.data.merchantProvidedBuyerIdentity !== order.user_id ||
      event.data.orderMetadata?.canvaslyPackId !== order.pack_id
    ) {
      console.error("Waffo order details did not match the pending order", { orderId: event.data.orderId, externalId });
      return new Response("Order details did not match", { status: 400 });
    }

    const { error: fulfillError } = await admin.rpc("fulfill_waffo_credit_order", {
      p_external_id: externalId,
      p_waffo_order_id: event.data.orderId,
    });
    if (fulfillError) {
      console.error("Could not fulfill completed Waffo order", fulfillError);
      return new Response("Credit fulfillment failed", { status: 503 });
    }
  } else {
    const { error: refundError } = await admin.rpc("revoke_waffo_refunded_order", {
      p_external_id: externalId,
      p_waffo_order_id: event.data.orderId,
    });
    if (refundError) {
      console.error("Could not revoke refunded Waffo credits", refundError);
      return new Response("Refund credit update failed", { status: 503 });
    }
  }

  return new Response("OK");
}
