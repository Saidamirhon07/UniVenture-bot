import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookmarkPlus, Check, GraduationCap, Landmark, MapPin, Search, ShieldAlert, SlidersHorizontal, Sparkles } from "lucide-react";
import { api } from "../api";
import type { Navigate, ProfileCompleteness } from "../types";
import { universities, type UniversityProfile } from "../data/catalogs";
import { Button, Card, ErrorBanner, Input, LoadingScreen, ScreenHeader, Segmented, Select, Tag, Textarea } from "../components/ui";

interface SchoolCardData { name: string; why_fit: string; risk_level: string; aid_note: string; next_research_step: string; }
interface FinderResult { profile_read: string; warnings: string[]; reach: SchoolCardData[]; match: SchoolCardData[]; safety: SchoolCardData[]; verification_note: string; }
type FitTier = "reach" | "match" | "safety";
type AutoFit = UniversityProfile & { tier: FitTier; why: string; aidNote: string; majorMatch: boolean };

const groupMeta = {
  reach: { label: "Reach", tone: "warn" as const, note: "Highly uncertain even with strong academics" },
  match: { label: "Match", tone: "cyan" as const, note: "Academic and contextual alignment is more balanced" },
  safety: { label: "Lower-risk", tone: "good" as const, note: "Not guaranteed—verify program, aid and requirements" },
};

