import assert from "node:assert/strict";

const baseUrl = (process.env.VERIFY_BASE_URL || "https://simplnewsletter.onrender.com").replace(/\/$/, "");
const schoolId = process.env.VERIFY_SCHOOL_ID;
const expectedRevision = process.env.VERIFY_REVISION;

if (!schoolId) throw new Error("VERIFY_SCHOOL_ID is required.");

let checks = 0;
function expect(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
}
function includes(actual, expected, label) {
  assert.ok(actual?.includes(expected), `${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  checks += 1;
}
function oneOf(actual, expected, label) {
  assert.ok(expected.includes(actual), `${label}: expected ${JSON.stringify(actual)} to be one of ${JSON.stringify(expected)}`);
  checks += 1;
}

async function request(path, init) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
}

const home = await request("/");
expect(home.status, 200, "home is available");
includes(home.headers.get("strict-transport-security"), "max-age=63072000", "HSTS");
includes(home.headers.get("content-security-policy"), "frame-ancestors 'none'", "CSP frame protection");
includes(home.headers.get("content-security-policy"), "object-src 'none'", "CSP object protection");
expect(home.headers.get("x-content-type-options"), "nosniff", "MIME sniffing disabled");
expect(home.headers.get("x-frame-options"), "DENY", "frame header");
expect(home.headers.get("referrer-policy"), "strict-origin-when-cross-origin", "referrer policy");
includes(home.headers.get("permissions-policy"), "camera=()", "permissions policy");
expect(home.headers.get("x-powered-by"), null, "framework disclosure removed");
expect(home.headers.get("cache-control"), "no-store", "HTML is not shared-cached");

const health = await request("/api/health");
expect(health.status, 200, "health status");
expect(health.headers.get("cache-control"), "no-store", "health no-store");
const healthBody = await health.json();
expect(healthBody.status, "ok", "health body");
expect(healthBody.service, "simplnewsletter", "health service identity");
expect(healthBody.revision === "unknown", false, "deployed revision is reported");
if (expectedRevision) expect(healthBody.revision, expectedRevision, "exact deployed revision");

const config = await request("/api/system/config");
expect(config.status, 200, "public config available");
const configBody = await config.json();
expect("providers" in configBody.config, false, "provider configuration is not disclosed");

const policy = await request("/api/media/policy");
expect(policy.status, 200, "media policy available");
const policyText = JSON.stringify(await policy.json()).toLowerCase();
expect(policyText.includes("svg"), false, "SVG upload is excluded");

for (const path of ["/api/members", "/api/schools", "/api/newsletters", "/api/signup-codes"]) {
  const response = await request(path);
  expect(response.status, 401, `${path} rejects signed-out access`);
  expect(response.headers.get("cache-control"), "no-store", `${path} is not cached`);
}

const crossSite = await request("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://attacker.invalid" },
  body: "{}"
});
expect(crossSite.status, 403, "cross-site mutation rejected");

const seededSignup = await request("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: `security-${Date.now()}@invalid.example`, password: "Correct-Horse-99!", signupCode: "thewire" })
});
expect(seededSignup.status, 400, "seeded signup code disabled");
const seededBody = await seededSignup.json();
expect(seededBody.message, "Signup could not be completed. Check your details and signup code.", "signup error is generic");
expect(JSON.stringify(seededBody).toLowerCase().includes("supabase"), false, "signup does not leak provider errors");

const webhook = await request(`/api/schools/webhook-input/${schoolId}`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ prompt: "security probe", callbackUrl: "https://127.0.0.1/callback" })
});
oneOf(webhook.status, [400, 401], "webhook fails closed without a usable secret");
const webhookBody = await webhook.json();
expect("jobId" in webhookBody, false, "rejected webhook creates no job");

const revise = await request(`/api/schools/webhook-input/${schoolId}/revise`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ prompt: "security probe" })
});
oneOf(revise.status, [400, 401], "revision webhook fails closed without a usable secret");
const reviseBody = await revise.json();
expect("jobId" in reviseBody, false, "rejected revision creates no job");

const missingSchool = await request("/schools/00000000-0000-4000-8000-000000000000");
expect(missingSchool.status, 404, "unknown school is not exposed");
includes(missingSchool.headers.get("content-security-policy"), "base-uri 'self'", "CSP applies to errors");

console.log(JSON.stringify({ status: "ok", baseUrl, checks, revision: healthBody.revision }));
