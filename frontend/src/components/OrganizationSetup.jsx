/**
 * OrganizationSetup
 *
 * Shown when an authenticated user has no active organization membership.
 * Lets the user register a new organization (they become its ADMIN).
 *
 * Props:
 *   token        – JWT bearer token
 *   onComplete   – called with the new organization object after success
 */

import { useState } from "react";

const API = "/api";

export default function OrganizationSetup({ token, onComplete }) {
  const [name, setName]                 = useState("");
  const [type, setType]                 = useState("RECIPIENT");
  const [address, setAddress]           = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription]  = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [servingZonesRaw, setServingZonesRaw] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const servingZones = servingZonesRaw
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${API}/organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
          address,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          description: description || undefined,
          operatingHours: operatingHours || undefined,
          servingZones: servingZones.length ? servingZones : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not create organization.");
        return;
      }

      onComplete(data.organization);
    } catch {
      setError("Backend connection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Register Your Organization</h2>
      <p style={{ marginBottom: "20px", color: "#59675f" }}>
        Your account is not yet linked to an organization. Register one below
        to continue. You will be its admin.
      </p>

      {error && (
        <p style={{ color: "#c0392b", marginBottom: "12px" }}>{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <label>Organization name *</label>
        <input
          type="text"
          placeholder="e.g. Green Valley Food Bank"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />

        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="RECIPIENT">Recipient</option>
          <option value="DONOR">Donor</option>
          <option value="BOTH">Both</option>
        </select>

        <label>Address</label>
        <input
          type="text"
          placeholder="Street address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={200}
        />

        <label>Contact email</label>
        <input
          type="email"
          placeholder="contact@example.org"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          maxLength={254}
        />

        <label>Contact phone</label>
        <input
          type="tel"
          placeholder="+1 555 000 0000"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          maxLength={30}
        />

        <label>Description</label>
        <input
          type="text"
          placeholder="Brief description of your organization"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />

        <label>Operating hours</label>
        <input
          type="text"
          placeholder="e.g. Mon–Fri 9am–5pm"
          value={operatingHours}
          onChange={(e) => setOperatingHours(e.target.value)}
          maxLength={200}
        />

        <label>Serving zones (comma-separated)</label>
        <input
          type="text"
          placeholder="e.g. Downtown, Westside, Northgate"
          value={servingZonesRaw}
          onChange={(e) => setServingZonesRaw(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Registering…" : "Register Organization"}
        </button>
      </form>
    </div>
  );
}
