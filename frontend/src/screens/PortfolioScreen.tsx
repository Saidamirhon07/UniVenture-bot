import { useEffect, useMemo, useState } from "react";
import { Award, BookOpenCheck, Brain, ChevronRight, ClipboardList, FileText, GraduationCap, HeartPulse, Landmark, Pencil, Plane, Sparkles, Target, TestTube2, UsersRound, WalletCards, X } from "lucide-react";
import { api } from "../api";
import type { Navigate, Readiness } from "../types";
import { Button, Card, ErrorBanner, LoadingScreen, ProgressRing, ScreenHeader, Tag } from "../components/ui";

type FieldDef = { key: string; label: string; placeholder: string; type?: "text" | "textarea" | "boolean" };
type SectionDef = { key: string; apiSection: string; title: string; icon: typeof GraduationCap; fields: FieldDef[] };

const sections: SectionDef[] = [
  { key: "profile", apiSection: "academic_profile", title: "Academic Profile", icon: GraduationCap, fields: [
    { key: "grade", label: "Grade", placeholder: "Grade 11" }, { key: "country", label: "Country", placeholder: "Uzbekistan" }, { key: "major", label: "Target major", placeholder: "Computer Science" }, { key: "target_countries", label: "Target countries", placeholder: "United States, Canada" },
  ] },
  { key: "test_scores", apiSection: "test_scores", title: "Test Scores", icon: TestTube2, fields: [
    { key: "gpa", label: "GPA", placeholder: "3.8/4.0" }, { key: "sat", label: "SAT", placeholder: "1450" }, { key: "act", label: "ACT", placeholder: "33" }, { key: "ielts", label: "IELTS", placeholder: "7.5" }, { key: "toefl", label: "TOEFL", placeholder: "105" },
  ] },
  { key: "essays", apiSection: "essays", title: "Essays Status", icon: FileText, fields: [
    { key: "personal_statement", label: "Personal Statement", placeholder: "Not started / outline / draft / revised / final" }, { key: "supplementals", label: "Supplementals", placeholder: "e.g. 4/10 drafted" }, { key: "common_app", label: "Common App", placeholder: "Draft" }, { key: "notes", label: "Notes", placeholder: "Current blocker…", type: "textarea" },
  ] },
  { key: "ecs", apiSection: "extracurriculars", title: "Extracurricular Spike", icon: Target, fields: [
    { key: "spike", label: "Your spike", placeholder: "Education technology + community impact" }, { key: "summary", label: "Activity summary", placeholder: "Describe your strongest activities and evidence…", type: "textarea" }, { key: "highlights", label: "Highlights", placeholder: "One achievement per line", type: "textarea" },
  ] },
  { key: "awards", apiSection: "awards", title: "Awards & Honors", icon: Award, fields: [{ key: "items", label: "Awards", placeholder: "One award per line", type: "textarea" }, { key: "notes", label: "Context", placeholder: "Selectivity, level, year…", type: "textarea" }] },
  { key: "projects", apiSection: "projects", title: "Portfolio Projects", icon: BookOpenCheck, fields: [{ key: "field", label: "Field", placeholder: "CS / design / research" }, { key: "items", label: "Projects", placeholder: "One project per line", type: "textarea" }, { key: "portfolio_url", label: "Portfolio URL", placeholder: "https://…" }, { key: "notes", label: "Gaps or notes", placeholder: "What still needs proof?", type: "textarea" }] },
  { key: "recommendations", apiSection: "recommendations", title: "Recommendation Letters", icon: UsersRound, fields: [{ key: "teachers", label: "Teachers", placeholder: "One teacher per line", type: "textarea" }, { key: "status", label: "Status", placeholder: "Not started / requested / confirmed / submitted" }, { key: "stories", label: "Stories they could tell", placeholder: "One story per line", type: "textarea" }] },
  { key: "preferences", apiSection: "preferences", title: "Countries & Environment", icon: Plane, fields: [{ key: "intended_major", label: "Intended major", placeholder: "Economics" }, { key: "target_countries", label: "Countries", placeholder: "US, UK" }, { key: "environment", label: "Preferred environment", placeholder: "Urban, collaborative, research-intensive" }, { key: "constraints", label: "Constraints", placeholder: "Location, climate, size…", type: "textarea" }] },
  { key: "financial_aid", apiSection: "financial_aid", title: "Financial Aid Needs", icon: WalletCards, fields: [{ key: "needs_aid", label: "Need financial aid?", placeholder: "", type: "boolean" }, { key: "budget", label: "Annual budget", placeholder: "$12,000" }, { key: "max_family_contribution", label: "Max family contribution", placeholder: "$8,000" }, { key: "notes", label: "Aid notes", placeholder: "Scholarship constraints…", type: "textarea" }] },
  { key: "deadlines", apiSection: "deadlines", title: "Deadlines", icon: ClipboardList, fields: [{ key: "nearest_deadline", label: "Nearest deadline", placeholder: "Nov 1, 2026" }, { key: "application_round", label: "Round", placeholder: "Early Action" }, { key: "items", label: "Deadline list", placeholder: "One deadline per line", type: "textarea" }] },
  { key: "wellness", apiSection: "wellness", title: "Wellness & Workload", icon: HeartPulse, fields: [{ key: "stress_level", label: "Stress level (1-10)", placeholder: "6" }, { key: "hours_per_week", label: "Hours available / week", placeholder: "8" }, { key: "sleep_hours", label: "Average sleep", placeholder: "7" }, { key: "support_needs", label: "Support needed", placeholder: "What would make this manageable?", type: "textarea" }] },
];

