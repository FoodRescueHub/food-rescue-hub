
const {
  evaluateDonationMatch
} = require("./collectionAgentService");

describe("evaluateDonationMatch", () => {
  const need = {
    foodType: "Rice",
    quantity: 10,
    unit: "kg",
    allergenRequirements: []
  };

  test("recommends sufficient matching donations", () => {
    const result = evaluateDonationMatch(need, {
      foodName: "Rice",
      quantity: 15,
      unit: "kg"
    });

    expect(result.recommended).toBe(true);
    expect(result.quantitySufficient).toBe(true);
  });

  test("rejects insufficient donations", () => {
    const result = evaluateDonationMatch(need, {
      foodName: "Rice",
      quantity: 5,
      unit: "kg"
    });

    expect(result.recommended).toBe(false);
    expect(result.quantitySufficient).toBe(false);
  });

  test("flags mismatched units for review", () => {
    const result = evaluateDonationMatch(need, {
      foodName: "Rice",
      quantity: 15,
      unit: "bags"
    });

    expect(result.recommended).toBe(false);
    expect(result.unitsMatch).toBe(false);
    expect(result.needsReview).toBe(true);
  });

  test("requires review for allergen requirements", () => {
    const result = evaluateDonationMatch(
      { ...need, allergenRequirements: ["peanuts"] },
      {
        foodName: "Rice",
        quantity: 15,
        unit: "kg"
      }
    );

    expect(result.recommended).toBe(false);
    expect(result.allergensNeedReview).toBe(true);
  });
});
