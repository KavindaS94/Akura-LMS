import { createHash } from "node:crypto";

export function formatPayHereAmount(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

export function generatePayHereCheckoutHash(opts: {
  merchantId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  merchantSecret: string;
}): string {
  const hashedSecret = createHash("md5")
    .update(opts.merchantSecret)
    .digest("hex")
    .toUpperCase();
  const amount = formatPayHereAmount(opts.amountMinor);
  return createHash("md5")
    .update(
      opts.merchantId + opts.orderId + amount + opts.currency + hashedSecret,
    )
    .digest("hex")
    .toUpperCase();
}

export function verifyPayHereNotification(opts: {
  merchantId: string;
  orderId: string;
  payhereAmount: string;
  payhereCurrency: string;
  statusCode: string;
  md5sig: string;
  merchantSecret: string;
}): boolean {
  const hashedSecret = createHash("md5")
    .update(opts.merchantSecret)
    .digest("hex")
    .toUpperCase();
  const local = createHash("md5")
    .update(
      opts.merchantId +
        opts.orderId +
        opts.payhereAmount +
        opts.payhereCurrency +
        opts.statusCode +
        hashedSecret,
    )
    .digest("hex")
    .toUpperCase();
  return local === opts.md5sig.toUpperCase();
}

export function isPayHereConfigured(): boolean {
  return Boolean(
    process.env.PAYHERE_MERCHANT_ID &&
      process.env.PAYHERE_MERCHANT_SECRET &&
      process.env.NEXT_PUBLIC_SITE_URL,
  );
}

export function payHereCheckoutUrl(): string {
  const sandbox = process.env.PAYHERE_SANDBOX !== "false";
  return sandbox
    ? "https://sandbox.payhere.lk/pay/checkout"
    : "https://www.payhere.lk/pay/checkout";
}

export function payHereRecurrence(cycle: "monthly" | "yearly"): string {
  return cycle === "yearly" ? "1 Year" : "1 Month";
}
