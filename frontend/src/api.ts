import type { SessionUser } from "./types";

const TOKEN_KEY = "univenture_hub_session";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function detailMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) return String((detail as { message: unknown }).message);
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object" && "msg" in detail[0]) return String(detail[0].msg);
  return "Something went wrong. Please try again.";
}

class ApiClient {
  private token = sessionStorage.getItem(TOKEN_KEY) || "";

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.detail ?? data;
      throw new ApiError(response.status, detailMessage(detail), detail);
    }
    return data as T;
  }

  async authenticate(): Promise<{ user: SessionUser; subscription: Record<string, unknown> }> {
    if (this.token) {
      try {
        const existing = await this.get<{ user: SessionUser }>("/api/me");
        return { user: existing.user, subscription: {} };
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        this.clearSession();
      }
    }

    const telegramInitData = window.Telegram?.WebApp.initData || import.meta.env.VITE_TELEGRAM_INIT_DATA || "";
    const payload = telegramInitData
      ? await this.post<{ token: string; user: SessionUser; subscription: Record<string, unknown> }>("/api/auth/telegram", { init_data: telegramInitData })
      : await this.post<{ token: string; user: SessionUser; subscription: Record<string, unknown> }>("/api/auth/dev", {
          user_id: Number(import.meta.env.VITE_DEV_USER_ID || 8489671503),
          first_name: import.meta.env.VITE_DEV_FIRST_NAME || "Saidamirkhon",
          username: "local_student",
        });
    this.token = payload.token;
    sessionStorage.setItem(TOKEN_KEY, payload.token);
    return { user: payload.user, subscription: payload.subscription };
  }

  clearSession() {
    this.token = "";
    sessionStorage.removeItem(TOKEN_KEY);
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  upload<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    return this.request<T>(path, { method: "POST", body: form });
  }
}

export const api = new ApiClient();

