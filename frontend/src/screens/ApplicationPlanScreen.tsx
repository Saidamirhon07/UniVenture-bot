import { useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CalendarDays, Check, CheckCircle2, Clock3, Flag, GitBranch, Route, ShieldCheck, Sparkles, Target } from "lucide-react";
import { api } from "../api";
import type { Navigate, ProfileCompleteness, Readiness } from "../types";
import { Button, Card, ErrorBanner, Input, ScreenHeader, Segmented, Select, Tag, Textarea } from "../components/ui";

interface PlanTask { key: string; title: string; why: string; effort: string; done_when: string; category: string; depends_on?: string; energy?: string; }
interface PlanResult {
  headline: string;
  strategy_note?: string;
  profile_snapshot?: { goal?: string; capacity?: string; main_constraint?: string };
  today_priority: PlanTask;
  this_week: PlanTask[];
  this_month: PlanTask[];
  before_deadline: PlanTask[];
  milestones?: Array<{ label: string; target_date: string; proof: string; status: string }>;
  risk_radar?: Array<{ risk: string; level: string; countermove: string }>;
  weekly_rhythm?: Array<{ day: string; focus: string; minutes: number }>;
  missing_inputs?: string[];
  workload_note: string;
}

const phases: Array<{ key: keyof Pick<PlanResult, "this_week" | "this_month" | "before_deadline">; label: string; subtitle: string }> = [
  { key: "this_week", label: "Launch week", subtitle: "Remove the first blockers" },
  { key: "this_month", label: "Build phase", subtitle: "Create evidence and strong drafts" },
  { key: "before_deadline", label: "Submission runway", subtitle: "Verify, polish and close loops" },
];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function TaskCard({ task, index, planId }: { task: PlanTask; index: number; planId: string }) {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  async function toggle() {
    const next = !done;
    setDone(next); setSaving(true);
    try {
      await api.post("/api/application-plan/task-status", { plan_id: planId, task_key: task.key, done: next });
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred(next ? "success" : "warning");
    } catch { setDone(!next); }
    finally { setSaving(false); }
  }
  return <button type="button" disabled={saving} className={`flight-task ${done ? "done" : ""}`} onClick={() => void toggle()}>
    <span className="flight-task-check">{done ? <CheckCircle2 size={18} /> : index + 1}</span>
    <span className="flight-task-copy"><small>{task.category} · {task.effort}{task.energy ? ` · ${task.energy} energy` : ""}</small><strong>{task.title}</strong><p>{task.why}</p>{task.depends_on && task.depends_on.toLowerCase() !== "none" ? <em><GitBranch size={12} />After: {task.depends_on}</em> : null}<b>Done when: {task.done_when}</b></span>
  </button>;
}

