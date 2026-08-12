/**
 * k6 smoke test — health + ready.
 *
 * Install: https://k6.io/docs/get-started/installation/
 * Run:    k6 run load/k6-smoke.js
 * Env:    BASE_URL=https://akura.elgiriya.com k6 run load/k6-smoke.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

function smoke() {
  const health = http.get(`${BASE}/api/health`);
  check(health, {
    "health 200": (r) => r.status === 200,
    "health ok": (r) => String(r.body).includes('"ok":true'),
  });

  const ready = http.get(`${BASE}/api/ready`);
  check(ready, {
    "ready 200": (r) => r.status === 200,
  });

  sleep(1);
}

export default smoke;
