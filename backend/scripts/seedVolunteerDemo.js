/**
 * Seed script to set up a test VOLUNTEER user and ASSIGNED pickup
 * for testing Member 6 Volunteer Dashboard.
 * 
 * Usage:
 *   node scripts/seedVolunteerDemo.js
 */

require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("../config/db");
const User = require("../models/User");
const Donation = require("../models/Donation");
const Need = require("../models/Need");
const Reservation = require("../models/Reservation");
const VolunteerAssignment = require("../models/VolunteerAssignment");

async function seed() {
  await connectDB();
  console.log("Connected to MongoDB Atlas.");

  const hashedPassword = await bcrypt.hash("Volunteer@2026!", 12);

  // 1. Create or update Volunteer user
  const volunteerEmail = "volunteer@foodrescue.dev";
  let volunteer = await User.findOne({ email: volunteerEmail });
  if (!volunteer) {
    volunteer = await User.create({
      name: "Sam Volunteer",
      email: volunteerEmail,
      password: hashedPassword,
      role: "VOLUNTEER",
      emailVerified: true,
    });
    console.log("Created volunteer:", volunteer.email);
  } else {
    volunteer.role = "VOLUNTEER";
    volunteer.password = hashedPassword;
    await volunteer.save();
    console.log("Updated volunteer:", volunteer.email);
  }

  // 2. Create or find Coordinator
  const coordEmail = "coordinator@foodrescue.dev";
  let coordinator = await User.findOne({ email: coordEmail });
  if (!coordinator) {
    coordinator = await User.create({
      name: "Alex Coordinator",
      email: coordEmail,
      password: hashedPassword,
      role: "COORDINATOR",
      emailVerified: true,
    });
    console.log("Created coordinator:", coordinator.email);
  }

  // 3. Create or find Donor
  const donorEmail = "donor.seed@example.com";
  let donor = await User.findOne({ email: donorEmail });
  if (!donor) {
    donor = await User.create({
      name: "Green Bakery",
      email: donorEmail,
      password: hashedPassword,
      role: "DONOR",
      emailVerified: true,
    });
    console.log("Created donor:", donor.email);
  }

  // 4. Create or find Recipient
  const recipientEmail = "recipient.seed@example.com";
  let recipient = await User.findOne({ email: recipientEmail });
  if (!recipient) {
    recipient = await User.create({
      name: "Community Food Pantry",
      email: recipientEmail,
      password: hashedPassword,
      role: "RECIPIENT",
      emailVerified: true,
    });
    console.log("Created recipient:", recipient.email);
  }

  // 5. Create a Donation
  let donation = await Donation.findOne({ donor: donor._id, status: "AVAILABLE" });
  if (!donation) {
    donation = await Donation.create({
      foodName: "Artisan Sourdough Loaves & Muffins",
      quantity: 25,
      unit: "pieces",
      description: "Fresh bakery surplus baked this morning. Keep in dry place.",
      pickupAddress: "123 Market Street, Suite 4B, Central City",
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "AVAILABLE",
      donor: donor._id,
    });
    console.log("Created donation:", donation.foodName);
  }

  // 6. Create a Need
  let need = await Need.findOne({ createdBy: recipient._id, status: "ACTIVE" });
  if (!need) {
    need = await Need.create({
      foodType: "Bread & Bakery",
      quantity: 20,
      unit: "pieces",
      pickupZone: "Downtown Community Center",
      pickupStart: new Date(Date.now() + 2 * 60 * 60 * 1000),
      pickupEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
      status: "ACTIVE",
      organizationId: recipient._id,
      createdBy: recipient._id,
    });
    console.log("Created need:", need.foodType);
  }

  // 7. Create a CONFIRMED Reservation
  let reservation = await Reservation.findOne({
    surplusLotId: donation._id,
    status: "CONFIRMED",
  });
  if (!reservation) {
    reservation = await Reservation.create({
      surplusLotId: donation._id,
      needId: need._id,
      recipientOrganizationId: recipient._id,
      quantity: 15,
      status: "CONFIRMED",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      confirmedAt: new Date(),
      createdBy: recipient._id,
    });
    console.log("Created confirmed reservation:", reservation._id);
  }

  // 8. Create a VolunteerAssignment with status ASSIGNED
  let assignment = await VolunteerAssignment.findOne({
    reservationId: reservation._id,
    volunteerId: volunteer._id,
  });

  if (!assignment) {
    assignment = await VolunteerAssignment.create({
      reservationId: reservation._id,
      volunteerId: volunteer._id,
      assignedBy: coordinator._id,
      status: "ASSIGNED",
      pickupWindow: "Today 3:00 PM - 5:00 PM",
      zone: "Downtown Central",
    });
    console.log("Created VolunteerAssignment:", assignment._id);
  } else {
    // Reset to ASSIGNED for clean re-testing
    assignment.status = "ASSIGNED";
    assignment.acceptedAt = null;
    assignment.completedAt = null;
    await assignment.save();
    console.log("Reset existing VolunteerAssignment to ASSIGNED:", assignment._id);
  }

  console.log("\n========================================================");
  console.log("SEED COMPLETED SUCCESSFULLY FOR VOLUNTEER TESTING!");
  console.log("Volunteer login credentials:");
  console.log("  Email:    ", volunteerEmail);
  console.log("  Password: ", "Volunteer@2026!");
  console.log("  Role:     ", "VOLUNTEER");
  console.log("Assignment ID: ", assignment._id);
  console.log("========================================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
