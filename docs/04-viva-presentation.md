# SmartEscrow — Part 4: Viva, Presentation, Revision

---

## 13. Viva / interview questions (60)

### A. Basics

**1. What is SmartEscrow in one sentence?**
A Next.js dApp that turns a plain-English payment condition into a smart-contract
escrow on Base Sepolia, stores the payment metadata off-chain, and lets the payer
or an oracle release or refund the locked funds.

**2. What problem does it solve?**
It removes the trusted intermediary and manual settlement from conditional
payments: funds are locked in code, release is a public transaction, and the
rules cannot be silently changed by the platform.

**3. Why blockchain instead of a normal database?**
A database can record "Alice owes Bob", but it cannot hold and transfer the money
without the platform being custodian. The contract holds the funds and enforces
who can move them.

**4. Why Base Sepolia?**
It is an EVM L2 with cheap testnet gas and a public faucet, so the full flow can
be demonstrated without real money. The chain id is 84532.

**5. Is this production-ready?**
No. It is testnet-only and unaudited, has a centralised oracle, an in-memory auth
store, and known recurring-payment accounting issues.

**6. Who are the users?**
Payers who lock funds against a deliverable, receivers who want proof of funds,
and developers/examiners evaluating the implementation.

**7. What are the four escrow types?**
Conditional (manual/oracle release), scheduled (release after a timestamp),
recurring (periodic payouts), and NFT-conditional (conditionTarget + token id,
advisory check).

**8. What is the "escrow id"?**
An incrementing `uint256` assigned by the contract (`nextEscrowId++`). It is the
key used to release/refund and to link the DB record via `contractEscrowId`.

### B. Architecture

**9. Describe the architecture.**
Browser (React/wagmi) → Next route handlers → `db.ts` → Mongo/JSON; the browser
also talks directly to Base Sepolia via the wallet; Node workers (listener,
scheduler, reconcile) talk to the chain and the same DB.

**10. Why does the browser talk to the chain directly?**
Transactions must be signed by the user's private key, which never leaves the
wallet. The server cannot (and should not) sign for the payer.

**11. What is the role of the Next.js server then?**
It authenticates wallet ownership, stores/updates metadata, validates and parses
input, serves the RAG chatbot, and reads chain data for the events endpoint.

**12. Where is the source of truth for money?**
The smart contract. The database is a convenience index; `reconcile.ts` can
rebuild linkage and status from chain state.

**13. What happens if the database is deleted?**
Escrows still exist on-chain and funds are safe. Records can be recovered by
scanning `EscrowCreated`/`EscrowReleased`/`EscrowRefunded` events and matching
sender/receiver/amount, which is what reconciliation does.

**14. What happens if the server is restarted?**
Auth sessions/nonces are lost, so the client re-signs on the next request;
payments persist in Mongo/JSON. The event listener's in-memory dedupe set resets,
but its updates are idempotent.

### C. Technology choices

**15. Why Next.js?**
One codebase for React UI and API route handlers, file routing, and simple
deployment. A separate backend would add operational overhead for a small app.

**16. Why wagmi/viem instead of ethers in the browser?**
wagmi provides React hooks for connection, reads, writes, and receipts with
caching; viem gives typed ABI utilities and signature verification. Ethers is
still used in Node scripts.

**17. Why MongoDB?**
The payment document has many optional fields and no joins; a document store
maps naturally. Atlas has a free tier. PostgreSQL would be better if relational
entities (users, disputes, audit) were added.

**18. Why a JSON fallback?**
So the project runs with zero database setup during a demo. It is explicitly a
development convenience, not a production store.

**19. Why Gemini?**
It handles paraphrased input better than regex, and the same provider supplies
embeddings. The parser still has a deterministic fallback, so the app does not
depend on AI availability.

**20. Why Zod if there is already manual validation?**
The AI output is untrusted. Manual checks sanitize, Zod enforces the final shape
and enums; two independent passes reduce the chance of a malformed value
reaching a transaction.

**21. Why Hardhat?**
Compilation, local node, deployment, and tests in the same TypeScript ecosystem.
Foundry is a valid alternative but would split tooling.

### D. Database

**22. What is the primary key?**
The application-level `id` (`pay_<uuid>`), with a unique index. Mongo also has
`_id`, but the app never exposes or uses it.

**23. Is `contractEscrowId` a foreign key?**
No. It is a soft reference to an on-chain struct; there is no database
constraint. Sender validation before writes prevents wrong links.

