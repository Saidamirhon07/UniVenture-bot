import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Award, BookOpenCheck, Brain, ChevronRight, ClipboardList, FileText, GraduationCap, HeartPulse, Pencil, Plane, Plus, Target, TestTube2, Trash2, UsersRound, WalletCards, X } from "lucide-react";
import { api } from "../api";
import type { Navigate, Readiness } from "../types";
import { Button, Card, ErrorBanner, LoadingScreen, ProgressRing, ScreenHeader, Tag } from "../components/ui";

type FieldDef = { key: string; label: string; placeholder: string; type?: "text" | "textarea" | "boolean" };
type SectionDef = { key: string; apiSection: string; title: string; icon: typeof GraduationCap; fields: FieldDef[] };
type Entry = Record<string, string>;

const sections: SectionDef[] = [
  { key: "profile", apiSection: "academic_profile", title: "Academic Profile", icon: GraduationCap, fields: [
    { key: "preferred_name", label: "Your name", placeholder: "How UniVentureAI should address you" }, { key: "grade", label: "Grade", placeholder: "Grade 11" }, { key: "graduation_year", label: "Graduation year", placeholder: "2027" }, { key: "country", label: "Country", placeholder: "Uzbekistan" }, { key: "citizenship", label: "Citizenship", placeholder: "Uzbekistan" }, { key: "curriculum", label: "Curriculum", placeholder: "National / IB / A Levels" }, { key: "major", label: "Target major", placeholder: "Computer Science" }, { key: "target_countries", label: "Target countries", placeholder: "United States, Canada" }, { key: "career_goal", label: "Long-term direction", placeholder: "Build education technology for Central Asia", type: "textarea" },
  ] },
  { key: "test_scores", apiSection: "test_scores", title: "Test Scores", icon: TestTube2, fields: [
    { key: "gpa", label: "GPA", placeholder: "3.8/4.0" }, { key: "sat", label: "SAT", placeholder: "1450" }, { key: "act", label: "ACT", placeholder: "33" }, { key: "ielts", label: "IELTS", placeholder: "7.5" }, { key: "toefl", label: "TOEFL", placeholder: "105" },
  ] },
  { key: "essays", apiSection: "essays", title: "Essays Status", icon: FileText, fields: [
    { key: "personal_statement", label: "Personal Statement", placeholder: "Not started / outline / draft / revised / final" }, { key: "supplementals", label: "Supplementals", placeholder: "e.g. 4/10 drafted" }, { key: "common_app", label: "Common App", placeholder: "Draft" }, { key: "notes", label: "Notes", placeholder: "Current blocker…", type: "textarea" },
  ] },
  { key: "ecs", apiSection: "extracurriculars", title: "Extracurricular Spike", icon: Target, fields: [
    { key: "spike", label: "Your spike", placeholder: "Education technology + community impact" }, { key: "notes", label: "Overall strategy notes", placeholder: "What connects these activities? What proof is missing?", type: "textarea" },
  ] },
  { key: "awards", apiSection: "awards", title: "Awards & Honors", icon: Award, fields: [{ key: "notes", label: "Awards strategy notes", placeholder: "Selectivity, translations or proof to collect…", type: "textarea" }] },
  { key: "projects", apiSection: "projects", title: "Portfolio Projects", icon: BookOpenCheck, fields: [{ key: "field", label: "Field", placeholder: "CS / design / research" }, { key: "items", label: "Projects", placeholder: "One project per line", type: "textarea" }, { key: "portfolio_url", label: "Portfolio URL", placeholder: "https://…" }, { key: "notes", label: "Gaps or notes", placeholder: "What still needs proof?", type: "textarea" }] },
  { key: "recommendations", apiSection: "recommendations", title: "Recommendation Letters", icon: UsersRound, fields: [{ key: "teachers", label: "Teachers", placeholder: "One teacher per line", type: "textarea" }, { key: "status", label: "Status", placeholder: "Not started / requested / confirmed / submitted" }, { key: "stories", label: "Stories they could tell", placeholder: "One story per line", type: "textarea" }] },
  { key: "preferences", apiSection: "preferences", title: "Countries & Environment", icon: Plane, fields: [{ key: "intended_major", label: "Intended major", placeholder: "Economics" }, { key: "target_countries", label: "Countries", placeholder: "US, UK" }, { key: "environment", label: "Preferred environment", placeholder: "Urban, collaborative, research-intensive" }, { key: "campus_size", label: "Campus size", placeholder: "Small / medium / large" }, { key: "career_goal", label: "Career direction", placeholder: "What should university help you build toward?", type: "textarea" }, { key: "constraints", label: "Constraints", placeholder: "Location, climate, size…", type: "textarea" }] },
  { key: "financial_aid", apiSection: "financial_aid", title: "Financial Aid Needs", icon: WalletCards, fields: [{ key: "needs_aid", label: "Need financial aid?", placeholder: "", type: "boolean" }, { key: "budget", label: "Annual budget", placeholder: "$12,000" }, { key: "max_family_contribution", label: "Max family contribution", placeholder: "$8,000" }, { key: "notes", label: "Aid notes", placeholder: "Scholarship constraints…", type: "textarea" }] },
  { key: "deadlines", apiSection: "deadlines", title: "My Deadlines", icon: ClipboardList, fields: [{ key: "nearest_deadline", label: "Nearest deadline", placeholder: "Nov 1, 2026" }, { key: "application_round", label: "Round", placeholder: "Early Action" }, { key: "target_intake", label: "Target intake", placeholder: "Fall 2027" }, { key: "exam_dates", label: "Planned test dates", placeholder: "SAT Oct 3, IELTS Sep 12", type: "textarea" }, { key: "items", label: "Deadline list", placeholder: "One deadline per line", type: "textarea" }] },
  { key: "wellness", apiSection: "wellness", title: "Wellness & Workload", icon: HeartPulse, fields: [{ key: "stress_level", label: "Stress level (1-10)", placeholder: "6" }, { key: "hours_per_week", label: "Hours available / week", placeholder: "8" }, { key: "available_days", label: "Available days", placeholder: "Tue, Thu, Sat" }, { key: "energy_pattern", label: "Best focus time", placeholder: "Early mornings / evenings / weekends" }, { key: "sleep_hours", label: "Average sleep", placeholder: "7" }, { key: "support_needs", label: "Support needed", placeholder: "What would make this manageable?", type: "textarea" }] },
];