function numberFrom(value: unknown): number | null {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeGpa(value: unknown): number | null {
  const number = numberFrom(value);
  if (number === null) return null;
  if (number <= 4.1) return number;
  if (number <= 5) return Math.min(4, number * .8);
  return Math.min(4, number / 25);
}

function countryMatches(targets: string[], country: string) {
  const aliases: Record<string, string[]> = { "United States": ["us", "usa", "united states", "america"], "United Kingdom": ["uk", "united kingdom", "britain", "england"], "South Korea": ["korea", "south korea"], "United Arab Emirates": ["uae", "united arab emirates"] };
  const accepted = [country.toLowerCase(), ...(aliases[country] || [])];
  return !targets.length || targets.some((target) => accepted.some((item) => target.toLowerCase().includes(item)));
}

function classifyUniversity(university: UniversityProfile, profile: { gpa: number | null; sat: number | null; major: string; needsAid: boolean }): AutoFit {
  const major = profile.major.toLowerCase();
  const majorMatch = university.strengths.some((strength) => major.includes(strength.toLowerCase()) || strength.toLowerCase().includes(major));
  let risk = university.selectivity;
  if (profile.sat !== null) risk += (university.satReference - profile.sat) / 240;
  else if (profile.gpa !== null) risk += (3.75 - profile.gpa) * .75;
  if (profile.needsAid && university.aid === "limited") risk += .45;
  if (majorMatch) risk -= .12;
  let tier: FitTier = risk >= 4.25 ? "reach" : risk >= 3.05 ? "match" : "safety";
  if (university.selectivity >= 4.65) tier = "reach";
  const why = `${majorMatch ? `${university.strengths.find((strength) => major.includes(strength.toLowerCase()) || strength.toLowerCase().includes(major)) || university.strengths[0]} aligns with your direction` : `${university.strengths.slice(0, 2).join(" and ")} are worth comparing`} · ${university.environment.toLowerCase()}.`;
  const aidNote = university.aid === "strong" ? "Stronger international aid signal—verify the exact policy." : university.aid === "limited" ? "Aid may be a major constraint; price-check before treating this as viable." : "Funding varies; research scholarships and net cost carefully.";
  return { ...university, tier, why, aidNote, majorMatch };
}

function openOfficial(url: string) { if (window.Telegram?.WebApp.openLink) window.Telegram.WebApp.openLink(url); else window.open(url, "_blank", "noopener,noreferrer"); }

export default function SchoolFinderScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [mode, setMode] = useState<"fit" | "custom" | "atlas">("fit");
  const [form, setForm] = useState({ intended_major: "", gpa: "", sat_act: "", english_test: "", countries: "United States", budget: "", needs_aid: "yes", environment: "No strong preference", preferences: "" });
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [result, setResult] = useState<FinderResult | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ portfolio: { profile: Record<string, unknown>; application: Record<string, Record<string, unknown>> }; profile_completeness: ProfileCompleteness }>("/api/me")
      .then((data) => {
        const profile = data.portfolio.profile || {};
        const tests = data.portfolio.application.test_scores || {};
        const preferences = data.portfolio.application.preferences || {};
        const savedCountries = profile.target_countries || preferences.target_countries;
        setForm((current) => ({ ...current,
          intended_major: String(profile.major || preferences.intended_major || ""),
          gpa: String(tests.gpa || profile.gpa || ""),
          sat_act: String(tests.sat || tests.act || profile.sat || ""),
          english_test: String(tests.ielts || tests.toefl || profile.ielts || ""),
          countries: Array.isArray(savedCountries) ? savedCountries.map(String).join(", ") : String(savedCountries || "United States"),
          budget: String(preferences.budget || profile.budget || ""),
          needs_aid: Boolean(preferences.needs_aid ?? profile.needs_aid ?? true) ? "yes" : "no",
          environment: String(preferences.environment || "No strong preference"),
        }));
        setProfileCompleteness(data.profile_completeness);
      })
      .catch(() => setError("Could not read your saved profile."))
      .finally(() => setProfileLoading(false));
  }, []);

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  const enoughProfile = Boolean(form.intended_major && form.gpa && form.countries && form.budget);
  const targetCountries = form.countries.split(",").map((item) => item.trim()).filter(Boolean);
  const autoFits = useMemo(() => universities
    .filter((university) => countryMatches(targetCountries, university.country))
    .map((university) => classifyUniversity(university, { gpa: normalizeGpa(form.gpa), sat: numberFrom(form.sat_act), major: form.intended_major, needsAid: form.needs_aid === "yes" }))
    .sort((a, b) => Number(b.majorMatch) - Number(a.majorMatch) || a.selectivity - b.selectivity), [form.countries, form.gpa, form.intended_major, form.needs_aid, form.sat_act]);
  const fitGroups = { reach: autoFits.filter((item) => item.tier === "reach"), match: autoFits.filter((item) => item.tier === "match"), safety: autoFits.filter((item) => item.tier === "safety") };
  const countries = ["All", ...Array.from(new Set(universities.map((item) => item.country)))];
  const atlas = universities.filter((item) => (countryFilter === "All" || item.country === countryFilter) && `${item.name} ${item.country} ${item.strengths.join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  async function findSchools() {
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await api.post<{ result: FinderResult }>("/api/school-finder", { intended_major: form.intended_major, gpa: form.gpa, sat_act: form.sat_act || null, english_test: form.english_test || null, target_countries: targetCountries, budget: form.budget, needs_aid: form.needs_aid === "yes", environment: form.environment, preferences: form.preferences || null });
      setResult(data.result); onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not build your school list."); }
    finally { setLoading(false); }
  }

  async function saveSchool(school: { name: string; why_fit?: string; why?: string; aid_note?: string; aidNote?: string }, category: FitTier) {
    try {
      await api.post("/api/schools/save", { name: school.name, category, why_fit: school.why_fit || school.why || "", aid_note: school.aid_note || school.aidNote || "" });
      setSaved((current) => new Set(current).add(school.name)); onChanged(); window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this school."); }
  }

  if (profileLoading) return <LoadingScreen label="Building your university fit map…" />;
  return <div className="page-enter space-y-3 school-fit-screen">
    <ScreenHeader eyebrow="University search" title="School Finder" description="Build a realistic school list." onBack={() => navigate("discover")} />
    <Segmented value={mode} onChange={setMode} options={[{ value: "fit", label: "My fit map" }, { value: "custom", label: "AI search" }, { value: "atlas", label: "Atlas" }]} />
    {error ? <ErrorBanner message={error} /> : null}

    {mode === "fit" ? <>
      {!enoughProfile ? <Card className="fit-locked"><span><Sparkles size={22} /></span><h2>Four profile signals unlock your map.</h2><p>Add your major, GPA, target countries and family budget. SAT/ACT makes the academic comparison more precise but is optional.</p><div className="fit-signal-grid">{[["Major", form.intended_major], ["GPA", form.gpa], ["Countries", form.countries], ["Budget", form.budget]].map(([label, value]) => <span className={value ? "done" : ""} key={label}>{value ? <Check size={14} /> : <SlidersHorizontal size={14} />}{label}</span>)}</div><Button className="w-full" onClick={() => navigate("portfolio")}>Complete my profile</Button></Card> : <>
        <Card className="fit-summary"><div><Tag tone="good">Live from your profile</Tag><h2>{autoFits.length} relevant universities mapped.</h2><p>Based on your academics, intended major, countries and aid needs. Categories show research priority—not admission probability.</p></div><span><strong>{profileCompleteness?.percent || 0}%</strong><small>profile depth</small></span></Card>
        <div className="fit-counts">{(["reach", "match", "safety"] as const).map((tier) => <button key={tier} onClick={() => document.getElementById(`fit-${tier}`)?.scrollIntoView({ behavior: "smooth" })}><span>{fitGroups[tier].length}</span><strong>{groupMeta[tier].label}</strong><small>{groupMeta[tier].note}</small></button>)}</div>
        {(["reach", "match", "safety"] as const).map((tier) => <section id={`fit-${tier}`} key={tier}><div className="section-title school-group-title"><div><Tag tone={groupMeta[tier].tone}>{groupMeta[tier].label}</Tag><small>{groupMeta[tier].note}</small></div><span>{fitGroups[tier].length} schools</span></div><div className="fit-school-list">{fitGroups[tier].map((school) => <Card key={school.name} className="fit-school"><div className="fit-school-head"><span><Landmark size={18} /></span><div><h3>{school.name}</h3><small><MapPin size={12} />{school.city}, {school.country}</small></div><button onClick={() => openOfficial(school.officialUrl)} aria-label={`Open ${school.name} official admissions page`}><ArrowUpRight size={17} /></button></div><div className="school-strengths">{school.strengths.map((strength) => <span key={strength}>{strength}</span>)}</div><p>{school.why}</p><div className={`aid-signal aid-${school.aid}`}><strong>Aid reality</strong><span>{school.aidNote}</span></div><Button variant={saved.has(school.name) ? "secondary" : "ghost"} className="w-full" onClick={() => void saveSchool(school, tier)}>{saved.has(school.name) ? <><Check size={16} />Saved</> : <><BookmarkPlus size={16} />Save to my list</>}</Button></Card>)}</div></section>)}
      </>}
    </> : null}

    {mode === "custom" ? <>
      <Card><div className="form-grid two"><Input label="Intended major" placeholder="Computer Science" value={form.intended_major} onChange={(event) => update("intended_major", event.target.value)} /><Input label="GPA" placeholder="3.8/4.0 or 92/100" value={form.gpa} onChange={(event) => update("gpa", event.target.value)} /><Input label="SAT / ACT" placeholder="SAT 1450 (optional)" value={form.sat_act} onChange={(event) => update("sat_act", event.target.value)} /><Input label="English test" placeholder="IELTS 7.5" value={form.english_test} onChange={(event) => update("english_test", event.target.value)} /></div><Input label="Target countries" hint="Separate with commas" value={form.countries} onChange={(event) => update("countries", event.target.value)} /><div className="form-grid two"><Input label="Annual family budget" placeholder="$12,000 / year" value={form.budget} onChange={(event) => update("budget", event.target.value)} /><Select label="Need financial aid?" value={form.needs_aid} onChange={(event) => update("needs_aid", event.target.value)}><option value="yes">Yes — important</option><option value="no">No</option></Select></div><Select label="Preferred environment" value={form.environment} onChange={(event) => update("environment", event.target.value)}><option>No strong preference</option><option>Large city</option><option>College town</option><option>Quiet campus</option><option>Research-intensive</option><option>Collaborative and undergraduate-focused</option></Select><Textarea label="What else matters?" rows={4} placeholder="Campus size, internships, climate, research interests…" value={form.preferences} onChange={(event) => update("preferences", event.target.value)} /><Button className="w-full" loading={loading} disabled={!form.intended_major || !form.gpa || !form.budget || !form.countries} onClick={() => void findSchools()}><Search size={18} />Build a custom list</Button></Card>
      {result ? <div className="space-y-4"><Card tone="cyan"><Tag tone="cyan">Profile read</Tag><h3 className="mt-3">Your current positioning</h3><p>{result.profile_read}</p>{result.warnings?.length ? <div className="warning-list">{result.warnings.map((warning) => <span key={warning}><ShieldAlert size={14} />{warning}</span>)}</div> : null}</Card>{(["reach", "match", "safety"] as const).map((tier) => <section key={tier}><div className="section-title school-group-title"><div><Tag tone={groupMeta[tier].tone}>{groupMeta[tier].label}</Tag><small>{groupMeta[tier].note}</small></div><span>{result[tier]?.length || 0} schools</span></div><div className="space-y-3">{(result[tier] || []).map((school) => <Card key={school.name} className="school-card"><div className="school-title"><span><Landmark size={19} /></span><div><h3>{school.name}</h3><small>{school.risk_level}</small></div></div><div className="school-detail"><strong>Why it fits</strong><p>{school.why_fit}</p></div><div className="school-detail"><strong>Aid note</strong><p>{school.aid_note}</p></div><div className="research-step"><GraduationCap size={16} /><span><strong>Research next:</strong> {school.next_research_step}</span></div><Button variant={saved.has(school.name) ? "secondary" : "ghost"} className="w-full" onClick={() => void saveSchool(school, tier)}>{saved.has(school.name) ? <><Check size={17} />Saved</> : <><BookmarkPlus size={17} />Save to my list</>}</Button></Card>)}</div></section>)}<p className="verification-note">{result.verification_note}</p></div> : null}
    </> : null}

    {mode === "atlas" ? <><div className="atlas-tools"><div className="opportunity-search"><Search size={17} /><input aria-label="Search university atlas" placeholder="University, country or major…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="filter-row atlas-countries">{countries.map((country) => <button className={countryFilter === country ? "active" : ""} key={country} onClick={() => setCountryFilter(country)}>{country}</button>)}</div></div><div className="atlas-list">{atlas.map((school) => { const fit = enoughProfile ? classifyUniversity(school, { gpa: normalizeGpa(form.gpa), sat: numberFrom(form.sat_act), major: form.intended_major, needsAid: form.needs_aid === "yes" }) : null; return <button key={school.name} onClick={() => openOfficial(school.officialUrl)}><span><Landmark size={18} /></span><div><small>{school.city} · {school.country}</small><strong>{school.name}</strong><em>{school.strengths.join(" · ")}</em></div>{fit ? <Tag tone={groupMeta[fit.tier].tone}>{groupMeta[fit.tier].label}</Tag> : <ArrowUpRight size={17} />}</button>; })}</div><p className="verification-note">The atlas is a research starting point. Open the official page to verify current requirements, aid and deadlines.</p></> : null}
  </div>;
}
