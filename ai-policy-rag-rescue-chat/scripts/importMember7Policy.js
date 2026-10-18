import { connectToDatabase, disconnectFromDatabase } from "../src/config/database.js";
import { PolicyDocument } from "../src/models/Document.js";

const approvedPolicy = {
  title: "Food Pickup and Handover Handling Policy",
  version: "1.0",
  status: "APPROVED",
  content: `FOOD PICKUP AND HANDOVER HANDLING POLICY
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
5.4 Approving a policy records the approving Coordinator and transitions the policy status to APPROVED.`
};

try {
  await connectToDatabase();
  const document = await PolicyDocument.findOneAndUpdate(
    { title: approvedPolicy.title, version: approvedPolicy.version },
    { $set: approvedPolicy },
    { returnDocument: "after", upsert: true, runValidators: true }
  );

  console.log(`Imported approved policy with ID: ${document.id}`);
} finally {
  await disconnectFromDatabase();
}
