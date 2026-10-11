
const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["CLAIMED", "COMPLETED", "CANCELLED"],
      default: "CLAIMED",
    },
  },
  { timestamps: true }
);

// Prevent the same recipient from claiming
// the same donation more than once.
claimSchema.index(
  { donation: 1, recipient: 1 },
  { unique: true }
);

module.exports = mongoose.model("Claim", claimSchema);
