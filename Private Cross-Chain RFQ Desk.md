# Implementation Specification: Private Cross-Chain RFQ Desk

## Product Overview and Purpose

The Private Cross-Chain Request for Quote (RFQ) Desk represents a paradigm shift in decentralized institutional trading, engineered specifically as a hybrid solution for the Encrypt-Ika Frontier April 2026 Hackathon. The protocol establishes a decentralized, zero-trust execution venue where institutional entities can negotiate and settle large-scale block trades across disparate blockchain networks without exposing their strategic intent to the public ledger. Operating at the direct intersection of "bridgeless capital markets" and "encrypted capital markets," the architecture fuses the Solana blockchain's high-throughput settlement layer with two groundbreaking cryptographic primitives: the Encrypt network's Fully Homomorphic Encryption (FHE) infrastructure and the Ika network's decentralized Multi-Party Computation (MPC) custody layer.

The primary purpose of this specification is to define a complete, concrete, and implementation-ready blueprint that serves as the single source of truth for all engineering efforts. The resulting product is designed to function as a startup-ready decentralized application (dApp) rather than a mere hackathon proof-of-concept. By utilizing Encrypt’s Ring-Enhanced Fully Homomorphic Encryption (REFHE) protocol, the system masks RFQ sizes, prices, and counterparty logic until a definitive mathematical match is achieved. Simultaneously, the protocol leverages the Ika network's 2PC-MPC cryptography and dWallet primitives to orchestrate native cross-chain asset custody and programmatic signing. This dual integration guarantees that neither the asset’s cross-chain trajectory nor the underlying trade terms are exposed to front-runners, Maximum Extractable Value (MEV) bots, or copy-traders prior to the final, irreversible execution of the trade.

## Problem Statement

Institutional participants, including Over-The-Counter (OTC) desks, automated market makers (AMMs), treasury management teams, and high-net-worth traders, face systemic execution risks when deploying significant capital within transparent Decentralized Finance (DeFi) environments. Public blockchains are inherently designed to broadcast state changes, which introduces severe information leakage. When an institutional trader submits a large Request for Quote or attempts to route a massive block trade through a traditional Central Limit Order Book (CLOB) or AMM, the public mempool exposes the intent, size, and timing of the trade. Adversarial actors utilize this transparency to calculate the trader's inventory constraints and urgency, resulting in predatory trading behaviors such as front-running and sandwich attacks.

Furthermore, executing cross-chain trades introduces severe fragmentation and custodial risks. Historically, moving liquidity between chains such as Bitcoin and Solana has required the use of centralized bridges or the minting of wrapped tokens. These mechanisms force users to surrender custody of their native assets to smart contract honeypots, which have proven exceptionally vulnerable to devastating exploits and de-pegging crises. Existing cross-chain RFQ solutions force a binary choice upon the user: either sacrifice zero-trust custody by using centralized custodians, or accept the systemic risks of fragmented, wrapped-token liquidity silos. The Private Cross-Chain RFQ Desk resolves these critical failures by ensuring that trade data remains cryptographically sealed during the negotiation and matching phases, and that cross-chain assets are managed via non-collusive, decentralized multiparty computation rather than vulnerable bridging smart contracts.

## Hackathon Fit and First-Prize Strategy

This architectural specification is explicitly optimized to dominate the Encrypt-Ika Frontier April 2026 hackathon by targeting the "Hybrid Solutions" category, rigorously satisfying the judging criteria for core integration, innovation, technical execution, and commercial potential. The architecture fundamentally depends on the core technologies provided by both sponsors, ensuring that their inclusion is structural rather than superficial. Without the integration of Encrypt’s REFHE protocol, the order matching logic would require on-chain decryption, violating the core privacy constraint. Conversely, without the integration of Ika’s dWallets, the cross-chain settlement phase would necessitate the use of vulnerable wrapped assets or centralized bridges. Both Software Development Kits (SDKs) are inextricably woven into the primary product loop.

The innovation of this project lies in bridging FHE-based encrypted state matching with 2PC-MPC programmatic custody. Existing confidential computing projects typically isolate their execution to single-chain tokens. This protocol proves that FHE-driven logic on Solana can programmatically authorize state changes on foreign blockchains, such as Bitcoin, via zero-trust signature generation. Commercially, the product targets a known, high-value problem within institutional trading, offering a solution that aligns perfectly with the hackathon's mandate to build real-world Web3 applications designed like startup launchpads.

To maximize the probability of securing the first-place prize, the implementation strategy relies on relentless focus and a tightly scoped Minimum Viable Product (MVP). The demonstration will feature exactly one complete, flawless lifecycle: a hidden RFQ creation, an encrypted bid submission, a homomorphically evaluated match, a cross-chain signature generation via Ika, and a final public settlement of the outcome. Superfluous features, such as multi-asset routing algorithms or complex dynamic order books, are explicitly excluded from this specification to guarantee a robust, production-grade presentation of the core sponsor technologies without the risk of scope creep or mid-demonstration failures.

## Target Users and User Roles

