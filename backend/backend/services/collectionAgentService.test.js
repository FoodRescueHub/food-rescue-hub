
const { evaluateDonationMatch } = jest.requireActual(
  "./collectionAgentService"
);

describe("evaluateDonationMatch", () => {
  test("recommends matching food when quantity is sufficient", () => {
    const need = {
      foodType: "Rice",
      quantity: 10,
      unit: "kg",
      allergenRequirements: []
    };

    const donation = {
      foodName: "Rice",
      quantity: 15,
      unit: "kg"
    };

    const result = evaluateDonationMatch(need, donation);

    expect(result.recommended).toBe(true);
    expect(result.needsReview).toBe(false);
    expect(result.quantitySufficient).toBe(true);
  });

  test("does not recommend a donation with insufficient quantity", () => {
    const need = {
      foodType: "Rice",
      quantity: 10,
      unit: "kg",
      allergenRequirements: []
    };

    const donation = {
      foodName: "Rice",
      quantity: 5,
      unit: "kg"
    };

    const result = evaluateDonationMatch(need, donation);

    expect(result.recommended).toBe(false);
    expect(result.quantitySufficient).toBe(false);
    expect(result.needsReview).toBe(true);
  });

  test("requires review when allergen requirements are present", () => {
    const need = {
      foodType: "Rice",
      quantity: 10,
      unit: "kg",
      allergenRequirements: ["peanuts"]
    };

    const donation = {
      foodName: "Rice",
      quantity: 15,
      unit: "kg"
    };

    const result = evaluateDonationMatch(need, donation);

    expect(result.recommended).toBe(false);
    expect(result.allergensNeedReview).toBe(true);
    expect(result.needsReview).toBe(true);
  });

  test("does not recommend donations with mismatched units", () => {
    const need = {
      foodType: "Rice",
      quantity: 10,
      unit: "kg",
      allergenRequirements: []
    };

    const donation = {
      foodName: "Rice",
      quantity: 15,
      unit: "litres"
    };

    const result = evaluateDonationMatch(need, donation);

    expect(result.recommended).toBe(false);
    expect(result.unitsMatch).toBe(false);
  });
});
