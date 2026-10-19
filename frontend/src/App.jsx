import { useState, useEffect, useEffectEvent } from "react";
import "./App.css";

const API = "/api";

function App() {
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
  const [matchingByNeed, setMatchingByNeed] = useState({});
  const [matchingErrors, setMatchingErrors] = useState({});
  const [matchingLoadingId, setMatchingLoadingId] = useState(null);

  // ==================== DONOR ====================
  const [donations, setDonations] = useState([]);
  const [foodName, setFoodName] = useState("");
  const [donationQuantity, setDonationQuantity] = useState("");
  const [donationUnit, setDonationUnit] = useState("kg");
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [donorPickupStart, setDonorPickupStart] = useState("");
  const [donorPickupEnd, setDonorPickupEnd] = useState("");
  const [donorAllergenInfoStatus, setDonorAllergenInfoStatus] = useState("UNKNOWN");
  const [donorAllergens, setDonorAllergens] = useState("");

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
          allergenRequirements: allergens
            .split(",")
            .map((allergen) => allergen.trim())
            .filter(Boolean),
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
  // Cancel an active food need
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
  async function cancelNeed(id) {
    if (!window.confirm("Are you sure you want to cancel this food need?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/needs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not cancel food need");
        return;
      }

      alert("Food need cancelled successfully.");
      await loadMyNeeds();
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

  // Matching returns proposals only. Reservation is a separate, explicit user action.
  async function findMatches(needId) {
    setMatchingLoadingId(needId);
    setMatchingErrors((previous) => ({ ...previous, [needId]: "" }));

    try {
      const response = await fetch(`${API}/matching/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ needId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMatchingErrors((previous) => ({
          ...previous,
          [needId]: data.message || "Could not find compatible donations.",
        }));
        return;
      }

      setMatchingByNeed((previous) => ({ ...previous, [needId]: data.data }));
    } catch (error) {
      console.error(error);
      setMatchingErrors((previous) => ({
        ...previous,
        [needId]: "Backend connection failed while searching for matches.",
      }));
    } finally {
      setMatchingLoadingId(null);
    }
  }

  async function reserveMatchingProposal(need, proposal) {
    const approved = window.confirm(
      `Create a reservation for ${proposal.quantity} ${proposal.unit} of ${proposal.foodName}? The server will recheck availability.`
    );
    if (!approved) return;

    try {
      const response = await fetch(
        `${API}/surplus/${proposal.donationId}/reservations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ needId: need._id, quantity: proposal.quantity }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "The proposal could not be reserved. Availability may have changed.");
        return;
      }

      alert("Reservation created. Review and confirm it in My Reservations.");
      setMatchingByNeed((previous) => {
        const next = { ...previous };
        delete next[need._id];
        return next;
      });
      await loadMyNeeds();
      await loadAvailableDonations();
      await loadReservations();
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

    if (!donorPickupStart || !donorPickupEnd) {
      alert("Please provide the pickup window.");
      return;
    }

    if (
      new Date(donorPickupStart) <= new Date() ||
      new Date(donorPickupEnd) <= new Date(donorPickupStart)
    ) {
      alert("Pickup window must be in the future and end after it starts.");
      return;
    }

    const allergenList = donorAllergens
      .split(",")
      .map((allergen) => allergen.trim())
      .filter(Boolean);

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
          pickupStart: donorPickupStart,
          pickupEnd: donorPickupEnd,
          allergenInfoStatus: donorAllergenInfoStatus,
          allergens: donorAllergenInfoStatus === "KNOWN" ? allergenList : [],
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
      setDonorPickupStart("");
      setDonorPickupEnd("");
      setDonorAllergenInfoStatus("UNKNOWN");
      setDonorAllergens("");
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

  // This Effect Event reads the latest token and role while keeping the loaders
  // outside the effect's reactive dependency list.
  const loadDashboardData = useEffectEvent(() => {
    if (role === "RECIPIENT") {
      void loadMyNeeds();
      void loadAvailableDonations();
      void loadReservations();
    }

    if (role === "DONOR") {
      void loadMyDonations();
    }
  });

  // ==================== AUTO LOAD DATA ====================
  useEffect(() => {
    if (!token) return;

    let active = true;
    void Promise.resolve().then(() => {
      if (active) loadDashboardData();
    });

    return () => {
      active = false;
    };
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

          <label>Pickup window starts</label>
          <input
            type="datetime-local"
            value={donorPickupStart}
            onChange={(e) => setDonorPickupStart(e.target.value)}
            required
          />

          <label>Pickup window ends</label>
          <input
            type="datetime-local"
            value={donorPickupEnd}
            onChange={(e) => setDonorPickupEnd(e.target.value)}
            required
          />

          <label>Allergen information</label>
          <select
            value={donorAllergenInfoStatus}
            onChange={(e) => setDonorAllergenInfoStatus(e.target.value)}
          >
            <option value="UNKNOWN">Unknown</option>
            <option value="KNOWN">Known</option>
          </select>

          <input
            type="text"
            placeholder="Allergens, comma-separated (leave blank if none)"
            value={donorAllergens}
            onChange={(e) => setDonorAllergens(e.target.value)}
            disabled={donorAllergenInfoStatus !== "KNOWN"}
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

     

            {needs.length === 0 ? (
        <p>No food needs found.</p>
      ) : (
        needs.map((need) => (
          <div key={need._id} className="card">
            <h3>{need.foodType}</h3>
            <p>Quantity: {need.quantity} {need.unit}</p>
            <p>Pickup zone: {need.pickupZone}</p>
            <p>Status: {need.status}</p>

            {need.status === "ACTIVE" && (
              <>
                <button onClick={() => cancelNeed(need._id)}>
                  Cancel Need
                </button>
                <button
                  onClick={() => findMatches(need._id)}
                  disabled={matchingLoadingId === need._id}
                >
                  {matchingLoadingId === need._id ? "Searching..." : "Find compatible donations"}
                </button>
              </>
            )}

            {matchingErrors[need._id] && (
              <p role="alert" className="matching-error">{matchingErrors[need._id]}</p>
            )}

            {matchingByNeed[need._id] && (
              <section className="matching-results" aria-label="Matching proposals">
                <h3>Suggested matches for coordinator review</h3>
                <p>
                  Proposed: {matchingByNeed[need._id].proposedQuantity} {need.unit} of {need.quantity} {need.unit}.
                  {matchingByNeed[need._id].fullyMatched
                    ? " The need is fully covered by these proposals."
                    : ` ${matchingByNeed[need._id].remainingQuantity} ${need.unit} remains unmatched.`}
                </p>
                <p>These are proposals only. No food is reserved until you review and explicitly select a proposal.</p>

                {matchingByNeed[need._id].proposals.length === 0 ? (
                  <p>No compatible proposals were found.</p>
                ) : matchingByNeed[need._id].proposals.map((proposal) => (
                  <article className="match-proposal" key={proposal.donationId}>
                    <h4>{proposal.foodName}</h4>
                    <p><strong>Proposed quantity:</strong> {proposal.quantity} {proposal.unit}</p>
                    <p><strong>Pickup location:</strong> {proposal.pickupAddress}</p>
                    <p>
                      <strong>Pickup window:</strong>{" "}
                      {new Date(proposal.pickupStart).toLocaleString()} – {new Date(proposal.pickupEnd).toLocaleString()}
                    </p>
                    <p><strong>Expiry:</strong> {new Date(proposal.expiryDate).toLocaleString()}</p>
                    <p>Passed availability, quantity, unit, allergen, and pickup-window checks at search time.</p>
                    <button onClick={() => reserveMatchingProposal(need, proposal)}>
                      Review and reserve this proposal
                    </button>
                  </article>
                ))}

                {matchingByNeed[need._id].rejected.length > 0 && (
                  <div className="matching-rejections">
                    <h4>Flagged or incompatible listings</h4>
                    {matchingByNeed[need._id].rejected.map((candidate) => (
                      <p key={candidate.donationId}>
                        Listing {candidate.donationId}: {candidate.reasons.map((reason) => reason.replaceAll("_", " ")).join(", ")}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ))
      )}

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