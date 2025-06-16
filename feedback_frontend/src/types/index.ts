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
}

export interface LowSimilarityQuery {
  query_type: number;
  col: string;
  query_content: string;
  similarity_score: number;
  metric_type: string;
  results: string | null;
  id: number;
  created_at: string;
}

export interface NoResultSummary {
  query: string;
  count: number;
}

// User info type
export interface UserInfo {
  username: string;
  isAuthenticated: boolean;
}

// Auth context types
export interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
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
