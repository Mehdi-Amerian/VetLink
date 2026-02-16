import axios, {
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import type { AxiosHeaderValue, RawAxiosRequestHeaders } from 'axios';

// What headers might look like coming from Axios
type HeadersLike = AxiosHeaders | RawAxiosRequestHeaders | undefined;

// Ensure we have an AxiosHeaders instance to work with, regardless of input type
function ensureAxiosHeaders(h: HeadersLike): AxiosHeaders {
  if (h instanceof AxiosHeaders) return h;

  const out = new AxiosHeaders();
  if (h) {
    // Copy plain-object headers into AxiosHeaders safely
    const entries = Object.entries(h as Record<string, unknown>);
    for (const [k, v] of entries) {
      if (typeof v !== 'undefined') {
        // Cast through `unknown` to the exact AxiosHeaderValue union
        out.set(k, v as unknown as AxiosHeaderValue);
      }
    }
  }
  return out;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Handle session expiry globally 
let hasHandledSessionExpiry = false;

/** Attach JWT to every request (browser only). */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      const headers = ensureAxiosHeaders(config.headers as HeadersLike);
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
  }
  return config;
});

/** Handle session expiry globally; otherwise pass errors through. */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    const code = typeof data?.code === "string" ? data.code : null;

    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const isAuthFail = hasToken && status === 401;
    const isExpired = isAuthFail && code === "TOKEN_EXPIRED";

    if (isAuthFail && !hasHandledSessionExpiry && typeof window !== "undefined") {
      hasHandledSessionExpiry = true;

      if (isExpired) localStorage.setItem("sessionExpired", "1");

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const reason = isExpired ? "session-expired" : "auth";
      window.location.replace(`/login?reason=${reason}`);
    }

    return Promise.reject(error);
  }
);

/** Add Idempotency-Key in a type-safe way. */
export function withIdempotency(
  config: AxiosRequestConfig | undefined,
  idemKey: string
): AxiosRequestConfig {
  const headers = ensureAxiosHeaders(config?.headers as HeadersLike);
  headers.set('Idempotency-Key', idemKey);

  return {
    ...(config ?? {}),
    headers,
  };
}
