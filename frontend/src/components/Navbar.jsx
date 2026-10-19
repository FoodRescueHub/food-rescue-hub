import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Sprout, LogOut, CheckCircle2, AlertTriangle, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header style={{
      backgroundColor: 'var(--color-white)',
      borderBottom: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      padding: '12px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Brand */}
        <Link to="/dashboard" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-forest)',
            color: 'var(--color-white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sprout size={20} />
          </div>
          <div>
            <span style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'var(--color-forest)',
              letterSpacing: '-0.2px',
              display: 'block',
              lineHeight: 1.2,
            }}>
              Food Rescue Hub
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              display: 'block',
            }}>
              Community Coordinator
            </span>
          </div>
        </Link>

        {/* User Badges & Logout */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-sage-light)',
                color: 'var(--color-forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User size={16} />
              </div>

              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {user.name || user.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: user.role === 'DONOR' ? 'var(--color-forest)' : 'var(--color-terracotta)',
                    color: 'var(--color-white)',
                    letterSpacing: '0.4px',
                  }}>
                    {user.role}
                  </span>

                  {user.emailVerified ? (
                    <span style={{
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: 'var(--color-success)',
                    }}>
                      <CheckCircle2 size={12} />
                      Verified
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: 'var(--color-terracotta)',
                      background: 'var(--color-terracotta-light)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <AlertTriangle size={12} />
                      Unverified Email
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-cream)',
                color: 'var(--color-text-main)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error-bg)';
                e.currentTarget.style.borderColor = 'var(--color-error-border)';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-cream)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-main)';
              }}
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
