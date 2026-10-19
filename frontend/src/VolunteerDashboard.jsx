import { useState, useEffect } from "react";

function VolunteerDashboard({ token, logout, API = "/api" }) {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedPickupId, setSelectedPickupId] = useState(null);
  const [pickupDetails, setPickupDetails] = useState({});
  const [filter, setFilter] = useState("ALL");

  // ==================== LOAD ASSIGNED PICKUPS ====================
  async function loadPickups() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/pickups`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load pickups");
      }

      setPickups(data.assignments || []);
    } catch (err) {
      console.error("Error loading pickups:", err);
      setError(err.message || "Backend connection failed.");
    } finally {
      setLoading(false);
    }
  }

  // ==================== LOAD SINGLE PICKUP DETAILS ====================
  async function loadPickupDetails(id) {
    if (selectedPickupId === id) {
      // Toggle off if already opened
      setSelectedPickupId(null);
      return;
    }

    setSelectedPickupId(id);

    try {
      const response = await fetch(`${API}/pickups/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not load pickup details");
        return;
      }

      if (data.assignment) {
        setPickupDetails((prev) => ({
          ...prev,
          [id]: data.assignment,
        }));
      }
    } catch (err) {
      console.error("Error loading pickup details:", err);
      alert("Could not load full pickup details.");
    }
  }

  // ==================== UPDATE PICKUP STATUS ====================
  async function updatePickupStatus(id, newStatus) {
    const confirmationText =
      newStatus === "ACCEPTED"
        ? "Do you want to accept this pickup assignment?"
        : newStatus === "PICKED_UP"
        ? "Confirm that you have picked up the food from the donor?"
        : newStatus === "FAILED"
        ? "Are you sure you want to mark this pickup as FAILED?"
        : `Update pickup status to ${newStatus}?`;

    if (!window.confirm(confirmationText)) {
      return;
    }

    setActionLoadingId(id);

    try {
      const response = await fetch(`${API}/pickups/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || `Failed to update status to ${newStatus}`);
        return;
      }

      alert(data.message || `Pickup status updated to ${newStatus}`);

      // Refresh list to sync state
      await loadPickups();

      // If details are open for this item, refresh details as well
      if (selectedPickupId === id) {
        const detailRes = await fetch(`${API}/pickups/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const detailData = await detailRes.json();
        if (detailData.assignment) {
          setPickupDetails((prev) => ({
            ...prev,
            [id]: detailData.assignment,
          }));
        }
      }
    } catch (err) {
      console.error("Error updating pickup status:", err);
      alert("Backend connection failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  useEffect(() => {
    if (token) {
      loadPickups();
    }
  }, [token]);

  // Filter pickups
  const filteredPickups = pickups.filter((item) => {
    if (filter === "ALL") return true;
    return item.status === filter;
  });

  function getStatusBadgeStyle(status) {
    switch (status) {
      case "ASSIGNED":
        return { background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba" };
      case "ACCEPTED":
        return { background: "#cce5ff", color: "#004085", border: "1px solid #b8daff" };
      case "PICKED_UP":
        return { background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" };
      case "FAILED":
        return { background: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" };
      case "CANCELLED":
        return { background: "#e2e3e5", color: "#383d41", border: "1px solid #d6d8db" };
      default:
        return { background: "#e9ecef", color: "#495057", border: "1px solid #ced4da" };
    }
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Volunteer Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <p style={{ color: "#46564d" }}>
        Welcome! Here you can view your assigned food rescue pickups, accept assignments, update pickup status, and view handover/collection instructions.
      </p>

      <div style={{ margin: "16px 0", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={loadPickups} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Pickups"}
        </button>

        <span style={{ marginLeft: "12px", fontWeight: "600" }}>Filter:</span>
        {["ALL", "ASSIGNED", "ACCEPTED", "PICKED_UP", "FAILED", "CANCELLED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              background: filter === f ? "#10563d" : "#e4ebe6",
              color: filter === f ? "#ffffff" : "#24352d",
              border: "1px solid #d4ded7",
            }}
          >
            {f} {f === "ALL" ? `(${pickups.length})` : `(${pickups.filter((p) => p.status === f).length})`}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#f8d7da", color: "#721c24", borderRadius: "8px", margin: "12px 0" }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      <hr />

      <h2>My Assigned Pickups ({filteredPickups.length})</h2>

      {loading && pickups.length === 0 ? (
        <p>Loading assigned pickups...</p>
      ) : filteredPickups.length === 0 ? (
        <p>No pickups found for filter: {filter}.</p>
      ) : (
        filteredPickups.map((assignment) => {
          const isSelected = selectedPickupId === assignment._id;
          const details = pickupDetails[assignment._id] || assignment;
          const reservation = details.reservationId || assignment.reservationId || {};
          const surplusLot = reservation.surplusLotId || {};
          const need = reservation.needId || {};
          const isActionLoading = actionLoadingId === assignment._id;

          const foodTitle = surplusLot.foodName || need.foodType || "Food Item";
          const quantity = reservation.quantity || surplusLot.quantity || "N/A";
          const unit = surplusLot.unit || need.unit || "portions";
          const pickupAddress = surplusLot.pickupAddress || "Address provided upon assignment";
          const pickupWindow = assignment.pickupWindow || "Not specified";
          const zone = assignment.zone || need.pickupZone || "Not specified";

          return (
            <div key={assignment._id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0" }}>{foodTitle}</h3>
                  <small style={{ color: "#7a8a80" }}>Assignment ID: {assignment._id}</small>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    ...getStatusBadgeStyle(assignment.status),
                  }}
                >
                  {assignment.status}
                </span>
              </div>

              <div style={{ marginTop: "12px" }}>
                <p>
                  <strong>Reserved Quantity:</strong> {quantity} {unit}
                </p>
                <p>
                  <strong>Pickup Address (Donor):</strong> {pickupAddress}
                </p>
                <p>
                  <strong>Pickup Window:</strong> {pickupWindow}
                </p>
                <p>
                  <strong>Delivery / Target Zone:</strong> {zone}
                </p>
                <p>
                  <strong>Reservation Status:</strong>{" "}
                  <span style={{ fontWeight: "600", color: reservation.status === "COLLECTED" ? "#155724" : "#176b4d" }}>
                    {reservation.status || "CONFIRMED"}
                  </span>
                  {reservation.status === "COLLECTED" && " (Recipient Collection Confirmed)"}
                </p>
              </div>

              {/* ACTION BUTTONS BASED ON BACKEND STATE MACHINE */}
              <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {assignment.status === "ASSIGNED" && (
                  <>
                    <button
                      onClick={() => updatePickupStatus(assignment._id, "ACCEPTED")}
                      disabled={isActionLoading}
                      style={{ background: "#176b4d" }}
                    >
                      {isActionLoading ? "Processing..." : "Accept Pickup"}
                    </button>
                    <button
                      onClick={() => updatePickupStatus(assignment._id, "FAILED")}
                      disabled={isActionLoading}
                      style={{ background: "#c82333" }}
                    >
                      {isActionLoading ? "Processing..." : "Mark as Failed"}
                    </button>
                  </>
                )}

                {assignment.status === "ACCEPTED" && (
                  <>
                    <button
                      onClick={() => updatePickupStatus(assignment._id, "PICKED_UP")}
                      disabled={isActionLoading}
                      style={{ background: "#28a745" }}
                    >
                      {isActionLoading ? "Processing..." : "Confirm Picked Up from Donor"}
                    </button>
                    <button
                      onClick={() => updatePickupStatus(assignment._id, "FAILED")}
                      disabled={isActionLoading}
                      style={{ background: "#c82333" }}
                    >
                      {isActionLoading ? "Processing..." : "Mark as Failed"}
                    </button>
                  </>
                )}

                {assignment.status === "PICKED_UP" && (
                  <p style={{ color: "#155724", fontWeight: "600", margin: "4px 0" }}>
                    Food picked up from donor. In transit for handover / recipient collection.
                  </p>
                )}

                {assignment.status === "FAILED" && (
                  <p style={{ color: "#721c24", fontWeight: "600", margin: "4px 0" }}>
                    Pickup marked as FAILED.
                  </p>
                )}

                {assignment.status === "CANCELLED" && (
                  <p style={{ color: "#6c757d", fontWeight: "600", margin: "4px 0" }}>
                    Assignment cancelled by coordinator.
                  </p>
                )}

                <button
                  onClick={() => loadPickupDetails(assignment._id)}
                  style={{
                    background: "#e4ebe6",
                    color: "#24352d",
                    border: "1px solid #d4ded7",
                  }}
                >
                  {isSelected ? "Hide Handover Details" : "View Handover & Collection Info"}
                </button>
              </div>

              {/* HANDOVER & COLLECTION INFORMATION ACCORDION / DETAILS */}
              {isSelected && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    backgroundColor: "#f9fbf9",
                    border: "1px solid #dbe6de",
                    borderRadius: "8px",
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0", color: "#176b4d" }}>
                    Handover & Collection Details
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {/* Donor Handover Section */}
                    <div style={{ background: "#ffffff", padding: "12px", borderRadius: "6px", border: "1px solid #e1e9e3" }}>
                      <strong style={{ color: "#176b4d", display: "block", marginBottom: "8px" }}>
                        1. Donor Handover (Pickup Point)
                      </strong>
                      <p style={{ margin: "4px 0" }}><strong>Food Item:</strong> {surplusLot.foodName || "N/A"}</p>
                      <p style={{ margin: "4px 0" }}><strong>Quantity:</strong> {quantity} {unit}</p>
                      <p style={{ margin: "4px 0" }}><strong>Pickup Address:</strong> {surplusLot.pickupAddress || "N/A"}</p>
                      <p style={{ margin: "4px 0" }}><strong>Description:</strong> {surplusLot.description || "None provided"}</p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Expiry Date:</strong>{" "}
                        {surplusLot.expiryDate ? new Date(surplusLot.expiryDate).toLocaleString() : "N/A"}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Volunteer Pickup Status:</strong>{" "}
                        {assignment.status === "PICKED_UP"
                          ? "Completed (Food in volunteer possession)"
                          : assignment.status === "ACCEPTED"
                          ? "Accepted - Volunteer traveling to donor"
                          : assignment.status}
                      </p>
                    </div>

                    {/* Recipient Collection Section */}
                    <div style={{ background: "#ffffff", padding: "12px", borderRadius: "6px", border: "1px solid #e1e9e3" }}>
                      <strong style={{ color: "#176b4d", display: "block", marginBottom: "8px" }}>
                        2. Recipient Collection (Drop-off Point)
                      </strong>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Recipient Contact/Org:</strong>{" "}
                        {details.recipientOrganizationId?.name || reservation.createdBy?.name || "Recipient Organization"}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Destination Zone:</strong> {zone}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Need Food Type:</strong> {need.foodType || "N/A"}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Recipient Window:</strong>{" "}
                        {need.pickupStart ? new Date(need.pickupStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}{" "}
                        - {need.pickupEnd ? new Date(need.pickupEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Final Collection Status:</strong>{" "}
                        {reservation.status === "COLLECTED" ? (
                          <span style={{ color: "#155724", fontWeight: "bold" }}>Confirmed by Recipient</span>
                        ) : (
                          <span style={{ color: "#856404" }}>Pending Recipient Confirmation</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Audit & Timestamps */}
                  <div style={{ marginTop: "12px", fontSize: "13px", color: "#607267", borderTop: "1px solid #e1e9e3", paddingTop: "8px" }}>
                    <p style={{ margin: "3px 0" }}>
                      <strong>Assigned At:</strong> {assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : "N/A"}
                      {assignment.assignedBy?.name && ` by ${assignment.assignedBy.name}`}
                    </p>
                    <p style={{ margin: "3px 0" }}>
                      <strong>Accepted At:</strong> {assignment.acceptedAt ? new Date(assignment.acceptedAt).toLocaleString() : "Pending"}
                    </p>
                    <p style={{ margin: "3px 0" }}>
                      <strong>Completed At:</strong> {assignment.completedAt ? new Date(assignment.completedAt).toLocaleString() : "Pending"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default VolunteerDashboard;