**24. Why are amounts stored as numbers, not wei?**
They are human-readable display values; conversion to base units happens at the
contract boundary with `parseUnits`. This is convenient but can lose precision
for extreme values; storing strings/wei would be stricter.

**25. What indexes exist and why?**
Unique `id` (lookup/dedupe), `senderAddress` (scoped lists), `type` and `status`
(filters), sparse `contractEscrowId` (listener/reconcile).

**26. How does the listener find a record?**
`updatePaymentByEscrowId(id, updates)` matches `contractEscrowId` and updates
status/hashes.

**27. Can an update clear a field?**
Not through `updatePayment`; `pickUpdates` ignores `undefined`. Clearing would
need an explicit `$unset` path.

**28. What are the JSON backend's weaknesses?**
Whole-file synchronous writes, no locking, no schema validation, and no
multi-instance safety; concurrent writes can lose data.

### E. API

**29. How does authentication work?**
Client requests a nonce, signs a message containing the address and nonce, and
sends address/signature/nonce headers. The server verifies with `viem`, deletes
the nonce, and creates a 5-minute session.

**30. Why is the nonce single-use?**
To stop replaying a captured signature. After a successful verify it is deleted;
reuse fails even within the expiry window.

**31. Why headers instead of cookies?**
The credential is a signature, not a session cookie; custom headers are explicit
and avoid ambient authority. There is no password or cookie to steal.

**32. How is sender spoofing prevented?**
The POST handler ignores the body's sender and writes the verified wallet
address. PATCH compares the stored sender with the verified address.

**33. What does GET /api/payments return?**
Only payments where the authenticated wallet is the sender, sorted newest first
by `createdAt` in Mongo.

**34. Why does PATCH require status?**
The current handler treats status as mandatory and updates the whitelisted
fields. This is a limitation: a txHash-only update is rejected.

**35. What are the parser's response fields?**
Receiver name/address, amount, token, type, condition, description, and optional
schedule/frequency from the rule fallback. `mock: true` means AI was not used.

**36. Why is `/api/events` returning no events?**
It requests 10,000 blocks; the public RPC caps `eth_getLogs` at 200 and the catch
block returns an empty array. A paid RPC or chunked query fixes it.

**37. What HTTP status does the chatbot use for configuration problems?**
503 with `code: MISSING_API_KEY` or `EMPTY_KNOWLEDGE_BASE`; validation is 400;
unexpected failures are 500.

### F. Frontend

**38. Where is global payment state?**
`EscrowContext`, mounted by the dashboard layout. It holds payments, auth header
cache, sample-data toggle, metrics, and the API helpers.

**39. Why cache auth headers?**
Signing every request would spam the wallet. Headers are reused for 4 minutes
(the nonce lives 5), then rebuilt.

**40. What happens on a 401?**
`authorizedFetch` clears the cache, obtains a new nonce/signature, and retries
the request once.

**41. Why retry the linkage PATCH twice?**
The wallet session can expire while the user is confirming a transaction. The
first retry uses a fresh signature; the page-level retry covers a transient
failure. If both fail, the UI refuses to claim success.

**42. Why does the create page verify the saved record?**
A 200 response is not enough; the returned record must contain the same tx hash
and escrow id, otherwise release/refund would be impossible.

**43. How is the escrow id obtained from a wallet transaction?**
The wallet returns a hash; the app waits for the receipt and decodes the
`EscrowCreated` log with viem's `decodeEventLog`.

**44. Why wait for the ERC-20 approval receipt?**
`createEscrow` calls `transferFrom`; if the approval is not mined first, the
escrow transaction reverts. Waiting also lets the UI show the two-step progress.

**45. What is the difference between `txHash` and `fundedTxHash`?**
`txHash` is the escrow creation transaction; `fundedTxHash` is the ERC-20
approval transaction.

**46. Why can the dashboard show "Not connected" balances but a contract value?**
The wallet balance is only read when an address exists; the contract balance is
public and read regardless.

**47. Why is there sample data?**
To demonstrate the UI without chain transactions. It is opt-in, labelled, and
never merged with real records; metrics ignore it.

### G. Contract and backend

**48. Who can release funds?**
The sender or the oracle. This is broader than "condition met": the sender can
always release, and the oracle is trusted.

**49. Who can refund?**
The oracle at any time; the sender only after `deadline`; everyone else reverts.

