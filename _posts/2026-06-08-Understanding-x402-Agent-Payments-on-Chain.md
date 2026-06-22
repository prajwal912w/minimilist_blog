---
layout: post
title: "Understanding x402"
date: 2026-06-08
excerpt: "x402 turns the long-reserved HTTP 402 Payment Required status into real machine payments. Agents quote, sign, verify, and settle USDC through a facilitator on a Layer 2 chain."
---

Imagine you want a new pair of running shoes. You message your **buyer-side agent**: size ten, under $150, something durable for daily runs. It already knows your preferences from earlier conversations, so you do not repeat yourself.

It reaches seller agents, compares catalogs, and comes back with an offer you accept. Payment is next. You already gave your agent a **USDC** wallet for purchases like this, so it can pay without pulling you into a checkout flow.

<figure style="text-align:center; margin: 0.75rem auto; max-width: 320px;">
  <img
    src="/assets/images/x402/wallet.png"
    alt="Buyer wallet on Base Sepolia"
    style="width: 100%; max-width: 320px; height: auto; border-radius: 8px; border: 1px solid #e1e4e8;"
  />
  <figcaption style="font-size: 0.85rem; opacity: 0.75; margin-top: 6px;">
    Buyer wallet.
  </figcaption>
</figure>

The agent pays, confirms the purchase, and you are done. That is what x402 is meant to handle.

When an agent pays for you, a few problems come up:





<div class="table-wrap" markdown="1">

| Problem          | Question                |
| ---------------- | ----------------------- |
| **Payment gate** | Who says pay first?     |
| **Units**        | Dollars or chain atoms? |
| **Proof**        | Paid or just claimed?   |
| **Chain ops**    | Who runs the RPC?       |
| **Settlement**   | Who broadcasts the tx?  |
| **Cost**         | L1 for every purchase?  |

</div>

**x402** solves these for agent payments over standard web requests.

---

## What x402 is

**x402** turns HTTP **402 Payment Required** into a working payment flow for agents. The backstory on why 402 sat unused for decades is in **[From HTTP 402 to x402](/2026/06/07/HTTP-402-to-x402-protocol.html)**. This post focuses on how it works in practice.

It is built for:

- **Machine-to-machine (M2M) payments**
- **Pay-per-use models** such as API calls or paywalled content
- **Micropayments** without account creation or traditional payment rails

In practice, x402 has three active parties and the chain. **Layer 2** and **Layer 1** are really one stack, but for micropayments you count them separately. Small payments run on L2 because posting each one directly to L1 is too expensive.

<div class="entity-box" markdown="1">

**Client agent**, **server-side agent**, **facilitator** (middle entity), **Layer 2** (e.g. Base), and **Layer 1** (Ethereum).

</div>

Those roles map to:





<div class="table-wrap" markdown="1">

| Role                           | Responsibility                                                                               | Reference in the diagram |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------ |
| **Buyer-side agent (client)**  | Requests the offer, signs the payment payload, receives the receipt                          | Buyer's Agent            |
| **Seller-side agent (server)** | Returns payment requirements, forwards verify/settle, returns paid status.<br>Exposes commerce endpoints and resources (shoe catalog, price fetch). | Seller's Agent           |
| **x402 facilitator**           | Validates the signed payload; broadcasts and confirms the USDC transfer                      | Facilitator              |
| **Layer 2 (e.g. Base)**        | Executes the transfer quickly and cheaply; where the receipt’s `txHash` lives                | L2                       |
| **Layer 1 (Ethereum)**         | Security anchor for the rollup; batches many L2 txs and posts proofs periodically            | L1                       |

</div>

---

## Settlement

Settlement is how an agreed offer becomes an on-chain payment. The buyer-side agent sends a commerce request. The seller-side agent returns x402 requirements. The buyer signs and retries with payment attached. The facilitator verifies and settles on Layer 2.

Buyer and seller must already agree on the offer through a negotiation layer such as [Agent Client Protocol](/2026/05/26/Understanding-Agent-Client-Protocol.html) sessions and prompts.

<figure style="text-align:center; margin: 0 0 1.5rem;">
  <img
    src="/assets/images/x402/diagram.png"
    alt="x402 settlement flow"
    style="max-width: 820px; width: 100%; height: auto; border-radius: 10px;"
  />
  <figcaption style="font-size: 0.95rem; opacity: 0.8; margin-top: 8px;">
    Figure 1. Settlement.
  </figcaption>
