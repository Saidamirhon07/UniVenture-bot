import type { SessionUser, SubscriptionStatus } from "./types";

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
  if (detail && typeof detail === "object" && "message" in detail) {
    const value = detail as { message: unknown; request_id?: unknown };
    const reference = value.request_id ? ` Reference: ${String(value.request_id)}` : "";
    return `${String(value.message)}${reference}`;
  }
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object" && "msg" in detail[0]) return String(detail[0].msg);
  return "Something went wrong. Please try again.";
}

function statusMessage(status: number): string {
  if (status === 429) return "Too many requests reached the service at once. Please wait a moment and try again.";
  if (status === 502 || status === 503 || status === 504) return "The AI service is temporarily unavailable. Please try again shortly.";
  if (status >= 500) return "UniVentureAI hit a server error. Please try again; contact support if it continues.";
  return "Something went wrong. Please try again.";
}

function telegramLaunchData(): string {
  const sdkData = window.Telegram?.WebApp.initData || "";
  if (sdkData) return sdkData;
  // Telegram places launch parameters in the URL fragment. Reading the raw
  // signed value is a safe fallback because the backend still validates its
  // HMAC, age and user before issuing a session.
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return fragment.get("tgWebAppData") || query.get("tgWebAppData") || "";
}

class ApiClient {
  private token = sessionStorage.getItem(TOKEN_KEY) || "";

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    let response: Response;
    try {
      response = await fetch(path, { ...options, headers });
    } catch {
      throw new ApiError(0, "Could not connect to UniVentureAI. Check your internet and try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.detail ?? data;
      const message = detailMessage(detail);
      throw new ApiError(response.status, message === "Something went wrong. Please try again." ? statusMessage(response.status) : message, detail);
    }
    return data as T;
  }

  async authenticate(): Promise<{ user: SessionUser; subscription: SubscriptionStatus }> {
    if (this.token) {
      try {
        return await this.get<{ user: SessionUser; subscription: SubscriptionStatus }>("/api/me");
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        this.clearSession();
      }
    }

    let telegramInitData = telegramLaunchData() || import.meta.env.VITE_TELEGRAM_INIT_DATA || "";
    // A few Telegram mobile clients expose WebApp.initData shortly after the
    // page script starts. Give that bridge a brief chance before falling back.
    if (!telegramInitData && import.meta.env.PROD) {
      for (let attempt = 0; attempt < 6 && !telegramInitData; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        telegramInitData = telegramLaunchData();
      }
    }
    if (!telegramInitData && import.meta.env.PROD) {
      throw new Error("Telegram could not verify this session. Close this screen and reopen UniVentureAI from the bot.");
    }
    const payload = telegramInitData
      ? await this.post<{ token: string; user: SessionUser; subscription: SubscriptionStatus }>("/api/auth/telegram", { init_data: telegramInitData })
      : await this.post<{ token: string; user: SessionUser; subscription: SubscriptionStatus }>("/api/auth/dev", {
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

  analyze<T>(path: string, body: unknown, file?: File | null): Promise<T> {
    if (!file) return this.post<T>(path, body);
    const form = new FormData();
    form.append("file", file);
    form.append("target", path);
    const details = { ...(body as Record<string, unknown>) };
    for (const key of ["content", "activity", "projects"]) delete details[key];
    form.append("payload", JSON.stringify(details));
    return this.request<T>("/api/files/analyze", { method: "POST", body: form });
  }

  upload<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    return this.request<T>(path, { method: "POST", body: form });
  }

  track(event: "app_open" | "screen_view" | "paywall_view" | "checkout_started" | "onboarding_completed" | "upgrade_view" | "upgrade_clicked" | "free_limit_reached", properties: Record<string, unknown> = {}, source?: string) {
    if (!this.token) return Promise.resolve({ recorded: false });
    return this.post<{ recorded: boolean }>("/api/analytics/event", { event, properties, source }).catch(() => ({ recorded: false }));
  }
}

export const api = new ApiClient();
