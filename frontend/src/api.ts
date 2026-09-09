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
  if (detail && typeof detail === "object" && "message" in detail) return String((detail as { message: unknown }).message);
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object" && "msg" in detail[0]) return String(detail[0].msg);
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
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.detail ?? data;
      throw new ApiError(response.status, detailMessage(detail), detail);
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
