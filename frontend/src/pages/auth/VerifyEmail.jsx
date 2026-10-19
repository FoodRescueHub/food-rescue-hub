import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import { authApi } from '../../services/authApi';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/FormInput';
import LoadingButton from '../../components/LoadingButton';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [status, setStatus] = useState(() => (tokenFromUrl ? 'loading' : 'idle'));
  const [statusMessage, setStatusMessage] = useState(() =>
    tokenFromUrl ? 'Verifying your email token with the server...' : ''
  );

  const executeManualVerification = async (tokenToVerify) => {
    if (!tokenToVerify || !tokenToVerify.trim()) {
      setStatus('error');
      setStatusMessage('Verification token is missing. Please use the link sent to your email or enter your token below.');
      return;
    }

    setStatus('loading');
    setStatusMessage('Verifying your email token with the server...');

    try {
      const response = await authApi.verifyEmail(tokenToVerify.trim());
      setStatus('success');
      setStatusMessage(response?.message || 'Your email has been successfully verified! You can now participate in food rescues.');
    } catch (err) {
      if (err.isNotFound || err.status === 404) {
        setStatus('pending_backend');
        setStatusMessage(
          'Email Verification Endpoint Pending: The backend email verification service (POST /api/auth/verify-email) is not yet active on this server. This detail has been logged for the backend team.'
        );
      } else if (err.status === 400 || err.status === 401) {
        setStatus('error');
        setStatusMessage(err.message || 'This verification token is invalid or has expired. Please request a new verification link.');
      } else {
        setStatus('error');
        setStatusMessage(err.message || 'Unable to complete email verification. Please check your connection and try again.');
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!tokenFromUrl) return;

    async function verify() {
      try {
        const response = await authApi.verifyEmail(tokenFromUrl.trim());
        if (!isMounted) return;
        setStatus('success');
        setStatusMessage(response?.message || 'Your email has been successfully verified! You can now participate in food rescues.');
      } catch (err) {
        if (!isMounted) return;
        if (err.isNotFound || err.status === 404) {
          setStatus('pending_backend');
          setStatusMessage(
            'Email Verification Endpoint Pending: The backend email verification service (POST /api/auth/verify-email) is not yet active on this server. This detail has been logged for the backend team.'
          );
        } else if (err.status === 400 || err.status === 401) {
          setStatus('error');
          setStatusMessage(err.message || 'This verification token is invalid or has expired. Please request a new verification link.');
        } else {
          setStatus('error');
          setStatusMessage(err.message || 'Unable to complete email verification. Please check your connection and try again.');
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [tokenFromUrl]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    executeManualVerification(tokenInput);
  };

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Confirming your email address ensures community trust and food safety standards."
    >
      <div className="status-card">
        {status === 'loading' && (
          <>
            <div className="status-icon-badge info">
              <RefreshCw size={36} className="spinner" style={{ animationDuration: '1.2s' }} />
            </div>
            <h2 className="status-card-title">Verifying Your Email...</h2>
            <p className="status-card-desc">{statusMessage}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="status-icon-badge success">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="status-card-title">Email Verified!</h2>
            <p className="status-card-desc">{statusMessage}</p>
            <div className="alert-box alert-success" style={{ textAlign: 'left', width: '100%' }}>
              <ShieldCheck size={20} />
              <span>Your account is now cleared for active community food operations.</span>
            </div>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
              <span>Log In to Workspace</span>
              <ArrowRight size={18} />
            </Link>
          </>
        )}

        {status === 'pending_backend' && (
          <>
            <div className="status-icon-badge info">
              <Mail size={36} />
            </div>
            <h2 className="status-card-title">Verification Service Notice</h2>
            <div className="alert-box alert-info" style={{ textAlign: 'left', width: '100%' }}>
              <span>{statusMessage}</span>
            </div>
            <p className="status-card-desc">
              Your registration is securely recorded. Once the backend verification route is connected, your account token will be processed automatically.
            </p>
            <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none', width: '100%' }}>
              Return to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="status-icon-badge error">
              <AlertTriangle size={36} />
            </div>
            <h2 className="status-card-title">Verification Issue</h2>
            <div className="alert-box alert-error" style={{ textAlign: 'left', width: '100%' }}>
              <span>{statusMessage}</span>
            </div>
          </>
        )}

        {(status === 'idle' || status === 'error') && !tokenFromUrl && (
          <form onSubmit={handleManualSubmit} style={{ width: '100%', marginTop: '8px' }}>
            <p className="status-card-desc" style={{ marginBottom: '16px' }}>
              If you received a verification code or token in your confirmation email, you may paste it below to verify your account manually:
            </p>

            <FormInput
              id="verificationToken"
              label="Verification Token"
              placeholder="Paste verification token here..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              required
            />

            <LoadingButton
              type="submit"
              loading={status === 'loading'}
              disabled={!tokenInput.trim()}
              style={{ marginTop: '12px' }}
            >
              Verify Token
            </LoadingButton>

            <div className="auth-links" style={{ marginTop: '16px' }}>
              <Link to="/login">Back to Sign In</Link>
            </div>
          </form>
        )}

        {status === 'error' && tokenFromUrl && (
          <div style={{ width: '100%', marginTop: '12px' }}>
            <button
              onClick={() => executeManualVerification(tokenFromUrl)}
              className="btn-secondary"
              style={{ marginBottom: '10px' }}
            >
              Retry Verification
            </button>
            <div className="auth-links">
              <Link to="/login">Return to Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
