const baseUrl = String(process.env.E2E_BASE_URL || "http://127.0.0.1:5052").replace(/\/+$/, "");
const apiBase = `${baseUrl}/api`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, body, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // leave null
  }
  return { response, json, raw: text };
}

function extractSessionToken(response) {
  const headerValues =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  for (const value of headerValues) {
    const match = /du_session=([^;]+)/.exec(String(value));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function requireSuccess(payload, label) {
  assert(payload && payload.success === true, `${label}: expected success response`);
  return payload.data;
}

async function main() {
  const uniqueEmail = `e2e-remit-${Date.now()}@example.com`;
  const password = "TestPassw0rd!";

  const register = await request("POST", "/auth/register", {
    fullName: "Remittance Tester",
    email: uniqueEmail,
    password,
    confirmPassword: password,
  });
  assert(
    register.response.status === 201,
    `register: expected 201, got ${register.response.status} :: ${register.raw}`
  );
  const registerData = requireSuccess(register.json, "register");
  const accessToken = String(registerData?.accessToken || "");
  assert(accessToken.includes("."), "register: missing access token");
  const sessionToken = extractSessionToken(register.response);
  assert(sessionToken, "register: missing session token cookie");

  const kyc = await request(
    "POST",
    "/auth/kyc/verify",
    {},
    { Authorization: `Bearer ${sessionToken}` }
  );
  assert(
    kyc.response.status === 200,
    `kyc verify: expected 200, got ${kyc.response.status} :: ${kyc.raw}`
  );
  requireSuccess(kyc.json, "kyc verify");

  const quote = await request(
    "POST",
    "/fintech/remittance/quote",
    {
      amountSent: 50,
      currencyFrom: "EUR",
      currencyTo: "USD",
      receivingCountry: "ZW",
      originCountry: "DE",
      recipientType: "mobile_money",
      recipientMsisdn: "+263771234567",
    },
    { Authorization: `Bearer ${accessToken}` }
  );
  assert(
    quote.response.status === 200,
    `quote: expected 200, got ${quote.response.status} :: ${quote.raw}`
  );
  const quoteData = requireSuccess(quote.json, "quote");
  assert(quoteData?.quote, "quote: missing quote payload");

  const send = await request(
    "POST",
    "/fintech/remittance/send",
    {
      recipientName: "Test Recipient",
      recipientType: "mobile_money",
      provider: "EcoCash",
      payoutChannel: "Mukuru",
      amountSent: 50,
      currencyFrom: "EUR",
      currencyTo: "USD",
      receivingCountry: "ZW",
      originCountry: "DE",
      senderMsisdn: "+491234567890",
      recipient: {
        mobileNumber: "+263771234567",
      },
    },
    { Authorization: `Bearer ${accessToken}` }
  );
  assert(
    send.response.status === 201,
    `send: expected 201, got ${send.response.status} :: ${send.raw}`
  );
  const sendData = requireSuccess(send.json, "send");
  const transaction = sendData?.transaction;
  assert(transaction?.id, "send: missing transaction id");
  assert(transaction?.provider_reference, "send: missing provider_reference");

  const status = await request(
    "GET",
    `/fintech/remittance/${transaction.id}`,
    null,
    { Authorization: `Bearer ${accessToken}` }
  );
  assert(
    status.response.status === 200,
    `status: expected 200, got ${status.response.status} :: ${status.raw}`
  );
  const statusData = requireSuccess(status.json, "status");
  assert(statusData?.transaction?.id === transaction.id, "status: transaction id mismatch");

  console.log("[e2e] SUCCESS: remittance quote/send/status flow passed.");
}

main().catch((error) => {
  console.error("[e2e] FAILED:", error?.message || error);
  process.exitCode = 1;
});
