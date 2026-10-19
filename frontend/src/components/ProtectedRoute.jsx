import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-cream)',
        gap: '16px',
        color: 'var(--color-forest)',
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(35, 75, 58, 0.2)', borderTopColor: 'var(--color-forest)' }} />
        <p style={{ fontWeight: 600 }}>Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        background: 'var(--color-cream)',
      }}>
        <div className="status-icon-badge error">
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ color: 'var(--color-forest)', marginBottom: '8px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', marginBottom: '20px' }}>
          Your current account role (<strong>{user.role}</strong>) does not have permission to access this area.
        </p>
        <button
          onClick={() => window.history.back()}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 24px' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
}
