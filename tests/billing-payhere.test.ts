import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  formatPayHereAmount,
  generatePayHereCheckoutHash,
  verifyPayHereNotification,
} from "../lib/billing/payhere";
import {
  addDays,
  mapPayHereStatusCode,
  shouldEnterDormant,
  statusAfterGraceExpired,
  statusAfterSuccessfulPayment,
  statusAfterTrialExpired,
  DORMANT_AFTER_READ_ONLY_DAYS,
  GRACE_DAYS,
} from "../lib/billing/transitions";

describe("PayHere hash", () => {
  it("formats minor units to 2 decimal amount", () => {
    assert.equal(formatPayHereAmount(990000), "9900.00");
    assert.equal(formatPayHereAmount(100), "1.00");
  });

  it("generates stable checkout hash", () => {
    const hash = generatePayHereCheckoutHash({
      merchantId: "1211149",
      orderId: "Order12345",
      amountMinor: 100000,
      currency: "LKR",
      merchantSecret: "secret",
    });
    assert.equal(hash.length, 32);
    assert.equal(
      hash,
      generatePayHereCheckoutHash({
        merchantId: "1211149",
        orderId: "Order12345",
        amountMinor: 100000,
        currency: "LKR",
        merchantSecret: "secret",
      }),
    );
  });

  it("verifies notify md5sig", () => {
    const merchantId = "1211149";
    const orderId = "Order12345";
    const amount = "1000.00";
    const currency = "LKR";
    const statusCode = "2";
    const secret = "secret";
    const hashedSecret = createHash("md5")
      .update(secret)
      .digest("hex")
      .toUpperCase();
    const expected = createHash("md5")
      .update(merchantId + orderId + amount + currency + statusCode + hashedSecret)
      .digest("hex")
      .toUpperCase();

    assert.equal(
      verifyPayHereNotification({
        merchantId,
        orderId,
        payhereAmount: amount,
        payhereCurrency: currency,
        statusCode,
        md5sig: expected,
        merchantSecret: secret,
      }),
      true,
    );
    assert.equal(
      verifyPayHereNotification({
        merchantId,
        orderId,
        payhereAmount: amount,
        payhereCurrency: currency,
        statusCode,
        md5sig: "DEADBEEF",
        merchantSecret: secret,
      }),
      false,
    );
  });
});

describe("subscription transitions", () => {
  it("activates to active after payment", () => {
    assert.equal(statusAfterSuccessfulPayment(), "active");
  });

  it("trial expiry enters past_due with grace", () => {
    const r = statusAfterTrialExpired();
    assert.equal(r.status, "past_due");
    assert.ok(r.graceEndsAt.getTime() > Date.now());
    assert.equal(GRACE_DAYS, 7);
  });

  it("grace expiry enters read_only", () => {
    assert.equal(statusAfterGraceExpired(), "read_only");
  });

  it("dormant after read_only window", () => {
    const since = addDays(new Date(), -(DORMANT_AFTER_READ_ONLY_DAYS + 1));
    assert.equal(shouldEnterDormant(since), true);
    assert.equal(shouldEnterDormant(new Date()), false);
  });

  it("maps PayHere status codes", () => {
    assert.equal(mapPayHereStatusCode(2), "paid");
    assert.equal(mapPayHereStatusCode(0), "pending");
    assert.equal(mapPayHereStatusCode(-1), "canceled");
    assert.equal(mapPayHereStatusCode(-2), "failed");
  });
});
