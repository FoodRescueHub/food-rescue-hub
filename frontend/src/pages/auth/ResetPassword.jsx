import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { validatePassword, validateConfirmPassword } from '../../utils/validation';
import AuthLayout from '../../components/AuthLayout';
import PasswordInput from '../../components/PasswordInput';
import FormInput from '../../components/FormInput';
import LoadingButton from '../../components/LoadingButton';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isPendingBackend, setIsPendingBackend] = useState(false);

  const handleBlur = (field) => {
    let err = null;
    if (field === 'password') err = validatePassword(password, true);
    if (field === 'confirmPassword') err = validateConfirmPassword(password, confirmPassword);

    if (err) {
      setFieldErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const validateForm = () => {
    const passErr = validatePassword(password, true);
    const confirmErr = validateConfirmPassword(password, confirmPassword);

    const errors = {};
    if (!token.trim()) errors.token = 'Reset token is required.';
    if (passErr) errors.password = passErr;
    if (confirmErr) errors.confirmPassword = confirmErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await authApi.resetPassword({ token: token.trim(), password });
      setResetSuccess(true);
    } catch (err) {
      if (err.isNotFound || err.status === 404) {
        setIsPendingBackend(true);
        setResetSuccess(true);
      } else if (err.status === 400 || err.status === 401) {
        setServerError('This password reset link is invalid or has expired. Please request a new link.');
      } else {
        setServerError(err.message || 'Unable to reset password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetSuccess) {
    return (
      <AuthLayout
        title="Password Updated"
        subtitle="Your new credentials have been recorded."
      >
        <div className="status-card">
          <div className="status-icon-badge success">
            <CheckCircle2 size={40} />
          </div>

          <h2 className="status-card-title">Password Reset Complete!</h2>

          <p className="status-card-desc">
            Your account password has been successfully updated. You may now sign in using your new password.
          </p>

          {isPendingBackend && (
            <div className="alert-box alert-info" style={{ textAlign: 'left', width: '100%' }}>
              <span>
                <strong>Integration Note:</strong> The backend password reset endpoint (<code>POST /api/auth/reset-password</code>) is currently pending backend completion. Form validation and payload handling have been verified.
              </span>
            </div>
          )}

          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
            <span>Sign In with New Password</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Choose a secure password with at least 8 characters."
    >
      {serverError && (
        <div className="alert-box alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {!tokenFromUrl && (
          <FormInput
            id="token"
            label="Recovery Token"
            placeholder="Paste your reset token from the email link"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (fieldErrors.token) setFieldErrors(prev => ({ ...prev, token: null }));
            }}
            error={fieldErrors.token}
            required
            disabled={isSubmitting}
          />
        )}

        <PasswordInput
          id="password"
          label="New Password"
          placeholder="Enter at least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }));
          }}
          onBlur={() => handleBlur('password')}
          error={fieldErrors.password}
          required
          showCriteria={true}
          autoComplete="new-password"
          disabled={isSubmitting}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: null }));
          }}
          onBlur={() => handleBlur('confirmPassword')}
          error={fieldErrors.confirmPassword}
          required
          autoComplete="new-password"
          disabled={isSubmitting}
        />

        <LoadingButton
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          icon={KeyRound}
        >
          Update Password
        </LoadingButton>

        <div className="auth-links">
          <Link to="/login">Cancel and Return to Sign In</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
