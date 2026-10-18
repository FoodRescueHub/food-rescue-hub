const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 300 },
    content: { type: String, required: true, trim: true, minlength: 1 },
    version: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    status: {
      type: String,
      enum: ["DRAFT", "APPROVED", "ARCHIVED"],
      default: "DRAFT",
      required: true,
      index: true,
    },
  },
  { collection: "policy_documents", timestamps: true, strict: "throw" }
);

module.exports =
  mongoose.models.PolicyDocument || mongoose.model("PolicyDocument", documentSchema);
