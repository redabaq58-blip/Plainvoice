import { createBrowserClient } from "@repo/database";
import { isAuthBypassed } from "@/lib/auth-bypass";

function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing NEXT_PUBLIC_API_URL in production.");
    }
    return "http://localhost:8000";
  }
  if (
    process.env.NODE_ENV === "production" &&
    (apiUrl.startsWith("http://localhost") || apiUrl.startsWith("http://127.0.0.1"))
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must not point to localhost in production.");
  }
  return apiUrl;
}

const API_URL = getApiUrl();

/** Read the Supabase access token from the auth cookie (fallback for fresh client instances). */
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("sb-") && c.includes("-auth-token="));
  if (!raw) return null;
  const value = raw.split("=").slice(1).join("=");
  try {
    const decoded = atob(value.replace("base64-", ""));
    const parsed = JSON.parse(decoded) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch wrapper for the FastAPI backend.
 * Gets the Supabase session token and forwards it as a Bearer token.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let token = "dev-bypass";
  if (!isAuthBypassed()) {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token ?? getTokenFromCookie() ?? "";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    window.location.href = "/auth/login";
    throw new Error("Unauthorized");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}
