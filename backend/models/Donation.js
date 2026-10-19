
const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    foodName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    embedding: {
      type: [Number],
      select: false
    },
    allergenInfoStatus: {
      type: String,
      enum: ["KNOWN", "UNKNOWN"],
      default: "UNKNOWN"
    },
    allergens: {
      type: [String],
      default: []
    },
    pickupStart: {
      type: Date
    },
    pickupEnd: {
      type: Date
    },
    pickupAddress: {
      type: String,
      required: true,
      trim: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "CLAIMED", "COMPLETED", "CANCELLED"],
      default: "AVAILABLE"
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donation", donationSchema);
