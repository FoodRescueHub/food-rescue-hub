import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { validateEmail, validatePassword } from '../../utils/validation';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/FormInput';
import PasswordInput from '../../components/PasswordInput';
import LoadingButton from '../../components/LoadingButton';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field change handler
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));

    // Clear inline error when typing
    if (fieldErrors[id]) {
      setFieldErrors(prev => ({ ...prev, [id]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  // Inline blur validation
  const handleBlur = (field) => {
    if (field === 'email') {
      const err = validateEmail(formData.email);
      setFieldErrors(prev => ({ ...prev, email: err }));
    } else if (field === 'password') {
      const err = validatePassword(formData.password, false);
      setFieldErrors(prev => ({ ...prev, password: err }));
    }
  };

  // Validate entire form before submit
  const validateForm = () => {
    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password, false);

    const errors = {};
    if (emailErr) errors.email = emailErr;
    if (passErr) errors.password = passErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      await login(formData.email, formData.password);
      // Navigate to destination route or default /dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setServerError('Invalid email or password. Please verify your credentials and try again.');
      } else if (err.status === 429) {
        setServerError('Too many login attempts. Please wait a few moments before trying again.');
      } else {
        setServerError(err.message || 'Unable to log in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Enter your credentials to access your food rescue coordinator workspace."
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
          label="Email Address"
          type="email"
          placeholder="coordinator@rescuehub.org"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur('email')}
          error={fieldErrors.email}
          icon={Mail}
          required
          autoComplete="email"
          disabled={isSubmitting}
        />

        <div>
          <PasswordInput
            id="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            error={fieldErrors.password}
            required
            autoComplete="current-password"
            disabled={isSubmitting}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <LoadingButton
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          icon={LogIn}
        >
          Sign In to Workspace
        </LoadingButton>

        <div className="auth-links">
          <span>
            Don't have an account yet?{' '}
            <Link to="/signup">Create one here</Link>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}
