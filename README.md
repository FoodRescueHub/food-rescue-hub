# Community Food Rescue Coordinator — Surplus Food Listings Module

## 📌 Role & Scope
This module implements the **Donor Surplus Food Management** subsystem for the **Community Food Rescue Coordinator** platform (built with Node.js, Express, Mongoose, and Zod).

It establishes the data persistence, safety policies, role-based access control, and API surface for cafés, bakeries, and campus kitchens to list surplus food, manage pickup windows, and track remaining quantities.

---

## 🏗️ Architecture & Component Overview

```
community-food-rescue/
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── app.js                         # Express app setup, CORS, route mounting
│   ├── server.js                      # MongoDB Atlas connection & server lifecycle
│   ├── models/
│   │   ├── SurplusLot.js              # Core Mongoose model for surplus food lots
│   │   ├── Organization.js            # Supporting Organization schema & verification
│   │   └── User.js                    # Supporting User identity & roles
│   ├── validators/
│   │   └── surplusLotValidator.js     # Zod validation schemas enforcing safety rules
│   ├── middleware/
│   │   ├── authMiddleware.js          # Role-based access control (Donor/Coordinator/Public)
│   │   └── sanitizer.js               # Sanitization layer protecting private addresses
│   ├── controllers/
│   │   └── surplusController.js       # Business logic for POST, GET, GET /:id, PATCH
│   └── routes/
│       └── surplusRoutes.js           # API route declarations & route protection
└── tests/
    └── surplus.test.js                # Automated integration & unit test suite (18 tests)
```

---

## 📄 1. Data Model: `SurplusLot.js`

### Schema Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | `ObjectId` | Yes | Reference to verified donor `Organization` |
| `createdBy` | `ObjectId` | Yes | Reference to donor `User` who created the listing |
| `title` | `String` | Yes | Title/headline of surplus food (max 200 chars) |
| `description` | `String` | Yes | Detailed description of items, packaging, condition |
| `quantity` | `Number` | Yes | Total quantity offered (must be positive integer) |
| `remainingQuantity` | `Number` | Yes | Remaining unreserved portions (auto-tracked) |
| `unit` | `String` | Yes | Unit of measure (e.g. `portions`, `servings`, `boxes`, `kg`) |
| `preparationInfo` | `Mixed` | Yes | Preparation details, kitchen batch info, timestamps |
| `storageInfo` | `Mixed` | Yes | Temperature requirements (`ambient`, `refrigerated`, `frozen`) |
| `allergenInfo` | `Object` | Yes | **Safety-critical:** Allergen specifications (see safety rules below) |
| `pickupStart` | `Date` | Yes | Start timestamp of collection window |
| `pickupEnd` | `Date` | Yes | End timestamp of collection window (`pickupEnd > pickupStart`) |
| `pickupZone` | `String` | Yes | Neighborhood or campus zone (e.g., `North Campus Zone 1`) |
| `pickupAddress` | `Object` | Optional | **Private** location: street, building, phone, internal door codes |
| `status` | `String` | Yes | Listing state (see Status Enum below) |

### Status Enum & Lifecycle
- `AVAILABLE`: Listing is active with `remainingQuantity === quantity`.
- `PARTIALLY_RESERVED`: Portions have been claimed (`0 < remainingQuantity < quantity`).
- `FULLY_RESERVED`: All stock claimed (`remainingQuantity === 0`).
- `EXPIRED`: Pickup window has closed (`pickupEnd < Date.now()`). Auto-detected on query and via `SurplusLot.expireOutdatedLots()`.
- `CANCELLED`: Withdrawn by donor or suspended by platform coordinator.

---

## 🛡️ Critical Safety & Privacy Guarantees

### 1. Allergen Safety Policy: Missing is UNKNOWN, NOT Allergen-Free
> **Rule:** In community food rescue, assuming unspecified food is allergen-free poses immediate physical risk to recipients.
- If `allergenInfo` is omitted or empty, the system automatically sets:
  ```json
  {
    "status": "UNKNOWN",
    "allergens": [],
    "isAllergenFree": false,
    "crossContaminationRisk": "UNKNOWN",
    "details": "UNKNOWN - Missing allergen information. Must not be assumed allergen-free."
  }
  ```
- Downstream AI matching tools and coordinators reject matching lots with `UNKNOWN` allergen status to recipient organizations with strict allergen allergies.

### 2. Privacy Sanitization for Public Users
> **Rule:** Public users must only see sanitized availability summaries without recipient identities or private addresses.
- Public requests to `GET /api/surplus` and `GET /api/surplus/:id` return general neighborhood `pickupZone` and pickup times, but **strip**:
  - `pickupAddress.streetAddress`
  - `pickupAddress.buildingOrRoom`
  - `pickupAddress.contactPhone`
  - `pickupAddress.donorNotes`
  - Recipient identities and beneficiary records
- Only the **verified donor organization** owning the listing or **platform coordinators** (and later, assigned volunteers with confirmed pickup tokens) can view exact collection addresses.

### 3. Quantity & Reservation Integrity
- When donors edit a listing (`PATCH /api/surplus/:id`), the system calculates:
  $$\text{currentlyReserved} = \text{lot.quantity} - \text{lot.remainingQuantity}$$