The system architecture designates two primary user roles, constrained to a peer-to-peer (P2P) interaction model for the duration of the MVP scope. These roles reflect the institutional nature of the application and define the authorization boundaries within the smart contract logic.

### The Maker (RFQ Initiator)

The Maker represents an institutional trader, treasury manager, or fund operator aiming to offload a large position of a native asset across a distinct blockchain network in exchange for a Solana-native stablecoin. The Maker requires absolute discretion regarding the size of the block they are moving and the minimum price they are willing to accept. The Maker possesses the technical capability to generate an Ika dWallet, which serves as the non-collusive cross-chain address for the asset they intend to sell. Through the application's frontend, the Maker defines the hidden parameters of the RFQ using Encrypt’s client-side SDK to generate ciphertexts , and subsequently deploys this encrypted state to the Solana Anchor program. The Maker's primary motivation is to secure a counterparty without revealing their hand to the broader market.

### The Taker (Bidder)

The Taker represents an OTC desk, algorithmic market maker, or specialized trading firm seeking to fulfill large orders and capture arbitrage opportunities. The Taker actively monitors the platform for newly deployed, sealed RFQs. While the Taker can observe the existence of an RFQ and the cryptographic commitment of the Maker's collateral within a dWallet, the actual price and size parameters remain completely obfuscated. The Taker utilizes the platform to formulate counter-bids, encrypting their proposed price and size using the Encrypt FHE cluster's public key. The Taker submits this encrypted bid alongside a physical escrow of Solana-native assets to the Anchor program, triggering the homomorphic evaluation process.

## Core User Journeys

The end-to-end user journey encapsulates the entirety of the integration, demonstrating the seamless handoff between client-side encryption, Solana state management, FHE computation, and MPC settlement.

The initialization journey begins when the Maker accesses the trader console and authenticates via a standard Solana wallet interface. The Maker invokes the Ika SDK to initiate a 2PC-MPC key generation ceremony, producing a new dWallet with a corresponding address on the target foreign chain. The Maker securely deposits the native asset into this dWallet address. Returning to the console, the Maker inputs the highly sensitive terms of the trade, specifying the exact size of the asset block and the minimum acceptable settlement price in USDC. The client application utilizes the Encrypt SDK to transform these plaintext values into secure REFHE ciphertexts. Finally, the Maker submits a transaction to the Solana Anchor program, effectively opening the RFQ by recording the ciphertexts and mapping them to the unique identifier of the generated dWallet.

The bidding journey commences when a Taker identifies the active RFQ via the frontend interface. Lacking knowledge of the Maker's exact parameters, the Taker formulates a competitive bid based on their own risk models. The Taker inputs their proposed block size and execution price, which the client application subsequently encrypts. The Taker broadcasts a transaction to the Anchor program containing these new ciphertexts, while simultaneously transferring the maximum required amount of USDC into a programmatic escrow vault controlled by the smart contract. This physical commitment ensures that if a FHE match is successful, settlement is mathematically guaranteed without requiring further action from the Taker.

The matching and execution journey represents the core technical achievement of the protocol. Upon receiving the bid, the Anchor program emits a Cross-Program Invocation (CPI) to the Encrypt network's on-chain gateway, passing the encrypted RFQ parameters, the encrypted bid parameters, and a reference to the specific FHE comparison circuit. The Encrypt executors retrieve this payload and process the logic homomorphically, evaluating whether the bid size matches the RFQ size and whether the bid price equals or exceeds the RFQ price. Following the computation, the Encrypt Decryptor threshold network performs a partial decryption, revealing only the final boolean result of the match while preserving the secrecy of the original input ciphertexts. This boolean result is written back to the Solana Anchor program.

If the returned result is positive, the Solana program executes the settlement phase. It immediately transfers the Taker's USDC escrow to the Maker's Solana account. Concurrently, the program updates its internal state to authorize the Ika network to generate a signature. The Maker's client detects this authorization and requests a 2PC-MPC signature from the Ika nodes to transfer the foreign asset from the dWallet to the Taker's designated address. The Ika nodes independently verify the Solana state; observing the valid authorization, they collaborate to produce the signature. Conversely, if the returned FHE result is negative, the Solana program fully refunds the Taker's USDC escrow, and the Maker's RFQ remains actively open for subsequent bids, with no information regarding the failed negotiation having been leaked to the public.

## What to Build and What Not to Build

To maintain hackathon competitiveness, ensure rigorous technical execution, and prevent scope creep, the project boundaries are aggressively defined. The development effort will focus exclusively on the core components required to demonstrate the FHE and MPC integrations operating in tandem.

The engineering team will build a comprehensive Solana Anchor program responsible for managing the RFQ lifecycle, holding the encrypted states, securing the SPL token vaults, and verifying the asynchronous callbacks from both the Encrypt and Ika networks. The team will also develop the Encrypt REFHE circuit utilizing the Arcis Rust framework , specifically crafting the logic to compare the encrypted price and size variables securely. A programmatic 2PC-MPC signing interface will be implemented using the Ika SDK to control a simulated cross-chain asset. Finally, a trader console frontend will be developed using React and Next.js, featuring client-side encryption modules and a specialized settlement transparency dashboard designed to visually articulate the privacy guarantees of the system during the final demonstration.

