/**
 * OrganizationDashboard
 *
 * Shown after the user is linked to an organization.
 * Tabs: Profile | Members | Verification
 *
 * Props:
 *   token        – JWT bearer token
 *   orgId        – organization ObjectId string
 *   memberRole   – "ADMIN" | "MEMBER" | "VIEWER"  (caller's role in this org)
 */

import { useState, useEffect, useCallback } from "react";

const API = "/api";

// ─── tiny helpers ────────────────────────────────────────────────────────────

function statusBadge(status) {
  const colors = {
    PENDING:  { bg: "#fff8e1", color: "#f39c12", border: "#f7d87c" },
    APPROVED: { bg: "#e8f8f0", color: "#176b4d", border: "#a3d9b8" },
    REJECTED: { bg: "#fdecea", color: "#c0392b", border: "#f0b9b8" },
  };
  const s = colors[status] || colors.PENDING;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "12px",
      fontSize: "13px",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

function memberRoleBadge(role) {
  const colors = {
    ADMIN:  "#176b4d",
    MEMBER: "#2980b9",
    VIEWER: "#7f8c8d",
  };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: 600,
      background: colors[role] || "#ccc",
      color: "#fff",
      marginLeft: "6px",
    }}>
      {role}
    </span>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab({ token, orgId, memberRole }) {
  const [org, setOrg]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");

  // editable fields
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Could not load organization."); return; }
      setOrg(data.organization);
      setForm({
        name:          data.organization.name          || "",
        type:          data.organization.type          || "RECIPIENT",
        address:       data.organization.address       || "",
        contactEmail:  data.organization.contactEmail  || "",
        contactPhone:  data.organization.contactPhone  || "",
        description:   data.organization.description   || "",
        operatingHours: data.organization.operatingHours || "",
        servingZonesRaw: (data.organization.servingZones || []).join(", "),
      });
    } catch { setError("Backend connection failed."); }
    finally  { setLoading(false); }
  }, [token, orgId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      const servingZones = form.servingZonesRaw
        .split(",").map((z) => z.trim()).filter(Boolean);
      const body = {
        name: form.name, type: form.type, address: form.address,
        contactEmail: form.contactEmail  || undefined,
        contactPhone: form.contactPhone  || undefined,
        description:  form.description   || undefined,
        operatingHours: form.operatingHours || undefined,
        servingZones: servingZones.length ? servingZones : undefined,
      };
      const res = await fetch(`${API}/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.message || "Could not save changes."); return; }
      setOrg(data.organization);
      setEditing(false);
    } catch { setSaveError("Backend connection failed."); }
    finally  { setSaving(false); }
  }

  function field(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  if (loading) return <p>Loading organization…</p>;
  if (error)   return <p style={{ color: "#c0392b" }}>{error}</p>;
  if (!org)    return null;

  if (editing && memberRole === "ADMIN") {
    return (
      <form onSubmit={handleSave}>
        <h2>Edit Organization Profile</h2>
        {saveError && <p style={{ color: "#c0392b" }}>{saveError}</p>}

        <label>Name *</label>
        <input value={form.name} onChange={field("name")} required minLength={2} maxLength={120} />

        <label>Type</label>
        <select value={form.type} onChange={field("type")}>
          <option value="RECIPIENT">Recipient</option>
          <option value="DONOR">Donor</option>
          <option value="BOTH">Both</option>
        </select>

        <label>Address</label>
        <input value={form.address} onChange={field("address")} maxLength={200} />

        <label>Contact email</label>
        <input type="email" value={form.contactEmail} onChange={field("contactEmail")} maxLength={254} />

        <label>Contact phone</label>
        <input type="tel" value={form.contactPhone} onChange={field("contactPhone")} maxLength={30} />

        <label>Description</label>
        <input value={form.description} onChange={field("description")} maxLength={1000} />

        <label>Operating hours</label>
        <input value={form.operatingHours} onChange={field("operatingHours")} maxLength={200} />

        <label>Serving zones (comma-separated)</label>
        <input value={form.servingZonesRaw} onChange={field("servingZonesRaw")} />

        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          <button type="button" onClick={() => { setEditing(false); setSaveError(""); }}
            style={{ background: "#6c757d" }}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>{org.name}</h2>
        {memberRole === "ADMIN" && (
          <button onClick={() => setEditing(true)} style={{ padding: "6px 14px", fontSize: "14px" }}>
            Edit
          </button>
        )}
      </div>

      <div className="card">
        <p><strong>Type:</strong> {org.type}</p>
        <p><strong>Address:</strong> {org.address || "—"}</p>
        <p><strong>Contact email:</strong> {org.contactEmail || "—"}</p>
        <p><strong>Contact phone:</strong> {org.contactPhone || "—"}</p>
        <p><strong>Description:</strong> {org.description || "—"}</p>
        <p><strong>Operating hours:</strong> {org.operatingHours || "—"}</p>
        <p><strong>Serving zones:</strong>{" "}
          {org.servingZones && org.servingZones.length
            ? org.servingZones.join(", ")
            : "—"}
        </p>
        <p><strong>Verification status:</strong> {statusBadge(org.verificationStatus)}</p>
      </div>
    </div>
  );
}

// ─── Members tab ─────────────────────────────────────────────────────────────

function MembersTab({ token, orgId, memberRole }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("MEMBER");
  const [inviting, setInviting]       = useState(false);
  const [inviteMsg, setInviteMsg]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/memberships/organizations/${orgId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Could not load members."); return; }
      setMembers(data.members || []);
    } catch { setError("Backend connection failed."); }
    finally  { setLoading(false); }
  }, [token, orgId]);

  useEffect(() => { load(); }, [load]);

  async function handleInvite(e) {
    e.preventDefault();
    setInviteMsg("");
    setInviting(true);
    try {
      const res = await fetch(`${API}/memberships/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteMsg(data.message || "Could not send invitation."); return; }
      setInviteMsg(`Invitation created for ${inviteEmail}.`);
      setInviteEmail("");
      await load();
    } catch { setInviteMsg("Backend connection failed."); }
    finally  { setInviting(false); }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      const res = await fetch(`${API}/memberships/organizations/${orgId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Could not update role."); return; }
      await load();
    } catch { alert("Backend connection failed."); }
  }

  async function handleRemove(userId, userName) {
    if (!window.confirm(`Remove ${userName} from this organization?`)) return;
    try {
      const res = await fetch(`${API}/memberships/organizations/${orgId}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Could not remove member."); return; }
      await load();
    } catch { alert("Backend connection failed."); }
  }

  async function handleAcceptInvite(membershipId) {
    // INVITED → ACTIVE. The admin updates the status on behalf of the user
    // for now; self-serve accept is a future enhancement.
    const userId = members.find((m) => m.membershipId === membershipId)?.user?._id;
    if (!userId) return;
    try {
      const res = await fetch(`${API}/memberships/organizations/${orgId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Could not accept invitation."); return; }
      await load();
    } catch { alert("Backend connection failed."); }
  }

  if (loading) return <p>Loading members…</p>;
  if (error)   return <p style={{ color: "#c0392b" }}>{error}</p>;

  return (
    <div>
      <h2>Members ({members.length})</h2>

      {members.map((m) => (
        <div key={m.membershipId} className="card"
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <strong>{m.user?.name || "Unknown"}</strong>
            {memberRoleBadge(m.role)}
            <p style={{ margin: "4px 0" }}>{m.user?.email}</p>
            <p style={{ margin: "4px 0", fontSize: "13px", color: "#7f8c8d" }}>
              Status: {m.status}
              {m.joinedAt ? ` · Joined ${new Date(m.joinedAt).toLocaleDateString()}` : ""}
            </p>
            {m.invitedBy && (
              <p style={{ margin: "4px 0", fontSize: "12px", color: "#aaa" }}>
                Invited by {m.invitedBy.name}
              </p>
            )}
          </div>

          {memberRole === "ADMIN" && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {m.status === "INVITED" && (
                <button onClick={() => handleAcceptInvite(m.membershipId)}
                  style={{ background: "#2980b9", padding: "6px 12px", fontSize: "13px" }}>
                  Activate
                </button>
              )}
              <select
                value={m.role}
                onChange={(ev) => handleRoleChange(m.user?._id, ev.target.value)}
                style={{ width: "auto", marginBottom: 0, padding: "6px 10px", fontSize: "13px" }}
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button onClick={() => handleRemove(m.user?._id, m.user?.name)}
                style={{ background: "#c0392b", padding: "6px 12px", fontSize: "13px" }}>
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      {memberRole === "ADMIN" && (
        <>
          <hr />
          <h2>Invite a Member</h2>
          {inviteMsg && (
            <p style={{ color: inviteMsg.startsWith("Invitation") ? "#176b4d" : "#c0392b" }}>
              {inviteMsg}
            </p>
          )}
          <form onSubmit={handleInvite}>
            <label>Email address of registered user</label>
            <input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <label>Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button type="submit" disabled={inviting}>
              {inviting ? "Inviting…" : "Send Invitation"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ─── Verification tab ─────────────────────────────────────────────────────────

function VerificationTab({ token, orgId }) {
  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/organizations/${orgId}/verification`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Could not load verification status."); return; }
        setInfo(data);
      } catch { setError("Backend connection failed."); }
      finally  { setLoading(false); }
    })();
  }, [token, orgId]);

  if (loading) return <p>Loading verification status…</p>;
  if (error)   return <p style={{ color: "#c0392b" }}>{error}</p>;
  if (!info)   return null;

  return (
    <div>
      <h2>Verification Status</h2>
      <div className="card">
        <p><strong>Organization:</strong> {info.name}</p>
        <p><strong>Status:</strong> {statusBadge(info.verificationStatus)}</p>

        {info.verificationStatus === "PENDING" && (
          <p style={{ marginTop: "12px", color: "#59675f" }}>
            Your organization is awaiting review by a coordinator. No action is needed from you.
          </p>
        )}

        {info.verificationStatus === "APPROVED" && (
          <p style={{ marginTop: "12px", color: "#176b4d" }}>
            Your organization has been verified and is fully active.
          </p>
        )}

        {info.verificationStatus === "REJECTED" && (
          <>
            <p style={{ marginTop: "12px", color: "#c0392b" }}>
              Your application was not approved.
            </p>
            {info.rejectionReason && (
              <p><strong>Reason:</strong> {info.rejectionReason}</p>
            )}
          </>
        )}

        {info.verificationNotes && (
          <p style={{ marginTop: "8px" }}>
            <strong>Coordinator notes:</strong> {info.verificationNotes}
          </p>
        )}

        {info.verifiedAt && (
          <p style={{ fontSize: "13px", color: "#7f8c8d", marginTop: "8px" }}>
            Reviewed on {new Date(info.verifiedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = ["Profile", "Members", "Verification"];

export default function OrganizationDashboard({ token, orgId, memberRole }) {
  const [tab, setTab] = useState("Profile");

  const tabStyle = (t) => ({
    padding: "8px 18px",
    borderRadius: "8px 8px 0 0",
    border: "1px solid #e1e9e3",
    borderBottom: t === tab ? "1px solid #fff" : "1px solid #e1e9e3",
    background: t === tab ? "#fff" : "#f4f7f5",
    color: t === tab ? "#176b4d" : "#59675f",
    fontWeight: t === tab ? 700 : 400,
    cursor: "pointer",
    marginRight: "4px",
    marginBottom: "-1px",
    position: "relative",
    zIndex: t === tab ? 1 : 0,
  });

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid #e1e9e3", marginBottom: "24px" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile"      && <ProfileTab      token={token} orgId={orgId} memberRole={memberRole} />}
      {tab === "Members"      && <MembersTab      token={token} orgId={orgId} memberRole={memberRole} />}
      {tab === "Verification" && <VerificationTab token={token} orgId={orgId} />}
    </div>
  );
}