</figure>





<div class="table-wrap" markdown="1">

| Step   | Phase              | Buyer-side agent                              | Seller-side agent                                      | x402 facilitator                    | Chain       | Meaning                                                                            |
| ------ | ------------------ | --------------------------------------------- | ------------------------------------------------------ | ----------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| —      | Offer agreed       | Ready to pay                                  | Ready to accept payment                                | —                                   | —           | Negotiation complete; x402 begins.                                                 |
| **1**  | Quote              | Sends request (e.g. `commerce/pay`)           | Receives request                                       | —                                   | —           | Client asks what payment is required for this offer.                               |
| **2**  | Payment required   | Receives **payment required**                 | Returns requirements (amount, asset, network, `payTo`) | —                                   | —           | Seller publishes the x402 terms. Same idea as HTTP 402.                            |
| **3**  | Signed payment     | Signs payload; sends request **with payment** | Receives signed payload                                | —                                   | —           | Buyer attaches cryptographic proof of willingness to pay under those terms.        |
| **4**  | Verify             | Waits                                         | Sends **verify** request                               | Verifies signature, amount, network | —           | Facilitator checks the payload before any chain write.                             |
| **5**  | Verified           | —                                             | Receives **verified**                                  | Returns valid                       | —           | Seller may proceed to settlement.                                                  |
| **6**  | Settle             | Waits                                         | Sends **settle** request                               | Submits USDC transfer               | **L2**      | Facilitator broadcasts the payment on the Layer 2 network.                         |
| **7**  | Rollup batching    | —                                             | —                                                      | **Rollup batching**                 | L2          | Multiple settlements may be grouped by the sequencer (normal L2 operation).        |
| **8**  | L1 anchor          | —                                             | —                                                      | Posts batch proof                   | L2 → **L1** | Rollup anchors compressed state to Ethereum for security.                          |
| **9**  | L1 confirm         | —                                             | —                                                      | —                                   | L1 confirms | Ethereum records the rollup’s commitment (not each agent’s tx individually on L1). |
| **10** | Settled            | —                                             | Receives **settled** + `txHash`                        | Confirms on L2                      | L2          | Payment is final on the layer agents use for receipts.                             |
| **11** | Receipt            | Receives **transaction receipt**              | Sends paid response                                    | —                                   | —           | Both sides can store hash, amounts, and explorer links.                            |

</div>

