import assert from "node:assert/strict";
import test from "node:test";
import {
  isFoodSafetyDeterminationQuestion,
  MISSING_APPROVED_INFORMATION
} from "../src/services/rescueChatService.js";

test("food-safety determinations are blocked before retrieval", () => {
  assert.equal(isFoodSafetyDeterminationQuestion("Is this food safe to eat?"), true);
  assert.equal(isFoodSafetyDeterminationQuestion("Explain the pickup acceptance process."), false);
  assert.match(MISSING_APPROVED_INFORMATION, /responsible coordinator/);
});
