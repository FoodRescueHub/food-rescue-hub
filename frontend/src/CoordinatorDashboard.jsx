import { useState, useEffect } from "react";

function CoordinatorDashboard({ token, logout, API = "/api" }) {
  const [activeTab, setActiveTab] = useState("organizations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==================== STATE ====================
  // 1. Organizations
  const [organizations, setOrganizations] = useState([]);
  const [orgFilter, setOrgFilter] = useState("ALL");

  // 2. Reservations
  const [reservations, setReservations] = useState([]);
  const [reservationFilter, setReservationFilter] = useState("ALL");

  // 3. Pickups
  const [pickups, setPickups] = useState([]);
  const [pickupFilter, setPickupFilter] = useState("ALL");

  // 4. Policies
  const [policies, setPolicies] = useState([]);
  const [policyFilter, setPolicyFilter] = useState("ALL");
  const [newTitle, setNewTitle] = useState("");
  const [newVersion, setNewVersion] = useState("1.0");
  const [newContent, setNewContent] = useState("");
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);

  // ==================== API LOADERS ====================
  async function loadOrganizations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/coordinator/organizations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load organizations");
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load organizations.");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrgVerification(id, newStatus) {
    let payload = { verificationStatus: newStatus };

    if (newStatus === "REJECTED") {
      const reason = window.prompt(
        "Please enter a reason for rejecting this organization:"
      );
      if (!reason || !reason.trim()) {
        alert("Rejection cancelled: a reason is required to reject an organization.");
        return;
      }
      payload.reason = reason.trim();
      payload.action = "REJECT_ORGANIZATION";
    } else if (newStatus === "SUSPENDED") {
      const reason = window.prompt(
        "Please enter a reason for suspending this organization:"
      );
      if (!reason || !reason.trim()) {
        alert("Suspension cancelled: a non-empty reason is required to suspend an organization.");
        return;
      }
      payload.reason = reason.trim();
      payload.action = "SUSPEND_ORGANIZATION";
    } else {
      if (!window.confirm(`Set organization verification status to ${newStatus}?`)) {
        return;
      }
    }

    try {
      const res = await fetch(`${API}/organizations/${id}/verification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update verification status");
      alert(data.message || "Verification status updated!");
      await loadOrganizations();
    } catch (err) {
      console.error(err);
      alert(err.message || "Update failed.");
    }
  }

  async function loadReservations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/coordinator/reservations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load reservations");
      setReservations(data.reservations || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load reservations.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPickups() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/pickups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load pickups");
      setPickups(data.assignments || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load pickups.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPolicies() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/policies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load policies");
      setPolicies(data.policies || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load policies.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePolicy(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newVersion.trim() || !newContent.trim()) {
      alert("Please fill in all policy fields.");
      return;
    }

    try {
      const res = await fetch(`${API}/policies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          version: newVersion.trim(),
          content: newContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create policy");
      alert("Policy draft created successfully!");
      setNewTitle("");
      setNewContent("");
      setShowCreatePolicy(false);
      await loadPolicies();
    } catch (err) {
      console.error(err);
      alert(err.message || "Policy creation failed.");
    }
  }

  async function approvePolicy(id) {
    if (!window.confirm("Are you sure you want to approve this policy for system/RAG use?")) return;

    try {
      const res = await fetch(`${API}/policies/${id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not approve policy");
      alert("Policy approved successfully!");
      await loadPolicies();
    } catch (err) {
      console.error(err);
      alert(err.message || "Policy approval failed.");
    }
  }

  // Auto load when tab changes
  useEffect(() => {
    if (!token) return;
    if (activeTab === "organizations") loadOrganizations();
    else if (activeTab === "reservations") loadReservations();
    else if (activeTab === "pickups") loadPickups();
    else if (activeTab === "policies") loadPolicies();
  }, [activeTab, token]);

  // Badge styles
  function getBadgeStyle(status) {
    switch (status) {
      case "APPROVED":
      case "COLLECTED":
        return { background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" };
      case "PENDING":
      case "ASSIGNED":
      case "HELD":
      case "DRAFT":
        return { background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba" };
      case "ACCEPTED":
      case "CONFIRMED":
        return { background: "#cce5ff", color: "#004085", border: "1px solid #b8daff" };
      case "PICKED_UP":
        return { background: "#d1ecf1", color: "#0c5460", border: "1px solid #bee5eb" };
      case "FAILED":
      case "REJECTED":
      case "SUSPENDED":
        return { background: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" };
      case "CANCELLED":
      case "EXPIRED":
      case "ARCHIVED":
        return { background: "#e2e3e5", color: "#383d41", border: "1px solid #d6d8db" };
      default:
        return { background: "#e9ecef", color: "#495057", border: "1px solid #ced4da" };
    }
  }

  // Filtered views
  const filteredOrgs = organizations.filter(
    (o) => orgFilter === "ALL" || o.verificationStatus === orgFilter
  );

  const filteredReservations = reservations.filter(
    (r) => reservationFilter === "ALL" || r.status === reservationFilter
  );

  const filteredPickups = pickups.filter(
    (p) => pickupFilter === "ALL" || p.status === pickupFilter
  );

  const filteredPolicies = policies.filter(
    (p) => policyFilter === "ALL" || p.status === policyFilter
  );

  return (
    <div className="container">
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1>Coordinator Dashboard</h1>
          <span style={{ fontSize: "14px", color: "#46564d" }}>
            Operational Management: Organizations, Reservations, Volunteer Pickups, and Policies
          </span>
        </div>
        <button onClick={logout}>Logout</button>
      </div>

      <hr />

      {/* NAVIGATION TABS */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {[
          { key: "organizations", label: "Organizations & Verification" },
          { key: "reservations", label: "All Reservations" },
          { key: "pickups", label: "Volunteer Pickups" },
          { key: "policies", label: "Handling Policies" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px",
              background: activeTab === tab.key ? "#176b4d" : "#e4ebe6",
              color: activeTab === tab.key ? "#ffffff" : "#24352d",
              border: "1px solid #d4ded7",
              fontWeight: "600",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#f8d7da", color: "#721c24", borderRadius: "8px", margin: "12px 0" }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      {/* ==================== TAB 1: ORGANIZATIONS ==================== */}
      {activeTab === "organizations" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h2>Organizations ({filteredOrgs.length})</h2>
            <button onClick={loadOrganizations} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div style={{ margin: "12px 0", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "600", fontSize: "14px" }}>Filter Status:</span>
            {["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((f) => (
              <button
                key={f}
                onClick={() => setOrgFilter(f)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  background: orgFilter === f ? "#10563d" : "#e4ebe6",
                  color: orgFilter === f ? "#ffffff" : "#24352d",
                  border: "1px solid #d4ded7",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredOrgs.length === 0 ? (
            <p>No organizations found.</p>
          ) : (
            filteredOrgs.map((org) => (
              <div key={org._id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{org.name}</h3>
                    <small style={{ color: "#7a8a80" }}>Type: {org.type} | ID: {org._id}</small>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "bold",
                      ...getBadgeStyle(org.verificationStatus),
                    }}
                  >
                    {org.verificationStatus}
                  </span>
                </div>

                <div style={{ marginTop: "10px" }}>
                  <p><strong>Address:</strong> {org.address || "None specified"}</p>
                  <p><strong>Registered:</strong> {new Date(org.createdAt).toLocaleDateString()}</p>
                  {org.verificationStatus === "REJECTED" && org.rejectionAudit && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", background: "#f8d7da", color: "#721c24", borderRadius: "6px", fontSize: "13px" }}>
                      <strong>Rejection Reason:</strong> {org.rejectionAudit.reason}
                      <div style={{ marginTop: "3px", fontSize: "12px", color: "#842029" }}>
                        Logged by: {org.rejectionAudit.coordinatorId?.name || org.rejectionAudit.coordinatorId?.email || "Coordinator"} on {new Date(org.rejectionAudit.timestamp || org.rejectionAudit.createdAt).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {org.verificationStatus === "SUSPENDED" && (org.suspensionAudit || org.suspensionReason) && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", background: "#fff3cd", color: "#856404", borderRadius: "6px", fontSize: "13px", border: "1px solid #ffeeba" }}>
                      <strong>Suspension Reason:</strong> {org.suspensionAudit?.reason || org.suspensionReason}
                      <div style={{ marginTop: "3px", fontSize: "12px", color: "#664d03" }}>
                        Logged by: {org.suspensionAudit?.coordinatorId?.name || org.suspensionAudit?.coordinatorId?.email || "Coordinator"} on {new Date(org.suspensionAudit?.timestamp || org.suspensionTimestamp || org.suspensionAudit?.createdAt || org.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {org.verificationStatus !== "APPROVED" && (
                    <button
                      onClick={() => updateOrgVerification(org._id, "APPROVED")}
                      style={{ background: "#28a745" }}
                    >
                      Approve Organization
                    </button>
                  )}
                  {org.verificationStatus !== "REJECTED" && (
                    <button
                      onClick={() => updateOrgVerification(org._id, "REJECTED")}
                      style={{ background: "#c82333" }}
                    >
                      Reject Organization
                    </button>
                  )}
                  {org.verificationStatus !== "SUSPENDED" && (
                    <button
                      onClick={() => updateOrgVerification(org._id, "SUSPENDED")}
                      style={{ background: "#6c757d", color: "#ffffff" }}
                    >
                      Suspend Organization
                    </button>
                  )}
                  {org.verificationStatus !== "PENDING" && (
                    <button
                      onClick={() => updateOrgVerification(org._id, "PENDING")}
                      style={{ background: "#ffc107", color: "#24352d" }}
                    >
                      Set Pending
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================== TAB 2: RESERVATIONS ==================== */}
      {activeTab === "reservations" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h2>All Reservations ({filteredReservations.length})</h2>
            <button onClick={loadReservations} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div style={{ margin: "12px 0", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "600", fontSize: "14px" }}>Filter:</span>
            {["ALL", "HELD", "CONFIRMED", "COLLECTED", "CANCELLED", "EXPIRED"].map((f) => (
              <button
                key={f}
                onClick={() => setReservationFilter(f)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  background: reservationFilter === f ? "#10563d" : "#e4ebe6",
                  color: reservationFilter === f ? "#ffffff" : "#24352d",
                  border: "1px solid #d4ded7",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredReservations.length === 0 ? (
            <p>No reservations found.</p>
          ) : (
            filteredReservations.map((r) => {
              const surplus = r.surplusLotId || {};
              const recipient = r.recipientOrganizationId || r.createdBy || {};
              return (
                <div key={r._id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0" }}>{surplus.foodName || "Food Reservation"}</h3>
                      <small style={{ color: "#7a8a80" }}>Reservation ID: {r._id}</small>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        ...getBadgeStyle(r.status),
                      }}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <p><strong>Quantity:</strong> {r.quantity} {surplus.unit || ""}</p>
                    <p><strong>Pickup Address:</strong> {surplus.pickupAddress || "N/A"}</p>
                    <p><strong>Recipient Org / User:</strong> {recipient.name || recipient.email || "Recipient"}</p>
                    <p><strong>Expires At:</strong> {r.expiresAt ? new Date(r.expiresAt).toLocaleString() : "N/A"}</p>
                    {r.confirmedAt && <p><strong>Confirmed At:</strong> {new Date(r.confirmedAt).toLocaleString()}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================== TAB 3: VOLUNTEER PICKUPS ==================== */}
      {activeTab === "pickups" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h2>Volunteer Pickups ({filteredPickups.length})</h2>
            <button onClick={loadPickups} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div style={{ margin: "12px 0", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "600", fontSize: "14px" }}>Filter:</span>
            {["ALL", "ASSIGNED", "ACCEPTED", "PICKED_UP", "FAILED", "CANCELLED"].map((f) => (
              <button
                key={f}
                onClick={() => setPickupFilter(f)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  background:
                    pickupFilter === f
                      ? f === "FAILED"
                        ? "#c82333"
                        : "#10563d"
                      : "#e4ebe6",
                  color: pickupFilter === f ? "#ffffff" : "#24352d",
                  border: "1px solid #d4ded7",
                  fontWeight: f === "FAILED" ? "bold" : "normal",
                }}
              >
                {f} {f === "FAILED" && `(${pickups.filter((p) => p.status === "FAILED").length})`}
              </button>
            ))}
          </div>

          {filteredPickups.length === 0 ? (
            <p>No volunteer pickups found for filter: {pickupFilter}.</p>
          ) : (
            filteredPickups.map((p) => {
              const res = p.reservationId || {};
              const surplus = res.surplusLotId || {};
              const need = res.needId || {};
              const volunteer = p.volunteerId || {};

              return (
                <div
                  key={p._id}
                  className="card"
                  style={{
                    borderLeft: p.status === "FAILED" ? "5px solid #dc3545" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0" }}>{surplus.foodName || need.foodType || "Pickup Task"}</h3>
                      <small style={{ color: "#7a8a80" }}>Assignment ID: {p._id}</small>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        ...getBadgeStyle(p.status),
                      }}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <p><strong>Assigned Volunteer:</strong> {volunteer.name || "N/A"} ({volunteer.email || "N/A"})</p>
                    <p><strong>Quantity:</strong> {res.quantity || surplus.quantity || "N/A"} {surplus.unit || ""}</p>
                    <p><strong>Donor Pickup Location:</strong> {surplus.pickupAddress || "N/A"}</p>
                    <p><strong>Pickup Window:</strong> {p.pickupWindow || "N/A"}</p>
                    <p><strong>Zone:</strong> {p.zone || need.pickupZone || "N/A"}</p>
                    <p><strong>Reservation Status:</strong> {res.status || "CONFIRMED"}</p>
                    {p.acceptedAt && <p><strong>Accepted At:</strong> {new Date(p.acceptedAt).toLocaleString()}</p>}
                    {p.completedAt && <p><strong>Completed At:</strong> {new Date(p.completedAt).toLocaleString()}</p>}
                  </div>

                  {p.status === "FAILED" && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", background: "#f8d7da", color: "#721c24", borderRadius: "6px", fontSize: "14px" }}>
                      ⚠️ <strong>Attention:</strong> This pickup was reported as FAILED by the volunteer. Reassignment or surplus review may be required.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================== TAB 4: HANDLING POLICIES ==================== */}
      {activeTab === "policies" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h2>Handling Policies ({filteredPolicies.length})</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowCreatePolicy(!showCreatePolicy)}>
                {showCreatePolicy ? "Cancel" : "+ Create Policy Draft"}
              </button>
              <button onClick={loadPolicies} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* CREATE POLICY FORM */}
          {showCreatePolicy && (
            <div style={{ margin: "16px 0", padding: "16px", background: "#ffffff", border: "1px solid #d4ded7", borderRadius: "8px" }}>
              <h3 style={{ margin: "0 0 12px 0" }}>Create New Handling Policy Draft</h3>
              <form onSubmit={handleCreatePolicy} style={{ padding: 0, border: "none", boxShadow: "none" }}>
                <label>Policy Title</label>
                <input
                  type="text"
                  placeholder="e.g. Prepared Food Transport and Hygiene Standard"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />

                <label>Version</label>
                <input
                  type="text"
                  placeholder="1.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  required
                />

                <label>Policy Content / Guidelines</label>
                <textarea
                  rows="5"
                  placeholder="Enter detailed safety, temperature, allergen, and handover rules..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #d4ded7",
                    marginBottom: "12px",
                    font: "inherit",
                  }}
                  required
                />

                <button type="submit" style={{ background: "#176b4d" }}>
                  Save Policy Draft
                </button>
              </form>
            </div>
          )}

          <div style={{ margin: "12px 0", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "600", fontSize: "14px" }}>Filter:</span>
            {["ALL", "DRAFT", "APPROVED", "ARCHIVED"].map((f) => (
              <button
                key={f}
                onClick={() => setPolicyFilter(f)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  background: policyFilter === f ? "#10563d" : "#e4ebe6",
                  color: policyFilter === f ? "#ffffff" : "#24352d",
                  border: "1px solid #d4ded7",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredPolicies.length === 0 ? (
            <p>No handling policies found for filter: {policyFilter}.</p>
          ) : (
            filteredPolicies.map((pol) => {
              const createdBy = pol.createdBy || {};
              const approvedBy = pol.approvedBy || {};
              return (
                <div key={pol._id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0" }}>{pol.title} (v{pol.version})</h3>
                      <small style={{ color: "#7a8a80" }}>Policy ID: {pol._id}</small>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        ...getBadgeStyle(pol.status),
                      }}
                    >
                      {pol.status}
                    </span>
                  </div>

                  <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", background: "#f8f9fa", padding: "12px", borderRadius: "6px", fontSize: "14px", border: "1px solid #e9ecef" }}>
                    {pol.content}
                  </div>

                  <div style={{ marginTop: "10px", fontSize: "13px", color: "#607267" }}>
                    <p style={{ margin: "3px 0" }}>
                      <strong>Created By:</strong> {createdBy.name || createdBy.email || "Coordinator"} on {new Date(pol.createdAt).toLocaleDateString()}
                    </p>
                    {pol.status === "APPROVED" && (
                      <p style={{ margin: "3px 0", color: "#155724" }}>
                        <strong>Approved By:</strong> {approvedBy.name || approvedBy.email || "Coordinator"} on {new Date(pol.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {pol.status === "DRAFT" && (
                    <div style={{ marginTop: "12px" }}>
                      <button
                        onClick={() => approvePolicy(pol._id)}
                        style={{ background: "#28a745" }}
                      >
                        Approve Policy for RAG
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CoordinatorDashboard;
