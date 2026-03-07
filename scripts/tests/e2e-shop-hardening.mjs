import { chromium } from "playwright";

const baseUrl = String(process.env.E2E_BASE_URL || "http://127.0.0.1:3002").replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getPayload(json) {
  if (json && typeof json === "object" && json.success === true && "data" in json) {
    return json.data;
  }
  return json;
}

function formatCurrency(amountCents, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

async function acceptCookies(page) {
  const acceptButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
    await page.waitForTimeout(250);
  }
}

async function loadCatalog(requestContext) {
  const response = await requestContext.get(`${baseUrl}/api/shop/products`);
  assert(response.ok(), `Expected /api/shop/products to return 2xx, got ${response.status()}`);
  const payload = getPayload(await response.json());
  const products = Array.isArray(payload?.products) ? payload.products : [];
  assert(products.length > 0, "Shop catalog returned no products.");
  return products;
}

async function registerUser(requestContext, email) {
  const response = await requestContext.post(`${baseUrl}/api/auth/register`, {
    data: {
      fullName: "Shop Hardening E2E",
      email,
      password: "StrongPass123!",
      confirmPassword: "StrongPass123!",
    },
  });
  assert(response.status() === 201, `Expected register to return 201, got ${response.status()}`);
  const payload = getPayload(await response.json());
  assert(String(payload?.accessToken || "").length > 20, "Register did not return an access token.");
}

