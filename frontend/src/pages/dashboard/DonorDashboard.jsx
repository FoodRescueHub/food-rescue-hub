import { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { PackagePlus, RefreshCw, XCircle, Calendar, MapPin } from 'lucide-react';
import '../../App.css';

const API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api`
  : '/api';

export default function DonorDashboard() {
  const { token } = useAuth();

  const [donations, setDonations] = useState([]);
  const [foodName, setFoodName] = useState('');
  const [donationQuantity, setDonationQuantity] = useState('');
  const [donationUnit, setDonationUnit] = useState('kg');
  const [description, setDescription] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Load My Donations
  const loadMyDonations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/donations/my`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setActionFeedback({ type: 'error', message: data.message || 'Could not load donations' });
        return;
      }

      setDonations(data.donations || data || []);
    } catch (error) {
      console.error(error);
      setActionFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  // Handle Donation Submit
  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setActionFeedback(null);

    try {
      const response = await fetch(`${API}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        setActionFeedback({ type: 'error', message: data.message || 'Could not create donation' });
        return;
      }

      setActionFeedback({ type: 'success', message: 'Donation created successfully!' });
      setDonations((prev) => [data.donation || data, ...prev]);

      setFoodName('');
      setDonationQuantity('');
      setDonationUnit('kg');
      setDescription('');
      setPickupAddress('');
      setExpiryDate('');
    } catch (error) {
      console.error(error);
      setActionFeedback({ type: 'error', message: 'Backend connection failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Donation
  const cancelDonation = async (id) => {
    try {
      const response = await fetch(`${API}/donations/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setActionFeedback({ type: 'error', message: data.message || 'Could not cancel donation' });
        return;
      }

      setActionFeedback({ type: 'success', message: 'Donation cancelled.' });

      setDonations((prev) =>
        prev.map((donation) =>
          donation._id === id
            ? {
                ...donation,
                status: 'CANCELLED',
              }
            : donation
        )
      );
    } catch (error) {
      console.error(error);
      setActionFeedback({ type: 'error', message: 'Backend connection failed.' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchDonations() {
      if (!token) return;
      try {
        const response = await fetch(`${API}/donations/my`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        });

        const data = await response.json();
        if (!isMounted) return;
        if (!response.ok) {
          setActionFeedback({ type: 'error', message: data.message || 'Could not load donations' });
          return;
        }

        setDonations(data.donations || data || []);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setActionFeedback({ type: 'error', message: 'Backend connection failed.' });
        }
      }
    }

    fetchDonations();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '32px auto', padding: '0 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--color-forest)', margin: 0, fontSize: '1.9rem' }}>Donor Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Publish surplus food lots and manage distribution to certified community partners.
          </p>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`alert-box ${actionFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: '20px' }}
        >
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Create Food Donation */}
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
          <PackagePlus size={22} />
          <span>Publish Surplus Food Lot</span>
        </h2>

        <form onSubmit={handleDonationSubmit} style={{ boxShadow: 'none', padding: 0, border: 'none', maxWidth: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label>Food Name *</label>
              <input
                type="text"
                placeholder="e.g. Sourdough Loaves, Fresh Apples"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1.5 }}>
                <label>Quantity *</label>
                <input
                  type="number"
                  placeholder="e.g. 20"
                  value={donationQuantity}
                  onChange={(e) => setDonationQuantity(e.target.value)}
                  required
                  min="1"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Unit *</label>
                <select
                  value={donationUnit}
                  onChange={(e) => setDonationUnit(e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="packets">packets</option>
                  <option value="pieces">pieces</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label>Pickup Address *</label>
            <input
              type="text"
              placeholder="e.g. 104 Main Street, Loading Bay B"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '12px' }}>
            <div>
              <label>Expiry Date & Time *</label>
              <input
                type="datetime-local"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Description (Optional)</label>
              <input
                type="text"
                placeholder="Storage temperature, packaging details, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ width: 'auto', marginTop: '18px', padding: '12px 28px' }}
          >
            {isLoading ? 'Publishing...' : 'Publish Food Donation'}
          </button>
        </form>
      </div>

      {/* My Donations List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--color-forest)', margin: 0, fontSize: '1.25rem' }}>
            My Published Donations ({donations.length})
          </h2>
          <button
            onClick={loadMyDonations}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-white)',
              color: 'var(--color-forest)',
              fontSize: '0.86rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {donations.length === 0 ? (
          <div style={{
            background: 'var(--color-white)',
            padding: '36px',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}>
            <p>No food donations published yet. Fill out the form above to post your first surplus lot.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {donations.map((donation) => (
              <div
                key={donation._id}
                style={{
                  background: 'var(--color-white)',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-forest)', fontSize: '1.1rem' }}>
                      {donation.foodName}
                    </h3>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: donation.status === 'AVAILABLE' ? 'var(--color-success-bg)' : 'var(--color-cream)',
                      color: donation.status === 'AVAILABLE' ? 'var(--color-success)' : 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}>
                      {donation.status}
                    </span>
                  </div>

                  <p style={{ margin: '8px 0 4px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    Quantity: {donation.quantity} {donation.unit}
                  </p>

                  {donation.description && (
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {donation.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    <MapPin size={14} />
                    <span>{donation.pickupAddress}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <Calendar size={14} />
                    <span>Expires: {donation.expiryDate ? new Date(donation.expiryDate).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                {donation.status === 'AVAILABLE' && (
                  <button
                    onClick={() => cancelDonation(donation._id)}
                    style={{
                      marginTop: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-error-bg)',
                      border: '1px solid var(--color-error-border)',
                      color: 'var(--color-error)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <XCircle size={14} />
                    <span>Cancel Donation</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
