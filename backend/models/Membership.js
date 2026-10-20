const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },

    role: {
      type: String,
      enum: ["ADMIN", "MEMBER", "VIEWER"],
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INVITED", "LEFT"],
      default: "ACTIVE"
    },

    joinedAt: {
      type: Date,
      default: null
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

// Prevent a user from having more than one membership record per organization.
membershipSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Membership", membershipSchema);
