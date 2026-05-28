---
name: OTP integration
description: Fast2SMS real OTP flow — in-memory store, send/resend endpoints, dev mode fallback
---

## What was built
- In-memory `otpStore` Map in `kisanRoutes.ts` — entries: `{ otp, expiresAt, sentAt }`
- `POST /api/auth/send-otp` — generates 4-digit OTP, calls Fast2SMS, stores with 5-min expiry
- `POST /api/auth/resend-otp` — 30s cooldown per phone enforced via `sentAt`
- `POST /api/auth/customer` — verifies OTP from store (codes: NO_OTP, OTP_EXPIRED, WRONG_OTP)
- `POST /api/auth/seller` — same, but first checks phone === SELLER_PHONE env var

## Dev mode fallback (important)
`sendOtpViaSms` logs `[DEV OTP] Phone: X → OTP: Y` to console when `NODE_ENV !== 'production'`.
If Fast2SMS fails (network, invalid number, etc.) in dev, it silently succeeds and the OTP is in server logs.
In production, Fast2SMS failure throws and the API returns 500.

## Fast2SMS API
- Endpoint: `POST https://www.fast2sms.com/dev/bulkV2`
- Headers: `authorization: <apiKey>`, `Content-Type: application/json`
- Body: `{ route: "otp", variables_values: "1234", numbers: "9876543210" }`
- Response: `{ return: true/false, message?: string[] }`
- Key: stored as `FAST2SMS_API_KEY` env var (shared environment)

**Why:** Real OTP needed for India production use. DLT-approved template assumed in Fast2SMS account.
**How to apply:** Never hardcode OTP fallbacks in production. Always use the store for verification.
