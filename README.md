# 🛰️ Zero-Gravity (0G)

> **Spend your Starknet vault balance at any Bitcoin Cash merchant — instantly, privately, without bridging a single token.**

---

## 🧠 How It Works

Zero-Gravity is a **State-Verification Loop** — no tokens cross chains, only proofs.

1. **Lock** — Deposit into your Starknet Vault. Your balance is proven on-chain.
2. **Attest** — The Shadow Oracle verifies your solvency and signs a cryptographic attestation.
3. **Release** — Bitcoin Cash covenant validates the oracle signature and releases BCH to the merchant.

**Total time: ~3-5 seconds. Zero bridging. Zero identity leakage.**

---

## 🏗️ Architecture

```
Starknet (Vault.cairo)       →  Supabase Realtime  →  Shadow Oracle
     ↓ SolvencySignal              ↓ Push                ↓ Sign
                                                    BCH Covenant (ShadowCard.cash)
                                                          ↓ Release
                                                    Merchant receives BCH ✅
```

*Full architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contracts** | Cairo 2.x (Starknet) + CashScript (BCH) |
| **Oracle** | Node.js / TypeScript |
| **AI** | Google Gemini 3 Flash (NL → TX Intent) |
| **Database** | Supabase (PostgreSQL + Realtime + RLS) |
| **Frontend** | Next.js 14 (App Router) |
| **Wallets** | Argent X (Starknet) + Burner Wallet (BCH) |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/<your-org>/zero-gravity.git
cd zero-gravity

# Install all workspaces
npm install

# Copy environment template
cp .env.example .env
# Fill in your API keys (see .env.example for guidance)

# Start frontend
npm run dev --workspace=apps/web

# Start Oracle daemon
npm run oracle
```

---

## 📜 Contracts

| Contract | Chain | Address |
|---|---|---|
| `Vault.cairo` | Starknet Sepolia | *TBD — Phase 1* |
| `ShadowCard.cash` | BCH Chipnet | *TBD — Phase 1* |

---

## 🔒 Security

- **STRIDE threat model** with 7-layer defense-in-depth
- **AI prompt injection** hardened: regex pre-filter + hardened system prompt + Zod post-validation
- **Supabase RLS** on all 5 tables — no IDOR possible
- **Nonce + TTL** prevents replay attacks
- **Oracle key** never exposed to client

*Full security analysis: [ARCHITECTURE.md → §4](./ARCHITECTURE.md)*

---

## 📄 License

MIT

---

*Built for ETHDenver 2026 🏔️*