Conversely, several features common to traditional trading platforms are explicitly excluded from this specification. The team will not build a Central Limit Order Book (CLOB) or a multi-party matching engine, as complex many-to-many execution logic introduces unnecessary risk and detracts from the core peer-to-peer RFQ narrative. Dynamic pricing oracles will not be integrated; all RFQs will rely on static, user-defined encrypted limits rather than attempting to fetch and process encrypted external data streams. The MVP will strictly support a single trading pair configuration to simplify the construction of the Ika transaction payloads. Furthermore, partial order fills are entirely out of scope. Bids must fulfill the RFQ in its entirety to avoid the immense complexity of performing encrypted fractional arithmetic and managing continuous partial refund logic within the strict time constraints of the hackathon.

## Functional Requirements

The functional requirements define the exact capabilities the system must possess to facilitate the private cross-chain RFQ workflow.

The protocol must provide a streamlined mechanism for the Maker to generate a non-collusive Ika dWallet directly from the frontend interface, subsequently retrieving and displaying the associated foreign-chain public address. This process must ensure that the user retains their cryptographic share of the 2PC-MPC key.

The client application must enforce strict client-side encryption. Before any transaction involving trade terms is broadcast to the Solana network, the frontend must utilize the Encrypt client SDK to encrypt the price and size parameters. These parameters must be structured as 64-bit unsigned integers to align with the processing capabilities of the REFHE machine-word Arithmetic Logic Unit (ALU).

The Solana Anchor program must act as an immutable state machine, securely storing the ciphertext byte arrays representing the RFQ and Bid parameters. The program must never possess the capability to decrypt these payloads natively.

The system must define, compile, and deploy a custom REFHE logic circuit utilizing the Arcis framework. This circuit must be capable of receiving four distinct ciphertexts (RFQ price, RFQ size, Bid price, Bid size) and homomorphically evaluating the conditional logic required to determine a valid match without ever interacting with the underlying plaintext data.

The Anchor program must enforce a strict cryptographic policy regarding cross-chain asset movement. The contract logic must explicitly prevent the issuance of any authorization signal to the Ika network unless a mathematically verified, positive FHE match result has been registered in the state by the authorized Encrypt Decryptor cluster.

To guarantee settlement liquidity and prevent griefing attacks, the system must force the Taker to physically lock their maximum potential Solana-native payment into an SPL Token vault controlled by the Anchor program's Program Derived Address (PDA) prior to initiating the FHE evaluation request.

The frontend must feature a dynamic settlement User Interface (UI) that updates in real-time as the asynchronous cryptographic processes complete. This UI must explicitly highlight the privacy preservation aspects of the transaction, clearly delineating the public state changes from the hidden variables that were successfully protected throughout the lifecycle.

## Non-Functional Requirements

The non-functional requirements dictate the performance characteristics, security models, and environmental constraints under which the protocol must operate.

Execution latency is a critical consideration in an architecture that bridges multiple advanced cryptographic networks. While the Ika 2PC-MPC protocol is capable of achieving sub-second multi-party computation signatures , Fully Homomorphic Encryption inherently requires more extensive computational resources. The user interface and the off-chain indexers must be designed to gracefully handle asynchronous states, operating under the assumption that the Encrypt REFHE execution and subsequent threshold decryption callback will require a processing window of anywhere from five to thirty seconds. The system must implement robust polling and loading state visualizations to prevent user abandonment during this window.

The architecture must strictly adhere to a zero-trust security model. The protocol must not rely on any centralized backend servers for matching logic, parameter storage, or private key management. The Ika 2PC-MPC protocol and the Encrypt Threshold FHE network must serve as the absolute and sole arbiters of cryptographic operations, ensuring that the system remains censorship-resistant and non-collusive by design.

Given the current state of FHE technology, the precision of the numerical inputs must be carefully managed. Price and size variables must be scaled off-chain and handled strictly as 64-bit unsigned integers. Floating-point arithmetic is explicitly forbidden within the FHE circuit to prevent precision loss and excessive computational overhead during the bootstrapping and homomorphic evaluation phases.

To ensure viability for the hackathon submission, the entire technological stack must be designed for and deployed to the appropriate development networks. The Anchor program must target the Solana Devnet, and the client applications must utilize the specific Pre-Alpha endpoints provided by both the Ika and Encrypt infrastructure teams to ensure compatibility with their latest respective protocol upgrades.

## System Architecture

The overarching system architecture is distributed across four distinct, interacting environments: the Client Frontend, the Solana Blockchain, the Encrypt FHE Cluster, and the Ika MPC Network. This separation of concerns ensures that computation, state management, and custody are handled by the systems best optimized for those specific tasks.

The Client Tier consists of a highly optimized React application built upon the Next.js framework. This tier is responsible for all user interactions, wallet connectivity, and the execution of the client-side cryptographic SDKs provided by Encrypt and Ika. It formats the initial payloads and orchestrates the transaction broadcasting to the Solana network.

