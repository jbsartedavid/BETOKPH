# BETOKPH Casino (GCash-First)

BETOKPH is a casino game frontend built with Next.js and HeroUI, now refocused for **casino-only gameplay** with a **GCash-first cashier flow**.

This version removes Web3/Solana wallet integration and introduces local, integration-ready flows for:
- GCash account registration per client
- Deposits via GCash API flow or QR flow
- Disbursement (withdrawal) via GCash
- Cashier transaction history and local balance ledger

---

## What Changed

### 1) Removed Web3 / NFT-related stack
- Removed Solana provider wiring from the global app provider
- Removed Solana wallet connect logic from navbar
- Removed Solana wallet adapter dependencies from `package.json`

### 2) Added GCash cashier module
- New utility module: `src/util/gcash.ts`
- New route: `src/app/cashier/page.tsx`
- New sidebar entry: **GCash Cashier**

### 3) Cashier capabilities
- Register or update client GCash details (`fullName`, `gcashNumber`)
- Deposit funds:
  - **GCash API** mode (simulated immediate success)
  - **GCash QR** mode (creates QR payload + QR image URL, then manual confirm)
- Request disbursement (withdrawal) to registered GCash number
- View transaction history with status (`pending`, `completed`, `failed`)

---

## Current Transaction Behavior

The cashier is implemented as an **integration-ready local simulation** so the app works end-to-end without backend credentials.

- Data is persisted in browser `localStorage`
- Balance updates automatically on completed deposits/disbursements
- QR deposits are created as `pending` and become `completed` when user confirms

Storage keys:
- `betokph.gcash.account`
- `betokph.gcash.history`
- `betokph.player.balance`

> For production, replace local logic in `src/util/gcash.ts` with calls to your secure backend that integrates with official GCash payment/disbursement APIs.

---

## Pages and Modules

- `src/app/cashier/page.tsx`
  - Account registration
  - Deposit (API / QR)
  - QR confirmation
  - Disbursement
  - Transaction history

- `src/util/gcash.ts`
  - Account validation and normalization
  - Transaction creation and status updates
  - Ledger state management

- `src/layout/navbar.tsx`
  - Replaced wallet connect button with GCash status/action button

- `src/providers/provider.tsx`
  - Removed Solana provider wrapper

---

## GCash Number Validation

Accepted formats:
- `09XXXXXXXXX`
- `639XXXXXXXXX`

Numbers are normalized and stored in local format (`09XXXXXXXXX`).

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Open:
- `http://localhost:3000` for landing/game pages
- `http://localhost:3000/cashier` for GCash cashier

### Build for production
```bash
npm run build
npm run start
```

---

## Production Integration Plan (Recommended)

To use real GCash rails in production:

1. **Create backend payment service**
   - Store API keys and secrets server-side only
   - Expose secure endpoints for deposit initialization, QR generation, status check, and disbursement

2. **Replace local utility calls**
   - Replace `createDeposit`, `confirmQrDeposit`, and `createDisbursement` internals in `src/util/gcash.ts`
   - Keep current interfaces so UI does not need large rewrites

3. **Add webhooks**
   - Verify payment/disbursement callbacks
   - Update transaction status and game balance server-side

4. **Move balance/account/history to database**
   - `users` table with gcash profile
   - `wallet_ledger` table for auditable balance movements
   - `transactions` table for API/QR/disbursement lifecycle tracking

5. **Compliance and operational controls**
   - KYC/AML checks where required
   - Withdrawal limits and fraud rules
   - Full audit logs and dispute handling process

---

## Suggested Backend API Contract

The frontend can target these routes:

- `POST /api/gcash/account/register`
- `GET /api/gcash/account`
- `POST /api/gcash/deposit` (channel: `api` | `qr`)
- `POST /api/gcash/deposit/confirm`
- `POST /api/gcash/disburse`
- `GET /api/gcash/transactions`
- `GET /api/wallet/balance`

Payload examples are intentionally omitted in this README so your final contract can match your selected provider/gateway.

---

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- HeroUI
- Tailwind CSS
- Socket.io client (game realtime)

---

## Notes

- This repository is now positioned as **casino-focused**, not NFT/Web3 wallet-focused.
- Existing game pages (Crash, Mine, Slide, Video Poker) remain available.
- Cashier currently uses local simulation and is ready to be connected to your backend GCash integration.

---

## License / Ownership

Set your preferred license and ownership details for BETOKPH before production release.
