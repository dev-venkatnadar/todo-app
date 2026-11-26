const DEFAULT_API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export function getApiUrl() {
  return localStorage.getItem("daymark_api") || DEFAULT_API_URL;
}

export function setApiUrl(url) {
  localStorage.setItem("daymark_api", url.replace(/\/+$/, ""));
}

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${getApiUrl().replace(/\/+$/, "")}${path}`, {
    ...options,
    headers,
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}