The State and Settlement Tier is embodied by the Solana Anchor program deployed to the Devnet environment. This smart contract acts as the central, immutable state machine and the ultimate trust anchor for the protocol. It is responsible for holding the physical SPL token vaults containing the Taker's escrow, recording the cryptographic commitments of the ciphertexts, and enforcing the strict sequential logic of the RFQ lifecycle.

The Encrypted Execution Tier is powered by the Encrypt FHE infrastructure. When triggered by a Cross-Program Invocation from the Solana program, this network's executors retrieve the relevant ciphertext payloads from the Solana state. They process the custom Arcis-compiled comparison circuit entirely within the encrypted domain. Once the homomorphic evaluation is complete, the result is passed to the Decryptor threshold network, which collaboratively reveals the final boolean outcome and posts it directly back to the Solana program via a callback instruction.

The Cross-Chain Custody Tier is managed by the Ika Network. The Solana program operates as the policy enforcer for this tier. When an FHE match is successfully validated and recorded, the Solana program updates its state to authorize the release of the foreign asset. The Ika protocol nodes continuously monitor this state; upon detecting the authorization, they collaborate utilizing the 2PC-MPC protocol to generate a mathematically unforgeable signature , securely transferring the asset on the foreign chain without requiring the intervention of a traditional, centralized bridging mechanism.

## Frontend Architecture

The frontend architecture is constructed as a strictly typed Single Page Application (SPA) utilizing React 18 and the Next.js App Router. This approach guarantees high performance, robust state management, and a seamless developer experience during the rapid iteration cycles typical of a hackathon. The application styling relies on Tailwind CSS, implementing a dark-mode, institutional trading aesthetic characterized by monospaced typography for numerical data and high-contrast status indicators to convey the complex asynchronous states clearly.

Wallet integration is facilitated by the `@solana/wallet-adapter-react` library, providing out-of-the-box support for ecosystem standards such as Phantom and Solflare. Given the complexity of tracking multiple active RFQs, encrypted states, and localized dWallet configurations, the frontend employs Zustand for global state management. This ensures that the user's active session data remains synchronized across various components. For asynchronous data fetching, blockchain polling, and RPC interactions, the application utilizes React Query, providing sophisticated caching and background refetching capabilities.

The UI is divided into several highly specialized React components. The `RfqCreationForm` is responsible for capturing the Maker's raw numerical inputs, invoking the `encryptValue()` function via the Encrypt SDK to generate the ciphertexts , and constructing the serialized instruction payload for the Anchor transaction. The `BidSubmissionModal` serves a similar purpose for the Taker, capturing the counter-terms, encrypting them, requesting the necessary SPL token transfer approvals, and dispatching the bid to the chain. The most critical UX element is the `StatusStepper` component. This visual tracking system translates the complex cryptographic pipeline into a readable format for the user, transitioning through states such as "Encrypting Payload," "Awaiting Homomorphic Evaluation," "Decrypting Threshold Result," "Generating MPC Signature," and finally, "Settlement Complete."

## Backend Architecture

In strict adherence to the zero-trust paradigm mandated by the hackathon sponsors and the inherent design of decentralized applications, there is no traditional centralized backend database responsible for storing plaintext trade data or managing private keys. Relying on a traditional backend would completely undermine the security guarantees provided by the FHE and MPC networks.

However, relying entirely on direct Remote Procedure Calls (RPC) to the Solana blockchain for complex state queries can lead to significant UI latency and rate-limiting issues. To optimize the frontend experience, the architecture incorporates a lightweight, Off-Chain Relayer and Indexer built in Node.js. The sole purpose of this service is to continuously poll the configured Solana RPC nodes, specifically listening for program events such as `RfqCreated`, `BidSubmitted`, and `MatchFinalized`.

The indexer parses these events and maintains a real-time, aggregated list of active RFQ public keys and their current operational statuses. It exposes this non-sensitive metadata to the frontend via a highly performant REST API. It is critical to note that this relayer service is entirely stateless regarding cryptographic authority; it holds no keys and executes no transactions. If the relayer experiences downtime, the frontend application is designed to degrade gracefully, falling back to direct Solana RPC queries to maintain full functionality, ensuring that the protocol remains robust and censorship-resistant.

## On-Chain Program Architecture (Solana)

The core operational logic of the RFQ desk resides within a Solana smart contract built using the Anchor framework. The program is designed to be highly modular, explicitly separating the definitions of state accounts from the business logic and external protocol invocations. The architecture relies heavily on Program Derived Addresses (PDAs) to manage state ownership and control the flow of assets without requiring persistent private keys.

The Anchor program exposes a specific set of operational instructions. The `initialize_rfq` instruction acts as the entry point for the Maker. It allocates a new PDA uniquely derived from the Maker's public key and a randomized salt. This instruction records the Maker's public key, the unique 32-byte identifier of the Ika dWallet holding the foreign asset , and the encrypted target price and size, which are stored efficiently as byte arrays within the account data.

