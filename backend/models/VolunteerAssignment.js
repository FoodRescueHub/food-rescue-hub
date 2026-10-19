const mongoose = require("mongoose");

const volunteerAssignmentSchema = new mongoose.Schema(
  {
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true
    },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "FAILED", "CANCELLED"],
      default: "ASSIGNED"
    },
    pickupWindow: {
      type: String,
      trim: true,
      default: ""
    },
    zone: {
      type: String,
      trim: true,
      default: ""
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VolunteerAssignment",
  volunteerAssignmentSchema
);
