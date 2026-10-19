```js
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

    const donors = await User.find({ role: "DONOR" }).limit(2);

    if (!recipient) {
      throw new Error(
        "No recipient with an organization was found. Create a test recipient first."
      );
    }

    if (donors.length < 2) {
      throw new Error(
        "At least two donor users are required. Create a second test donor first."
      );
    }

    // Avoid creating duplicate sample records for the same recipient.
    const existingNeed = await Need.findOne({
      organizationId: recipient.organizationId,
      createdBy: recipient._id,
      foodType: "Rice",
      quantity: 30,
      pickupZone: "Sample Zone",
      status: "ACTIVE"
    });

    if (existingNeed) {
      console.log("Sample Collection Agent need already exists.");
      console.log("Need ID:", existingNeed._id.toString());
      return;
    }

    const now = Date.now();

    const need = await Need.create({
      organizationId: recipient.organizationId,
      createdBy: recipient._id,
      foodType: "Rice",
      quantity: 30,
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
        quantity: 20,
        unit: "kg",
        description: "Sample rice donation from donor A",
        pickupAddress: "Sample Pickup Location A",
        expiryDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
        status: "AVAILABLE",
        donor: donors[0]._id
      },
      {
        foodName: "Rice",
        quantity: 15,
        unit: "kg",
        description: "Sample rice donation from donor B",
        pickupAddress: "Sample Pickup Location B",
        expiryDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
        status: "AVAILABLE",
        donor: donors[1]._id
      }
    ]);

    console.log("Collection Agent seed data created successfully.");
    console.log("Need ID:", need._id.toString());
    console.log(
      "Donation IDs:",
      donations.map((donation) => donation._id.toString())
    );
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedCollectionAgent();
```
