# food-rescue-hub
# 🥖 Community Food Rescue Coordinator

A neighborhood platform where verified cafés, bakeries, and campus kitchens offer surplus food for collection by approved community organizations. The system matches available quantity and pickup windows with recipients who can collect the food in time.

> **Status:** Requirements and member assignments are documented. Implementation of each module is **pending / not verified** until code is merged and tested. Update the [Project Status](#-project-status) table as work lands.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [User Roles](#-user-roles)
- [API Reference](#-api-reference)
- [Data Models](#-data-models)
- [Team Modules](#-team-modules)
- [Business Rules](#-business-rules)
- [Security](#-security)
- [Testing](#-testing)
- [Demo Scenarios](#-demo-scenarios)
- [Open Decisions](#-open-decisions)
- [Project Status](#-project-status)
- [Contributing](#-contributing)

---

## 🌍 Overview

```
Donor posts surplus lot (quantity + preparation/storage/allergen details)
  → Recipient organization records a need
  → Matching finds candidate lots and checks hard constraints
  → Recipient requests a quantity; reservation reduces remaining quantity
  → Reservation must be confirmed before its hold expires
  → Coordinator may assign an approved volunteer
  → Assigned volunteer sees private pickup details
  → Donor records handover quantity; recipient confirms collection
  → Cancellation / failure / expiry / collection are all auditable
```

## ✨ Key Features

- **Public availability** – sanitized surplus summaries (no recipient identities, no exact private addresses)
- **Verified participation** – verified email + approved organization required to publish or reserve
- **Inventory safety** – no over-reservation, even under concurrent requests; expired/cancelled holds restore quantity exactly once
- **Distinct events** – reservation, cancellation, handover, pickup failure, and collection are tracked separately
- **AI semantic matching** – Atlas Vector Search finds candidates, then exact quantity / allergen / pickup-window / availability checks are applied
- **Policy RAG chat** – answers only from coordinator-approved policies, with citations
- **Collection agent** – proposes feasible multi-pickup plans; never reserves stock
- **Food-safety discipline** – AI never decides whether food is safe to eat

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | ReactJS |
| Backend | Node.js + Express |
| ODM | Mongoose |
| Database | MongoDB Atlas |
| Vector retrieval | MongoDB Atlas Vector Search |
| Model runtime | Ollama |
| AI orchestration | LangChain JavaScript |
| Validation | Zod |
| Auth | Verified email, hashed passwords, expiring server-side sessions, protected cookies, CSRF protection, login rate limits |

## 🏗 Architecture

```
React screens (role-aware UI; UI checks are NOT security)
        │
        ▼
Express API + auth/session middleware + CSRF + rate limits
   ├─ Domain APIs: organizations, surplus, needs, reservations, pickups, policies
   ├─ Authorization: role + org membership + resource ownership + assignment
   ├─ Atomic inventory updates + reservation expiry
   └─ AI endpoints with Zod-validated inputs and bounded tools
        │
        ▼
Mongoose models → MongoDB Atlas
   ├─ Operational collections (users, memberships, lots, needs, reservations…)
   └─ Approved policy documents/chunks + vector index
        │
        ▼
LangChain JS → Ollama (embeddings + generation) → RAG / tool workflows
```

**Boundaries**

- The server is the authority for identity, authorization, stock, expiry, and state transitions.
- AI matching returns **proposals only**; it never mutates inventory or creates reservations.
- The collection agent uses read/check tools; coordinator confirmation + the normal reservation API perform mutations.
- RAG answers must be grounded in approved policy chunks and expose sources.
- Public listing responses are sanitized separately from protected pickup responses.

## 📂 Project Structure

> Suggested layout — finalize and freeze before integration.

```
community-food-rescue/
├── server/
│   ├── server.js
│   ├── config/            # DB connection, session, env
│   ├── middleware/        # auth, RBAC, CSRF, rate limit, validation
│   ├── models/            # User, Organization, Membership, SurplusLot, Need, ...
│   ├── routes/
│   ├── controllers/
│   ├── services/          # matching, rag, agent
│   ├── seed/seed.js
│   └── tests/
├── client/
│   └── src/
│       ├── api/           # shared API client
│       ├── pages/
│       └── components/
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS)
- A MongoDB Atlas cluster (with Vector Search enabled)
- [Ollama](https://ollama.com) installed locally, with your chosen embedding and chat models pulled
- Git

### Installation

```bash
# 1. Clone
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>

# 2. Backend
cd server
npm install
cp .env.example .env      # then fill in values

# 3. Frontend
cd ../client
npm install
```

### Run

```bash
# Backend
cd server
npm run dev

# Frontend (new terminal)
cd client
npm start
```

### Seed sample data

```bash
cd server
node seed/seed.js
```

The seed script inserts connected sample data (users, organizations, memberships, lots, needs, reservations, volunteer assignments, handling policies) using valid MongoDB IDs, and should be safe to re-run.

## 🔐 Environment Variables

Exact names must be agreed by the team. Example:

```env
PORT=5000
MONGODB_URI=<your-atlas-connection-string>
SESSION_SECRET=<long-random-string>
CLIENT_ORIGIN=http://localhost:3000
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=<model-name>
CHAT_MODEL=<model-name>
```

> Never commit `.env`. Commit only `.env.example`.

## 👥 User Roles

| Role | Capabilities |
|---|---|
| `DONOR` | Create/edit own organization's surplus lots; record handover quantity |
| `RECIPIENT` | Create needs; reserve quantity; confirm collection |
| `VOLUNTEER` | View assigned pickup details only; update pickup status (joins via coordinator invitation) |
| `COORDINATOR` | Verify/suspend organizations, manage policies, review failed pickups, monitor operations |

Users cannot self-assign staff roles.

## 📡 API Reference

Request/response schemas, status codes, pagination, and error envelope are still to be finalized.

### Public

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/food-rescue/about` | Participation guidance |
| GET | `/api/surplus` | Sanitized availability summaries |

### Authentication (Member 1)

| Method | Route |
|---|---|
| POST | `/api/auth/signup` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/verify-email` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |

### Organizations (Member 2)

| Method | Route | Notes |
|---|---|---|
| POST | `/api/organizations` | Create organization |
| GET | `/api/organizations/:id` | Subject to access policy |
| GET | `/api/organizations/:id/members` | Org-scoped |
| PATCH | `/api/organizations/:id` | Edit organization |
| PATCH | `/api/organizations/:id/verification` | Coordinator only; audited |

### Surplus (Member 3)

| Method | Route | Notes |
|---|---|---|
| POST | `/api/surplus` | Donor creates lot |
| GET | `/api/surplus/:id` | Private fields need authorization |
| PATCH | `/api/surplus/:id` | Own organization only |

### Needs (Member 4)

| Method | Route |
|---|---|
| POST | `/api/needs` |
| GET | `/api/needs` |
| GET | `/api/needs/:id` |
| PATCH | `/api/needs/:id` |

### Reservations (Member 5)

| Method | Route | Notes |
|---|---|---|
| POST | `/api/surplus/:id/reservations` | Atomic quantity hold |
| GET | `/api/reservations` | Org-scoped |
| GET | `/api/reservations/:id` | |
| POST | `/api/reservations/:id/confirm` | |
| POST | `/api/reservations/:id/cancel` | Releases held quantity |

### Pickups & Handover (Member 6)

| Method | Route | Notes |
|---|---|---|
| POST | `/api/pickups` | Create/assign pickup |
| GET | `/api/pickups/:id` | Assigned volunteer only |
| PATCH | `/api/pickups/:id` | Restricted transitions |
| POST | `/api/reservations/:id/handover` | Donor records actual quantity |
| POST | `/api/reservations/:id/collection` | Recipient confirms collection |

### Coordinator & Policies (Member 7)

| Method | Route |
|---|---|
| GET | `/api/coordinator/organizations` |
| GET | `/api/coordinator/reservations` |
| GET | `/api/coordinator/pickups` |
| POST | `/api/policies` |
| GET | `/api/policies` |
| PATCH | `/api/policies/:id` |
| POST | `/api/policies/:id/approve` |

### AI (Members 8, 9, 10)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/matching/search` | Semantic candidates + hard-constraint filtering |
| POST | `/api/rescue-chat` | Policy RAG Q&A with citations |
| POST | `/api/policies/:id/index` | Index approved policy into chunks/vector index |
| POST | `/api/collection-agent` | Proposed collection plan (no mutation) |

## 🗄 Data Models

| Model | Key fields | Owner |
|---|---|---|
| User | name, email, password (hash), role, emailVerified, organizationId* | 1 |
| Organization | name, type, address, phone, verificationStatus, verifiedBy, verifiedAt | 2 |
| Membership | userId, organizationId, role, status | 2 |
| SurplusLot | organizationId, createdBy, title, description, quantity, remainingQuantity, unit, preparationInfo, storageInfo, allergenInfo, pickupStart, pickupEnd, pickupZone, status | 3 |
| Need | organizationId, createdBy, foodType, quantity, unit, allergenRequirements, pickupStart, pickupEnd, pickupZone, status | 4 |
| Reservation | surplusLotId, needId, recipientOrganizationId, quantity, status, expiresAt, createdBy, confirmedAt, cancelledAt | 5 |
| VolunteerAssignment | reservationId, volunteerId, assignedBy, status, pickupWindow, zone, acceptedAt, completedAt | 6 |
| Handover | reservationId, donorId, recipientId, quantityHandedOver, recordedBy, handoverTime, notes | 6 |
| HandlingPolicy | title, version, content, status, createdBy, approvedBy | 7 |
| Audit log | action, reason, coordinatorId, timestamp | 7 |
| Document / Chunk | title, content, version, status / documentId, content, embedding, metadata | 9 |

\* `User.organizationId` vs `Membership` source of truth is an [open decision](#-open-decisions).

**Status enums**

- Organization: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`
- SurplusLot: `AVAILABLE`, `PARTIALLY_RESERVED`, `FULLY_RESERVED`, `EXPIRED`, `CANCELLED`
- Need: `ACTIVE`, `FULFILLED`, `CANCELLED`, `EXPIRED`
- Reservation: `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`, `COLLECTED`
- VolunteerAssignment: `ASSIGNED`, `ACCEPTED`, `PICKED_UP`, `FAILED`, `CANCELLED`
- HandlingPolicy: `DRAFT`, `APPROVED`, `ARCHIVED`

## 🧩 Team Modules

Each member owns a backend module **and** its React UI.

| # | Module | Owner focus |
|---|---|---|
| 1 | Authentication + common backend setup | Auth APIs, sessions, CSRF, rate limiting, project setup |
| 2 | Organizations + Memberships + RBAC | Org registration, verification state, membership checks |
| 3 | Surplus food listings | Donor CRUD, sanitized public listings |
| 4 | Recipient needs | Need CRUD, feeds matching/agent |
| 5 | Reservations + quantity control | Atomic holds, expiry, cancellation |
| 6 | Volunteer pickup + handover | Assignments, private pickup access, handover/collection |
| 7 | Coordinator dashboard + policies | Verification, audit, policy approval, monitoring |
| 8 | AI semantic matching | Atlas Vector Search + hard-constraint filters |
| 9 | Policy RAG + rescue chat | Approved-only retrieval, citations, abstention |
| 10 | Collection agent + seed + integration | Agent tools, seed script, end-to-end checks |

**Agent tool order (Member 10):** `readNeeds(organizationId)` → `findAvailableLots(window)` → `checkPickupCapacity(volunteerId, lots)`

## 📏 Business Rules

- Public `GET /api/surplus` is sanitized.
- Email verification and organization approval are required before publishing or reserving.
- Donors cannot view other organizations' beneficiary records.
- Only the assigned volunteer can read private pickup details.
- Reservations reduce quantity immediately, expire if unconfirmed, and are rechecked on the server.
- Offered, reserved, handed-over, and collected quantities are tracked separately.
- **Missing allergen information = `UNKNOWN`, never allergen-free.**
- AI cannot reserve; the agent only proposes; coordinator confirmation + reservation API perform mutations.
- RAG uses only approved policy documents, shows citations and tool status, and abstains gracefully when evidence is missing.
- AI does not determine food safety; uncertain questions go to the responsible coordinator.

## 🛡 Security

- Hashed passwords; expiring server-side sessions; protected cookies
- CSRF protection on state-changing requests; login rate limiting
- No self-assignment of coordinator/staff roles; volunteers join via coordinator invitation
- Server-side authorization on every protected route: role + organization membership + resource ownership + assignment
- Atomic conditional updates or transactions for stock; idempotent expiry/cancel restoration
- Server-validated state transitions (never trust client-supplied status)
- Zod validation for AI endpoints and tool arguments
- Exact addresses/contact numbers visible only to confirmed collection participants
- Coordinator suspension/rejection actions require an audit reason, actor, and timestamp

## 🧪 Testing

| Area | Minimum acceptance evidence |
|---|---|
| Auth | Signup/login/logout, verification gate, recovery, session expiry, rate limit, CSRF, no self-assigned coordinator role |
| Organization/RBAC | Pending org cannot publish/reserve; cross-org reads denied; only coordinator verifies/suspends |
| Surplus | Own-listing edit only; public summary omits private data; missing allergens stay `UNKNOWN` |
| Needs | CRUD works; other orgs' needs are inaccessible |
| Reservation concurrency | With 20 available, simultaneous 15 and 10 requests cannot both succeed; stock never negative |
| Expiry/cancel | Quantity released exactly once; confirmed/collected not released |
| Pickup privacy | Assigned volunteer can read; unassigned volunteer denied |
| Handover/collection | Actual quantity recorded; failures visible to coordinator |
| Semantic matching | Constraints applied after vector search; incomplete allergen data flagged/rejected |
| RAG | Cites approved source; drafts excluded; no-evidence query abstains |
| Agent | Tools run in order; conflicts surfaced; no reservation side effects |
| Seed/integration | Valid IDs; scenarios reproducible; end-to-end demo works |

Use Postman (or equivalent) for success, validation, unauthorized, and cross-organization cases. Add **automated** tests for inventory concurrency and expiry.

## 🎬 Demo Scenarios

**A – Split a 30-portion need:** Need for 30; Donor A has 20, Donor B has ≥10. The system proposes two lots totaling 30, reports window conflicts, labels output as a proposal, and changes no stock until the reservation API is used.

**B – Missing allergen info:** A relevant lot lacks allergen data and the recipient has an allergen constraint. The lot is flagged/rejected as `UNKNOWN`; the UI never claims allergen-free.

**C – Policy RAG with no evidence:** A question not covered by approved policies returns a clear missing-evidence response and refers the user to the responsible coordinator.

## ❓ Open Decisions

- `User.organizationId` vs `Membership` as the source of truth
- Ownership of `PATCH /api/organizations/:id/verification` (Members 2 & 7)
- Reservation state machine, hold duration, expiry scheduler, who confirms
- Atomic stock mechanism and idempotency
- Whether one need can be split across multiple reservations
- Allergen schema and compatibility logic
- Volunteer invitation and assignment eligibility
- `HandlingPolicy` vs `Document` model overlap; version immutability and reindexing
- Embedding model, vector dimensions, index names, chunking
- Travel-zone estimate schema and capacity rule
- API response/error envelope, pagination, timezone convention
- Frontend routing/styling conventions
- Email / password-recovery provider

## 📊 Project Status

| Area | Status |
|---|---|
| Scope, stack, member assignments | ✅ Documented |
| Schemas and APIs | ⏳ Pending / not verified |
| AI matching / RAG / agent | ⏳ Pending / not verified |
| Security controls | ⏳ Pending / not verified |
| Seed data and integration | ⏳ Pending / not verified |
| Deployment | — Not available |

Update this table only when evidence exists (code merged, tests run, or feature demonstrated).

## 🔁 Recommended Integration Order

1. Freeze repo structure, env var names, API error shape, lint/format rules
2. Auth/session skeleton and shared middleware (Member 1)
3. User / Organization / Membership agreement (Members 1 + 2)
4. SurplusLot and Need schemas (Members 3 + 4)
5. Reservation atomicity, expiry, cancellation (Member 5)
6. Pickups, handover, collection (Member 6)
7. Coordinator verification, audit, policies (Member 7)
8. Vector matching with hard filters (Member 8)
9. Approved-only policy indexing + chat (Member 9)
10. Seed data, agent, end-to-end checks (Member 10)
11. Connect React screens; verify loading/error/empty/success states
12. Run security, concurrency, AI missing-data, and full demo scenarios

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/<module>-<short-name>`
2. Keep to the agreed model/field names, endpoints, and response envelope
3. Never let AI code paths mutate stock or reserve food
4. Add or update tests for your module
5. Open a pull request and request review from the module's integration partners

## 📄 License

Add your license here (e.g., MIT) or remove this section.
