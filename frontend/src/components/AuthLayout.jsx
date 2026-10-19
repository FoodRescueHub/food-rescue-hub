import { Sprout, HeartHandshake, ShieldCheck, Truck, Users } from 'lucide-react';
import '../styles/auth.css';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left: Brand Identity & Mission Sidebar */}
        <div className="auth-sidebar">
          <div>
            <div className="auth-brand">
              <div className="auth-brand-logo">
                <Sprout size={26} strokeWidth={2.3} />
              </div>
              <div>
                <h2 className="auth-brand-title">Community Food Rescue</h2>
                <p className="auth-brand-tagline">Connecting surplus with need</p>
              </div>
            </div>

            <div className="auth-mission-wrap">
              <div className="auth-mission-badge">
                <HeartHandshake size={14} />
                <span>Social Impact Initiative</span>
              </div>

              <h1 className="auth-mission-title">
                “Good food deserves a second chance.”
              </h1>

              <p className="auth-mission-desc">
                Connecting surplus food with local communities that need it most.
                Join our network of verified donors, distribution coordinators, and recipient organizations.
              </p>

              <div className="auth-impact-list">
                <div className="auth-impact-item">
                  <ShieldCheck size={18} />
                  <span>Verified organization & food safety standards</span>
                </div>
                <div className="auth-impact-item">
                  <Truck size={18} />
                  <span>Real-time surplus alerts and automated reservations</span>
                </div>
                <div className="auth-impact-item">
                  <Users size={18} />
                  <span>Empowering volunteers and community partners</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-sidebar-footer">
            <p>© {new Date().getFullYear()} Community Food Rescue Coordinator. Dedicated to zero hunger & food waste reduction.</p>
          </div>
        </div>

        {/* Right: Authentication Form Card */}
        <div className="auth-content">
          <div className="auth-header">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
