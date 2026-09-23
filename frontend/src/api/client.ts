const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  retryOnUnauthorized?: boolean;
}

type RefreshAccessToken = () => Promise<string>;
let refreshAccessToken: RefreshAccessToken | null = null;

export function setRefreshAccessToken(handler: RefreshAccessToken | null) {
  refreshAccessToken = handler;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const requestOptions = {
    method: options.method || 'GET',
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  };
  let res = await fetch(`${API_BASE_URL}${path}`, requestOptions);

  if (res.status === 401 && options.token && options.retryOnUnauthorized !== false && refreshAccessToken) {
    try {
      const renewedToken = await refreshAccessToken();
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...requestOptions,
        headers: { ...requestOptions.headers, Authorization: `Bearer ${renewedToken}` },
      });
    } catch {
      // Preserve the original unauthorized response for the caller.
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore parse failure, use default message
    }
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  refresh: () =>
    request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      retryOnUnauthorized: false,
    }),

  getStats: (token: string) =>
    request<any>('/monitoring/stats', { token }),

  getLogs: (token: string, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/audit/logs?${qs}`, { token });
  },

  listUsers: (token: string) => request<any[]>('/admin/users', { token }),

  listAllAccess: (token: string) => request<any[]>('/admin/model-access', { token }),

  grantAccess: (token: string, userId: string, model: string, permission: string) =>
    request('/admin/model-access', {
      method: 'POST',
      token,
      body: { userId, model, permission },
    }),

  revokeAccess: (token: string, id: string) =>
    request(`/admin/model-access/${id}`, { method: 'DELETE', token }),
};
