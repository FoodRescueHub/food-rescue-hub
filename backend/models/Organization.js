const mongoose = require("mongoose");

// Sub-schema for verification documents uploaded by the organization.
const documentSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    // ── Original fields (preserved exactly) ──────────────────────────────────

    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      default: "RECIPIENT"
    },

    address: {
      type: String,
      default: ""
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING"
    },

    // ── New contact & profile fields ─────────────────────────────────────────

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    contactPhone: {
      type: String,
      trim: true,
      default: ""
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    // Approximate number of people the organization can serve per day/week.
    servingCapacity: {
      type: Number,
      min: 0,
      default: null
    },

    // Geographic zones or neighbourhoods the organization serves.
    servingZones: {
      type: [String],
      default: []
    },

    // Free-text operating hours description (e.g. "Mon–Fri 9am–5pm").
    operatingHours: {
      type: String,
      trim: true,
      default: ""
    },

    // ── Verification supporting documents ────────────────────────────────────

    documents: {
      type: [documentSchema],
      default: []
    },

    // ── Coordinator verification fields (populated by Member 7's workflow) ──

    verificationNotes: {
      type: String,
      trim: true,
      default: ""
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
