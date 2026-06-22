---
layout: post
title: "Understanding ERC-8004: Identity, Reputation, and Validation for Agents"
date: 2026-06-22
excerpt: "ERC-8004 is a global on-chain registry for agents: identity via ERC-721, buyer feedback on the Reputation Registry, and third-party attestation on the Validation Registry. This post explains how the three registries work, what gets stored on-chain, and where the model breaks in practice."
---

Say your buyer agent finds a seller agent, negotiates over [ACP](/2026/05/26/Understanding-Agent-Client-Protocol.html), and pays with [x402](/2026/06/08/Understanding-x402-Agent-Payments-on-Chain.html). Payment settles. Now what?

You still need to know who you paid, whether others trust them, and whether an independent party verified their claims. That is what ERC-8004 is for.

## What is ERC-8004?

ERC-8004 is a protocol to build a global registry for agents, giving them identity, reputation, and validation on-chain.

There are roughly eight billion people on this planet. If every human eventually runs one agent to achieve a particular task, we need a way to keep those agents accountable. A global registry with a history of each agent's activity, promoted or demoted based on what it actually did, and a record that cannot be tampered with or manipulated because it lives on a blockchain.

As the population of agents grows, we need a decentralized directory. These agents are borderless and internet-native. They can transact on behalf of a user and disrupt cross-border payments. That enables KYA (Know Your Agent), the same way finance uses KYC for people.

This solves discovery (global identity), which builds trust.

---

## How does it work?

ERC-8004 combines three registries:

<div class="table-wrap" markdown="1">

| Registry   | Question it answers                         | Analogy                                  |
| ---------- | ------------------------------------------- | ---------------------------------------- |
| Identity   | Who is this agent?                          | A business license with a public listing |
| Reputation | How did buyers rate it?                     | Customers reviewing a restaurant         |
| Validation | Did an independent party verify its claims? | A food inspector certifying the kitchen  |

</div>

---

## 1) Identity Registry

Before reputation or validation matter, the agent needs a public ID. Agents register on the Identity Registry using ERC-721. Each agent is an NFT (Non-Fungible Token), browsable and transferable across NFT-compliant apps.

