/**
 * SQL Data Lab API Client
 * Wraps all REST API calls with error handling matching the standard API Error Contract.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface ApiError {
  code: string;
  message: string;
  request_id?: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    request_id: string;
    timestamp: string;
  };
  error?: ApiError;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("datalab_token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("datalab_token", token);
  } else {
    localStorage.removeItem("datalab_token");
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  const storedToken = getStoredToken();
  if (storedToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${storedToken}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  try {
    const response = await fetch(url, config);
    const result: ApiResponse<T> = await response.json();

    if (!response.ok || !result.success) {
      let msg = result.error?.message;
      if (!msg && (result as any).detail) {
        if (Array.isArray((result as any).detail)) {
          msg = (result as any).detail.map((d: any) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(", ");
        } else {
          msg = String((result as any).detail);
        }
      }
      const err: ApiError = result.error || {
        code: "HTTP_ERROR",
        message: msg || `Request failed with status ${response.status}`,
      };
      throw err;
    }

    return result.data;
  } catch (error: any) {
    if (error.code && error.message) {
      throw error;
    }
    throw {
      code: "NETWORK_ERROR",
      message: error.message || "Failed to communicate with the server. Ensure the backend is running.",
    } as ApiError;
  }
}

// API Endpoints helpers
export const api = {
  // Auth & Profile
  register: async (data: any) => {
    const res = await apiRequest<any>("/auth/register", { method: "POST", body: JSON.stringify(data) });
    if (res && res.access_token) {
      setStoredToken(res.access_token);
    }
    return res;
  },
  login: async (data: any) => {
    const res = await apiRequest<any>("/auth/login", { method: "POST", body: JSON.stringify(data) });
    if (res && res.access_token) {
      setStoredToken(res.access_token);
    }
    return res;
  },
  logout: async () => {
    setStoredToken(null);
    try {
      return await apiRequest<any>("/auth/logout", { method: "POST" });
    } catch {
      return null;
    }
  },
  getMe: () => apiRequest<any>("/auth/me"),
  getProfile: () => apiRequest<{ user: any; stats: any }>("/auth/profile"),
  updateProfile: (data: { full_name?: string; email?: string }) =>
    apiRequest<any>("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiRequest<any>("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),

  // Workspaces
  listWorkspaces: () => apiRequest<{ workspaces: any[]; max_workspaces: number }>("/workspaces"),
  createWorkspace: (data: { name: string; description?: string }) =>
    apiRequest<any>("/workspaces", { method: "POST", body: JSON.stringify(data) }),
  getWorkspace: (id: string) => apiRequest<any>(`/workspaces/${id}`),
  updateWorkspace: (id: string, data: { name?: string; description?: string }) =>
    apiRequest<any>(`/workspaces/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWorkspace: (id: string) => apiRequest<any>(`/workspaces/${id}`, { method: "DELETE" }),

  // Datasets
  listDatasets: (workspaceId: string) => apiRequest<{ datasets: any[] }>(`/datasets?workspace_id=${workspaceId}`),
  uploadDatasets: (formData: FormData) => apiRequest<any>("/datasets/upload", { method: "POST", body: formData }),
  getDatasetPreview: (datasetId: string) => apiRequest<any>(`/datasets/${datasetId}/preview`),
  deleteDataset: (datasetId: string) => apiRequest<any>(`/datasets/${datasetId}`, { method: "DELETE" }),

  // SQL & Inspection
  executeSQL: (data: { workspace_id: string; query: string; limit?: number }) =>
    apiRequest<any>("/sql/execute", { method: "POST", body: JSON.stringify(data) }),
  explainSQL: (data: { workspace_id: string; query: string }) =>
    apiRequest<any>("/sql/explain", { method: "POST", body: JSON.stringify(data) }),
  getTableStats: (workspaceId: string, tableName: string) =>
    apiRequest<any>(`/sql/table-stats?workspace_id=${workspaceId}&table_name=${encodeURIComponent(tableName)}`),
  getDataQualityProfile: (workspaceId: string, tableName: string) =>
    apiRequest<any>(`/sql/data-quality-profile?workspace_id=${workspaceId}&table_name=${encodeURIComponent(tableName)}`),
  getSchemaGraph: (workspaceId: string) =>
    apiRequest<{ nodes: any[]; edges: any[] }>(`/sql/schema-graph?workspace_id=${workspaceId}`),
  formatSQL: (query: string) =>
    apiRequest<{ formatted_query: string }>("/sql/format", { method: "POST", body: JSON.stringify({ query }) }),

  // Queries & History
  getQueryHistory: (workspaceId: string, search?: string, statusFilter?: string) => {
    let queryParams = `workspace_id=${workspaceId}`;
    if (search) queryParams += `&search=${encodeURIComponent(search)}`;
    if (statusFilter && statusFilter !== "ALL") queryParams += `&status_filter=${encodeURIComponent(statusFilter)}`;
    return apiRequest<{ history: any[]; retention_max: number }>(`/queries/history?${queryParams}`);
  },
  deleteQueryHistory: (id: string) => apiRequest<any>(`/queries/history/${id}`, { method: "DELETE" }),
  cleanupHistory: (workspaceId: string, options?: { clear_all?: boolean; days?: number }) => {
    let queryParams = `workspace_id=${workspaceId}`;
    if (options?.clear_all) queryParams += "&clear_all=true";
    if (options?.days) queryParams += `&days=${options.days}`;
    return apiRequest<any>(`/queries/history/cleanup?${queryParams}`, { method: "DELETE" });
  },
  getSavedQueries: (workspaceId: string, search?: string, tag?: string) => {
    let queryParams = `workspace_id=${workspaceId}`;
    if (search) queryParams += `&search=${encodeURIComponent(search)}`;
    if (tag) queryParams += `&tag=${encodeURIComponent(tag)}`;
    return apiRequest<{ saved_queries: any[] }>(`/queries/saved?${queryParams}`);
  },
  createSavedQuery: (data: any) => apiRequest<any>("/queries/saved", { method: "POST", body: JSON.stringify(data) }),
  updateSavedQuery: (id: string, data: any) => apiRequest<any>(`/queries/saved/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSavedQuery: (id: string) => apiRequest<any>(`/queries/saved/${id}`, { method: "DELETE" }),

  // Exports
  exportCSV: async (data: { filename: string; columns: string[]; rows: any[][] }) => {
    const res = await fetch(`${API_BASE_URL}/exports/csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  exportJSON: async (data: { filename: string; columns: string[]; rows: any[][] }) => {
    const res = await fetch(`${API_BASE_URL}/exports/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.filename}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // Challenges
  listChallenges: (difficulty?: string, category?: string) => {
    let queryParams = "";
    if (difficulty && difficulty.toLowerCase() !== "all") queryParams += `?difficulty=${encodeURIComponent(difficulty)}`;
    if (category && category.toLowerCase() !== "all") {
      queryParams += (queryParams ? "&" : "?") + `category=${encodeURIComponent(category)}`;
    }
    return apiRequest<{ challenges: any[]; stats: { total: number; completed: number; earned_xp: number; total_xp: number } }>(`/challenges${queryParams}`);
  },
  getChallenges: (workspaceId?: string, difficulty?: string, category?: string) => {
    let queryParams = "";
    if (difficulty && difficulty.toLowerCase() !== "all") queryParams += `?difficulty=${encodeURIComponent(difficulty)}`;
    if (category && category.toLowerCase() !== "all") {
      queryParams += (queryParams ? "&" : "?") + `category=${encodeURIComponent(category)}`;
    }
    return apiRequest<{ challenges: any[]; stats: { total: number; completed: number; earned_xp: number; total_xp: number } }>(`/challenges${queryParams}`);
  },
  getChallenge: (id: string) => apiRequest<any>(`/challenges/${id}`),
  validateChallenge: (id: string, arg2: any, arg3?: string) => {
    const body = typeof arg2 === "string" 
      ? { submitted_sql: arg2, workspace_id: arg3 || "" }
      : arg2;
    return apiRequest<any>(`/challenges/${id}/validate`, { method: "POST", body: JSON.stringify(body) });
  },

  // AI Assistant
  explainQuery: (data: any) => apiRequest<any>("/ai/explain-query", { method: "POST", body: JSON.stringify(data) }),
  explainError: (data: any) => apiRequest<any>("/ai/explain-error", { method: "POST", body: JSON.stringify(data) }),
  generateSQL: (data: any) => apiRequest<any>("/ai/generate-sql", { method: "POST", body: JSON.stringify(data) }),
  aiExplainQuery: (data: any) => apiRequest<any>("/ai/explain-query", { method: "POST", body: JSON.stringify(data) }),
  aiFixQuery: (data: any) => apiRequest<any>("/ai/explain-error", { method: "POST", body: JSON.stringify(data) }),
  aiGenerateQuery: (data: any) => apiRequest<any>("/ai/generate-sql", { method: "POST", body: JSON.stringify(data) }),
};