const blankActivity = (): Entry => ({ name: "", role: "", organization: "", time: "", description: "" });
const blankAward = (): Entry => ({ name: "", level: "", year: "", context: "" });
function toEditor(value: unknown) { return Array.isArray(value) ? value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n") : value === true ? "yes" : value === false ? "no" : String(value ?? ""); }
function parseEditor(field: FieldDef, value: string) {
  if (field.type === "boolean") return value === "yes";
  if (["items", "highlights", "teachers", "stories"].includes(field.key)) return value.split("\n").map((item) => item.trim()).filter(Boolean);
  if (field.key === "target_countries") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (field.key === "available_days") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (["stress_level", "hours_per_week", "sleep_hours", "graduation_year"].includes(field.key) && value.trim()) return Number(value);
  return value;
}
function storedEntries(value: unknown, fallbackKey: string): Entry[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "object" && item ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, nested]) => [key, String(nested ?? "")])) : { [fallbackKey]: String(item) });
}
function summaryFor(section: SectionDef, data: Record<string, unknown>) {
  if (section.key === "ecs" && Array.isArray(data.activities) && data.activities.length) return `${data.activities.length} activities saved`;
  if (section.key === "awards" && Array.isArray(data.items) && data.items.length) return `${data.items.length} awards saved`;
  const values = section.fields.map((field) => data[field.key]).filter((value) => value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length));
  if (!values.length) return "Add details";
  return values.slice(0, 2).map((value) => Array.isArray(value) ? `${value.length} saved` : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)).join(" • ").slice(0, 95);
}

