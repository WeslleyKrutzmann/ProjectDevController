const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5096/api";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(
  path: string,
  method: HttpMethod,
  token?: string,
  body?: unknown
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, "GET", token),
  post: <T>(path: string, body: unknown, token?: string) => request<T>(path, "POST", token, body),
  put: <T>(path: string, body: unknown, token?: string) => request<T>(path, "PUT", token, body)
};