#### Wire format

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request (`commerce/pay`)**

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "commerce/pay",
  "params": {
    "sessionId": "sess_abc123",
    "offerId": "nike-air-max-90",
    "offer": {
      "id": "nike-air-max-90",
      "name": "Nike Air Max 90",
      "price": 90,
      "currency": "USD"
    }
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Response (payment required)**

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "status": "payment_required",
    "offerId": "nike-air-max-90",
    "fx": {
      "catalogUsd": 90,
      "usdc": "90",
      "usdcAtomic": "9000"
    },
    "x402": {
      "scheme": "exact",
      "network": "eip155:84532",
      "facilitator": "https://x402.org/facilitator",
      "payTo": "0x29A1…b5A0",
      "usdcContract": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "paymentRequired": { }
    },
    "balanceCheck": {
      "sufficient": true
    }
  }
}
```

</div>

</div>

<p class="wire-summary">Ask for payment terms.</p>

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request (`commerce/pay`, execute)**

```json
{
  "jsonrpc": "2.0",
  "id": 43,
  "method": "commerce/pay",
  "params": {
    "sessionId": "sess_abc123",
    "offerId": "nike-air-max-90",
    "execute": true,
    "payment": { }
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Response (paid)**

```json
{
  "jsonrpc": "2.0",
  "id": 43,
  "result": {
    "status": "paid",
    "offerId": "nike-air-max-90",
    "receipt": {
      "catalogUsd": 90,
      "usdcPaid": "90",
      "payTo": "0x29A1…b5A0",
      "payer": "0x4299…e111",
      "txHash": "0xabc…def",
      "explorer": "https://sepolia.basescan.org/tx/0xabc…def",
      "ethGas": "0.000012",
      "network": "eip155:84532"
    }
  }
}
```

</div>

</div>

<p class="wire-summary">Pay and get receipt.</p>

### Key rules for settlement





<div class="table-wrap" markdown="1">

| Rule                     | Requirement                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Exact terms**          | The signed payload must match the published requirements (amount, asset, network, `payTo`).                                            |
| **Verify before settle** | Facilitator validates the payload before broadcasting.                                                                                 |
| **Receipt**              | Success means a verifiable on-chain `txHash` plus payer/payee metadata.                                                                |
| **Facilitator role**     | Seller coordinates verify/settle; buyer proves payment through signing, not by sending raw funds to an unverified address out of band. |
| **Scheme**               | `exact` is common for fixed-price commerce; other schemes exist for metered or capped spend.                                           |
| **Timeout**              | Requirements include a maximum window; stale payloads are rejected.                                                                    |

</div>




Spec: [x402 HTTP 402](https://docs.x402.org/core-concepts/http-402)

---

## Layer 2

Ethereum **Layer 1** is the shared security layer for the ecosystem. Every transaction competes for limited block space. That works for high-value settlement, but it is expensive and slow for **frequent, small agent payments** like shoe purchases, API calls, or per-request fees.

**Layer 2** networks such as Base run on top of Ethereum with a different cost model:





<div class="table-wrap" markdown="1">

|                    | Layer 1 (Ethereum)               | Layer 2 (e.g. Base)                                  |
| ------------------ | -------------------------------- | ---------------------------------------------------- |
| **Fees**           | Higher                           | Lower                                                |
| **Latency**        | Block times suited to settlement | Faster confirmation for everyday transfers           |
| **Throughput**     | Limited base-layer capacity      | Many txs batched inside the rollup                   |
| **Security model** | Native chain finality            | Inherits Ethereum security via periodic L1 anchoring |

</div>

Depending on the payment type, the facilitator may or may not use L1 directly. Settlement time depends on the chain you use.

---

## Protocol map





<div class="table-wrap" markdown="1">

| Phase   | Primary steps                                       |
| ------- | --------------------------------------------------- |
| Quote   | `commerce/pay` returns payment required             |
| Sign    | Buyer signs payload matching published terms        |
| Verify  | Seller asks facilitator to validate signature       |
| Settle  | Facilitator submits USDC transfer on L2           |
| Receipt | Seller returns paid status and `txHash` to buyer    |

</div>




---

## Payment rails

The [x402 whitepaper](https://www.x402.org/x402-whitepaper.pdf) compares legacy rails with **x402 on Base**:

<div class="table-wrap" markdown="1">

| Payment rail              | Typical fees              | Settlement finality                         | Chargeback risk      | Scalability                 |
| ------------------------- | ------------------------- | ------------------------------------------- | -------------------- | --------------------------- |
| **Credit card**           | $0.30 + 2.9%              | Days (batch)                                | Yes, up to 120d      | 65k TPS*                    |
| **PayPal**                | ~3% + markup              | Instant authorization; settlement in days   | Yes                  | Unknown                     |
| **Stripe (pay with crypto)** | 1.5%+                  | Depends on blockchain                       | No                   | Depends on blockchain       |
| **Ethereum L1**           | $1–$5 + gas               | 1–2 min for confirmations                   | No                   | 15–20 TPS                   |
| **x402 (on Base)**        | Free* (gas &lt; $0.0001)  | ~200 ms                                     | No                   | Hundreds to thousands TPS   |

</div>

The tradeoff is speed and low fees in exchange for weaker buyer protections. There are no chargebacks and no built-in dispute settlement. Payments are final once settled on-chain, so a wrong address, wrong amount, or bad agent decision usually needs a manual refund from the seller. Buyers also need a funded wallet with USDC and gas, both sides must support x402, and the flow still depends on a facilitator, RPC access, and the L2 network staying up. Agents that hold wallet keys take on real security risk, and sellers still handle off-ramping, accounting, and compliance on their own.

---

## Try the demo

Still struggling to see how quote, verify, and settle connect? Walk through the live demo: [x402 Demo](https://dheeraj-agentic-communication-demo.netlify.app/).

The early steps show **ACP**: handshake, session, intent, and offer between the buyer-side agent and seller-side agent. When the **payment** step begins, you are watching **x402** in action. Step through it once, then come back to this post.

---

## Thank you for reading