- Donors **cannot reduce total quantity below currently reserved stock**.
- Adjusting quantity recalculates `remainingQuantity = newQuantity - currentlyReserved` and updates status accordingly.

---

## 🚀 API Endpoints & Usage

### 1. Create Surplus Listing
- **Route:** `POST /api/surplus`
- **Access:** Protected (`donor` role with verified organization)
- **Headers:** `x-user-id`, `x-user-role: donor`, `x-org-id` (or session cookie)
- **Sample Request:**
```json
POST /api/surplus
Content-Type: application/json

{
  "title": "Surplus Sourdough & Croissants",
  "description": "Artisanal breads and morning croissants baked early today.",
  "quantity": 30,
  "unit": "portions",
  "preparationInfo": "Baked at 5:00 AM today in campus bakery. Packaged in sanitized containers.",
  "storageInfo": "Ambient cool pantry storage. Best consumed within 36 hours.",
  "allergenInfo": {
    "status": "CONTAINS",
    "allergens": ["wheat", "gluten", "dairy"],
    "isAllergenFree": false,
    "crossContaminationRisk": "LOW"
  },
  "pickupStart": "2026-10-15T10:00:00.000Z",
  "pickupEnd": "2026-10-15T14:00:00.000Z",
  "pickupZone": "North Campus Zone 1",
  "pickupAddress": {
    "streetAddress": "128 University Way, Kitchen Bay B",
    "buildingOrRoom": "Bakery Room 102",
    "contactPhone": "+1-555-019-2834",
    "donorNotes": "Ring Door 3 for Chef Marcus"
  }
}
```
- **Response (201 Created):**
```json
{
  "message": "Surplus food listing created successfully",
  "data": {
    "id": "670ddb21...",
    "title": "Surplus Sourdough & Croissants",
    "quantity": 30,
    "remainingQuantity": 30,
    "status": "AVAILABLE",
    ...
  }
}
```

---

### 2. View Available Surplus (Public Sanitized Summaries)
- **Route:** `GET /api/surplus`
- **Access:** Public (no authentication required)
- **Query Parameters:**
  - `pickupZone`: Filter by zone (e.g. `?pickupZone=North Campus`)
  - `status`: Filter by status (`AVAILABLE`, `PARTIALLY_RESERVED`, `EXPIRED`, `CANCELLED`)
  - `search`: Keyword search in title and description
  - `availableOnly`: Default `true` (only `remainingQuantity > 0`)
- **Sanitized Response (200 OK):**
```json
{
  "count": 1,
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "data": [
    {
      "id": "670ddb21...",
      "organizationId": "65f000000000000000000001",
      "title": "Surplus Sourdough & Croissants",
      "description": "Artisanal breads and morning croissants...",
      "quantity": 30,
      "remainingQuantity": 30,
      "unit": "portions",
      "preparationInfo": "Baked at 5:00 AM...",
      "storageInfo": "Ambient cool pantry storage...",
      "allergenInfo": {
        "status": "CONTAINS",
        "allergens": ["wheat", "gluten", "dairy"],
        "isAllergenFree": false,
        "crossContaminationRisk": "LOW"
      },
      "pickupStart": "2026-10-15T10:00:00.000Z",
      "pickupEnd": "2026-10-15T14:00:00.000Z",
      "pickupZone": "North Campus Zone 1",
      "status": "AVAILABLE"
    }
  ]
}
```
*(Notice: Private street address and direct phone numbers are completely omitted from public view).*

---

### 3. Get Single Surplus Lot
- **Route:** `GET /api/surplus/:id`
- **Access:** Public (Sanitized) / Owning Donor (Full Details)
- **Response:** Single surplus lot document, sanitized according to caller's authorization.

---

### 4. Edit Surplus Listing
- **Route:** `PATCH /api/surplus/:id`
- **Access:** Protected (`donor` belonging to the lot's organization, or `coordinator`)
- **Sample Request:**
```json
PATCH /api/surplus/670ddb21...
Content-Type: application/json

{
  "title": "Corrected: Sourdough Loaves & Croissants (40 Portions)",
  "quantity": 40,
  "preparationInfo": "Batch baked at 5:30 AM, cooling completed under sanitary hood."
}
```
- **Validation Guard:** If 10 portions were already reserved, quantity cannot be set below 10. `remainingQuantity` updates to $40 - 10 = 30$.

---

## 🧪 Automated Test Suite

Run the full integration test suite with Node.js built-in test runner:
```bash
npm test
```
**Test Results:**
- `19 tests across 6 suites passing (0 failures)`
- Covers model validation, allergen fallback, public privacy sanitization, zone filtering, expiration handling, quantity limits, and role authorization.

---

## 🔗 AI Matching & Reservation System Integration
This module provides clean schema primitives designed for the capstone's downstream AI and reservation features:
1. **LangChain & Vector Search:** `title`, `description`, `preparationInfo`, and `storageInfo` can be embedded into Atlas Vector Search chunks for semantic matching with recipient organization needs.
2. **Deterministic Constraint Matching:** Exact quantity filter (`remainingQuantity >= needQuantity`), pickup window interval matching (`[pickupStart, pickupEnd]`), and zone travel estimates (`pickupZone`).
3. **Food Safety Agent Policy:** Ensures the AI agent rejects matching if allergen handling details are `UNKNOWN` when the recipient has strict dietary requirements.
