import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<any>) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const { data } = await axios.post(`${API_URL}/api/auth/refresh-token`, {
                refreshToken,
              });
              localStorage.setItem('token', data.data.token);
              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${data.data.token}`;
                return this.client.request(error.config);
              }
            } catch (refreshError) {
              // Refresh failed, logout user
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          } else {
            // No refresh token, redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/register', { email, password });
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }
    return data;
  }

  async logout() {
    await this.client.post('/api/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  async verifyEmail(token: string) {
    const { data } = await this.client.post('/api/auth/verify-email', { token });
    return data;
  }

  async requestPasswordReset(email: string) {
    const { data } = await this.client.post('/api/auth/request-password-reset', { email });
    return data;
  }

  async resetPassword(token: string, newPassword: string) {
    const { data } = await this.client.post('/api/auth/reset-password', { token, newPassword });
    return data;
  }

  // User endpoints
  async getProfile() {
    const { data } = await this.client.get('/api/users/profile');
    return data;
  }

  async updateApiKeys(apiKey: string, secretKey: string, uid: string) {
    const { data } = await this.client.post('/api/users/api-keys', { apiKey, secretKey, uid });
    return data;
  }

  async removeApiKeys() {
    const { data } = await this.client.delete('/api/users/api-keys');
    return data;
  }

  async getGatekeeperStatus() {
    const { data } = await this.client.get('/api/users/gatekeeper/status');
    return data;
  }

  async checkAccess() {
    const { data } = await this.client.post('/api/users/gatekeeper/check');
    return data;
  }

  // Generic HTTP methods
  async get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }

  async patch(url: string, data?: any, config?: any) {
    return this.client.patch(url, data, config);
  }
}

export const apiClient = new ApiClient();
