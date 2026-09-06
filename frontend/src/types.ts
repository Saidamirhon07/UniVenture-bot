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
  | "boost";

export type Navigate = (screen: ScreenId) => void;

export interface SessionUser {
  id: number;
  name: string;
  has_manual_name?: boolean;
  onboarding_complete?: boolean;
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
  subscription: { has_access: boolean; access_type: string; remaining_days: number | null; price: string };
}

export interface EvaluationResponse {
  evaluation_id?: string;
  topic?: string;
  mode?: string;
  can_full_review: boolean;
  result: Record<string, unknown>;
}
