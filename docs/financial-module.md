# Remittance and Airtime Module

## Folder Structure

```text
du-platform-backend/
  modules/
    fintech/
      controllers/
        remittanceController.ts
        airtimeController.ts
      dto/
      providers/
        thunesGatewayProvider.ts
        reloadlyGatewayProvider.ts
      repositories/
        fintechRepository.ts
      routes/
        index.ts
      services/
        thunesGatewayService.ts
        reloadlyGatewayService.ts
        remittanceService.ts
        airtimeService.ts
  utils/
    sanitize.ts
du-platform-frontend/src/components/
  SendMoneyForm.tsx
  AirtimeTopupForm.tsx
```

## Example Thunes API Call (backend-side)

```ts
const provider = new ThunesProvider();

const quote = await provider.createQuotation(
  {
    external_id: "2b9f7b8f-a5cf-47d8-baa6-6de5ce5750d3",
    payer_id: 123,
    mode: "SOURCE_AMOUNT",
    transaction_type: "C2C",
    source: { amount: "250.00", currency: "EUR", country_iso_code: "DEU" },
    destination: { currency: "USD", country_iso_code: "ZWE" },
  },
);
```

## Example Reloadly OAuth Flow

```ts
const provider = new ReloadlyProvider();

const token = await provider.getAccessToken(); // cached in memory
const operator = await provider.detectOperator("+263771234567", "ZW");
```

## MySQL Transaction Handling Example

```ts
const conn = await db.getConnection();
try {
  await conn.query("START TRANSACTION");

  await conn.execute(
    `INSERT INTO remittance_transactions (user_id, recipient_name, recipient_type, provider, amount_sent, currency_from, currency_to)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, recipientName, recipientType, provider, amount, "EUR", "USD"]
  );

  await conn.query("COMMIT");
} catch (error) {
  await conn.query("ROLLBACK");
  throw error;
} finally {
  conn.release();
}
```

## Security Notes

- All Thunes and Reloadly credentials are loaded from backend environment variables.
- All provider calls are backend-side only.
- JWT is required for `/api/fintech/remittance/*` and `/api/fintech/airtime/*`.
- Basic in-memory rate limiting is applied per requester IP.
- Failed attempts are persisted to `financial_failed_attempts`.
- Standard API response format is enforced via `successResponse` and `errorResponse`.
- Compliance notice is returned and displayed in UI:

> Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.
