import { useState, useEffect } from "react";
import "./App.css";

const API = "/api";

function App() {
  const [collectionPlans, setCollectionPlans] = useState({});
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [planError, setPlanError] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // ==================== RECIPIENT ====================
  const [needs, setNeeds] = useState([]);
  const [foodType, setFoodType] = useState("");
  const [needQuantity, setNeedQuantity] = useState("");
  const [needUnit, setNeedUnit] = useState("kg");
  const [pickupZone, setPickupZone] = useState("");
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [allergens, setAllergens] = useState("");

  const [availableDonations, setAvailableDonations] = useState([]);
  const [reservations, setReservations] = useState([]);

  // ==================== DONOR ====================
  const [donations, setDonations] = useState([]);
  const [foodName, setFoodName] = useState("");
  const [donationQuantity, setDonationQuantity] = useState("");
  const [donationUnit, setDonationUnit] = useState("kg");
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  
async function generatePlan(needId) {
  setLoadingPlanId(needId);
  setPlanError("");

  try {
    const response = await fetch(`${API}/collection-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ needId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not generate collection plan."
      );
    }

    setCollectionPlans((previous) => ({
      ...previous,
      [needId]: data.data,
    }));
  } catch (error) {
    setPlanError(
      error.message || "Could not connect to the backend."
    );
  } finally {
    setLoadingPlanId(null);
  }
}


  // ==================== AUTH ====================
  async function handleAuth(e) {
    e.preventDefault();

    const endpoint =
      mode === "login" ? "/auth/login" : "/auth/signup";

    const body =
      mode === "login"
        ? {
            email,
            password,
          }
        : {
            name,
            email,
            password,
            role: "RECIPIENT",
          };

    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Authentication failed");
        return;
      }

      if (mode === "signup") {
        alert("Signup successful. Please login.");
        setMode("login");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);

      setToken(data.token);
      setRole(data.user.role);

      setEmail("");
      setPassword("");
      setName("");
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setToken(null);
    setRole(null);
  }

  // ==================== RECIPIENT - CREATE NEED ====================
  async function handleNeedSubmit(e) {
    e.preventDefault();

    if (!pickupStart || !pickupEnd) {
      alert("Please select pickup start and end time.");
      return;
    }

    if (new Date(pickupEnd) <= new Date(pickupStart)) {
      alert("Pickup end time must be after pickup start time.");
      return;
    }

    try {
      const response = await fetch(`${API}/needs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          foodType,
          quantity: Number(needQuantity),
          unit: needUnit,
          pickupZone,
          pickupStart,
          pickupEnd,
          allergens,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not create food need");
        return;
      }

      alert("Food need created successfully!");

      setNeeds((prev) => [data.need || data, ...prev]);

      setFoodType("");
      setNeedQuantity("");
      setNeedUnit("kg");
      setPickupZone("");
      setPickupStart("");
      setPickupEnd("");
      setAllergens("");
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== RECIPIENT - LOAD MY NEEDS ====================
  async function loadMyNeeds() {
    try {
      const response = await fetch(`${API}/needs`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not load food needs");
        return;
      }

      setNeeds(data.needs || data || []);
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== RECIPIENT - LOAD DONATIONS ====================
  async function loadAvailableDonations() {
    try {
      const response = await fetch(`${API}/donations`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not load donations");
        return;
      }

      setAvailableDonations(data.donations || data || []);
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== RECIPIENT - RESERVE ====================
  async function reserveDonation(donationId) {
    if (needs.length === 0) {
      alert("First create a food need.");
      return;
    }

    const activeNeed = needs.find(
      (need) => need.status === "ACTIVE"
    );

    if (!activeNeed) {
      alert("No ACTIVE food need found.");
      return;
    }

    const quantity = prompt("Enter quantity to reserve:");

    if (!quantity || Number(quantity) <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/surplus/${donationId}/reservations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            needId: activeNeed._id,
            quantity: Number(quantity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Reservation failed");
        return;
      }

      alert("Food reserved successfully!");

      await loadAvailableDonations();
      await loadReservations();
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== RECIPIENT - LOAD RESERVATIONS ====================
  async function loadReservations() {
    try {
      const response = await fetch(`${API}/reservations`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not load reservations");
        return;
      }

      console.log("RESERVATIONS RESPONSE:", data);

      setReservations(data.reservations || data || []);
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== RECIPIENT - CONFIRM RESERVATION ====================
  async function confirmReservation(id) {
    try {
      const response = await fetch(
        `${API}/reservations/${id}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not confirm reservation");
        return;
      }

      alert("Reservation confirmed successfully!");

      await loadReservations();
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== RECIPIENT - CANCEL RESERVATION ====================
  async function cancelReservation(id) {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this reservation?"
    );

    if (!confirmCancel) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/reservations/${id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not cancel reservation");
        return;
      }

      alert("Reservation cancelled successfully!");

      await loadReservations();
      await loadAvailableDonations();
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== DONOR - CREATE DONATION ====================
  async function handleDonationSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          foodName,
          quantity: Number(donationQuantity),
          unit: donationUnit,
          description,
          pickupAddress,
          expiryDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not create donation");
        return;
      }

      alert("Donation created successfully!");

      setDonations((prev) => [
        data.donation || data,
        ...prev,
      ]);

      setFoodName("");
      setDonationQuantity("");
      setDonationUnit("kg");
      setDescription("");
      setPickupAddress("");
      setExpiryDate("");
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== DONOR - LOAD MY DONATIONS ====================
  async function loadMyDonations() {
    try {
      const response = await fetch(`${API}/donations/my`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not load donations");
        return;
      }

      setDonations(data.donations || data || []);
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== DONOR - CANCEL ====================
  async function cancelDonation(id) {
    try {
      const response = await fetch(
        `${API}/donations/${id}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not cancel donation");
        return;
      }

      alert("Donation cancelled.");

      setDonations((prev) =>
        prev.map((donation) =>
          donation._id === id
            ? {
                ...donation,
                status: "CANCELLED",
              }
            : donation
        )
      );
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
  }

  // ==================== AUTO LOAD DATA ====================
  useEffect(() => {
    if (!token) {
      return;
    }

    if (role === "RECIPIENT") {
      loadMyNeeds();
      loadAvailableDonations();
      loadReservations();
    }

    if (role === "DONOR") {
      loadMyDonations();
    }
  }, [token, role]);

  // ==================== LOGIN SCREEN ====================
  if (!token) {
    return (
      <div className="container">
        <h1>Community Food Rescue</h1>

        <h2>
          {mode === "login"
            ? "Login"
            : "Create Account"}
        </h2>

        <form onSubmit={handleAuth}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button type="submit">
            {mode === "login"
              ? "Login"
              : "Signup"}
          </button>
        </form>

        <button
          onClick={() =>
            setMode(
              mode === "login"
                ? "signup"
                : "login"
            )
          }
        >
          {mode === "login"
            ? "Create new account"
            : "Already have an account? Login"}
        </button>
      </div>
    );
  }

  // ==================== DONOR DASHBOARD ====================
  if (role === "DONOR") {
    return (
      <div className="container">
        <h1>Donor Dashboard</h1>

        <button onClick={logout}>
          Logout
        </button>

        <hr />

        <h2>Create Food Donation</h2>

        <form onSubmit={handleDonationSubmit}>
          <input
            type="text"
            placeholder="Food name"
            value={foodName}
            onChange={(e) =>
              setFoodName(e.target.value)
            }
            required
          />

          <input
            type="number"
            placeholder="Quantity"
            value={donationQuantity}
            onChange={(e) =>
              setDonationQuantity(e.target.value)
            }
            required
            min="1"
          />

          <select
            value={donationUnit}
            onChange={(e) =>
              setDonationUnit(e.target.value)
            }
          >
            <option value="kg">kg</option>
            <option value="litre">litre</option>
            <option value="packets">packets</option>
            <option value="pieces">pieces</option>
          </select>

          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Pickup address"
            value={pickupAddress}
            onChange={(e) =>
              setPickupAddress(e.target.value)
            }
            required
          />

          <label>Expiry date</label>

          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) =>
              setExpiryDate(e.target.value)
            }
            required
          />

          <button type="submit">
            Create Donation
          </button>
        </form>

        <hr />

        <h2>My Donations</h2>

        <button onClick={loadMyDonations}>
          Refresh My Donations
        </button>

        {donations.length === 0 ? (
          <p>No donations found.</p>
        ) : (
          donations.map((donation) => (
            <div
              key={donation._id}
              className="card"
            >
              <h3>
                {donation.foodName}
              </h3>

              <p>
                Quantity:{" "}
                {donation.quantity}{" "}
                {donation.unit}
              </p>

              <p>
                Pickup:{" "}
                {donation.pickupAddress}
              </p>

              <p>
                Status:{" "}
                {donation.status}
              </p>

              <p>
                Expiry:{" "}
                {donation.expiryDate
                  ? new Date(
                      donation.expiryDate
                    ).toLocaleString()
                  : "N/A"}
              </p>

              {donation.status ===
                "AVAILABLE" && (
                <button
                  onClick={() =>
                    cancelDonation(
                      donation._id
                    )
                  }
                >
                  Cancel Donation
                </button>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // ==================== RECIPIENT DASHBOARD ====================
  return (
    <div className="container">
      <h1>Recipient Dashboard</h1>

      <button onClick={logout}>
        Logout
      </button>

      <hr />

      <h2>Create Food Need</h2>

      <form onSubmit={handleNeedSubmit}>
        <input
          type="text"
          placeholder="Food type"
          value={foodType}
          onChange={(e) =>
            setFoodType(e.target.value)
          }
          required
        />

        <input
          type="number"
          placeholder="Quantity"
          value={needQuantity}
          onChange={(e) =>
            setNeedQuantity(e.target.value)
          }
          required
          min="1"
        />

        <select
          value={needUnit}
          onChange={(e) =>
            setNeedUnit(e.target.value)
          }
        >
          <option value="kg">kg</option>
          <option value="litre">litre</option>
          <option value="packets">packets</option>
          <option value="pieces">pieces</option>
        </select>

        <input
          type="text"
          placeholder="Pickup zone"
          value={pickupZone}
          onChange={(e) =>
            setPickupZone(e.target.value)
          }
          required
        />

        <label>Pickup start</label>

        <input
          type="datetime-local"
          value={pickupStart}
          onChange={(e) =>
            setPickupStart(e.target.value)
          }
          required
        />

        <label>Pickup end</label>

        <input
          type="datetime-local"
          value={pickupEnd}
          onChange={(e) =>
            setPickupEnd(e.target.value)
          }
          required
        />

        <input
          type="text"
          placeholder="Allergens (optional)"
          value={allergens}
          onChange={(e) =>
            setAllergens(e.target.value)
          }
        />

        <button type="submit">
          Create Food Need
        </button>
      </form>

      <hr />
      

      <h2>My Food Needs</h2>

      {planError && (
        <p role="alert" className="error-message">
          {planError}
        </p>
      )}

      {needs.length === 0 ? (
        <p>No food needs found.</p>
      ) : (
        needs.map((need) => (
          <div key={need._id} className="card">
            <h3>{need.foodType}</h3>

            <p>
              Quantity: {need.quantity} {need.unit}
            </p>

            <p>Pickup zone: {need.pickupZone}</p>
            <p>Status: {need.status}</p>

            <button
              type="button"
              onClick={() => generatePlan(need._id)}
              disabled={loadingPlanId === need._id}
            >
              {loadingPlanId === need._id
                ? "Generating proposal..."
                : "Generate Collection Plan"}
            </button>

            {collectionPlans[need._id] && (
              <div className="card">
                <h3>Proposed Pickup Plan</h3>

                <p>
                  Requested:{" "}
                  {collectionPlans[need._id].requestedQuantity}{" "}
                  {collectionPlans[need._id].requestedUnit}
                </p>

                <p>
                  Coordinator review required:{" "}
                  {collectionPlans[need._id]
                    .requiresCoordinatorReview
                    ? "Yes"
                    : "No"}
                </p>

                <p>
                  Inventory changed:{" "}
                  {collectionPlans[need._id].inventoryChanged
                    ? "Yes"
                    : "No"}
                </p>

                <p>{collectionPlans[need._id].message}</p>

                <h4>Suggested Donations</h4>

                {(
                  collectionPlans[need._id].combinedPlan
                    ?.selectedDonations || []
                ).map((donation) => (
                  <div
                    key={String(donation.donationId)}
                    className="card"
                  >
                    <p>
                      <strong>{donation.foodName}</strong>
                    </p>

                    <p>
                      Proposed quantity:{" "}
                      {donation.allocatedQuantity} {donation.unit}
                    </p>

                    <p>Pickup: {donation.pickupAddress}</p>

                    <p>
                      Allergen status: UNKNOWN — verify before
                      approval.
                    </p>

                    <p>{donation.reviewReason}</p>
                  </div>
                ))}

                {collectionPlans[need._id].combinedPlan
                  ?.remainingQuantity > 0 && (
                  <p>
                    Still needed:{" "}
                    {
                      collectionPlans[need._id].combinedPlan
                        .remainingQuantity
                    }{" "}
                    {collectionPlans[need._id].requestedUnit}
                  </p>
                )}

                <p>
                  Travel, donor availability, volunteer capacity,
                  and pickup conflicts must be verified before
                  coordinator approval. This proposal does not
                  reserve food.
                </p>
              </div>
            )}
          </div>
        ))
      )}


      
      <hr />

      <h2>Available Food Donations</h2>

      <button
        onClick={loadAvailableDonations}
      >
        Refresh Available Donations
      </button>

      {availableDonations.length === 0 ? (
        <p>
          No available donations found.
        </p>
      ) : (
        availableDonations.map(
          (donation) => (
            <div
              key={donation._id}
              className="card"
            >
              <h3>
                {donation.foodName}
              </h3>

              <p>
                Quantity:{" "}
                {donation.quantity}{" "}
                {donation.unit}
              </p>

              <p>
                Description:{" "}
                {donation.description ||
                  "No description"}
              </p>

              <p>
                Pickup:{" "}
                {donation.pickupAddress}
              </p>

              <p>
                Expiry:{" "}
                {donation.expiryDate
                  ? new Date(
                      donation.expiryDate
                    ).toLocaleString()
                  : "N/A"}
              </p>

              <p>
                Status:{" "}
                {donation.status}
              </p>

              {donation.status ===
                "AVAILABLE" && (
                <button
                  onClick={() =>
                    reserveDonation(
                      donation._id
                    )
                  }
                >
                  Reserve Food
                </button>
              )}
            </div>
          )
        )
      )}

      <hr />

      <h2>My Reservations</h2>

      <button onClick={loadReservations}>
        Refresh Reservations
      </button>

      {reservations.length === 0 ? (
        <p>
          No reservations found.
        </p>
      ) : (
        reservations.map((reservation) => {
          const reservationFood =
            typeof reservation.surplusLotId === "object" &&
            reservation.surplusLotId !== null
              ? reservation.surplusLotId.foodName
              : availableDonations.find(
                  (donation) =>
                    donation._id ===
                    reservation.surplusLotId
                )?.foodName;

          return (
            <div
              key={reservation._id}
              className="card"
            >
              <h3>
                Reservation
              </h3>

              <p>
                Quantity:{" "}
                {reservation.quantity}
              </p>

              <p>
                Status:{" "}
                {reservation.status}
              </p>

              <p>
                Expires:{" "}
                {reservation.expiresAt
                  ? new Date(
                      reservation.expiresAt
                    ).toLocaleString()
                  : "N/A"}
              </p>

              <p>
                Food:{" "}
                {reservationFood ||
                  reservation.needId?.foodType ||
                  "Food donation"}
              </p>

              {reservation.status ===
                "HELD" && (
                <>
                  <button
                    onClick={() =>
                      confirmReservation(
                        reservation._id
                      )
                    }
                  >
                    Confirm Reservation
                  </button>

                  <button
                    onClick={() =>
                      cancelReservation(
                        reservation._id
                      )
                    }
                  >
                    Cancel Reservation
                  </button>
                </>
              )}

              {reservation.status ===
                "CONFIRMED" && (
                <p>
                  Reservation confirmed.
                </p>
              )}

              {reservation.status ===
                "CANCELLED" && (
                <p>
                  Reservation cancelled.
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default App;