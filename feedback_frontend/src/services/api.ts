import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  Token,
  FeedbackSummary,
  QALog,
  LowRelevanceResult,
  LowRelevanceSummary,
  NoResultSummary,
  LoginSuccessResponse,
  LoginErrorResponse,
  User,
  UserCreate,
} from "../types";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL, // Your backend address
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true, // Ensure cookies are sent with requests
});

const AUTH_TOKEN_KEY = "auth_token";

// Initialize token from sessionStorage
let authToken: string | null = sessionStorage.getItem(AUTH_TOKEN_KEY);

// Request interceptor to add Bearer token
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear token
      authToken = null;
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      // Redirect to login page to avoid being stuck on a page that requires auth
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (
    username: string,
    password: string
  ): Promise<LoginSuccessResponse | LoginErrorResponse> => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const response: AxiosResponse<LoginSuccessResponse | LoginErrorResponse> =
      await api.post("/api/v1/login", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        validateStatus: function (status) {
          return (status >= 200 && status < 300) || status === 401;
        },
      });

    // Store token in memory and sessionStorage if login successful
    if (
      "success" in response.data &&
      response.data.success &&
      response.data.data.access_token
    ) {
      const token = response.data.data.access_token;
      authToken = token;
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    return response.data;
  },

  logout: () => {
    authToken = null;
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  },

  getCurrentUser: async () => {
    // Avoid making a request if there's no token to begin with
    if (!authToken) {
      return null;
    }
    try {
      const response = await api.get("/api/v1/me");
      return response.data;
    } catch (error) {
      // The interceptor will handle 401 errors.
      // For other errors, we treat it as not authenticated.
      return null;
    }
  },
};

// Feedback API
export const feedbackAPI = {
  getSummary: async (limit = 10): Promise<FeedbackSummary[]> => {
    const response: AxiosResponse<FeedbackSummary[]> = await api.get(
      "/api/v1/feedback/summary",
      {
        params: { limit },
      }
    );
    return response.data;
  },
};

// QA Logs API
export const qaLogsAPI = {
  getLogs: async (skip = 0, limit = 100, search?: string): Promise<QALog[]> => {
    const response: AxiosResponse<QALog[]> = await api.get("/api/v1/qa-logs", {
      params: { skip, limit, search },
    });
    return response.data;
  },
};

// Low Relevance API
export const lowRelevanceAPI = {
  getResults: async (
    skip = 0,
    limit = 100,
    min_score?: number,
    max_score?: number
  ): Promise<LowRelevanceSummary[]> => {
    const response: AxiosResponse<LowRelevanceSummary[]> = await api.get(
      "/api/v1/low-relevance-results",
      {
        params: { skip, limit, min_score, max_score },
      }
    );
    return response.data;
  },
};

// No Result API
export const noResultAPI = {
  getSummary: async (limit = 10): Promise<NoResultSummary[]> => {
    const response: AxiosResponse<NoResultSummary[]> = await api.get(
      "/api/v1/no-result/summary",
      {
        params: { limit },
      }
    );
    return response.data;
  },
};

// User API
export const userAPI = {
  getUsers: async (skip = 0, limit = 100): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/api/v1/users", {
      params: { skip, limit },
    });
    return response.data;
  },

  createUser: async (userData: UserCreate): Promise<User> => {
    const response: AxiosResponse<User> = await api.post(
      "/api/v1/users",
      userData
    );
    return response.data;
  },
};

export default api;
