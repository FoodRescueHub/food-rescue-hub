import { AlertCircle } from 'lucide-react';

export default function FormInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  hint,
  icon: Icon,
  required = false,
  autoComplete,
  disabled = false,
  maxLength,
  minLength,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}</span>
        </label>
      )}

      <div className="form-input-wrap">
        {Icon && (
          <div className="form-input-icon">
            <Icon size={18} />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`form-input ${!Icon ? 'no-icon' : ''} ${error ? 'is-error' : ''}`}
          {...props}
        />
      </div>

      {error ? (
        <div id={`${inputId}-error`} className="form-error-text" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <div id={`${inputId}-hint`} className="form-hint-text">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
