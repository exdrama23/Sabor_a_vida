import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const api = axios.create();
api.defaults.withCredentials = true; 
api.defaults.baseURL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:2923/api' 
  : 'https://sabor-a-vida.onrender.com/api';

let accessToken: string | null = localStorage.getItem('accessToken'); 
let csrfToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getAuthTokens() {
  return { accessToken, csrfToken };
}

export function clearAuth() {
  accessToken = null;
  csrfToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('isAdmin');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('admin_cache_')) {
      localStorage.removeItem(key);
    }
  });
}

export function isAuthenticated(): boolean {
  return !!accessToken;
}


function subscribeToRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onRefreshComplete(newToken: string) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  try {
    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    
    const { accessToken: newAccessToken, csrfToken: newCsrfToken } = response.data;
    
    setAccessToken(newAccessToken);
    setCsrfToken(newCsrfToken);
    
    return newAccessToken;
  } catch (error) {
    clearAuth();
    throw error;
  }
}


api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isTokenExpired = 
      error.response?.status === 401 && 
      (error.response?.data as any)?.code === 'TOKEN_EXPIRED';
    
    const is401 = error.response?.status === 401;
    const isAuthRoute = originalRequest.url?.includes('/auth/');
    
    if (is401 && !isAuthRoute && accessToken) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      
      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;

        onRefreshComplete(newToken);

        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];

        window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  accessToken: string;
  csrfToken: string;
  expiresIn: number;
}

export interface AuthStatus {
  authenticated: boolean;
  email?: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { email, password });
  
  const { accessToken: newAccessToken, csrfToken: newCsrfToken } = response.data;
  setAccessToken(newAccessToken);
  setCsrfToken(newCsrfToken);
  localStorage.setItem('isAdmin', 'true');
  
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAuth();
  }
}

export async function checkAuthStatus(): Promise<AuthStatus> {
  const response = await api.get<AuthStatus>('/auth/status');
  return response.data;
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await api.get<{ csrfToken: string }>('/auth/csrf');
  setCsrfToken(response.data.csrfToken);
  return response.data.csrfToken;
}

export default api;