The `submit_bid` instruction is utilized by the Taker. It allocates a separate PDA specifically for the Bid, establishing a relational link to the target RFQ PDA. This instruction records the encrypted bid parameters and fundamentally executes a token transfer, moving the maximum potential USDC cost from the Taker's wallet into a programmatic vault controlled entirely by the Anchor program's PDA authority.

The `request_fhe_computation` instruction serves as the bridge to the Encrypt network. It formulates a Cross-Program Invocation to the Encrypt infrastructure's on-chain gateway. The payload for this CPI includes the encrypted RFQ parameters, the encrypted Bid parameters, and a specific identifier pointing to the compiled FHE comparison circuit that the executors must run.

The `finalize_match` instruction operates as an authorized callback mechanism, strictly meant to be executed by the Encrypt threshold decryptor network. It accepts the plaintext boolean result of the homomorphic evaluation. If the result is true, it updates the RFQ state to `Matched`; if false, it records a failure, allowing the Taker to reclaim their escrow.

Finally, the `execute_settlement` instruction handles the physical resolution of the trade. If the state indicates a successful match, the program utilizes its PDA authority to transfer the USDC from the programmatic vault to the Maker. Crucially, it then updates its internal state or emits a highly specific, verifiable event that the Ika smart contract infrastructure monitors. This action serves as the cryptographic authorization required for the Ika nodes to proceed with the 2PC-MPC signature generation for the foreign chain.

## Database and Data Model

The data architecture is heavily skewed toward on-chain state management, utilizing Anchor's account serialization capabilities to store the necessary cryptographic commitments and structural metadata.

### On-Chain Data Models (Anchor Accounts)

The `RfqState` account is the primary data structure representing the Maker's intent.

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `maker` | `Pubkey` | The Solana public key of the RFQ creator. |
| `dwallet_id` | `[u8; 32]` | The unique identifier of the Ika dWallet holding the foreign asset. |
| `foreign_asset_chain` | `u8` | Enum identifier for the target chain (e.g., 0 = BTC, 1 = ETH). |
| `encrypted_price` | `Vec<u8>` | REFHE ciphertext of the target minimum price. |
| `encrypted_size` | `Vec<u8>` | REFHE ciphertext of the exact asset size. |
| `status` | `u8` | State enum: 0 = Active, 1 = Computing, 2 = Matched, 3 = Cancelled. |
| `bump` | `u8` | The cryptographic bump seed required for PDA derivation. |

The `BidState` account represents the Taker's specific counter-proposal linked to an active RFQ.

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `rfq_pda` | `Pubkey` | Cryptographic reference to the target `RfqState` account. |
| `taker` | `Pubkey` | The Solana public key of the bidding entity. |
| `encrypted_bid_price` | `Vec<u8>` | REFHE ciphertext of the proposed bid price. |
| `encrypted_bid_size` | `Vec<u8>` | REFHE ciphertext of the proposed bid size. |
| `escrow_amount` | `u64` | The plaintext maximum amount of USDC physically escrowed in the vault. |
| `foreign_receive_address` | `String` | The plaintext destination address where the Taker intends to receive the foreign asset. |
| `status` | `u8` | State enum: 0 = Pending, 1 = Accepted, 2 = Rejected. |

### Off-Chain Data Models (Relayer Cache)

The lightweight indexer utilizes a simple SQLite database optimized for rapid read operations to serve the frontend interface efficiently.

| **Table** | **Column** | **Type** | **Description** |
| --- | --- | --- | --- |
| `IndexedRfqs` | `rfq_pubkey` | String (Primary Key) | The base58 encoded public key of the RFQ PDA. |
| `IndexedRfqs` | `maker_pubkey` | String | The base58 encoded public key of the creator. |
| `IndexedRfqs` | `status` | Integer | The mirrored numerical status of the on-chain account. |
| `IndexedRfqs` | `created_at` | Timestamp | The Unix timestamp of the `initialize_rfq` event. |

## API Contracts

The Off-Chain Relayer exposes a minimal, read-only REST API designed exclusively to accelerate frontend rendering by eliminating the need to scan massive historical block ranges via RPC.

**Endpoint: `GET /api/rfqs/active`**

This endpoint retrieves a comprehensive list of all RFQ public keys currently holding an `Active` state on the blockchain.

JSON

# 

`{
  "status": "success",
  "data":
}`

**Endpoint: `GET /api/rfqs/:pubkey/bids`**

This endpoint retrieves the public keys of all `BidState` accounts associated with a specific RFQ, allowing the Taker to track the status of their submissions without directly polling the Solana nodes.

JSON

# 

`{
  "status": "success",
  "data":
}`

## Encrypt (REFHE) Integration Strategy

The Encrypt protocol integration is the cornerstone of the platform's privacy guarantees. Unlike legacy homomorphic encryption schemes that struggle with logical branching and require massive computational overhead for basic comparisons, Encrypt leverages the Ring-Enhanced Fully Homomorphic Encryption (REFHE) protocol. REFHE is uniquely designed to support both arithmetic and logical operations natively on 64-bit machine words, effectively functioning as an encrypted Arithmetic Logic Unit (ALU).

