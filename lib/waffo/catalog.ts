export const CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    price: "4.99",
    credits: 10,
    productId: "PROD_4LC4J7rTFjEUfhIbWUAo3f",
  },
  value: {
    name: "Value Pack",
    price: "14.99",
    credits: 40,
    productId: "PROD_6gnFW3O3uBWDmALdZyfxwW",
  },
} as const;

export const WAFFO_MERCHANT_ID = "MER_0yHjC1rru8E430b6FTZcxZ";
export const WAFFO_STORE_ID = "STO_6BuljBQBnDHTFJjx6Y9kQ2";

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function isCreditPackId(value: unknown): value is CreditPackId {
  return typeof value === "string" && value in CREDIT_PACKS;
}
