// Auto-detect API URL based on current host
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser - use same host but port 4000
    const host = window.location.hostname;
    return `http://${host}:4000`;
  }
  // Server-side - use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

const API_URL = getApiUrl();

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data;
}

// Task API
export const tasksApi = {
  list: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    return apiClient<{ items: any[]; total: number }>(`/api/tasks?${params}`);
  },

  get: (id: string) => apiClient<any>(`/api/tasks/${id}`),

  create: (data: { title: string; description?: string; priority?: string }) =>
    apiClient<any>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<any>) =>
    apiClient<any>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  assign: (id: string, agentId: string) =>
    apiClient<any>(`/api/tasks/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    }),

  unblock: (id: string, response: string, approved: boolean) =>
    apiClient<void>(`/api/tasks/${id}/unblock`, {
      method: 'POST',
      body: JSON.stringify({ response, approved }),
    }),

  addComment: (id: string, content: string) =>
    apiClient<any>(`/api/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getOutput: (id: string) =>
    apiClient<{ output: string }>(`/api/tasks/${id}/output`),

  delete: (id: string) =>
    apiClient<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// Agent API
export const agentsApi = {
  list: () => apiClient<any[]>('/api/agents'),

  get: (id: string) => apiClient<any>(`/api/agents/${id}`),

  create: (data: { name: string; openclawAgentId: string }) =>
    apiClient<any>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<any>) =>
    apiClient<any>(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Dashboard API
export const dashboardApi = {
  get: () => apiClient<any>('/api/dashboard'),

  getStats: () => apiClient<any>('/api/dashboard/stats'),

  getActivity: (limit?: number) =>
    apiClient<any[]>(`/api/dashboard/activity?limit=${limit || 20}`),
};
