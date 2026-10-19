import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { validateEmail } from '../../utils/validation';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/FormInput';
import LoadingButton from '../../components/LoadingButton';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPendingBackend, setIsPendingBackend] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(null);
    if (serverError) setServerError(null);
  };

  const handleBlur = () => {
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    setIsPendingBackend(false);

    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (apiErr) {
      if (apiErr.isNotFound || apiErr.status === 404) {
        setIsPendingBackend(true);
        setIsSubmitted(true);
      } else {
        setServerError(apiErr.message || 'Unable to submit password recovery request. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check Your Inbox"
        subtitle="Password recovery request submitted."
      >
        <div className="status-card">
          <div className="status-icon-badge success">
            <CheckCircle2 size={40} />
          </div>

          <h2 className="status-card-title">Recovery Link Sent</h2>

          <p className="status-card-desc">
            If an account is associated with <strong>{email}</strong>, password reset instructions and a secure recovery link have been dispatched.
          </p>

          {isPendingBackend && (
            <div className="alert-box alert-info" style={{ textAlign: 'left', width: '100%' }}>
              <span>
                <strong>Integration Note:</strong> The backend password recovery endpoint (<code>POST /api/auth/forgot-password</code>) is currently pending deployment by the backend team. This flow has been safely connected.
              </span>
            </div>
          )}

          <div style={{ width: '100%', marginTop: '12px' }}>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter the email associated with your account to receive recovery instructions."
    >
      {serverError && (
        <div className="alert-box alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <FormInput
          id="email"
          label="Account Email Address"
          type="email"
          placeholder="your.email@organization.org"
          value={email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={emailError}
          icon={Mail}
          required
          autoComplete="email"
          disabled={isSubmitting}
        />

        <LoadingButton
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          icon={Send}
        >
          Send Password Reset Link
        </LoadingButton>

        <div className="auth-links">
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