export default function ApplicationPlanScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [form, setForm] = useState({ deadline: "", weekly_hours: "8", extra_context: "", application_round: "Undecided", target_intake: "Fall 2027", school_count: "10", exam_dates: "", recommender_status: "Not started", energy_pattern: "Evenings", plan_style: "balanced" as "balanced" | "intensive" | "low_stress" });
  const [availableDays, setAvailableDays] = useState<string[]>(["Tue", "Thu", "Sat"]);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [planId, setPlanId] = useState("");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [profile, setProfile] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedMinutes = useMemo(() => Number(form.weekly_hours || 0) * 60, [form.weekly_hours]);

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleDay(day: string) { setAvailableDays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day]); }

  async function generate() {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ plan_id: string; result: PlanResult; readiness: Readiness; profile_completeness: ProfileCompleteness }>("/api/application-plan", {
        ...form,
        deadline: form.deadline || null,
        weekly_hours: Number(form.weekly_hours),
        school_count: Number(form.school_count),
        exam_dates: form.exam_dates || null,
        recommender_status: form.recommender_status || null,
        extra_context: form.extra_context || null,
        available_days: availableDays,
      });
      setResult(data.result); setPlanId(data.plan_id); setReadiness(data.readiness); setProfile(data.profile_completeness); onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create your flight plan."); }
    finally { setLoading(false); }
  }

  return <div className="page-enter space-y-3 flight-plan-screen">
    <ScreenHeader eyebrow="Adaptive application system" title="Application Flight Plan" description="A living route built from your profile, real capacity, dependencies and deadlines." onBack={() => navigate("home")} />

    {!result ? <>
      <Card className="flight-intro"><div className="flight-intro-icon"><Route size={23} /></div><div><Tag tone="cyan">Built around your life</Tag><h2>No generic monthly checklist.</h2><p>UniVentureAI sequences what unlocks the next task, then reshapes the week around exams, energy and available time.</p></div></Card>
      <Card className="flight-builder">
        <div className="builder-heading"><div><strong>1. Choose your pace</strong><small>The plan protects this weekly limit.</small></div><span><BatteryCharging size={17} />{selectedMinutes} min / week</span></div>
        <Segmented value={form.plan_style} onChange={(value) => setForm((current) => ({ ...current, plan_style: value }))} options={[{ value: "low_stress", label: "Low stress" }, { value: "balanced", label: "Balanced" }, { value: "intensive", label: "Intensive" }]} />
        <div className="form-grid two flight-deadline-grid"><Input label="Nearest deadline" type="date" value={form.deadline} onChange={(event) => update("deadline", event.target.value)} /><Input label="Hours available / week" type="number" min={1} max={80} value={form.weekly_hours} onChange={(event) => update("weekly_hours", event.target.value)} /></div>
        <div className="form-grid two"><Select label="Application round" value={form.application_round} onChange={(event) => update("application_round", event.target.value)}><option>Undecided</option><option>Early Decision</option><option>Early Action</option><option>Regular Decision</option><option>Rolling</option></Select><Input label="Target intake" placeholder="Fall 2027" value={form.target_intake} onChange={(event) => update("target_intake", event.target.value)} /></div>
        <div className="form-grid two"><Input label="Planned universities" type="number" min={1} max={40} value={form.school_count} onChange={(event) => update("school_count", event.target.value)} /><Select label="Best focus time" value={form.energy_pattern} onChange={(event) => update("energy_pattern", event.target.value)}><option>Early mornings</option><option>Afternoons</option><option>Evenings</option><option>Weekends</option><option>Varies</option></Select></div>

        <div className="field"><span className="field-label">Days you can actually work</span><div className="day-picker">{weekDays.map((day) => <button className={availableDays.includes(day) ? "active" : ""} key={day} onClick={() => toggleDay(day)}>{availableDays.includes(day) ? <Check size={13} /> : null}{day}</button>)}</div></div>
        <div className="form-grid two"><Input label="Upcoming test dates" placeholder="SAT Oct 3, IELTS Sep 12" value={form.exam_dates} onChange={(event) => update("exam_dates", event.target.value)} /><Select label="Recommenders" value={form.recommender_status} onChange={(event) => update("recommender_status", event.target.value)}><option>Not started</option><option>Choosing teachers</option><option>Asked, waiting</option><option>Confirmed</option><option>Submitted</option></Select></div>
        <Textarea label="Known disruptions or non-negotiables" rows={4} placeholder="Final exams, travel, family responsibilities, a competition, unfinished test prep…" value={form.extra_context} onChange={(event) => update("extra_context", event.target.value)} />
        {error ? <ErrorBanner message={error} /> : null}
        <Button className="w-full flight-generate" loading={loading} disabled={!form.weekly_hours || !availableDays.length} onClick={() => void generate()}><Sparkles size={18} />Generate my Flight Plan</Button>
      </Card>
    </> : <div className="space-y-4">
      <Card className="flight-command"><div className="flight-command-top"><div><Tag tone="good">Route generated</Tag><h2>{result.headline}</h2></div><span>{readiness?.score || 0}<small>/100 ready</small></span></div><p>{result.strategy_note || result.workload_note}</p><div className="flight-snapshot"><span><small>Goal</small><strong>{result.profile_snapshot?.goal || form.target_intake}</strong></span><span><small>Capacity</small><strong>{result.profile_snapshot?.capacity || `${form.weekly_hours} hr/week`}</strong></span><span><small>Main constraint</small><strong>{result.profile_snapshot?.main_constraint || "Verify deadlines"}</strong></span></div></Card>

      {result.milestones?.length ? <section className="milestone-section"><div className="section-title"><h2>Your generated runway</h2><span>{result.milestones.length} milestones</span></div><div className="milestone-runway">{result.milestones.slice(0, 5).map((milestone, index) => <div className={`milestone ${index === 0 ? "active" : ""}`} key={`${milestone.label}-${index}`}><span>{index === 0 ? <Target size={15} /> : <Flag size={14} />}</span><div><small>{milestone.target_date} · {milestone.status}</small><strong>{milestone.label}</strong><p>{milestone.proof}</p></div></div>)}</div></section> : null}

      <Card tone="light" className="plan-hero"><div className="priority-icon"><Sparkles size={20} /></div><div><Tag tone="warn">Do this first</Tag><h2>{result.today_priority.title}</h2><p>{result.today_priority.why}</p><div className="task-meta"><span><Clock3 size={14} />{result.today_priority.effort}</span><span><Flag size={14} />{result.today_priority.category}</span></div></div></Card>

      {phases.map((phase) => <section key={phase.key} className="timeline-phase flight-phase"><div className="timeline-heading"><span /><div><h3>{phase.label}</h3><p>{phase.subtitle}</p></div></div><div className="timeline-tasks">{(result[phase.key] || []).map((task, index) => <TaskCard key={task.key || `${task.title}-${index}`} task={task} index={index} planId={planId} />)}</div></section>)}

      {result.weekly_rhythm?.length ? <Card className="weekly-rhythm"><div className="section-title"><h2>Your weekly rhythm</h2><span>{form.plan_style}</span></div>{result.weekly_rhythm.map((item, index) => <div key={`${item.day}-${index}`}><span>{item.day}</span><strong>{item.focus}</strong><em>{item.minutes} min</em></div>)}</Card> : null}

      {result.risk_radar?.length ? <Card className="risk-radar"><div className="section-title"><h2>Risk radar</h2><ShieldCheck size={18} /></div>{result.risk_radar.map((item, index) => <div key={`${item.risk}-${index}`}><span className={`risk-${item.level}`}><AlertTriangle size={15} />{item.level}</span><div><strong>{item.risk}</strong><p>{item.countermove}</p></div></div>)}</Card> : null}

      {result.missing_inputs?.length || (profile && profile.percent < 80) ? <Card tone="cyan"><Tag tone="cyan">Make version 2 sharper</Tag><p className="mt-3">{result.missing_inputs?.join(" · ") || `Your profile is ${profile?.percent}% complete. Add the missing signals in Portfolio.`}</p><Button variant="secondary" className="w-full" onClick={() => navigate("portfolio")}>Complete my profile</Button></Card> : null}
      <Card tone="cyan"><Tag tone="cyan">Workload guardrail</Tag><p className="mt-3">{result.workload_note}</p></Card>
      <Button variant="secondary" className="w-full" onClick={() => setResult(null)}><CalendarDays size={17} />Recalibrate the plan</Button>
    </div>}
  </div>;
}
