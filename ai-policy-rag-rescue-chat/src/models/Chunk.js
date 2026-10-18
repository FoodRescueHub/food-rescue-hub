import mongoose from "mongoose";

const { Schema } = mongoose;

const chunkSchema = new Schema(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "PolicyDocument",
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (vector) =>
          Array.isArray(vector) && vector.length > 0 && vector.every(Number.isFinite),
        message: "embedding must be a non-empty vector of finite numbers"
      }
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
      default: {}
    }
  },
  {
    collection: "policy_chunks",
    timestamps: true,
    strict: "throw"
  }
);

export const PolicyChunk =
  mongoose.models.PolicyChunk || mongoose.model("PolicyChunk", chunkSchema);
