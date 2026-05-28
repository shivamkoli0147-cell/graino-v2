---
name: Seller auth
description: Seller login uses SELLER_PHONE env var — must be set to Rohit's real number for production
---

## Seller auth flow
- Two-step: phone entry → OTP verify (same Fast2SMS OTP system as customers)
- Backend checks `phone === process.env.SELLER_PHONE || "9999999999"`
- Then verifies OTP from in-memory store

## Critical: production setup
`SELLER_PHONE` env var must be set to Rohit Mukati's real 10-digit mobile number.
Until then, `9999999999` is the default — Fast2SMS will fail to deliver to this fake number.
In dev mode this is fine (OTP logged to server console). In production it will block login.

**How to set:** Add `SELLER_PHONE=<rohit's number>` as a Replit environment variable.

**Why:** Seller is a single fixed person (Rohit Mukati). No seller DB table needed — just env-based phone check.
