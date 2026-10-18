import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../src/config/database.js";
import { indexApprovedPolicy } from "../src/services/policyIndexService.js";

const documentId = process.argv[2];

if (!mongoose.Types.ObjectId.isValid(documentId)) {
  throw new Error("Usage: npm run index:policy -- <approved-policy-id>");
}

try {
  await connectToDatabase();
  console.log(JSON.stringify(await indexApprovedPolicy(documentId), null, 2));
} finally {
  await disconnectFromDatabase();
}
