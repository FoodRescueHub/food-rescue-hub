/**
 * One-time script: creates and approves one HandlingPolicy via the live API.
 * Runs against the backend server at http://localhost:5000.
 * Safe to delete after use.
 */

const http = require("http");

const BASE = "http://localhost:5000/api";

const COORDINATOR_EMAIL = "coordinator@foodrescue.dev";
const COORDINATOR_PASSWORD = "Volunteer@2026!";

const POLICY_TITLE = "Food Pickup and Handover Handling Policy";
const POLICY_VERSION = "1.0";
const POLICY_CONTENT = `
FOOD PICKUP AND HANDOVER HANDLING POLICY
Version 1.0

1. VOLUNTEER ASSIGNMENT
1.1 A volunteer may only be assigned to a pickup task for a reservation that has status CONFIRMED.
1.2 Only a Coordinator may create or cancel a volunteer pickup assignment.
1.3 An assigned volunteer must accept the pickup task before proceeding (status transitions from ASSIGNED to ACCEPTED).
1.4 Only the assigned volunteer or a Coordinator may view private pickup details, including the donor pickup address and contact information.

2. VOLUNTEER PICKUP STATUS LIFECYCLE
2.1 Valid volunteer assignment statuses are: ASSIGNED, ACCEPTED, PICKED_UP, FAILED, CANCELLED.
2.2 A volunteer must accept (ACCEPTED) the assignment before marking the food as collected (PICKED_UP).
2.3 Only Coordinators may cancel a pickup assignment.
2.4 A terminal status (FAILED or CANCELLED) cannot be changed once set.

3. FOOD HANDOVER PROCEDURE
3.1 Handover must be recorded by the Donor or a Coordinator via the POST /api/reservations/:id/handover endpoint.
3.2 The handover record must capture the actual quantity handed over (quantityHandedOver), which may differ from the originally reserved quantity.
3.3 Handover records must identify the Donor, the Recipient, who recorded the handover (recordedBy), the time of handover (handoverTime), and optional notes.
3.4 Only one handover record is permitted per reservation.

4. COLLECTION CONFIRMATION
4.1 Collection confirmation (POST /api/reservations/:id/collection) is available to the Recipient or Coordinator.
4.2 A handover record must exist before collection can be confirmed.
4.3 Confirming collection transitions the Reservation status from CONFIRMED to COLLECTED.
4.4 Upon confirmed collection, any associated volunteer assignment is automatically marked with a completedAt timestamp.

5. POLICY MANAGEMENT
5.1 Only Coordinators may create, edit, or approve handling policies.
5.2 All new policies are created in DRAFT status.
5.3 Only APPROVED policies are accessible to the RAG (Retrieval-Augmented Generation) system for Member 9.
5.4 Approving a policy records the approving Coordinator and transitions the policy status to APPROVED.
`.trim();

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  // Step 1: Login as coordinator
  console.log("Step 1: Logging in as coordinator...");
  const loginRes = await request("POST", "/auth/login", null, {
    email: COORDINATOR_EMAIL,
    password: COORDINATOR_PASSWORD
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error("Login failed:", loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.token;
  console.log("Login successful. Role:", loginRes.body.user.role);

  // Step 2: Create policy as DRAFT
  console.log("\nStep 2: Creating policy draft...");
  const createRes = await request("POST", "/policies", token, {
    title: POLICY_TITLE,
    version: POLICY_VERSION,
    content: POLICY_CONTENT
  });

  if (createRes.status !== 201 || !createRes.body.policy) {
    console.error("Policy creation failed:", createRes.body);
    process.exit(1);
  }

  const policy = createRes.body.policy;
  console.log("Policy created:");
  console.log("  ID:     ", policy._id);
  console.log("  Title:  ", policy.title);
  console.log("  Version:", policy.version);
  console.log("  Status: ", policy.status);

  // Step 3: Approve the policy
  console.log("\nStep 3: Approving policy...");
  const approveRes = await request("POST", `/policies/${policy._id}/approve`, token);

  if (approveRes.status !== 200 || !approveRes.body.policy) {
    console.error("Policy approval failed:", approveRes.body);
    process.exit(1);
  }

  const approved = approveRes.body.policy;
  console.log("\n=== FINAL POLICY RECORD ===");
  console.log("Title:      ", approved.title);
  console.log("Version:    ", approved.version);
  console.log("Status:     ", approved.status);
  console.log("CreatedBy:  ", approved.createdBy);
  console.log("ApprovedBy: ", approved.approvedBy);
  console.log("UpdatedAt:  ", approved.updatedAt);
  console.log("===========================");
}

run().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});