export default function PortfolioScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [portfolio, setPortfolio] = useState<{ profile: Record<string, unknown>; application: Record<string, Record<string, unknown>> } | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [editing, setEditing] = useState<SectionDef | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [activityDrafts, setActivityDrafts] = useState<Entry[]>([]);
  const [awardDrafts, setAwardDrafts] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.get<{ portfolio: typeof portfolio; readiness: Readiness }>("/api/me");
      setPortfolio(data.portfolio); setReadiness(data.readiness);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your portfolio."); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    document.body.classList.toggle("sheet-open", Boolean(editing));
    return () => document.body.classList.remove("sheet-open");
  }, [editing]);

  function sectionData(section: SectionDef): Record<string, unknown> {
    if (!portfolio) return {};
    if (section.key === "profile") return portfolio.profile;
    if (section.key === "financial_aid") return portfolio.application.preferences || {};
    return portfolio.application[section.key] || {};
  }
  function openEditor(section: SectionDef) {
    const data = sectionData(section);
    setDraft(Object.fromEntries(section.fields.map((field) => [field.key, toEditor(data[field.key])])));
    if (section.key === "ecs") {
      const entries = storedEntries(data.activities, "description");
      setActivityDrafts([...entries, ...Array.from({ length: Math.max(0, 10 - entries.length) }, blankActivity)].slice(0, 10));
    }
    if (section.key === "awards") {
      const entries = storedEntries(data.items, "name");
      setAwardDrafts([...entries, ...Array.from({ length: Math.max(0, 10 - entries.length) }, blankAward)].slice(0, 10));
    }
    setEditing(section); setError("");
  }
  async function save() {
    if (!editing) return;
    setLoading(true); setError("");
    try {
      const data: Record<string, unknown> = Object.fromEntries(editing.fields.map((field) => [field.key, parseEditor(field, draft[field.key] || "")]));
      if (editing.key === "ecs") {
        const activities = activityDrafts.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.trim()]))).filter((item) => Object.values(item).some(Boolean));
        data.activities = activities;
        data.summary = activities.map((item) => `${item.name || "Activity"}: ${item.description || item.role || ""}`).join("\n");
        data.highlights = activities.map((item) => item.description).filter(Boolean);
      }
      if (editing.key === "awards") data.items = awardDrafts.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.trim()]))).filter((item) => Object.values(item).some(Boolean));
      const response = await api.post<{ portfolio: NonNullable<typeof portfolio>; readiness: Readiness }>("/api/profile/update", { section: editing.apiSection, data });
      setPortfolio(response.portfolio); setReadiness(response.readiness); setEditing(null); onChanged();
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this section."); }
    finally { setLoading(false); }
  }
  function updateEntry(setter: React.Dispatch<React.SetStateAction<Entry[]>>, index: number, key: string, value: string) {
    setter((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  const completed = useMemo(() => portfolio ? sections.filter((section) => summaryFor(section, sectionData(section)) !== "Add details").length : 0, [portfolio]);
  if (!portfolio && !error) return <LoadingScreen label="Opening your application portfolio…" />;

  return <div className="page-enter space-y-3">
    <ScreenHeader eyebrow="Your living application record" title="My Portfolio" description="Edit once. Every AI tool uses this same saved memory." onBack={() => navigate("home")} />
    {error && !editing ? <ErrorBanner message={error} /> : null}
    {portfolio && readiness ? <>
      <Card className="portfolio-score"><ProgressRing value={readiness.score} size={102} /><div><Tag tone="cyan">{completed}/{sections.length} sections active</Tag><h2>{readiness.blocker.label} needs attention</h2><p>{readiness.blocker.message} This measures preparation—not admission probability.</p></div></Card>
      <div className="portfolio-list">{sections.map((section) => { const Icon = section.icon; const summary = summaryFor(section, sectionData(section)); return <button key={section.key} onClick={() => openEditor(section)}><span className="portfolio-icon"><Icon size={19} /></span><span><strong>{section.title}</strong><small>{summary}</small></span>{summary === "Add details" ? <Tag>Add</Tag> : <ChevronRight size={18} />}</button>; })}</div>
      <Card tone="cyan" className="memory-note"><Brain size={20} /><div><strong>Connected memory</strong><p>Updates here improve plans, matches and feedback in both the Mini App and chatbot.</p></div></Card>
    </> : null}

    {editing ? createPortal(<div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><div className="edit-sheet">
      <div className="sheet-handle" />
      <div className="sheet-title"><div><Tag tone="cyan">Edit section</Tag><h2>{editing.title}</h2></div><button aria-label="Close editor" onClick={() => setEditing(null)}><X size={20} /></button></div>
      <div className="sheet-body space-y-3">
        {editing.fields.map((field) => <label className="field" key={field.key}><span className="field-label">{field.label}</span>{field.type === "textarea" ? <textarea className="textarea" rows={4} placeholder={field.placeholder} value={draft[field.key] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} /> : field.type === "boolean" ? <select className="input" value={draft[field.key] || "no"} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}><option value="yes">Yes</option><option value="no">No</option></select> : <input className="input" placeholder={field.placeholder} value={draft[field.key] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>)}
        {editing.key === "ecs" ? <div className="repeater-section"><div className="repeater-heading"><div><strong>Your activities</strong><small>{activityDrafts.length}/10 slots</small></div>{activityDrafts.length < 10 ? <button onClick={() => setActivityDrafts((items) => [...items, blankActivity()])}><Plus size={16} /> Add</button> : null}</div>{activityDrafts.map((item, index) => <div className="repeater-card" key={index}><div className="repeater-number"><span>{index + 1}</span><strong>{item.name || `Activity ${index + 1}`}</strong>{activityDrafts.length > 1 ? <button aria-label={`Remove activity ${index + 1}`} onClick={() => setActivityDrafts((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button> : null}</div><input className="input" placeholder="Activity name" value={item.name || ""} onChange={(event) => updateEntry(setActivityDrafts, index, "name", event.target.value)} /><div className="mini-grid"><input className="input" placeholder="Role" value={item.role || ""} onChange={(event) => updateEntry(setActivityDrafts, index, "role", event.target.value)} /><input className="input" placeholder="Organization" value={item.organization || ""} onChange={(event) => updateEntry(setActivityDrafts, index, "organization", event.target.value)} /></div><input className="input" placeholder="Grades + time (10–12 · 5 hr/wk)" value={item.time || ""} onChange={(event) => updateEntry(setActivityDrafts, index, "time", event.target.value)} /><textarea className="textarea" rows={3} placeholder="What you did, leadership, numbers and real impact" value={item.description || ""} onChange={(event) => updateEntry(setActivityDrafts, index, "description", event.target.value)} /></div>)}</div> : null}
        {editing.key === "awards" ? <div className="repeater-section"><div className="repeater-heading"><div><strong>Awards & honors</strong><small>{awardDrafts.length}/10 slots</small></div>{awardDrafts.length < 10 ? <button onClick={() => setAwardDrafts((items) => [...items, blankAward()])}><Plus size={16} /> Add</button> : null}</div>{awardDrafts.map((item, index) => <div className="repeater-card" key={index}><div className="repeater-number"><span>{index + 1}</span><strong>{item.name || `Award ${index + 1}`}</strong>{awardDrafts.length > 1 ? <button aria-label={`Remove award ${index + 1}`} onClick={() => setAwardDrafts((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button> : null}</div><input className="input" placeholder="Award / honor name" value={item.name || ""} onChange={(event) => updateEntry(setAwardDrafts, index, "name", event.target.value)} /><div className="mini-grid"><input className="input" placeholder="Level (school, national…)" value={item.level || ""} onChange={(event) => updateEntry(setAwardDrafts, index, "level", event.target.value)} /><input className="input" placeholder="Year / grade" value={item.year || ""} onChange={(event) => updateEntry(setAwardDrafts, index, "year", event.target.value)} /></div><textarea className="textarea" rows={2} placeholder="Selectivity, rank, scope or context" value={item.context || ""} onChange={(event) => updateEntry(setAwardDrafts, index, "context", event.target.value)} /></div>)}</div> : null}
      </div>
      <div className="sheet-actions">{error ? <ErrorBanner message={error} /> : null}<Button className="w-full" loading={loading} onClick={() => void save()}><Pencil size={17} /> Save Section</Button></div>
    </div></div>, document.body) : null}
  </div>;
}
