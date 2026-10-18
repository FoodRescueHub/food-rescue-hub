
const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    surplusLotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
      required: true
    },
    needId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Need",
      required: true
    },
    recipientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["HELD", "CONFIRMED", "EXPIRED", "CANCELLED", "COLLECTED"],
      default: "HELD"
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);
