import axios, { AxiosError } from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'https://family-health-guardian-backend.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Supabase JWT bearer token if available
api.interceptors.request.use(
  async (config) => {
    // Allow public health check endpoints without bearer token
    if (config.url === '/health' || config.url?.endsWith('/health')) {
      return config;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Cancel request client-side instead of triggering 401 error logs on backend
        return Promise.reject(new Error('Unauthenticated: No active session token found.'));
      }
    } catch (error) {
      console.warn('[API] Failed to retrieve session for request authentication:', error);
      return Promise.reject(error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error message from backend
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string | Array<{ msg?: string }> }>) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Extract error detail (single string or FastAPI validation array)
      let message = 'An unexpected server error occurred.';
      if (typeof data?.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        message = data.detail.map((err) => err.msg || JSON.stringify(err)).join(', ');
      } else if (error.message) {
        message = error.message;
      }

      // Handle 401 Unauthorized logging without destructively wiping session
      if (status === 401) {
        console.warn('[API] 401 Unauthorized encountered. Verify session or backend SUPABASE_JWT_SECRET.');
      }

      // Attach normalized human-readable message
      const enhancedError = new Error(message);
      (enhancedError as unknown as { originalError: AxiosError; status: number }).originalError = error;
      (enhancedError as unknown as { status: number }).status = status;
      return Promise.reject(enhancedError);
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please check your connection and try again.'));
    }

    return Promise.reject(new Error(error.message || 'Network error. Please try again later.'));
  }
);

export default api;
