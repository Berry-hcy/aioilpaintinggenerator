import { WaffoPancake } from "@waffo/pancake-ts";
import { WAFFO_MERCHANT_ID } from "@/lib/waffo/catalog";

export function createWaffoClient() {
  const merchantId = process.env.WAFFO_MERCHANT_ID || WAFFO_MERCHANT_ID;
  const privateKey = process.env.WAFFO_PRIVATE_KEY;
  if (!merchantId || !privateKey) throw new Error("Waffo server credentials are not configured.");
  return new WaffoPancake({ merchantId, privateKey });
}
