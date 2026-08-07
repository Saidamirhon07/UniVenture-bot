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
}

export interface Readiness {
  score: number;
  categories: Array<{ key: string; label: string; score: number; max: number }>;
  blocker: { key: string; label: string; score: number; max: number; message: string };
}

export interface DashboardData {
  name: string;
  readiness: Readiness;
  today_priority: { title: string; why: string; effort?: string };
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