async function main() {
  const guestContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 960 },
  });
  const guestPage = await guestContext.newPage();

  const products = await loadCatalog(guestContext.request);
  const firstInStock = products.find((product) => Number(product.stock_qty) > 0);
  const firstOutOfStock = products.find((product) => Number(product.stock_qty) <= 0);
  assert(firstInStock, "No in-stock product found for checkout verification.");
  assert(firstOutOfStock, "No out-of-stock product found for restock verification.");

  await guestPage.goto(`${baseUrl}/shop/products?category=all`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await acceptCookies(guestPage);
  await guestPage.getByRole("heading", { name: /cart & checkout/i }).waitFor({ timeout: 15000 });

  await guestPage.getByText(/full name/i).first().waitFor({ timeout: 10000 });
  await guestPage.getByText(/email address/i).first().waitFor({ timeout: 10000 });
  await guestPage.getByText(/shipping address/i).first().waitFor({ timeout: 10000 });

  const outOfStockCard = guestPage.locator(`[data-shop-product-card="${firstOutOfStock.slug}"]`).first();
  await outOfStockCard.getByRole("button", { name: /notify me/i }).click();
  await guestPage.getByRole("dialog").waitFor({ timeout: 10000 });
  await guestPage.locator("#restock-email").fill("invalid-email");
  await guestPage.getByRole("dialog").getByRole("button", { name: /^notify me$/i }).click();
  await guestPage.getByRole("alert").waitFor({ timeout: 5000 });
  await guestPage.locator("#restock-email").fill("shop.notify.e2e@example.com");
  await guestPage.getByRole("dialog").getByRole("button", { name: /^notify me$/i }).click();
  await guestPage.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 });

  const manualPage = await guestContext.newPage();
  await manualPage.goto(`${baseUrl}/shop/products?category=all`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await acceptCookies(manualPage);
  await manualPage.getByRole("heading", { name: /cart & checkout/i }).waitFor({ timeout: 15000 });

  const inStockCard = manualPage.locator(`[data-shop-product-card="${firstInStock.slug}"]`).first();
  await inStockCard.getByRole("button", { name: /add to cart/i }).click();

  await manualPage.locator("#shop-customer-name").fill("Guest Buyer");
  await manualPage.locator("#shop-customer-email").fill("guest.checkout.e2e@example.com");
  await manualPage.locator("#shop-shipping-country").fill("Germany");
  await manualPage.locator("#shop-shipping-city").fill("Berlin");
  await manualPage.locator("#shop-shipping-address").fill("Example Street 5");
  await manualPage.getByLabel(/express send/i).check();

  const expectedShippingCents =
    Number(firstInStock.price_cents) >= 7500 ? 800 : 2000;
  const expectedTotal = formatCurrency(
    Number(firstInStock.price_cents) + expectedShippingCents,
    String(firstInStock.currency || "EUR")
  );
  await manualPage.getByText(expectedTotal, { exact: false }).waitFor({ timeout: 10000 });

  const createManualOrderResponse = manualPage.waitForResponse(
    (response) => response.url().includes("/api/shop/orders") && response.request().method() === "POST"
  );
  await manualPage.getByRole("button", { name: /place order/i }).click();
  const manualOrderResponse = await createManualOrderResponse;
  assert(
    manualOrderResponse.ok(),
    `Expected manual assisted order creation to succeed, got ${manualOrderResponse.status()}`
  );
  const manualOrderPayload = getPayload(await manualOrderResponse.json());
  const manualOrder = manualOrderPayload?.order;
  assert(manualOrder, "Manual order response did not include an order.");
  assert(manualOrder.paymentMethod === "manual_assisted", "Manual order used the wrong payment method.");
  assert(manualOrder.deliverySpeed === "express", "Manual order did not persist express delivery.");
  assert(manualOrder.shippingCents === expectedShippingCents, "Manual order shipping total was incorrect.");
  assert(String(manualOrder.manageToken || "").length > 20, "Manual order did not return a manage token.");
  assert(!("customerEmail" in manualOrder), "Manual order response exposed customer email.");
  assert(!("shippingAddress" in manualOrder), "Manual order response exposed shipping address.");
  await manualPage.getByText(String(manualOrder.orderRef)).waitFor({ timeout: 10000 });
  const manualPageText = await manualPage.locator("body").textContent();
  assert(
    String(manualPageText || "").toLowerCase().includes("assisted checkout"),
    "Manual checkout confirmation copy did not render after order placement."
  );
  assert(
    !(await manualPage.getByRole("button", { name: /confirm dummy payment/i }).isVisible().catch(() => false)),
    "Manual checkout still shows the dummy payment confirmation button."
  );

  const unsecuredLookup = await guestContext.request.get(
    `${baseUrl}/api/shop/orders/${manualOrder.orderRef}`
  );
  assert(unsecuredLookup.status() === 404, `Expected unauthenticated order lookup to fail, got ${unsecuredLookup.status()}`);

  const wrongTokenLookup = await guestContext.request.get(
    `${baseUrl}/api/shop/orders/${manualOrder.orderRef}`,
    { headers: { "X-Order-Access-Token": "invalid-token" } }
  );
  assert(wrongTokenLookup.status() === 404, `Expected invalid-token order lookup to fail, got ${wrongTokenLookup.status()}`);

  const securedLookup = await guestContext.request.get(
    `${baseUrl}/api/shop/orders/${manualOrder.orderRef}`,
    { headers: { "X-Order-Access-Token": manualOrder.manageToken } }
  );
  assert(securedLookup.ok(), `Expected secured order lookup to succeed, got ${securedLookup.status()}`);
  const securedLookupPayload = getPayload(await securedLookup.json());
  assert(securedLookupPayload?.order?.orderRef === manualOrder.orderRef, "Secured lookup returned the wrong order.");
  assert(!("customerEmail" in securedLookupPayload.order), "Secured lookup exposed customer email.");
  assert(!("shippingAddress" in securedLookupPayload.order), "Secured lookup exposed shipping address.");

  const manualConfirm = await guestContext.request.post(
    `${baseUrl}/api/shop/orders/${manualOrder.orderRef}/confirm-payment`,
    {
      data: {
        manageToken: manualOrder.manageToken,
        paymentReference: `MANUAL-${Date.now()}`,
      },
    }
  );
  assert(
    manualConfirm.status() === 400,
    `Expected assisted checkout confirm-payment to fail, got ${manualConfirm.status()}`
  );
  const manualConfirmText = await manualConfirm.text();
  assert(
    manualConfirmText.includes("cannot be auto-confirmed"),
    "Manual confirm-payment did not return the expected hardening error."
  );

  const authContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 960 },
  });
  const authEmail = `shop.auth.e2e.${Date.now()}@example.com`;
  await registerUser(authContext.request, authEmail);

  const authPage = await authContext.newPage();
  let authMeCalls = 0;
  let refreshCalls = 0;
  authPage.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/auth/me")) authMeCalls += 1;
    if (url.includes("/api/auth/token/refresh")) refreshCalls += 1;
  });

  await authPage.goto(`${baseUrl}/shop/products?category=all`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await acceptCookies(authPage);
  await authPage.getByText(/signed in as/i).waitFor({ timeout: 15000 });
  await authPage.waitForTimeout(1500);
  assert(authMeCalls >= 1, "Signed-in shop load did not request /auth/me.");
  assert(refreshCalls === 0, `Signed-in shop load unexpectedly called /auth/token/refresh ${refreshCalls} time(s).`);

  const authInStockCard = authPage.locator(`[data-shop-product-card="${firstInStock.slug}"]`).first();
  await authInStockCard.getByRole("button", { name: /add to cart/i }).click();
  await authPage.locator("#shop-shipping-country").fill("Germany");
  await authPage.locator("#shop-shipping-city").fill("Hamburg");
  await authPage.locator("#shop-shipping-address").fill("Harbor Road 7");
  await authPage.getByLabel(/dummy gateway/i).check();

  const createDummyOrderResponse = authPage.waitForResponse(
    (response) => response.url().includes("/api/shop/orders") && response.request().method() === "POST"
  );
  await authPage.getByRole("button", { name: /place order/i }).click();
  const dummyOrderResponse = await createDummyOrderResponse;
  assert(dummyOrderResponse.ok(), `Expected dummy gateway order creation to succeed, got ${dummyOrderResponse.status()}`);
  const dummyOrderPayload = getPayload(await dummyOrderResponse.json());
  const dummyOrder = dummyOrderPayload?.order;
  assert(dummyOrder?.paymentMethod === "dummy_gateway", "Dummy order did not persist dummy gateway payment method.");
  assert(String(dummyOrder?.manageToken || "").length > 20, "Dummy order did not return a manage token.");

  const confirmDummyPaymentResponse = authPage.waitForResponse(
    (response) =>
      response.url().includes(`/api/shop/orders/${dummyOrder.orderRef}/confirm-payment`) &&
      response.request().method() === "POST"
  );
  await authPage.getByRole("button", { name: /confirm dummy payment/i }).click();
  const dummyConfirmResponse = await confirmDummyPaymentResponse;
  assert(dummyConfirmResponse.ok(), `Expected dummy payment confirmation to succeed, got ${dummyConfirmResponse.status()}`);
  const dummyConfirmPayload = getPayload(await dummyConfirmResponse.json());
  assert(dummyConfirmPayload?.order?.status === "paid", "Dummy payment confirmation did not mark the order paid.");
  await authPage.getByRole("button", { name: /payment confirmed/i }).waitFor({ timeout: 10000 });

  await guestContext.close();
  await authContext.close();
}

try {
  await main();
  console.log("[e2e] SUCCESS: shop hardening flow passed.");
} catch (error) {
  console.error("[e2e] FAILED:", error?.message || error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
