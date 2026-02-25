# 📄 PRODUCT REQUIREMENT DOCUMENT (PRD)
**Project:** Zero-Gravity (0G)
**Tagline:** Payments at the Speed of Thought.
**Status:** Hackathon V1 (BCH-1 Hackcelerator)

---

## 1. EXECUTIVE SUMMARY
Zero-Gravity is a decentralized "Bridgeless" payment protocol that enables users to spend assets held on Layer 2 (Starknet) instantly at Bitcoin Cash (BCH) merchants. By combining AI-driven natural language parsing with cross-chain solvency proofs, we eliminate the 10+ minute wait times and security risks associated with traditional token bridges.

---

## 2. PROBLEM STATEMENT
1.  **High-Friction UX:** Traditional crypto payments require users to handle hex addresses, manual bridge transfers, and complex chain fee calculations.
2.  **Bridge Centralization/Risk:** Token bridges are primary targets for exploits ($2.8B+ lost) and often rely on centralized multisigs.
3.  **The "Idle Capital" Problem:** Users holding assets in fast, cheap L2 environments (like Starknet) cannot easily spend them in the real world (PoS terminals, coffee shops).
4.  **Slow Settlement:** Moving value across chains usually takes 10 minutes to an hour, making it impossible for real-world retail payments.

---

## 3. THE SOLUTION (THE SHADOW LOOP)
Zero-Gravity introduces a **State-Verification Loop** instead of a token bridge:
1.  **AI Intent:** User expresses intent in plain English (e.g., "Pay $0.5 for a quick coffee").
2.  **Solvency Lock:** Protocol locks the equivalent USD value on Starknet via a Validity Proof.
3.  **Shadow Attestation:** An off-chain Oracle verifies the L2 lock instantly.
4.  **BCH Settlement:** Protocol releases instant liquidity on the Bitcoin Cash network directly to the merchant.

---

## 4. TARGET AUDIENCE
-   **DeFi Natives:** Users holding capital on Starknet/L2 who want real-world utility without off-ramping.
-   **BCH Merchants:** Business owners seeking instant, low-fee settlement from global liquidity pools.
-   **The Next Billion:** Non-technical users who want to pay with crypto using natural language instead of complex wallets.

---

## 5. KEY FEATURES (V1)
-   **🧠 Intelligent Intent Parser:** Real-time natural language processing powered by Google Gemini 3 Flash.
-   **🌉 Protocol Bridge:** Automated user registration and intent tracking between Starknet and Supabase.
-   **🔐 Validium Vaults:** Secure fund locking on Starknet using Cairo-based smart contracts.
-   **🟢 Instant BCH Settlement:** Zero-wait payments on Bitcoin Cash via the Shadow Oracle.
-   **⚡ Real-time Lifecycle Tracker:** A high-fidelity UI tracking transaction progress across 4 stages with less than 2s update latency.

---

## 6. USER EXPERIENCE (UX) GOALS
-   **Latency:** Intent parsing < 500ms. End-to-end settlement < 30 seconds.
-   **Clarity:** Continuous visual feedback during the transaction lifecycle. Clear success/failure states.
-   **Simplicity:** Minimal button clicks. Connect Wallet -> Type intent -> Confirm.

---

## 7. TECHNICAL STACK
-   **Frontend:** Next.js 14, Tailwind CSS, Framer Motion.
-   **Blockchain:** Starknet (Cairo), Bitcoin Cash (CashScript).
-   **AI:** Gemini 3 Flash (Primary), Gemini 2.5 Flash (Fallback).
-   **Backend/DevOps:** Supabase (Real-time DB), Node.js (Oracle Daemon), Vercel.

---

## 8. ROADMAP & GO-TO-MARKET (GTM)
### Phase 1: The Ignition (Hackcelerator)
- **Goal:** Core protocol stability and community visibility.
- **Action:** Live demo on BCH-1, open-source the bridge code, 3 social media building updates.
- **KPI:** Successful end-to-end transaction < 30s.

### Phase 2: The Loop Beta (Q2 2026)
- **Goal:** Real-world validation with anchor merchants.
- **Action:** Partner with 5 local coffee shops/merchants to accept BCH via Zero-Gravity. Implement Multi-asset vaults (STRK/ETH).
- **GTM Strategy:** Provide free POS terminals (iPad/Tablet) pre-loaded with the 0G Merchant UI.

### Phase 3: The Protocol SDK (Q3 2026)
- **Goal:** Become the "Stripe for Cross-chain Solvency".
- **Action:** Launch `@zero-gravity/sdk` for developers. Enable 3rd party wallets to add a "Spend from Starknet" button.
- **GTM Strategy:** Developer grants and documentation focus.

### Phase 4: Global Settlement (Q4 2026+)
- **Goal:** Large-scale merchant aggregation.
- **Action:** Integrate with BitPay/Coinbase Commerce as an alternative "Instant Liquidity" provider. Transition to a Decentralized Oracle Network (DON).

---

## 9. COMPETITIVE EDGE: WHY WE WIN
Zero-Gravity is the only protocol combining AI-Intents with **Bridgeless Solvency** for Bitcoin Cash.

| Feature | Zero-Gravity | Traditional Bridges | Centralized Exchanges |
|---|---|---|---|
| **Security Model** | Solvency Loop (No Bridge Risk) | Lock-and-Mint (Honeypot Risk) | Custodial (Exchange Risk) |
| **Settlement Time** | **< 30 Seconds** | 10 - 20 Minutes | Instant (but high fee/KYC) |
| **UX Learning Curve** | **Zero** (Plain English) | High (Wallets/Chains/Gas) | Low (App) |
| **Cost** | Minimal (Starknet L2) | High (Bridge Fees + L1 gas) | High (Spread + Withdraw fee) |
| **Privacy** | L2 Privacy + BCH UTXO | Fully Transparent | Zero Privacy (KYC) |

### Key Differentiation
1.  **Architecture:** We move *Proofs*, not *Tokens*. Even if our Oracle is compromised, the L2 funds are secured by Starknet's Validity Proofs.
2.  **Speed:** By bypassing the BCH "Deep Confirmation" wait through Oracle Attestation, we achieve "Retail Speed" that standard bridges can't touch.
3.  **Niche:** While others focus on BTC/ETH, we own the **BCH Payment primitive**, the fastest and cheapest settlement rail for real-world commerce.

---

## 10. SUCCESS METRICS
-   **Conversion:** 90%+ success rate on natural language intent parsing.
-   **Retention:** Reducing the time-to-payment from 15 mins (bridged) to <30 seconds (Zero-Gravity).
-   **Security:** $0 lost to bridge exploits (by design—no bridging of assets).
