import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Flag, Sparkles } from "lucide-react";
import { api } from "../api";
import type { Navigate, Readiness } from "../types";
import { Button, Card, ErrorBanner, Input, ScreenHeader, Tag, Textarea } from "../components/ui";

interface PlanTask { title: string; why: string; effort: string; done_when: string; category: string; }
interface PlanResult { headline: string; today_priority: PlanTask; this_week: PlanTask[]; this_month: PlanTask[]; before_deadline: PlanTask[]; workload_note: string; }

const phases: Array<{ key: keyof Pick<PlanResult, "this_week" | "this_month" | "before_deadline">; label: string; subtitle: string }> = [
  { key: "this_week", label: "This week", subtitle: "Build momentum" },
  { key: "this_month", label: "This month", subtitle: "Move the core pieces" },
  { key: "before_deadline", label: "Before deadline", subtitle: "Close every open loop" },
];

function TaskCard({ task, index }: { task: PlanTask; index: number }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`plan-task ${done ? "plan-task-done" : ""}`} onClick={() => setDone((value) => !value)}>
      <span className="task-check">{done ? <CheckCircle2 size={19} /> : index + 1}</span>
      <span className="task-copy"><small>{task.category} • {task.effort}</small><strong>{task.title}</strong><p>{task.why}</p><em>Done when: {task.done_when}</em></span>
    </button>
  );
}

export default function ApplicationPlanScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [deadline, setDeadline] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("8");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ result: PlanResult; readiness: Readiness }>("/api/application-plan", { deadline: deadline || null, weekly_hours: Number(weeklyHours), extra_context: context || null });
      setResult(data.result); setReadiness(data.readiness); onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create your plan."); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Personalized roadmap" title="Application Plan" description="A dependency-aware plan built from your saved portfolio and actual weekly capacity." onBack={() => navigate("home")} />
      <Card>
        <div className="form-grid two">
          <Input label="Nearest deadline" placeholder="e.g. Nov 1, 2026" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <Input label="Hours available / week" type="number" min={1} max={80} value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />
        </div>
        <Textarea label="Anything that changed?" rows={4} placeholder="Exams, travel, unfinished test prep, recommenders not confirmed…" value={context} onChange={(e) => setContext(e.target.value)} />
        {error ? <ErrorBanner message={error} /> : null}
        <Button className="w-full" loading={loading} onClick={() => void generate()}><CalendarDays size={18} /> Generate My Roadmap</Button>
      </Card>

      {result ? (
        <div className="space-y-4">
          <Card tone="light" className="plan-hero">
            <div className="priority-icon"><Sparkles size={20} /></div>
            <div><Tag tone="warn">Do this first</Tag><h2>{result.today_priority.title}</h2><p>{result.today_priority.why}</p><div className="task-meta"><span><Clock3 size={14} />{result.today_priority.effort}</span><span><Flag size={14} />{result.today_priority.category}</span></div></div>
          </Card>
          {readiness ? <p className="plan-context">Plan calibrated to your {readiness.score}% preparation score and saved workload.</p> : null}
          {phases.map((phase) => (
            <section key={phase.key} className="timeline-phase">
              <div className="timeline-heading"><span /><div><h3>{phase.label}</h3><p>{phase.subtitle}</p></div></div>
              <div className="timeline-tasks">{(result[phase.key] || []).map((task, index) => <TaskCard key={`${task.title}-${index}`} task={task} index={index} />)}</div>
            </section>
          ))}
          <Card tone="cyan"><Tag tone="cyan">Workload guardrail</Tag><p className="mt-3">{result.workload_note}</p></Card>
        </div>
      ) : null}
    </div>
  );
}