function toEditor(value: unknown) { return Array.isArray(value) ? value.join("\n") : value === true ? "yes" : value === false ? "no" : String(value ?? ""); }
function parseEditor(field: FieldDef, value: string) {
  if (field.type === "boolean") return value === "yes";
  if (["items", "highlights", "teachers", "stories"].includes(field.key)) return value.split("\n").map((item) => item.trim()).filter(Boolean);
  if (field.key === "target_countries") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (["stress_level", "hours_per_week", "sleep_hours"].includes(field.key) && value.trim()) return Number(value);
  return value;
}

function summaryFor(section: SectionDef, data: Record<string, unknown>) {
  const values = section.fields.map((field) => data[field.key]).filter((value) => value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length));
  if (!values.length) return "Add details";
  return values.slice(0, 2).map((value) => Array.isArray(value) ? `${value.length} saved` : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)).join(" • ").slice(0, 95);
}

export default function PortfolioScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [portfolio, setPortfolio] = useState<{ profile: Record<string, unknown>; application: Record<string, Record<string, unknown>> } | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [editing, setEditing] = useState<SectionDef | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.get<{ portfolio: typeof portfolio; readiness: Readiness }>("/api/me");
      setPortfolio(data.portfolio); setReadiness(data.readiness);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your portfolio."); }
  }
  useEffect(() => { void load(); }, []);

  function sectionData(section: SectionDef): Record<string, unknown> {
    if (!portfolio) return {};
    if (section.key === "profile") return portfolio.profile;
    if (section.key === "financial_aid") return portfolio.application.preferences || {};
    return portfolio.application[section.key] || {};
  }

  function openEditor(section: SectionDef) {
    const data = sectionData(section);
    setDraft(Object.fromEntries(section.fields.map((field) => [field.key, toEditor(data[field.key])])));
    setEditing(section); setError("");
  }

  async function save() {
    if (!editing) return;
    setLoading(true); setError("");
    try {
      const data = Object.fromEntries(editing.fields.map((field) => [field.key, parseEditor(field, draft[field.key] || "")]));
      const response = await api.post<{ portfolio: NonNullable<typeof portfolio>; readiness: Readiness }>("/api/profile/update", { section: editing.apiSection, data });
      setPortfolio(response.portfolio); setReadiness(response.readiness); setEditing(null); onChanged();
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this section."); }
    finally { setLoading(false); }
  }

  const completed = useMemo(() => portfolio ? sections.filter((section) => summaryFor(section, sectionData(section)) !== "Add details").length : 0, [portfolio]);
  if (!portfolio && !error) return <LoadingScreen label="Opening your application portfolio…" />;

  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Your living application record" title="My Portfolio" description="Edit once. Essay reviews, school matching and planning all use the same memory." onBack={() => navigate("home")} />
      {error && !editing ? <ErrorBanner message={error} /> : null}
      {portfolio && readiness ? (
        <>
          <Card className="portfolio-score">
            <ProgressRing value={readiness.score} size={102} />
            <div><Tag tone="cyan">{completed}/{sections.length} sections active</Tag><h2>{readiness.blocker.label} needs attention</h2><p>{readiness.blocker.message} The score measures preparation, not admission probability.</p></div>
          </Card>
          <div className="portfolio-list">
            {sections.map((section) => {
              const Icon = section.icon;
              const data = sectionData(section);
              const summary = summaryFor(section, data);
              return (
                <button key={section.key} onClick={() => openEditor(section)}>
                  <span className="portfolio-icon"><Icon size={19} /></span>
                  <span><strong>{section.title}</strong><small>{summary}</small></span>
                  {summary === "Add details" ? <Tag>Add</Tag> : <ChevronRight size={18} />}
                </button>
              );
            })}
          </div>
          <Card tone="cyan" className="memory-note"><Brain size={20} /><div><strong>Connected memory</strong><p>Updates here immediately improve future plans and feedback. Your existing chatbot sees the same saved profile.</p></div></Card>
        </>
      ) : null}

      {editing ? (
        <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
          <div className="edit-sheet">
            <div className="sheet-handle" />
            <div className="sheet-title"><div><Tag tone="cyan">Edit section</Tag><h2>{editing.title}</h2></div><button onClick={() => setEditing(null)}><X size={20} /></button></div>
            <div className="space-y-3">
              {editing.fields.map((field) => (
                <label className="field" key={field.key}>
                  <span className="field-label">{field.label}</span>
                  {field.type === "textarea" ? <textarea className="textarea" rows={4} placeholder={field.placeholder} value={draft[field.key] || ""} onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))} />
                    : field.type === "boolean" ? <select className="input" value={draft[field.key] || "no"} onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))}><option value="yes">Yes</option><option value="no">No</option></select>
                    : <input className="input" placeholder={field.placeholder} value={draft[field.key] || ""} onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))} />}
                </label>
              ))}
            </div>
            {error ? <ErrorBanner message={error} /> : null}
            <Button className="w-full" loading={loading} onClick={() => void save()}><Pencil size={17} /> Save Section</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
