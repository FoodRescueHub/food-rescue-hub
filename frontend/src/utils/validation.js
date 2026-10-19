/**
 * Validation helpers matching backend Zod schema contracts
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'Email address is required.';
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return 'Email address is required.';
  }
  if (trimmed.length > 254) {
    return 'Email must not exceed 254 characters.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password, isSignup = false) {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length === 0) {
    return 'Password is required.';
  }
  if (isSignup) {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (password.length > 72) {
      return 'Password cannot exceed 72 characters.';
    }
  }
  return null;
}

export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return 'Full name is required.';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (trimmed.length > 80) {
    return 'Name cannot exceed 80 characters.';
  }
  return null;
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

export function getPasswordCriteria(password = '') {
  return {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };
}
