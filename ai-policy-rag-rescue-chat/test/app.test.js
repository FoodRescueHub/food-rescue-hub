import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app.js";
import { documentIdSchema } from "../src/routes/policies.js";

test("Express app is configured", () => {
  assert.equal(typeof app, "function");
});

test("policy indexing accepts only a MongoDB ObjectId", () => {
  assert.equal(documentIdSchema.safeParse("not-an-id").success, false);
  assert.equal(documentIdSchema.safeParse("507f1f77bcf86cd799439011").success, true);
});
