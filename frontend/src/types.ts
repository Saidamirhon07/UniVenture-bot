export type ScreenId =
  | "home"
  | "discover"
  | "prep"
  | "coach"
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

export interface DashboardData {
  name: string;
  location?: string;
  intended_major?: string;
  readiness: Readiness;
  profile_completeness: ProfileCompleteness;
  today_priority: { title: string; why: string; effort?: string };
  weekly_path: Array<{ key?: string; title: string; effort?: string; category?: string }>;
  trajectory?: { now: string; next: string; deadline: string };
  status_cards: Array<{ key: string; label: string; value: string; progress: number }>;
  subscription: { has_access: boolean; access_type: string; remaining_days: number | null; price: string };
}

export interface EvaluationResponse {
  evaluation_id?: string;
  topic?: string;
  mode?: string;
  can_full_review: boolean;
  result: Record<string, unknown>;
}
