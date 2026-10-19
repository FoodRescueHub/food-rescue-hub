import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { getPasswordCriteria } from '../utils/validation';

export default function PasswordInput({
  id,
  label = 'Password',
  value,
  onChange,
  onBlur,
  placeholder = '••••••••',
  error,
  hint,
  required = false,
  autoComplete = 'current-password',
  disabled = false,
  showCriteria = false,
  maxLength = 72,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const criteria = showCriteria ? getPasswordCriteria(value) : null;

  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">
        <span>{label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}</span>
      </label>

      <div className="form-input-wrap">
        <div className="form-input-icon">
          <Lock size={18} />
        </div>

        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`form-input ${error ? 'is-error' : ''}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
          className="form-toggle-password"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <div id={`${inputId}-error`} className="form-error-text" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {showCriteria && (
        <div className="password-criteria" aria-live="polite">
          <div className="password-criteria-title">Password requirements:</div>
          <div className={`password-criteria-item ${criteria.minLength ? 'met' : ''}`}>
            {criteria.minLength ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            <span>At least 8 characters (max 72)</span>
          </div>
          <div className={`password-criteria-item ${criteria.hasLetter ? 'met' : ''}`}>
            {criteria.hasLetter ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            <span>Contains letters</span>
          </div>
          <div className={`password-criteria-item ${criteria.hasNumber ? 'met' : ''}`}>
            {criteria.hasNumber ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            <span>Contains at least one number</span>
          </div>
        </div>
      )}

      {hint && !error && !showCriteria && (
        <div className="form-hint-text">{hint}</div>
      )}
    </div>
  );
}
