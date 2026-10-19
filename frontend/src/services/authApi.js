/**
 * Authentication API Service
 * Interacts directly with the backend REST endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api`
  : '/api';

export class AuthApiError extends Error {
  constructor(message, status = 500, errors = null, isNotFound = false) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.errors = errors;
    this.isNotFound = isNotFound;
  }
}

/**
 * Universal JSON request helper with credentials and standard headers
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include', // Support cross-origin cookies / sessions
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    console.error(`[authApi] Network failure on ${endpoint}:`, netErr);
    throw new AuthApiError(
      'Unable to connect to the backend server. Please verify your connection or ensure the API server is running on port 5000.',
      0
    );
  }

  // Handle 404 for unmounted/unimplemented routes gracefully
  if (response.status === 404) {
    throw new AuthApiError(
      `This authentication feature is not yet implemented or enabled on the backend (${endpoint}).`,
      404,
      null,
      true
    );
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let errorMessage = (data && data.message) || `Request failed with status ${response.status}`;

    // Format Zod error array from backend if present
    if (data && Array.isArray(data.errors) && data.errors.length > 0) {
      const fieldErrors = data.errors.map(err => err.message).filter(Boolean);
      if (fieldErrors.length > 0) {
        errorMessage = fieldErrors.join('. ');
      }
    }

    throw new AuthApiError(errorMessage, response.status, data?.errors || null);
  }

  return data;
}

export const authApi = {
  /**
   * User registration
   * POST /api/auth/signup
   * @param {{ name: string, email: string, password: string, role?: 'DONOR'|'RECIPIENT' }}
   */
  async signup({ name, email, password, role = 'RECIPIENT' }) {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      }),
    });
  },

  /**
   * User login
   * POST /api/auth/login
   * @param {{ email: string, password: string }}
   */
  async login({ email, password }) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });
  },

  /**
   * User logout
   * POST /api/auth/logout
   * Invalidates token server-side in TokenBlacklist
   * @param {string} token
   */
  async logout(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return request('/auth/logout', {
      method: 'POST',
      headers,
    });
  },

  /**
   * Check session / retrieve user profile
   * GET /api/profile
   * @param {string} [token]
   */
  async getProfile(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return request('/profile', {
      method: 'GET',
      headers,
    });
  },

  /**
   * Verify email address with token
   * POST /api/auth/verify-email
   * @param {string} token
   */
  async verifyEmail(token) {
    return request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  /**
   * Request password reset link
   * POST /api/auth/forgot-password
   * @param {string} email
   */
  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  },

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   * @param {{ token: string, password: string }}
   */
  async resetPassword({ token, password }) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};
