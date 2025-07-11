// API response types based on Swagger specification
export interface Token {
  access_token: string;
  token_type: string;
}

export interface Feedback {
  query: string;
  liked: boolean;
  reason: string | null;
  response: string | null;
  created_at: string;
}

export interface FeedbackCreate {
  query: string;
  liked: boolean;
  reason?: string | null;
}

export interface FeedbackResponse {
  total: number;
  data: Feedback[];
}

export interface QALog {
  task_id: string;
  query: string;
  response: string;
  id: number;
  created_at: string;
  rerank_results: RerankResult[];
}

export interface PaginatedQALogsResponse {
  total: number;
  data: QALog[];
}

export interface RerankResult {
  task_id: string;
  original_index: number;
  content: string | null;
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
  page_id: string | null;
  section_name: string | null;
  title: string | null;
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
  full_name?: string | null;
  is_admin?: boolean;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserWithToken {
  access_token: string;
  token_type: string;
  user: User;
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

export interface PaginatedUsersResponse {
  data: User[];
  total: number;
}

export interface AuthState {
  token: string | null;
}

export interface PaginatedLowRelevanceResponse {
  data: LowRelevanceSummary[];
  total: number;
}

export interface PaginatedFeedbackResponse {
  data: Feedback[];
  total: number;
}

export interface RecentFeedback {
  id: number;
  query: string;
  liked: boolean;
  created_at: string;
}

export interface FeedbackDashboardSummary {
  total_feedback: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  recent_feedback: RecentFeedback[];
}

// OneNote Sync Log Types
export interface OneNoteSyncStat {
  sync_run_id: string;
  sync_date: string;
  created_count: number;
  updated_count: number;
  deleted_count: number;
}

export interface PaginatedOneNoteSyncStatsResponse {
  total: number;
  page: number;
  pageSize: number;
  data: OneNoteSyncStat[];
}

export interface OneNotePageDetail {
  page_id: string;
  section_name: string;
  title: string;
}

export interface OneNoteSyncRunDetail {
  sync_run_id: string;
  created_pages: OneNotePageDetail[];
  updated_pages: OneNotePageDetail[];
  deleted_pages: OneNotePageDetail[];
}
