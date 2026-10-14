import { useState } from "react";
import "./App.css";

function App() {
  const [needs, setNeeds] = useState([]);
  const [foodType, setFoodType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [pickupZone, setPickupZone] = useState("");
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [allergens, setAllergens] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (new Date(pickupEnd) <= new Date(pickupStart)) {
      alert("Pickup end must be after pickup start.");
      return;
    }

    const newNeed = {
      id: Date.now(),
      foodType,
      quantity,
      unit,
      pickupZone,
      pickupStart,
      pickupEnd,
      allergens,
      status: "ACTIVE",
    };

    setNeeds([...needs, newNeed]);

    setFoodType("");
    setQuantity("");
    setUnit("kg");
    setPickupZone("");
    setPickupStart("");
    setPickupEnd("");
    setAllergens("");
  }

  function cancelNeed(id) {
    setNeeds(
      needs.map((need) =>
        need.id === id ? { ...need, status: "CANCELLED" } : need
      )
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Food Rescue Hub</h1>
          <p>Recipient Dashboard</p>
        </div>
        <span className="role">Recipient</span>
      </header>

      <main className="container">
        <section className="welcome">
          <h2>Your Food Needs</h2>
          <p>
            Tell us what food your organization needs and when you can collect it.
          </p>
        </section>

        <section className="panel">
          <h2>Create a Food Need</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Food type
                <input
                  value={foodType}
                  onChange={(e) => setFoodType(e.target.value)}
                  placeholder="e.g. Rice, vegetables"
                  required
                />
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  required
                />
              </label>

              <label>
                Unit
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="litres">Litres</option>
                  <option value="packets">Packets</option>
                  <option value="boxes">Boxes</option>
                  <option value="meals">Meals</option>
                </select>
              </label>

              <label>
                Pickup zone
                <input
                  value={pickupZone}
                  onChange={(e) => setPickupZone(e.target.value)}
                  placeholder="e.g. Kukatpally"
                  required
                />
              </label>

              <label>
                Pickup start
                <input
                  type="datetime-local"
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                  required
                />
              </label>

              <label>
                Pickup end
                <input
                  type="datetime-local"
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="allergen-field">
              Allergen requirements
              <input
                value={allergens}
                onChange={(e) => setAllergens(e.target.value)}
                placeholder="e.g. No peanuts, dairy-free"
              />
            </label>

            <button className="primary-btn" type="submit">
              + Submit Food Need
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Your Requests</h2>
            <span>{needs.length} total</span>
          </div>

          {needs.length === 0 ? (
            <p className="empty">
              No food needs added yet. Submit your first request above.
            </p>
          ) : (
            <div className="needs-list">
              {needs.map((need) => (
                <article className="need-card" key={need.id}>
                  <div className="need-top">
                    <h3>{need.foodType}</h3>
                    <span className={`status ${need.status.toLowerCase()}`}>
                      {need.status}
                    </span>
                  </div>

                  <p>
                    <strong>Quantity:</strong> {need.quantity} {need.unit}
                  </p>
                  <p>
                    <strong>Pickup zone:</strong> {need.pickupZone}
                  </p>
                  <p>
                    <strong>Pickup window:</strong>{" "}
                    {new Date(need.pickupStart).toLocaleString()} –{" "}
                    {new Date(need.pickupEnd).toLocaleString()}
                  </p>
                  <p>
                    <strong>Allergens:</strong> {need.allergens || "None specified"}
                  </p>

                  {need.status === "ACTIVE" && (
                    <button
                      className="cancel-btn"
                      onClick={() => cancelNeed(need.id)}
                    >
                      Cancel Request
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;