Within the client application, the SDK utilizes the FHE cluster's globally distributed public key to encrypt the 64-bit unsigned integers representing the price and size variables. The resulting ciphertexts are highly compressed compared to older FHE implementations, allowing them to be serialized as standard byte arrays and passed efficiently into the Solana Anchor program without exceeding transaction size limits.

The core matching logic is encapsulated within a custom FHE circuit, compiled using the Arcis Rust framework provided by the Encrypt infrastructure. This circuit operates entirely within the encrypted domain, ensuring that the node operators executing the computation possess zero knowledge regarding the underlying trade parameters. The Arcis circuit executes a highly optimized boolean evaluation: it verifies that the encrypted bid size is exactly equal to the encrypted RFQ size, and that the encrypted bid price is greater than or equal to the encrypted RFQ target price. Because REFHE can perform these logical "greater than" comparisons efficiently during its internal bootstrapping cycle, the latency is reduced from minutes to mere seconds. The output of this circuit is a single encrypted boolean value, which is then routed to the threshold decryption network to be revealed and posted back to the Solana state.

## Ika (2PC-MPC) Integration Strategy

The Ika network integration eliminates the requirement for centralized custodial bridges, replacing them with a programmatic, zero-trust cryptographic framework. This is achieved through the deployment of dWallets, which are secured by the novel 2PC-MPC protocol.

The lifecycle of the integration begins with the dWallet generation. Utilizing the `@ika.xyz/sdk`, the Maker initiates a Two-Party Computation key generation ceremony. The Maker's local device securely generates and holds one share of the cryptographic key, while the massively decentralized Ika network generates and holds the corresponding distributed share. This structure inherently guarantees that the Ika network cannot act unilaterally to move the funds; the Maker must explicitly authorize the action, ensuring absolute non-collusive custody.

Crucially, the architecture binds the operational policy of this dWallet directly to the state of the Solana Anchor program. The policy explicitly dictates that the Ika network validators will only collaborate to generate a signature share if, and only if, the Solana program emits a mathematically verifiable `execute_settlement` authorization for that specific dWallet identifier. Upon a successful FHE match, the Maker's client application detects the state change on Solana, constructs the raw transaction for the foreign chain (e.g., a Bitcoin transaction sending the funds to the Taker), and requests a signature from the Ika network. The network nodes independently read the Solana state, verify that the authorization policy has been satisfied by the smart contract, and return their signature shares. The client combines these shares, producing a valid, unforgeable transaction that is subsequently broadcast to the foreign network, finalizing the bridgeless settlement.

## Authentication, Authorization, and State Management

Authentication within the system is handled entirely via standard cryptographic signatures. Users authenticate their actions on the Solana network using Ed25519 signatures generated by standard browser extension wallets such as Phantom or Solflare. The system does not employ traditional email/password authentication or issue session tokens, adhering strictly to Web3 interaction patterns.

Authorization is bifurcated between the programmatic rules of the Solana smart contract and the cryptographic threshold rules of the MPC network. On Solana, the Anchor program utilizes Program Derived Addresses equipped with strict bump validation to ensure that only the program itself possesses the authority to authorize transfers from the USDC token vaults. No human administrator or external protocol can access these funds. On the cross-chain side, dWallet authorization is governed entirely by the 2PC-MPC protocol. The Ika network validators autonomously read the Solana state as their source of truth. If the `RfqState` status equals `Matched`, the threshold nodes authorize the signature request mathematically, requiring no centralized administrative override or permissioned API access.

The state management of the protocol is rigorously defined to prevent the locking of user funds during the asynchronous execution phases.

| **Current State** | **Trigger Instruction** | **Validation Condition** | **Next State** |
| --- | --- | --- | --- |
| `None` | `initialize_rfq` | Valid ciphertexts, valid dWallet ID | `Active` (RFQ) |
| `Active` (RFQ) | `submit_bid` | Valid USDC escrow physically locked | `Pending` (Bid) & `Computing` (RFQ) |
| `Computing` | FHE callback (`finalize_match`) | `result == true` | `Matched` (RFQ) & `Accepted` (Bid) |
| `Computing` | FHE callback (`finalize_match`) | `result == false` | `Active` (RFQ) & `Rejected` (Bid) |
| `Matched` | `execute_settlement` | Valid MPC signatures generated | `Settled` (RFQ) |

## Error Handling, Validation Rules, and Edge Cases

The robustness of the protocol relies on comprehensive on-chain validation and explicit error handling matrices designed to mitigate unexpected behaviors during asynchronous operations.

### Solana Custom Error Definitions

The Anchor program implements a suite of custom error codes to ensure state integrity and provide clear debugging information.

