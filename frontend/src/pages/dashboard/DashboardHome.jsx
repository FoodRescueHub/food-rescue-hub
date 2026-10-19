import { useAuth } from '../../context/useAuth';
import Navbar from '../../components/Navbar';
import DonorDashboard from './DonorDashboard';
import RecipientDashboard from './RecipientDashboard';

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-cream)' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        {user?.role === 'DONOR' ? (
          <DonorDashboard />
        ) : user?.role === 'RECIPIENT' ? (
          <RecipientDashboard />
        ) : (
          <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px', textAlign: 'center' }}>
            <h2>Welcome to Community Food Rescue</h2>
            <p>Your account ({user?.email}) is signed in with role: <strong>{user?.role || 'User'}</strong>.</p>
          </div>
        )}
      </main>
    </div>
  );
}
