
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Need = require("../models/Need");
const Donation = require("../models/Donation");

async function seedCollectionAgent() {
  try {
    await connectDB();

    const recipient = await User.findOne({
      role: "RECIPIENT",
      organizationId: { $exists: true, $ne: null }
    });

    const donor = await User.findOne({ role: "DONOR" });

    if (!recipient) {
      throw new Error(
        "No recipient with an organization was found. Create a test recipient first."
      );
    }

    if (!donor) {
      throw new Error("No donor was found. Create a test donor first.");
    }

    const now = Date.now();

    const need = await Need.create({
      organizationId: recipient.organizationId,
      createdBy: recipient._id,
      foodType: "Rice",
      quantity: 10,
      unit: "kg",
      allergenRequirements: [],
      pickupStart: new Date(now + 60 * 60 * 1000),
      pickupEnd: new Date(now + 24 * 60 * 60 * 1000),
      pickupZone: "Sample Zone",
      status: "ACTIVE"
    });

    const donations = await Donation.insertMany([
      {
        foodName: "Rice",
        quantity: 15,
        unit: "kg",
        description: "Sample rice donation",
        pickupAddress: "Sample Pickup Location A",
        expiryDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
        status: "AVAILABLE",
        donor: donor._id
      },
      {
        foodName: "Rice",
        quantity: 5,
        unit: "kg",
        description: "Smaller sample rice donation",
        pickupAddress: "Sample Pickup Location B",
        expiryDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
        status: "AVAILABLE",
        donor: donor._id
      }
    ]);

    console.log("Collection Agent seed data created.");
    console.log("Need ID:", need._id.toString());
    console.log(
      "Donation IDs:",
      donations.map((item) => item._id.toString())
    );
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedCollectionAgent();