**50. What is the executor?**
An address allowed (with the oracle) to call `executeScheduledRelease` and
`executeRecurringPayout`. It defaults to the oracle at deployment.

**51. How is reentrancy prevented?**
`nonReentrant` on settlement functions plus checks-effects-interactions: status
is changed (and `lastRecurringExecution` written) before the external call.

**52. Why does the contract use `call` for ETH?**
`transfer` forwards a fixed 2300 gas and can break smart-contract receivers;
`call` with a success check is the recommended pattern.

**53. What happens on double release?**
The second call fails `require(status == Active)`. Tests cover this.

**54. What is the recurring-payment bug?**
Creation deposits `amount` once, but every payout sends `amount` again. After the
first payout the escrow is unfunded; later payouts can drain other escrows or
fail. The status also remains Active on-chain.

**55. Is the NFT condition enforced on-chain?**
No. `verifyNFTCondition` is a view function; settlement does not call it. The
oracle must check it and choose `resolveEscrow`.

**56. What does the scheduler do if a payment is not due?**
The contract reverts with a reason ("Scheduled time not reached", "Interval not
yet elapsed"); the scheduler logs and leaves the record active.

**57. Why does the listener start at the current block?**
To avoid replaying history on every start. The trade-off is missed events during
downtime, which reconciliation repairs.

**58. What does reconciliation correct?**
Missing `contractEscrowId`/`txHash`/`blockNumber`, stale status, missing
settlement hashes/dates, and linkage recovered from receipts or a bounded event
window.

**59. Why does reconciliation refuse the JSON fallback when Mongo is configured?**
So an operator cannot believe a production repair succeeded while it actually
wrote to a local file. `requireMongo` throws instead.

**60. How would you scale this?**
Move auth state to Redis, run the indexer/scheduler as durable workers with a
queue, paginate and index queries, use a managed RPC with wide log ranges, add a
receiver portal, and replace the single oracle with a multisig/oracle network.

---

## 13.1 One-minute introduction (~150 words)

"SmartEscrow is a full-stack Web3 escrow application. A user connects a wallet,
describes a payment in plain English, and the app extracts the recipient, amount,
token, and release condition. The funds are then locked in a Solidity contract on
Base Sepolia, and the database stores the payment metadata and the on-chain
escrow id. Later, the payer or the oracle can release the money, the payer can
refund after the deadline, and a scheduler can execute time-based payments. The
app supports ETH, USDC, and USDT, wallet-signature authentication instead of
passwords, four escrow types, and a RAG chatbot that answers questions from the
project documentation. The system also has an event listener and a reconciliation
script, so the off-chain record can be repaired from the chain if a write fails.
It is testnet-only and unaudited, but it demonstrates the complete escrow
lifecycle end to end."

## 13.2 Three-minute explanation (~450 words)

"SmartEscrow solves a trust problem. If two people agree on a conditional
payment, someone normally has to hold the money — a marketplace, a lawyer, or a
platform. That intermediary can freeze funds, delay settlement, or take a fee.
SmartEscrow replaces that intermediary with a smart contract on Base Sepolia.

The user flow has four stages. First, connect a wallet. Authentication uses a
signed nonce rather than a password: the server issues a nonce, the wallet signs
a message containing the address and nonce, and the server verifies the signature
with viem. That proves wallet ownership without exposing a private key.

Second, define the payment. The user can type a sentence, which is sent to
Gemini with a strict JSON schema. The response passes a manual validator and a
Zod schema; if the AI is unavailable, a deterministic rule parser takes over. The
user reviews every field before continuing.

Third, lock the funds. The app first creates a pending record in MongoDB or the
local JSON fallback. Then it sends the contract transaction. For ETH it sends the
amount as `msg.value`; for USDC or USDT it first approves the exact amount, waits
for that receipt, and then creates the escrow. When the transaction is mined, the
app decodes the `EscrowCreated` event to get the escrow id, then updates the
database with the transaction hash and id. That write is retried and verified;
if it cannot be confirmed, the UI tells the user not to create the escrow again,
and the reconciliation script can repair the record later.

Fourth, settle. The detail page can release or refund. It sends the wallet
transaction, waits for the receipt, and only then marks the record completed or
cancelled. The contract enforces the rules: only the sender or oracle can
release; the oracle can refund anytime; the sender can refund only after the
deadline. Reentrancy is blocked, and state changes happen before external calls.

There are also background services. The event listener syncs chain events to the
database. The scheduler executes scheduled and recurring escrows. The
reconciliation script treats the chain as the source of truth and repairs
missing or stale records.

The stack is Next.js 16 and React 19, wagmi and viem, Solidity 0.8.20 with
Hardhat, MongoDB with a JSON fallback, and Gemini for parsing and the chatbot.
The main limitations are that it is testnet-only, the oracle is a single trusted
address, the auth store is in memory, and recurring escrows are underfunded
because the contract pays the same amount repeatedly from a single deposit."

## 13.3 Five-minute technical explanation (~850 words)

Use the three-minute structure, then add these technical details:

1. **Architecture.** Root layout mounts `Web3Provider` and `ToastProvider`;
   the dashboard layout mounts `EscrowProvider`, which owns payments and the auth
   cache. The browser never sends its private key. The server owns metadata and
   verification; the chain owns money.

2. **Contract model.** `SmartEscrow` stores a struct per escrow with sender,
   receiver, token, amount, condition, deadline, status, type and type-specific
   fields. `nextEscrowId` increments from zero. `release`, `refund`,
   `resolveEscrow`, `executeScheduledRelease`, and `executeRecurringPayout` are
   all guarded by status and access checks and `nonReentrant`. The two internal
   settlement functions set status before transferring and use `call` for ETH.

3. **Persistence and linkage.** The metadata record is created first as
   `pending`, then linked with `txHash`, `fundedTxHash`, and `contractEscrowId`.
   Receipts are the bridge: `extractEscrowIdFromLogs` decodes every log against
   the ABI and returns the `EscrowCreated` id. This logic is shared by the hook
   and the E2E test.

4. **Reliability engineering.** Wallet sessions are in-memory and expire after
   five minutes, so a PATCH can legitimately return 401 after the chain
   transaction. `authorizedFetch` rebuilds credentials and retries; the create
   page retries the write and verifies the returned record. If all attempts
   fail, the record can be recovered by `reconcile.ts`, which resolves the id
   from stored fields, receipts, or a bounded event scan, checks the on-chain
   sender, and corrects status/hashes without overwriting unrelated records.

5. **AI pipeline.** Parsing uses Gemini with a response schema, then manual
   sanitisation and Zod. RAG uses `pdf-parse` → 1000/150 chunks → 3072-dimension
   embeddings → JSON vector store → cosine top-4 → Gemini with a context-only
   prompt. Missing key or empty store becomes a typed 503.

6. **Security posture.** Implemented: signature auth, one-time nonce, sessions,
   sender derivation, ownership checks, validation, secret separation, contract
   access control, reentrancy guards. Missing: rate limiting, CSP/security
   headers, durable auth store, receiver access, contract pause/upgrade,
   multisig oracle, audit. Be explicit that "audited" is not true.

7. **Known defects.** Recurring pays `amount` repeatedly from one deposit and is
   marked completed by the listener after the first payout; the default duration
   is shorter than the interval; `/api/events` exceeds the public RPC log range;
   the profile shows a hardcoded USD estimate; `/api/index-pdf` does not index.

8. **Verification.** Contract 23, E2E 3, API 15, security 22, JSON DB 8, chatbot
   UI 9 — 80 passing in this review; Mongo 5 are opt-in; chatbot live tests need
   a key and vector store.

## 13.4 Demonstration script (10–12 minutes)

**Preparation:** dev server running; wallet on Base Sepolia with faucet ETH; at
least one USDC for the token flow; contract address set; Mongo connected or JSON
fallback acknowledged.

1. **Landing page (30 s).** Show the hero, explain the four steps, and point out
   that the animation is illustrative, not a live API call.
2. **Connect (45 s).** Click Connect Wallet, choose the browser wallet, switch to
   Base Sepolia if prompted. Sign the message. Say explicitly: "This is a
   signature, not a transaction, and it costs no gas."
3. **Dashboard (45 s).** Show the live wallet balance and contract balance, the
   active/completed cards, and the real payment list. Mention sample data is
   opt-in and labelled.
4. **Create with natural language (2 min).** Enter: "Pay 0.0001 ETH to 0x… when
   the demo deliverable is approved." Extract, show the populated fields, edit
   the condition, continue to review.
5. **Confirm and explain the two writes (1.5 min).** Confirm; show the pending
   record, the wallet transaction, the Basescan hash, and the success state.
   Explain that the DB was updated only after the receipt and the escrow id was
   decoded from the event.
6. **Verify on-chain (1 min).** Open the detail page; show escrow id, tx hash,
   status, and the timeline. Open Basescan and show `EscrowCreated`.
7. **Release (1 min).** Click Release Funds, confirm in the wallet, wait, show
   status Completed. Point out the receipt was checked before the DB write.
8. **Refund path (optional, 1 min).** Create a second escrow, try refund before
   the deadline (contract rejects), then use the oracle/executor or wait.
9. **Automation (1 min).** Show `npm run scheduler:dry` output and explain that
   the real scheduler signs with the server key; mention the listener.
10. **Repair story (1 min).** Run `npm run reconcile:dry`; explain how it would
    recover a record that lost `txHash`/`escrowContractId`.
11. **Chatbot (30 s).** Ask "How do I connect MetaMask?" and show the grounded
    answer; mention the 503 behavior when unconfigured.
12. **Close (30 s).** Summarize the trust model, the test counts, and the honest
    limitations.

## 13.5 Difficult examiner questions

**"You call it non-custodial, but the oracle can release or refund. Isn't that
custody?"**
The contract holds funds; neither the company nor the oracle can move them to an
arbitrary address. But the oracle *can choose* release vs refund, so it is a
trusted adjudicator. This is a centralisation weakness; a multisig or decentralised
oracle network is the fix.

**"What stops me from editing the database and marking my payment completed?"**
Nothing in the DB protects the money. A forged status only changes what the UI
shows; the contract still requires a release transaction, and the listener/
reconcile will overwrite the status from chain state. The API also scopes writes
to the authenticated sender.

**"What if the server is down when a transaction succeeds?"**
The chain state is authoritative. The client may fail to PATCH, but the record
keeps the deposit hash and the UI warns the user. `reconcile.ts` reads the
receipt/logs and repairs the linkage later.

**"Why not store the private key on the server and sign for users?"**
That would make the platform custodial and create a single catastrophic key.
Users sign with their own wallet; the server key is only for deployment and
scheduled execution.

**"How do you know the escrow id belongs to this payment?"**
The receipt must contain `EscrowCreated`; reconciliation additionally checks the
on-chain sender against the record's sender before linking. Receiver/amount
mismatches are logged.

**"Can a user replay a signature?"**
The same session headers work for up to five minutes by design, but the nonce is
deleted after first verification, so a captured signature cannot start a *new*
session. After five minutes both the session and nonce are invalid.

**"What is the biggest bug?"**
Recurring escrows: one deposit funds repeated `amount` payouts, so the second
payout is unfunded. The listener also marks the escrow completed after the first
release. This needs a budget/decrement model and a distinct payout event.

**"Why are there two database backends?"**
For zero-setup demos, with Mongo for persistence. The fallback is explicitly not
production-safe (no locking, whole-file writes).

**"Your README says audited and multi-chain. Is that true?"**
No. There is no audit report and the wagmi config supports Base Sepolia and
localhost; only Base Sepolia has a deployment. The README is aspirational in
those places, and the code is the authority.

## 13.6 Final revision sheet

**Numbers to remember**

- Chain: Base Sepolia, `84532`.
- Escrow status enum: `0 Active`, `1 Completed`, `2 Refunded`.
- Escrow type enum: `0 Conditional`, `1 Scheduled`, `2 Recurring`.
- Nonce/session TTL: 5 minutes; client header cache: 4 minutes.
- RAG: 1000-char chunks, 150 overlap, 3072-dim embeddings, top-4.
- Tests: contract 23, E2E 3, API 15, security 22, JSON DB 8, Mongo 5 opt-in,
  chatbot 7 API + 9 UI; 80 executed here.

**Pipeline in one line**
Parse → validate → `POST` pending → wallet tx (approve first for ERC-20) → wait
receipt → decode `EscrowCreated` → `PATCH` linkage → release/refund → wait
receipt → `PATCH` settlement.

**Security in one line**
Signature + one-time nonce + 5-min session → server-derived sender → ownership
checks → validation → nonReentrant contract → checks-effects-interactions.

**Failures to mention before you are asked**
Centralised oracle; unaudited; in-memory auth; no rate limiting; recipient has no
portal; POST accepts client-owned fields; `/api/events` log range; recurring
underfunding/completion bug; fake USD on profile; `indexPDF` unwired.

**The strongest answer you can give**
"The chain is the source of truth. The database is an index that we can rebuild,
and we wrote the reconciliation tooling to prove it."
