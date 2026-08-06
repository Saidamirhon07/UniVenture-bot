import { useState } from "react";
import { BookmarkPlus, Check, GraduationCap, Landmark, Search, ShieldAlert } from "lucide-react";
import { api } from "../api";
import type { Navigate } from "../types";
import { Button, Card, ErrorBanner, Input, ScreenHeader, Select, Tag, Textarea } from "../components/ui";

interface SchoolCardData {
  name: string;
  why_fit: string;
  risk_level: string;
  aid_note: string;
  next_research_step: string;
}

interface FinderResult {
  profile_read: string;
  warnings: string[];
  reach: SchoolCardData[];
  match: SchoolCardData[];
  safety: SchoolCardData[];
  verification_note: string;
}

const groupMeta = {
  reach: { label: "Reach", tone: "warn" as const, note: "Ambitious, plausible with strong execution" },
  match: { label: "Match", tone: "cyan" as const, note: "Profile alignment looks more balanced" },
  safety: { label: "Lower risk", tone: "good" as const, note: "Still verify affordability and program fit" },
};

export default function SchoolFinderScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [form, setForm] = useState({ intended_major: "", gpa: "", sat_act: "", english_test: "", countries: "United States", budget: "", needs_aid: "yes", environment: "No strong preference", preferences: "" });
  const [result, setResult] = useState<FinderResult | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function findSchools() {
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await api.post<{ result: FinderResult }>("/api/school-finder", {
        intended_major: form.intended_major,
        gpa: form.gpa,
        sat_act: form.sat_act || null,
        english_test: form.english_test || null,
        target_countries: form.countries.split(",").map((item) => item.trim()).filter(Boolean),
        budget: form.budget,
        needs_aid: form.needs_aid === "yes",
        environment: form.environment,
        preferences: form.preferences || null,
      });
      setResult(data.result); onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not build your school list."); }
    finally { setLoading(false); }
  }

  async function saveSchool(school: SchoolCardData, category: "reach" | "match" | "safety") {
    try {
      await api.post("/api/schools/save", { name: school.name, category, why_fit: school.why_fit, aid_note: school.aid_note });
      setSaved((current) => new Set(current).add(school.name)); onChanged();
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this school."); }
  }

  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Build a balanced list" title="School Finder" description="Interactive reach, match and lower-risk research—not fake acceptance odds." onBack={() => navigate("home")} />

      <Card>
        <div className="form-grid two">
          <Input label="Intended major" placeholder="Computer Science" value={form.intended_major} onChange={(e) => update("intended_major", e.target.value)} />
          <Input label="GPA" placeholder="3.8/4.0 or 92/100" value={form.gpa} onChange={(e) => update("gpa", e.target.value)} />
          <Input label="SAT / ACT" placeholder="SAT 1450 (optional)" value={form.sat_act} onChange={(e) => update("sat_act", e.target.value)} />
          <Input label="English test" placeholder="IELTS 7.5" value={form.english_test} onChange={(e) => update("english_test", e.target.value)} />
        </div>
        <Input label="Target countries" hint="Separate multiple countries with commas" value={form.countries} onChange={(e) => update("countries", e.target.value)} />
        <div className="form-grid two">
          <Input label="Annual family budget" placeholder="$12,000 / year" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
          <Select label="Need financial aid?" value={form.needs_aid} onChange={(e) => update("needs_aid", e.target.value)}>
            <option value="yes">Yes — aid is important</option><option value="no">No</option>
          </Select>
        </div>
        <Select label="Preferred environment" value={form.environment} onChange={(e) => update("environment", e.target.value)}>
          <option>No strong preference</option><option>Large city</option><option>College town</option><option>Quiet campus</option><option>Warm climate</option><option>Research-intensive</option><option>Collaborative and undergraduate-focused</option>
        </Select>
        <Textarea label="What else matters?" rows={4} placeholder="Campus size, internships, location, religious environment, specific research interests…" value={form.preferences} onChange={(e) => update("preferences", e.target.value)} />
        {error ? <ErrorBanner message={error} /> : null}
        <Button className="w-full" loading={loading} disabled={!form.intended_major || !form.gpa || !form.budget || !form.countries} onClick={() => void findSchools()}>
          <Search size={18} /> Build My School List
        </Button>
      </Card>

      {result ? (
        <div className="space-y-4">
          <Card tone="cyan"><Tag tone="cyan">Profile read</Tag><h3 className="mt-3">Your current positioning</h3><p>{result.profile_read}</p>{result.warnings?.length ? <div className="warning-list">{result.warnings.map((warning) => <span key={warning}><ShieldAlert size={14} />{warning}</span>)}</div> : null}</Card>
          {(["reach", "match", "safety"] as const).map((category) => (
            <section key={category}>
              <div className="section-title school-group-title"><div><Tag tone={groupMeta[category].tone}>{groupMeta[category].label}</Tag><small>{groupMeta[category].note}</small></div><span>{result[category]?.length || 0} schools</span></div>
              <div className="space-y-3">
                {(result[category] || []).map((school) => (
                  <Card key={school.name} className="school-card">
                    <div className="school-title"><span><Landmark size={19} /></span><div><h3>{school.name}</h3><small>{school.risk_level}</small></div></div>
                    <div className="school-detail"><strong>Why it fits</strong><p>{school.why_fit}</p></div>
                    <div className="school-detail"><strong>Aid note</strong><p>{school.aid_note}</p></div>
                    <div className="research-step"><GraduationCap size={16} /><span><strong>Research next:</strong> {school.next_research_step}</span></div>
                    <Button variant={saved.has(school.name) ? "secondary" : "ghost"} className="w-full" onClick={() => void saveSchool(school, category)}>
                      {saved.has(school.name) ? <><Check size={17} /> Saved to My School List</> : <><BookmarkPlus size={17} /> Save to My School List</>}
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          ))}
          <p className="verification-note">{result.verification_note}</p>
        </div>
      ) : null}
    </div>
  );
}

