import { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { HeartHandshake, RefreshCw } from 'lucide-react';
import '../../App.css';

const API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api`
  : '/api';

export default function RecipientDashboard() {
  const { token } = useAuth();

  // Food Needs State
  const [needs, setNeeds] = useState([]);
  const [foodType, setFoodType] = useState('');
  const [needQuantity, setNeedQuantity] = useState('');
  const [needUnit, setNeedUnit] = useState('kg');
  const [pickupZone, setPickupZone] = useState('');
  const [pickupStart, setPickupStart] = useState('');
  const [pickupEnd, setPickupEnd] = useState('');
  const [allergens, setAllergens] = useState('');

  // Donations & Reservations State
  const [availableDonations, setAvailableDonations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isSubmittingNeed, setIsSubmittingNeed] = useState(false);

  // Load My Needs
  const loadMyNeeds = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/needs`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Could not load food needs' });
        return;
      }

      setNeeds(data.needs || data || []);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Create Food Need
  const handleNeedSubmit = async (e) => {
    e.preventDefault();

    if (!pickupStart || !pickupEnd) {
      setFeedback({ type: 'error', message: 'Please select pickup start and end times.' });
      return;
    }

    if (new Date(pickupEnd) <= new Date(pickupStart)) {
      setFeedback({ type: 'error', message: 'Pickup end time must be strictly after pickup start time.' });
      return;
    }

    setIsSubmittingNeed(true);
    setFeedback(null);

    try {
      const response = await fetch(`${API}/needs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        setFeedback({ type: 'error', message: data.message || 'Could not create food need' });
        return;
      }

      setFeedback({ type: 'success', message: 'Food need created successfully!' });
      setNeeds((prev) => [data.need || data, ...prev]);

      setFoodType('');
      setNeedQuantity('');
      setNeedUnit('kg');
      setPickupZone('');
      setPickupStart('');
      setPickupEnd('');
      setAllergens('');
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    } finally {
      setIsSubmittingNeed(false);
    }
  };

  // Cancel Food Need
  const cancelNeed = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this food need?')) return;

    try {
      const response = await fetch(`${API}/needs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Could not cancel food need' });
        return;
      }

      setFeedback({ type: 'success', message: 'Food need cancelled successfully.' });
      await loadMyNeeds();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Load Available Donations
  const loadAvailableDonations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/donations`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Could not load donations' });
        return;
      }

      setAvailableDonations(data.donations || data || []);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Reserve Donation
  const reserveDonation = async (donationId) => {
    if (needs.length === 0) {
      setFeedback({ type: 'error', message: 'Please create an active food need before reserving surplus.' });
      return;
    }

    const activeNeed = needs.find((need) => need.status === 'ACTIVE');
    if (!activeNeed) {
      setFeedback({ type: 'error', message: 'No ACTIVE food need found. Create one first.' });
      return;
    }

    const quantity = prompt('Enter quantity to reserve:');
    if (!quantity || Number(quantity) <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid positive quantity.' });
      return;
    }

    try {
      const response = await fetch(`${API}/surplus/${donationId}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          needId: activeNeed._id,
          quantity: Number(quantity),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Reservation failed' });
        return;
      }

      setFeedback({ type: 'success', message: 'Food reserved successfully! It is held for 15 minutes.' });
      await loadAvailableDonations();
      await loadReservations();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Load Reservations
  const loadReservations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/reservations`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Could not load reservations' });
        return;
      }

      setReservations(data.reservations || data || []);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Confirm Reservation
  const confirmReservation = async (id) => {
    try {
      const response = await fetch(`${API}/reservations/${id}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Could not confirm reservation' });
        return;
      }

      setFeedback({ type: 'success', message: 'Reservation confirmed successfully!' });
      await loadReservations();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Cancel Reservation
  const cancelReservation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      const response = await fetch(`${API}/reservations/${id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Could not cancel reservation' });
        return;
      }

      setFeedback({ type: 'success', message: 'Reservation cancelled.' });
      await loadReservations();
      await loadAvailableDonations();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initRecipientData() {
      if (!token) return;
      try {
        const [needsRes, donationsRes, reservationsRes] = await Promise.allSettled([
          fetch(`${API}/needs`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }),
          fetch(`${API}/donations`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }),
          fetch(`${API}/reservations`, { method: 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }),
        ]);

        if (!isMounted) return;

        if (needsRes.status === 'fulfilled' && needsRes.value.ok) {
          const d = await needsRes.value.json();
          setNeeds(d.needs || d || []);
        }
        if (donationsRes.status === 'fulfilled' && donationsRes.value.ok) {
          const d = await donationsRes.value.json();
          setAvailableDonations(d.donations || d || []);
        }
        if (reservationsRes.status === 'fulfilled' && reservationsRes.value.ok) {
          const d = await reservationsRes.value.json();
          setReservations(d.reservations || d || []);
        }
      } catch (err) {
        console.error(err);
      }
    }

    initRecipientData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: '1060px', margin: '32px auto', padding: '0 20px 60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--color-forest)', margin: 0, fontSize: '1.9rem' }}>Recipient Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
          Publish food requirements, explore surplus lots, and manage your reservation pickups.
        </p>
      </div>

      {feedback && (
        <div
          className={`alert-box ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: '20px' }}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Create Need Form */}
      <div style={{
        background: 'var(--color-white)',
        padding: '28px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        marginBottom: '36px',
      }}>
        <h2 style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--color-forest)',
          fontSize: '1.25rem',
          margin: '0 0 20px',
        }}>
          <HeartHandshake size={22} />
          <span>Post a Community Food Need</span>
        </h2>

        <form onSubmit={handleNeedSubmit} style={{ boxShadow: 'none', padding: 0, border: 'none', maxWidth: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label>Food Type *</label>
              <input
                type="text"
                placeholder="e.g. Prepared Meals, Produce, Bakery"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1.5 }}>
                <label>Quantity *</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={needQuantity}
                  onChange={(e) => setNeedQuantity(e.target.value)}
                  required
                  min="1"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Unit *</label>
                <select
                  value={needUnit}
                  onChange={(e) => setNeedUnit(e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="packets">packets</option>
                  <option value="pieces">pieces</option>
                </select>
              </div>
            </div>

            <div>
              <label>Pickup Zone / District *</label>
              <input
                type="text"
                placeholder="e.g. Downtown, Zone 4"
                value={pickupZone}
                onChange={(e) => setPickupZone(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '12px' }}>
            <div>
              <label>Pickup Start Time *</label>
              <input
                type="datetime-local"
                value={pickupStart}
                onChange={(e) => setPickupStart(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Pickup End Time *</label>
              <input
                type="datetime-local"
                value={pickupEnd}
                onChange={(e) => setPickupEnd(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Allergen Requirements</label>
              <input
                type="text"
                placeholder="e.g. Nut-free, Dairy-free (optional)"
                value={allergens}
                onChange={(e) => setAllergens(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingNeed}
            className="btn-primary"
            style={{ width: 'auto', marginTop: '18px', padding: '12px 28px' }}
          >
            {isSubmittingNeed ? 'Posting...' : 'Post Food Need'}
          </button>
        </form>
      </div>

      {/* Grid: My Needs & Available Donations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '36px' }}>
        {/* Needs Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--color-forest)', margin: 0, fontSize: '1.2rem' }}>
              My Food Needs ({needs.length})
            </h2>
            <button
              onClick={loadMyNeeds}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
                fontSize: '0.82rem',
              }}
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {needs.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No active food needs posted.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {needs.map((need) => (
                <div
                  key={need._id}
                  style={{
                    background: 'var(--color-white)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-forest)', fontSize: '1rem' }}>{need.foodType}</h3>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: need.status === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--color-cream)',
                      color: need.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}>
                      {need.status}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 2px', fontSize: '0.88rem' }}>
                    Quantity: <strong>{need.quantity} {need.unit}</strong> | Zone: {need.pickupZone}
                  </p>
                  {need.status === 'ACTIVE' && (
                    <button
                      onClick={() => cancelNeed(need._id)}
                      style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--color-error)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel Need
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Donations Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--color-forest)', margin: 0, fontSize: '1.2rem' }}>
              Available Food Surplus ({availableDonations.length})
            </h2>
            <button
              onClick={loadAvailableDonations}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
                fontSize: '0.82rem',
              }}
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {availableDonations.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No surplus donations available at the moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableDonations.map((donation) => (
                <div
                  key={donation._id}
                  style={{
                    background: 'var(--color-white)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-forest)', fontSize: '1rem' }}>{donation.foodName}</h3>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      {donation.quantity} {donation.unit}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    {donation.description || 'Surplus produce/prepared food.'}
                  </p>
                  <p style={{ margin: '2px 0 8px', fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
                    📍 {donation.pickupAddress}
                  </p>
                  {donation.status === 'AVAILABLE' && (
                    <button
                      onClick={() => reserveDonation(donation._id)}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', width: 'auto' }}
                    >
                      Hold & Reserve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reservations Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--color-forest)', margin: 0, fontSize: '1.25rem' }}>
            My Active Reservations ({reservations.length})
          </h2>
          <button
            onClick={loadReservations}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-white)',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {reservations.length === 0 ? (
          <div style={{
            background: 'var(--color-white)',
            padding: '30px',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}>
            <p>No reservations held or confirmed. Reserve items from the surplus list above.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {reservations.map((reservation) => (
              <div
                key={reservation._id}
                style={{
                  background: 'var(--color-white)',
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-forest)', fontSize: '0.95rem' }}>
                    {reservation.surplusLotId?.foodName || reservation.needId?.foodType || 'Food Lot'}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: reservation.status === 'CONFIRMED' ? 'var(--color-success-bg)' : 'var(--color-sage-light)',
                    color: reservation.status === 'CONFIRMED' ? 'var(--color-success)' : 'var(--color-forest)',
                    border: '1px solid var(--color-border)',
                  }}>
                    {reservation.status}
                  </span>
                </div>

                <p style={{ margin: '4px 0', fontSize: '0.88rem' }}>
                  Quantity: <strong>{reservation.quantity}</strong>
                </p>

                {reservation.expiresAt && (
                  <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Hold Expires: {new Date(reservation.expiresAt).toLocaleTimeString()}
                  </p>
                )}

                {reservation.status === 'HELD' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => confirmReservation(reservation._id)}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Confirm Pickup
                    </button>
                    <button
                      onClick={() => cancelReservation(reservation._id)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Release
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
