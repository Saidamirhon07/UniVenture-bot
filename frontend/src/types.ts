export type ScreenId =
  | "home"
  | "roadmap"
  | "tools"
  | "discover"
  | "prep"
  | "coach"
  | "brainstorm"
  | "rewrite"
  | "essay"
  | "school"
  | "plan"
  | "portfolio"
  | "ec"
  | "ielts"
  | "sat"
  | "feedback"
  | "recommendation"
  | "portfolio-builder"
  | "boost"
  | "founder"
  | "free-check";

export type Navigate = (screen: ScreenId) => void;

export interface SessionUser {
  id: number;
  name: string;
  has_manual_name?: boolean;
  onboarding_complete?: boolean;
  is_admin?: boolean;
}

export interface FounderAnalytics {
  generated_at: string;
  window_days: number;
  audience: { dau: number; wau: number; mau: number; total_users: number };
  subscriptions: { active_paid: number; ever_paid: number; churned: number; churn_rate: number; cancelled_active: number };
  funnel: { visitors: number; upgrade_viewed: number; checkout_started: number; paid: number; visitor_to_paid: number; visitor_to_upgrade: number; visitor_to_checkout: number };
  tools: Array<{ name: string; views: number }>;
  practice: Record<"sat" | "ielts", { sessions: number; students: number; questions: number; correct: number; accuracy: number }>;
  revenue_by_source: Array<{ source: string; currency: string; amount: number; payments: number; buyers: number }>;
  timeline: Array<{ date: string; active_users: number; opens: number; tool_views: number }>;
  privacy: string;
}

export interface QuestionFactorySnapshot {
  categories: Record<string, { target: number; verified: number; published: number; remaining: number }>;
  review_queue: Array<{ id: string; category: string; prompt: string; level: string; verification_confidence: number; verification_note?: string }>;
  total_items: number;
  storage_path: string;
}

export interface SubscriptionStatus {
  has_access: boolean;
  is_premium: boolean;
  tier: "free" | "premium";
  access_type: "paid" | "trial" | "expired" | "unrestricted" | string;
  remaining_days: number | null;
  expires_at?: string | null;
  trial_ends_at?: string | null;
  price: string;
  price_uzs: number;
  period_days: number;
  recurring: boolean;
  auto_renews?: boolean;
  support_handle?: string;
  payment_method?: "manual_card" | string;
  card_number?: string;
  card_holder?: string;
  bank_name?: string;
  payment_status?: "pending" | "approved" | "rejected" | null;
}

export interface ProfileCompleteness {
  percent: number;
  filled: number;
  total: number;
  missing: Array<{ key: string; label: string }>;
}

export interface Readiness {
  score: number;
  categories: Array<{ key: string; label: string; score: number; max: number }>;
  blocker: { key: string; label: string; score: number; max: number; message: string };
}

export interface TaskAction {
  mode: "navigate" | "reminder";
  label: string;
  screen: ScreenId;
  secondary_label?: string;
}

export interface PracticeStreak {
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
  today_skills: Array<"sat" | "ielts">;
  last_completed_date: string | null;
  total_sessions: number;
  just_recorded?: "sat" | "ielts";
}

export interface NotificationItem {
  id: string;
  kind: "task" | "streak" | "deadline" | "profile" | "opportunity" | "reminder";
  title: string;
  body: string;
  screen: ScreenId;
  action_label: string;
  unread: boolean;
}

export interface DashboardData {
  name: string;
  location?: string;
  intended_major?: string;
  readiness: Readiness;
  profile_completeness: ProfileCompleteness;
  today_priority: { key?: string; title: string; why: string; effort?: string; category?: string; done_when?: string };
  today_action: TaskAction;
  weekly_path: Array<{ key?: string; title: string; effort?: string; category?: string }>;
  trajectory?: { now: string; next: string; deadline: string };
  status_cards: Array<{ key: string; label: string; value: string; progress: number }>;
  practice_streak: PracticeStreak;
  notifications: NotificationItem[];
  unread_notifications: number;
  subscription: SubscriptionStatus;
}

export interface EvaluationResponse {
  evaluation_id?: string;
  topic?: string;
  mode?: string;
  can_full_review: boolean;
  result: Record<string, unknown>;
}