| **Error Code** | **Trigger Condition** | **Mitigation/Action** |
| --- | --- | --- |
| `ErrInvalidCiphertextSize` | The injected `Vec<u8>` does not match the expected REFHE ciphertext byte length. | Revert transaction. Client must re-encrypt using the correct FHE public key parameters. |
| `ErrRfqNotActive` | A Taker attempts to submit a bid to an RFQ already in the `Computing` or `Matched` state. | Revert transaction. Client UI must refresh to reflect the updated active order book. |
| `ErrEscrowMismatch` | The provided USDC does not meet the maximum possible requirement defined by the bid size. | Revert transaction. Client must approve a larger token allowance. |
| `ErrUnauthorizedCallback` | Any entity other than the registered Encrypt Decryptor cluster attempts to invoke `finalize_match`. | Revert transaction. Security alert logged on the off-chain indexer. |

### Edge Case Mitigation

A primary edge case involves FHE network timeouts or the failure of the threshold network to return a computation result. Given the experimental nature of pre-alpha infrastructure , computations may stall. To mitigate this, the smart contract introduces a `force_cancel_timeout` instruction. If a bid remains stuck in the `Computing` state for a duration exceeding 200 consecutive Solana blocks, either the Maker or the Taker can invoke this instruction to forcefully revert the RFQ back to the `Active` state and trigger an immediate refund of the Taker's locked USDC escrow.

Another critical edge case occurs if the Maker fails to cooperate with the Ika signature generation after a successful FHE match. Because the user holds one local share of the 2PC-MPC key , their device must actively participate in the final signing ceremony. If the Maker maliciously refuses to sign, the Taker's USDC escrow on Solana remains locked in the PDA vault, unable to be claimed by the Maker until the cross-chain settlement is verified by the network. This economic standoff ensures the Maker has zero financial incentive to abandon the trade post-match.

## Security, Performance, and Accessibility Considerations

The primary security thesis of the architecture relies entirely on Encrypt's REFHE implementation. Because the underlying plaintext values of price and size are encrypted client-side, they are never exposed to the Solana validators, the RPC node operators, or the executors running the matching engines. This zero-knowledge context theoretically eliminates all vectors for MEV extraction, front-running, and competitive copy-trading. Furthermore, collusion resistance is mathematically guaranteed by Ika's 2PC-MPC architecture, which utilizes hundreds of permissionless nodes. To forge a cross-chain signature without the explicit authorization of the Solana program, a highly improbable two-thirds threshold of these decentralized nodes would have to act maliciously in collusion, an action heavily disincentivized by strict economic slashing conditions.

Performance optimization is heavily dependent on the capabilities of the chosen cryptographic frameworks. Standard FHE operations are notoriously slow, often requiring several minutes to process complex logic. However, by leveraging REFHE, the platform optimizes logical operations and comparisons over 64-bit integers, effectively compressing evaluation times down to a manageable window of several seconds. Once the FHE evaluation concludes, the Ika 2PC-MPC network executes the cross-chain signature generation with sub-second latency. This allows the final settlement phase to feel virtually instantaneous to the end-user, aided by Solana's rapid 400ms block times.

While the primary focus of the hackathon build is technological integration, accessibility considerations remain a priority for the frontend execution. The institutional trader console will be designed with explicit ARIA labels and semantic HTML structures to ensure compatibility with screen readers. Furthermore, the high-contrast color palette chosen for the status indicators is specifically optimized to accommodate users with color vision deficiencies, ensuring the complex state transitions are universally decipherable.

## Component and Module Breakdown (Folder Structure)

The repository will be strictly organized to facilitate rapid evaluation by the hackathon judges, isolating the distinct environments into logically separated directories.

private-rfq-desk/

├── app/                              # Next.js Frontend Application

│   ├── src/

│   │   ├── components/               # UI components (RfqForm, StatusStepper, OrderBook)

│   │   ├── hooks/                    # Cryptographic custom hooks (useEncrypt, useIka, useAnchor)

│   │   ├── context/                  # Global Wallet and Protocol state contexts

│   │   └── pages/                    # Application routing and primary views

├── programs/

│   └── private_rfq/                  # Solana Anchor Smart Contract

│       ├── src/

│       │   ├── lib.rs                # Program entrypoint and instruction routing

│       │   ├── state.rs              # Struct definitions for RfqState and BidState

│       │   ├── instructions/         # Isolated modules for each instruction logic path

│       │   └── errors.rs             # Custom Anchor error code definitions

├── encrypt-circuit/                  # Encrypt REFHE Logic Implementation

│   └── src/

│       └── match_logic.rs            # The Arcis-compiled FHE comparison circuit

├── relayer/                          # Node.js Off-chain State Indexer

│   ├── index.ts                      # RPC polling daemon and SQLite manager

│   └── api.ts                        # Express REST API routing

├── tests/                            # Comprehensive Integration Test Suite

│   └── private_rfq.ts                # End-to-End TypeScript test scripts utilizing Anchor

├── Anchor.toml                       # Anchor framework configuration and cluster settings

├── package.json                      # Monorepo dependencies and build scripts

└── README.md                         # Detailed Hackathon submission documentation

## Deployment, Testing, and Observability Strategy

A rigorous testing and deployment regimen is critical to demonstrating the technical execution quality demanded by the hackathon judging criteria.

