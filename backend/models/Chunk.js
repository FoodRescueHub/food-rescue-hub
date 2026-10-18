const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PolicyDocument",
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true, minlength: 1 },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (vector) =>
          Array.isArray(vector) && vector.length > 0 && vector.every(Number.isFinite),
        message: "embedding must be a non-empty vector of finite numbers",
      },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
  },
  { collection: "policy_chunks", timestamps: true, strict: "throw" }
);

module.exports = mongoose.models.PolicyChunk || mongoose.model("PolicyChunk", chunkSchema);