**Identity (ID tab).** Each registered agent gets an agent ID, chain, global ID (e.g. `eip155:84532:…:6832`), owner address, agent wallet, and declared payment support. [See agent #6832 on 8004scan](https://testnet.8004scan.io/agents/base-sepolia/6832) for a live example on Base Sepolia.

<figure class="post-figure-sm">
  <img src="/assets/images/ERC_8004/erc8004-profile-id.png" alt="ERC-8004 agent identity tab">
  <figcaption>Figure 1: Identity (ID tab).</figcaption>
</figure>

The on-chain NFT points to an off-chain registration file (`agentURI`). A typical file looks like this:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Attention Agent",
  "description": "Commerce agent that turns buyer intent into catalog offers and payments.",
  "image": "https://blob.8004scan.app/30aefe5a...fcb3d869.jpg",
  "services": [
    {
      "name": "custom",
      "endpoint": "https://example-agent.example.com/"
    }
  ],
  "registrations": [
    {
      "agentId": 6832,
      "agentRegistry": "eip155:84532:0x8004A818...A494BD9e"
    }
  ],
  "supportedTrusts": ["reputation", "tee-attestation"],
  "active": true,
  "x402support": true
}
```

<div class="table-wrap" markdown="1">

| Field                 | Meaning                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `services[].endpoint` | Public URL where the agent can be reached                                                             |
| `registrations[]`     | Links this file back to on-chain agent ID + registry contract                                         |
| `x402support`         | Agent accepts x402 machine payments                                                                   |
| `supportedTrusts`     | Declared trust models (`reputation`; `tee-attestation` is metadata until Validation Registry is used) |

</div>

---

## 2) Reputation Registry

With identity settled, the next question is trust. Once an agent is registered and publicly visible, its credibility grows through on-chain feedback from clients who actually used it.

That feedback can measure quality of service (star rating), reachability, uptime, success rate, response time, and more. The better an agent performs, the faster it tends to climb discoverability rankings on indexers like [8004scan](https://testnet.8004scan.io/).

Feedback is structured in an off-chain file; a hash (or inline URI) is submitted on-chain via `giveFeedback()`.

A common scoring pattern maps star ratings to a 0–100 scale (e.g. 4 stars = 80 points).

**Rating UI.** Clients express a score — often as stars that map to a numeric value out of 100.

<figure class="post-figure-sm">
  <img src="/assets/images/ERC_8004/erc8004-rating-ui.png" alt="Star rating UI mapped to a numeric score">
  <figcaption>Figure 2: Rating UI.</figcaption>
</figure>

**Submitting feedback.** The client wallet signs and broadcasts `giveFeedback()` on the Reputation Registry.

<figure class="post-figure-sm">
  <img src="/assets/images/ERC_8004/erc8004-reputation-flow.png" alt="On-chain giveFeedback transaction flow">
  <figcaption>Figure 3: Submitting feedback.</figcaption>
</figure>

Feedback is averaged with previous entries. For [agent #6832 on 8004scan](https://testnet.8004scan.io/agents/base-sepolia/6832):

<div class="table-wrap" markdown="1">

| Metric                    | Value                |
| ------------------------- | -------------------- |
| Average score             | 4.2 / 5 (85/100)     |
| Total feedback            | 16                   |
| Overall leaderboard score | 20.83                |

</div>

**Profile Feedback tab.** Surfaces on-chain feedback count, average score, payment history tied to reviews, and publisher identity.

<figure class="post-figure-sm">
  <img src="/assets/images/ERC_8004/erc8004-profile-feedback.png" alt="Profile feedback tab">
  <figcaption>Figure 4: Profile Feedback tab.</figcaption>
</figure>

8004scan blends multiple dimensions when computing rank: engagement, service, compliance, momentum.

**Score breakdown.** Weighted dimensions produce the leaderboard score. Avg validation score stays at 0 until a validator submits an attestation on the Validation Registry.

<figure class="post-figure-sm">
  <img src="/assets/images/ERC_8004/erc8004-score-breakdown.png" alt="8004scan score breakdown dimensions">
  <figcaption>Figure 5: Score breakdown.</figcaption>
</figure>

**Profile Rank tab.** Indexer-computed dimensions that drive discoverability beyond raw star averages.

<figure class="post-figure-sm">
  <img src="/assets/images/ERC_8004/erc8004-profile-rank.png" alt="Profile rank tab">
  <figcaption>Figure 6: Profile Rank tab.</figcaption>
</figure>

### Why fake feedback is harder

Every `giveFeedback` call costs gas. Bots are usually not willing to pay for every review, so each feedback carries a real cost. Tags (e.g. `x402`, `acp-commerce`) let indexers filter agents by rating, context, and endpoint — similar to filtering restaurants on a maps app, except the reviews are on-chain and portable across apps.

A single rating splits across three layers:

<div class="table-wrap" markdown="1">

| Layer | What gets stored | Example |
| ----- | ---------------- | ------- |
| On-chain (Reputation Registry) | Score, tags, endpoint, proof pointer | 80 points, `x402`, `acp-commerce`, agent endpoint URL |
| Off-chain (inside `feedback_uri`) | Full payment or service receipt | USDC paid, tx hash, offer ID, network |
| Indexer (8004scan) | Aggregated trust signals | 4.2/5 average, 16 total reviews, rank 20.83 |

</div>

The on-chain call itself carries four fields:

<div class="table-wrap" markdown="1">

| Field          | Example                            | Purpose                    |
| -------------- | ---------------------------------- | -------------------------- |
| `value`        | `80`                               | Score 0–100 (4 stars × 20) |
| `tag1`         | `x402`                             | Payment rail used          |
| `tag2`         | `acp-commerce`                     | Commerce context           |
| `feedback_uri` | `data:application/json;base64,...` | Off-chain payment proof    |

</div>

---

## 3) Validation Registry

Reputation tells you what buyers thought. Validation answers a different question: did an independent party verify the agent's claims?

The Validation Registry is where trusted validators attest to capabilities, identity, or runtime behavior (TEE proofs, audits, service checks). Until an attestation is submitted, the validation score on indexers remains at zero — as visible in Figure 5.

<div class="table-wrap" markdown="1">

|                    | Reputation Registry               | Validation Registry           |
| ------------------ | --------------------------------- | ----------------------------- |
| Who submits        | Buyer / client after use          | Named validator address       |
| What it proves     | "I paid and rate this experience" | "I tested and attest claim X" |

</div>

---

## Advantages

<div class="table-wrap" markdown="1">

| Parameter                   | Explanation                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Public trust record         | Ratings live on-chain; anyone can verify them, not just trust a platform's database                    |
| Portable reputation         | An agent's score follows its ERC-8004 identity across apps and indexers, not locked to one marketplace |
| Spam is costly              | Gas makes mass fake reviews more expensive than free web ratings                                       |
| Tied to real wallets        | Each review links to an address, so accountability is stronger than anonymous forms                    |
| Better discoverability      | Indexers (e.g. 8004scan) turn feedback into rankings so good agents get found faster                   |
| Richer context possible     | Off-chain proofs (payment receipt, test report) can back the on-chain score                            |
| Independent validators      | Validation Registry lets third parties attest quality, not only buyer opinions                         |

</div>

---

## Limitations

<div class="table-wrap" markdown="1">

| Parameter                        | Explanation                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Gas kills participation          | Unlike Google/Yelp, buyers must pay to rate; most won't, so scores skew toward motivated users |
| Off-chain storage cost & ops     | Detailed proofs need IPFS/hosting; someone pays and maintains that data                        |
| Sybil attacks still possible     | Gas helps but doesn't stop someone funding many wallets to inflate ratings                     |
| Slow to show up                  | On-chain tx ≠ instant rank change; indexers lag, so UX feels broken to normal users            |
| Wallet UX barrier                | Mainstream users don't want to sign crypto txs after a purchase                                  |
| Rank is confusing                | Leaderboard score ≠ simple star average; users misread trust signals                           |
| No recourse for bad reviews      | Mistaken or malicious on-chain feedback is hard to remove or dispute                           |

</div>

---

## How the pieces connect

<div class="table-wrap" markdown="1">

| Step         | What happens                                |
| ------------ | ------------------------------------------- |
| Identity     | Agent registers on the Identity Registry    |
| Interaction  | Client uses the agent (e.g. via ACP)        |
| Payment      | Client pays (e.g. via x402)                 |
| Reputation   | Client submits `giveFeedback()` on-chain    |
| Discoverability | Indexers update rank and public profile  |

</div>

## References

- [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004)
- [8004scan (testnet)](https://testnet.8004scan.io/)
- [Example agent #6832 on Base Sepolia](https://testnet.8004scan.io/agents/base-sepolia/6832)

---

Want to see ERC-8004 in action? Try it here: [dheeraj-agentic-communication-demo.netlify.app](https://dheeraj-agentic-communication-demo.netlify.app/)
