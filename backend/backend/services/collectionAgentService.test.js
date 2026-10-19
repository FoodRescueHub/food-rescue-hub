
const { evaluateDonationMatch } = require("./donationMatch");

describe("evaluateDonationMatch", () => {
  const donation = {
    foodType: "Vegetables",
    unit: "kg",
    quantity: 10,
    allergens: [],
  };

  const need = {
    foodType: "vegetables",
    unit: "kg",
    quantity: 5,
    allergens: [],
  };

  test("matches compatible food and sufficient quantity", () => {
    const result = evaluateDonationMatch(donation, need);

    expect(result.matches).toBe(true);
    expect(result.quantitySufficient).toBe(true);
  });

  test("rejects insufficient quantity", () => {
    const result = evaluateDonationMatch(
      { ...donation, quantity: 2 },
      need
    );

    expect(result.matches).toBe(false);
    expect(result.quantitySufficient).toBe(false);
  });

  test("flags allergen compatibility for manual review", () => {
    const result = evaluateDonationMatch(
      { ...donation, allergens: ["peanuts"] },
      { ...need, allergens: ["peanuts"] }
    );

    expect(result.matches).toBe(false);
    expect(result.allergenReviewRequired).toBe(true);
  });

  test("rejects mismatched units", () => {
    const result = evaluateDonationMatch(
      donation,
      { ...need, unit: "litres" }
    );

    expect(result.matches).toBe(false);
    expect(result.unitsMatch).toBe(false);
  });
});
