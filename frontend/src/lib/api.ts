import axios, {
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import type { AxiosHeaderValue, RawAxiosRequestHeaders } from 'axios';

// What headers might look like coming from Axios
type HeadersLike = AxiosHeaders | RawAxiosRequestHeaders | undefined;

/** Normalize to an AxiosHeaders instance without using `any`. */
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

/** Attach JWT to every request (browser only). */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = ensureAxiosHeaders(config.headers as HeadersLike);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
  }
  return config;
});

/** Pass errors through; handle per call. */
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
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
