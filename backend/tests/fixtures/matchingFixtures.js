const now = new Date("2030-01-01T00:00:00.000Z");

const need = {
  _id: "need-fixture",
  foodType: "vegetarian cooked meal",
  quantity: 30,
  unit: "portions",
  allergenRequirements: ["peanut"],
  pickupStart: new Date("2030-01-01T10:00:00.000Z"),
  pickupEnd: new Date("2030-01-01T14:00:00.000Z")
};

function listing(id, quantity, overrides = {}) {
  return {
    _id: id,
    foodName: "Vegetable rice meal",
    quantity,
    unit: "portions",
    status: "AVAILABLE",
    expiryDate: new Date("2030-01-02T00:00:00.000Z"),
    pickupStart: new Date("2030-01-01T11:00:00.000Z"),
    pickupEnd: new Date("2030-01-01T13:00:00.000Z"),
    allergenInfoStatus: "KNOWN",
    allergens: [],
    semanticScore: 0.9,
    ...overrides
  };
}

module.exports = { now, need, listing };
