// API response types based on Swagger specification
export interface Token {
  access_token: string;
  token_type: string;
}

export interface FeedbackSummary {
  query: string;
  satisfied_count: number;
  unsatisfied_count: number;
  total_count: number;
}

export interface QALog {
  task_id: string;
  query: string;
  response: string;
  id: number;
  created_at: string;
  rerank_results: RerankResult[];
}

export interface RerankResult {
  task_id: string;
  original_index: number;
  content: string | null;
  similarity: number;
  relevance: number;
  metadata: object | null;
  id: number;
  created_at: string;
}

export interface LowRelevanceResult {
  query: string;
  original_index: number;
  relevance_score: number;
  content: string | null;
  id: number;
  created_at: string;
}

export interface LowRelevanceSummary {
  query: string;
  count: number;
  avg_relevance_score: number;
  results: LowRelevanceResult[];
}

export interface NoResultSummary {
  query: string;
  count: number;
}

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
  full_name?: string;
  is_admin?: boolean;
}

// Auth context types
export interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// API error type
export interface APIError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

export interface LoginSuccessResponse {
  success: boolean;
  data: Token;
}

export interface LoginErrorResponse {
  error: {
    code: number;
    message: string;
  };
}
