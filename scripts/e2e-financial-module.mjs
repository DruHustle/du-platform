const baseUrl = String(process.env.E2E_BASE_URL || "http://127.0.0.1:5057").replace(/\/+$/, "");

let cookieJar = "";

function unwrapPayload(json) {
  if (json && typeof json === "object" && json.success === true && "data" in json) {
    return json.data;
  }
  return json;
}

function updateCookieJarFromResponse(response) {
  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);

  for (const rawCookie of cookies) {
    if (!rawCookie) continue;
    const pair = String(rawCookie).split(";")[0]?.trim();
    if (!pair) continue;

    const [name] = pair.split("=");
    if (!name) continue;

    const parts = cookieJar
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .filter((chunk) => !chunk.startsWith(`${name}=`));

    parts.push(pair);
    cookieJar = parts.join("; ");
  }
}

async function request(path, { method = "GET", body, headers = {}, expectedStatus } = {}) {
  const requestHeaders = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };
  if (cookieJar) requestHeaders.Cookie = cookieJar;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  updateCookieJarFromResponse(response);

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`Expected ${method} ${path} -> ${expectedStatus}, received ${response.status}. Body: ${text}`);
  }

  return { response, json, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const now = Date.now();
  const email = `fin.e2e.${now}@example.com`;
  const password = "StrongPass123!";

  console.log(`[e2e] Base URL: ${baseUrl}`);
  console.log(`[e2e] Registering test user: ${email}`);

  const registerResult = await request("/api/auth/register", {
    method: "POST",
    body: {
      fullName: "Financial E2E User",
      email,
      password,
      confirmPassword: password,
    },
    expectedStatus: 201,
  });

  let accessToken = String(unwrapPayload(registerResult.json)?.accessToken || "").trim();

  if (!accessToken) {
    const tokenResult = await request("/api/auth/token/refresh", {
      method: "POST",
      expectedStatus: 200,
    });
    accessToken = String(unwrapPayload(tokenResult.json)?.accessToken || "").trim();
  }

  assert(accessToken.length > 20, "JWT access token was not issued.");

  console.log("[e2e] Enabling KYC for test user (non-production endpoint)");
  const kycResult = await request("/api/auth/kyc/verify", {
    method: "POST",
    expectedStatus: 200,
  });
  assert(Boolean(unwrapPayload(kycResult.json)?.user?.kycVerified), "KYC verification did not update user profile.");

  console.log("[e2e] Requesting remittance FX quote");
  const remittancePayload = {
    recipientName: "John Recipient",
    recipientType: "mobile_money",
    provider: "EcoCash",
    amountSent: 125,
    currencyFrom: "EUR",
    currencyTo: "USD",
    receivingCountry: "ZW",
    recipient: {
      mobileNumber: "+263771234567",
    },
  };

  const quoteResult = await request("/api/fintech/remittance/quote", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: remittancePayload,
    expectedStatus: 200,
  });
  assert(quoteResult.json?.success === true, "Remittance quote response format invalid.");

  console.log("[e2e] Sending remittance transfer");
  const sendResult = await request("/api/fintech/remittance/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: remittancePayload,
    expectedStatus: 201,
  });

  assert(sendResult.json?.success === true, "Remittance send response format invalid.");
  const remittanceId = Number(sendResult.json?.data?.transaction?.id);
  assert(Number.isFinite(remittanceId) && remittanceId > 0, "Remittance transaction id missing.");

  console.log("[e2e] Fetching remittance status");
  const remittanceStatus = await request(`/api/fintech/remittance/${remittanceId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    expectedStatus: 200,
  });
  assert(remittanceStatus.json?.success === true, "Remittance status response format invalid.");

  console.log("[e2e] Fetching airtime options");
  const airtimeOptions = await request("/api/fintech/airtime/options", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { phoneNumber: "+263771234567" },
    expectedStatus: 200,
  });
  assert(airtimeOptions.json?.success === true, "Airtime options response format invalid.");

  console.log("[e2e] Creating airtime top-up");
  const topupResult = await request("/api/fintech/airtime/topup", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      phoneNumber: "+263771234567",
      amount: 5,
      currency: "USD",
    },
    expectedStatus: 201,
  });

  assert(topupResult.json?.success === true, "Airtime top-up response format invalid.");
  const airtimeId = Number(topupResult.json?.data?.transaction?.id);
  assert(Number.isFinite(airtimeId) && airtimeId > 0, "Airtime transaction id missing.");

  console.log("[e2e] Fetching airtime status");
  const airtimeStatus = await request(`/api/fintech/airtime/${airtimeId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    expectedStatus: 200,
  });
  assert(airtimeStatus.json?.success === true, "Airtime status response format invalid.");

  console.log("[e2e] SUCCESS: financial remittance + airtime end-to-end flow passed.");
}

main().catch((error) => {
  console.error("[e2e] FAILED:", error?.message || error);
  process.exitCode = 1;
});