The testing strategy follows a tiered approach. Initial validation relies on Rust unit tests to verify the integrity of the Arcis FHE circuit logic utilizing the Encrypt SDK's local mock execution environment before any interaction with a live network. Subsequently, Anchor Localnet tests are employed utilizing the `anchor test` command alongside a local Solana validator. During this phase, the Encrypt threshold decryptor is mocked by generating a test keypair granted administrative override rights, allowing the test suite to directly inject boolean results into the `finalize_match` instruction to simulate FHE completion. Final integration testing relies on deploying the program to the Solana Devnet, utilizing the live Encrypt Pre-Alpha infrastructure to perform actual homomorphic evaluations , and leveraging the Ika Devnet to generate verifiable signatures for a testnet blockchain (e.g., Bitcoin Testnet).

Deployment assumptions dictate that the Anchor smart contract will reside exclusively on the Solana Devnet cluster. The Next.js frontend application will be statically exported and hosted on a globally distributed Content Delivery Network (CDN) such as Vercel. The stateless Node.js Relayer will be hosted on a lightweight, persistent server environment.

Observability is implemented throughout the stack to ensure rapid debugging during the demonstration phase. The frontend application integrates structured console logging that explicitly traces the lifecycle of the ciphertexts and the state of the 2PC-MPC generation. The on-chain Anchor program utilizes `msg!()` macros extensively to log state transition metadata, which the off-chain indexer ingests and exposes via its API, providing a comprehensive, real-time audit trail of the protocol's asynchronous operations.

## Open Questions, Assumptions, and Acceptance Criteria

Given the bleeding-edge nature of the sponsor technologies, the specification relies on several explicit assumptions regarding the capabilities of the pre-alpha SDKs.

It is assumed that the Encrypt Pre-Alpha SDK currently supports the deployment of custom circuits or provides access to predefined ALU comparison modules capable of handling 64-bit integers. If custom circuit compilation via Arcis is restricted during the hackathon window , the architecture will pivot to utilize whatever primitive logical operation endpoints the REFHE protocol exposes by default. Furthermore, it is assumed that the Ika Solana integration natively allows on-chain programs to programmatically authorize signatures. If the pre-alpha SDK restricts authorization to client-side signatures only, the architecture will shift to an optimistic security model where the client verifies the Solana state and generates the signature, backed by severe on-chain slashing conditions.

The protocol must satisfy three core Acceptance Criteria to be considered complete for submission:

1. **Encrypted Order Creation:** The system passes if a user can input price and size parameters, the client successfully encrypts the data using REFHE, and the Anchor program stores the resultant ciphertext blob, with all plaintext values verified to be completely absent from the Solana network block explorer.
2. **FHE Matching Execution:** The system passes if the Encrypt network executors process two corresponding ciphertexts, evaluate the matching logic accurately, and return the correct boolean result to the Solana program without ever decrypting or revealing the underlying integers.
3. **Bridgeless Settlement:** The system passes if, upon receiving a positive FHE match result, the Ika network successfully generates a valid transaction signature for a foreign testnet (e.g., Bitcoin) authorized by the Solana program's state change, followed by the Solana program releasing the locked USDC escrow to the Maker.

## Demo Plan and Submission-Readiness Checklist

The video demonstration is weighted heavily in the judging criteria for completeness and clarity. The five-minute presentation will adhere to a highly structured, narrative-driven script designed to explicitly highlight the core integrations.

The demonstration will commence with a concise articulation of the problem: "Institutional participants leak highly sensitive strategic data on public blockchains. Today, we resolve this systemic flaw by combining Encrypt's Fully Homomorphic Encryption with Ika's zero-trust multiparty custody." The narrative will then transition to the Maker's perspective, showcasing the generation of the Ika dWallet natively on Solana  and the creation of an RFQ. The presentation will explicitly display the block explorer, proving to the judges that the parameters are entirely obfuscated as ciphertext blobs on the ledger.

The perspective will then shift to the Taker, demonstrating the submission of an encrypted bid and the physical escrow of USDC into the programmatic vault. The critical phase of the demonstration will visualize the FHE execution state, explaining the REFHE logic occurring off-chain until the frontend updates to the `Matched` status. The video will conclude by showcasing the final settlement: the Ika network authorizing the release of the native Bitcoin, followed by the successful transfer of the USDC on Solana, culminating in the statement: "Bridgeless, Encrypted, Institutional Capital Markets. Built entirely on Solana."

Prior to final submission, the engineering team will verify all requirements against the following checklist:

- [ ]  Public GitHub Repository initialized, populated, and set to public visibility.
- [ ]  Comprehensive `README.md` file crafted, strictly adhering to submission guidelines (Problem statement, target user, precise Encrypt/Ika usage documentation, and local build instructions).
- [ ]  Solana Program successfully deployed and verified on the Devnet cluster.
- [ ]  Next.js Frontend application deployed to Vercel with a publicly accessible, stable URL.
- [ ]  FHE circuit logic and Ika dWallet implementation heavily commented within the codebase to guide technical judges during their review.
- [ ]  Five-minute demonstration video recorded, edited for clarity, uploaded, and linked within the submission portal.