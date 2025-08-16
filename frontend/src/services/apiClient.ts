import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Mock API responses for development
const mockResponses = {
  '/users/0x742d35Cc6634C0532925a3b8D39aC6645A6C0E0C': {
    address: '0x742d35Cc6634C0532925a3b8D39aC6645A6C0E0C',
    username: 'john_doe',
    email: 'john@example.com',
    role: 'freelancer',
    isVerified: true,
    profile: {
      bio: 'Full-stack developer with 5 years of experience',
      skills: ['React', 'Node.js', 'Blockchain', 'Smart Contracts'],
      hourlyRate: 75,
      availability: 'Available',
    },
    reputation: {
      rating: 4.8,
      completedProjects: 24,
      totalEarnings: 18500,
    },
  },
};

// Mock interceptor for development
if (import.meta.env.DEV) {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url;
      if (url && mockResponses[url as keyof typeof mockResponses]) {
        return Promise.resolve({
          data: mockResponses[url as keyof typeof mockResponses],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
        });
      }
      return Promise.reject(error);
    }
  );
}

export default apiClient;