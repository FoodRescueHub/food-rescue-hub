
const {
  evaluateDonationMatch,
  buildCombinedPlan,
} = require("./collectionAgentService");

describe("Collection Agent service", () => {
  const need = {
    foodType: "vegetables",
    unit: "kg",
    quantity: 5,
    allergenRequirements: [],
  };

  const donation = {
    foodName: "Vegetables",
    unit: "kg",
    quantity: 10,
    expiryDate: new Date("2027-01-01"),
  };

  test("matches compatible food and sufficient quantity", () => {
    const result = evaluateDonationMatch(need, donation);

    expect(result.foodMatches).toBe(true);
    expect(result.unitsMatch).toBe(true);
    expect(result.quantitySufficient).toBe(true);
  });

  test("flags allergen information for coordinator review", () => {
    const result = evaluateDonationMatch(need, donation);

    expect(result.allergensNeedReview).toBe(true);
    expect(result.recommended).toBe(false);
  });

  test("rejects mismatched units", () => {
    const result = evaluateDonationMatch(need, {
      ...donation,
      unit: "litres",
    });

    expect(result.unitsMatch).toBe(false);
    expect(result.recommended).toBe(false);
  });

  test("combines donations without changing inventory", () => {
    const result = buildCombinedPlan(
      { ...need, quantity: 30 },
      [
        { ...donation, quantity: 20 },
        { ...donation, quantity: 15 },
      ]
    );

    expect(result.fulfilledByProposal).toBe(true);
    expect(result.remainingQuantity).toBe(0);
    expect(
      result.selectedDonations.map((item) => item.allocatedQuantity)
    ).toEqual([20, 10]);
    expect(result.inventoryChanged).toBe(false);
    expect(result.requiresCoordinatorReview).toBe(true);
  });

  test("reports the unmet quantity when donations are insufficient", () => {
    const result = buildCombinedPlan(
      { ...need, quantity: 30 },
      [{ ...donation, quantity: 20 }]
    );

    expect(result.fulfilledByProposal).toBe(false);
    expect(result.remainingQuantity).toBe(10);
  });
});
