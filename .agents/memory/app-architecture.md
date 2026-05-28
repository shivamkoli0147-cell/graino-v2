---
name: App architecture
description: KisanDirect/Graino monorepo structure, port layout, state management approach
---

## Services
- API Server: port 8080, `artifacts/api-server/`, Express 5, Drizzle ORM on Supabase PostgreSQL
- Frontend: port 21034, `artifacts/kisan-direct/`, React + Vite + Tailwind + Baloo 2 font

## Frontend state (App.tsx)
Single-file state machine — no router. State: mode (customer/seller), customerTab, sellerTab, cart, viewProductId.
Customer flow: SplashScreen → CustomerAuth → [ProductList | ProductDetail | CartPage | OrdersPage] + CustomerProfile overlay
Seller flow: SellerAuth → [SellerDashboard | SellerOrders | SellerProducts]

## Key conventions
- Max-width 390px, dark green #1a3d1a outer bg, Baloo 2 font everywhere
- Hindi text on customer UI, English labels on seller UI
- Cart stored in App.tsx state (not localStorage) — clears on page refresh intentionally
- Customer session → localStorage (`kd_customer`), Seller session → sessionStorage (`kd_seller`)
- API calls via generated hooks from `@workspace/api-client-react` (Orval codegen)
- New non-spec endpoints (send-otp, resend-otp) called via direct fetch('/api/...')

## ALLOWED_VILLAGES
Backend has `ALLOWED_VILLAGES` const in kisanRoutes.ts — must match `VILLAGES` const in utils.ts.
Both: Pichor, Bamori, Datia, Indergarh, Bhander, Dabra, Karera, Lahar, Mohna, Shivpuri (10 villages).
