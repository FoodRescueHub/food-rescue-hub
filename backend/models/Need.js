
const mongoose = require("mongoose");

const needSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    foodType: {
      type: String,
      required: true,
      trim: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },

    unit: {
      type: String,
      required: true,
      trim: true
    },

    allergenRequirements: {
      type: [String],
      default: []
    },

    pickupStart: {
      type: Date,
      required: true
    },

    pickupEnd: {
      type: Date,
      required: true
    },

    pickupZone: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "FULFILLED", "CANCELLED", "EXPIRED"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Need", needSchema);
