import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, UserPlus, AlertCircle, CheckCircle2, Building, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { validateName, validateEmail, validatePassword, validateConfirmPassword } from '../../utils/validation';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/FormInput';
import PasswordInput from '../../components/PasswordInput';
import LoadingButton from '../../components/LoadingButton';

export default function Signup() {
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'RECIPIENT', // Default to RECIPIENT per backend schema
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));

    if (fieldErrors[id]) {
      setFieldErrors(prev => ({ ...prev, [id]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleRoleChange = (selectedRole) => {
    // Security constraint: only allow DONOR or RECIPIENT
    if (selectedRole === 'DONOR' || selectedRole === 'RECIPIENT') {
      setFormData(prev => ({ ...prev, role: selectedRole }));
    }
  };

  const handleBlur = (field) => {
    let err = null;
    if (field === 'name') err = validateName(formData.name);
    else if (field === 'email') err = validateEmail(formData.email);
    else if (field === 'password') err = validatePassword(formData.password, true);
    else if (field === 'confirmPassword') err = validateConfirmPassword(formData.password, formData.confirmPassword);

    if (err) {
      setFieldErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const validateForm = () => {
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password, true);
    const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);

    const errors = {};
    if (nameErr) errors.name = nameErr;
    if (emailErr) errors.email = emailErr;
    if (passErr) errors.password = passErr;
    if (confirmErr) errors.confirmPassword = confirmErr;

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
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      setRegisteredEmail(formData.email);
      setSignupSuccess(true);
    } catch (err) {
      if (err.status === 409) {
        setServerError('An account with this email already exists. Please sign in or use a different email.');
      } else {
        setServerError(err.message || 'Unable to create account. Please check your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupSuccess) {
    return (
      <AuthLayout
        title="Account Created"
        subtitle="Verification required before accessing the platform."
      >
        <div className="status-card">
          <div className="status-icon-badge success">
            <CheckCircle2 size={40} />
          </div>

          <h2 className="status-card-title">Registration Successful!</h2>

          <p className="status-card-desc">
            We have registered your account for <strong>{registeredEmail}</strong> with the role of{' '}
            <strong>{formData.role}</strong>.
          </p>

          <div className="alert-box alert-info" style={{ textAlign: 'left', width: '100%' }}>
            <span>
              <strong>Email Verification Notice:</strong> For food safety and community accountability, an email verification is required before publishing or claiming food surpluses. Please check your inbox for instructions.
            </span>
          </div>

          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
            Proceed to Log In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create an Account"
      subtitle="Join the Community Food Rescue network as a donor or recipient organization."
    >
      {serverError && (
        <div className="alert-box alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <FormInput
          id="name"
          label="Full Name or Organization Contact"
          placeholder="e.g. Jane Doe or Green Market Team"
          value={formData.name}
          onChange={handleChange}
          onBlur={() => handleBlur('name')}
          error={fieldErrors.name}
          icon={User}
          required
          autoComplete="name"
          disabled={isSubmitting}
        />

        <FormInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="contact@organization.org"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur('email')}
          error={fieldErrors.email}
          icon={Mail}
          required
          autoComplete="email"
          disabled={isSubmitting}
        />

        {/* Role Selector: DONOR vs RECIPIENT strictly enforced */}
        <div className="form-group">
          <label className="form-label">
            <span>Account Role <span style={{ color: 'var(--color-error)' }}>*</span></span>
          </label>
          <div className="role-selector-wrap">
            <div
              className={`role-card-option ${formData.role === 'RECIPIENT' ? 'is-selected' : ''}`}
              onClick={() => handleRoleChange('RECIPIENT')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRoleChange('RECIPIENT'); }}
            >
              <div className="role-card-title">
                <HeartHandshake size={16} />
                <span>Recipient</span>
              </div>
              <div className="role-card-desc">
                Food banks, shelters, and non-profits requesting surplus donations.
              </div>
            </div>

            <div
              className={`role-card-option ${formData.role === 'DONOR' ? 'is-selected' : ''}`}
              onClick={() => handleRoleChange('DONOR')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRoleChange('DONOR'); }}
            >
              <div className="role-card-title">
                <Building size={16} />
                <span>Donor</span>
              </div>
              <div className="role-card-desc">
                Restaurants, grocers, and caterers with surplus food to share.
              </div>
            </div>
          </div>
          <p className="form-hint-text">
            Staff coordinator roles are managed privately and cannot be self-registered.
          </p>
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          onBlur={() => handleBlur('password')}
          error={fieldErrors.password}
          required
          showCriteria={true}
          autoComplete="new-password"
          disabled={isSubmitting}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
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
          icon={UserPlus}
        >
          Create Community Account
        </LoadingButton>

        <div className="auth-links">
          <span>
            Already have an account?{' '}
            <Link to="/login">Sign in instead</Link>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}
