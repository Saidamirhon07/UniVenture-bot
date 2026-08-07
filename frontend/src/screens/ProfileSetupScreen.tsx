import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, Check, Compass, GraduationCap, WalletCards } from "lucide-react";
import { api } from "../api";
import type { SessionUser } from "../types";
import { Button, Card, ErrorBanner, Input, Select, Tag } from "../components/ui";

type ProfileSetupProps = {
  name: string;
  onComplete: (user: SessionUser) => void;
};

const steps = [
  { label: "Foundation", icon: GraduationCap },
  { label: "Direction", icon: Compass },
  { label: "Reality", icon: CalendarClock },
];

export default function ProfileSetupScreen({ name, onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    grade: "Grade 11",
    graduation_year: String(new Date().getFullYear() + 1),
    country: "Uzbekistan",
    curriculum: "National curriculum",
    intended_major: "",
    target_countries: "United States",
    gpa: "",
    sat: "",
    ielts: "",
    needs_aid: "yes",
    annual_budget: "",
    weekly_hours: "8",
    nearest_deadline: "",
    application_round: "Undecided",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.grade && form.graduation_year && form.country && form.curriculum);
    if (step === 1) return Boolean(form.intended_major && form.target_countries && form.gpa);
    return Boolean(form.annual_budget && form.weekly_hours);
  }, [form, step]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function finish() {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ user: SessionUser }>("/api/profile/onboarding", {
        ...form,
        graduation_year: Number(form.graduation_year),
        target_countries: form.target_countries.split(",").map((item) => item.trim()).filter(Boolean),
        needs_aid: form.needs_aid === "yes",
        weekly_hours: Number(form.weekly_hours),
        sat: form.sat || null,
        ielts: form.ielts || null,
        nearest_deadline: form.nearest_deadline || null,
      });
      onComplete(data.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your application profile.");
    } finally { setLoading(false); }
  }

  async function skip() {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ user: SessionUser }>("/api/profile/onboarding/skip", {});
      onComplete(data.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue.");
    } finally { setLoading(false); }
  }

  return (
    <main className="profile-setup page-enter">
      <div className="setup-brand"><strong>UniVentureAI</strong><span>Build your Application Twin</span></div>
      <div className="setup-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map(({ label, icon: Icon }, index) => <div className={index <= step ? "active" : ""} key={label}><span>{index < step ? <Check size={15} /> : <Icon size={16} />}</span><small>{label}</small></div>)}
      </div>

      <Card className="setup-card">
        <Tag tone="cyan">About 90 seconds</Tag>
        <h1>{step === 0 ? `Start with your school, ${name}.` : step === 1 ? "Where are you heading?" : "Build a plan that fits real life."}</h1>
        <p>{step === 0 ? "These basics stop your roadmap from giving generic advice." : step === 1 ? "Scores and direction unlock a more realistic school-fit map." : "Capacity, money and deadlines change what a smart plan looks like."}</p>

        {step === 0 ? <div className="form-grid two setup-fields">
          <Select label="Current grade" value={form.grade} onChange={(event) => update("grade", event.target.value)}><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option><option>Gap year</option></Select>
          <Input label="Graduation year" type="number" min={2026} max={2035} value={form.graduation_year} onChange={(event) => update("graduation_year", event.target.value)} />
          <Input label="Home country" value={form.country} onChange={(event) => update("country", event.target.value)} />
          <Select label="Curriculum" value={form.curriculum} onChange={(event) => update("curriculum", event.target.value)}><option>National curriculum</option><option>IB Diploma</option><option>A Levels</option><option>AP / US curriculum</option><option>Other</option></Select>
        </div> : null}

        {step === 1 ? <div className="setup-fields">
          <Input label="Intended major" placeholder="Computer Science" value={form.intended_major} onChange={(event) => update("intended_major", event.target.value)} />
          <Input label="Target countries" hint="Separate with commas" placeholder="United States, Canada" value={form.target_countries} onChange={(event) => update("target_countries", event.target.value)} />
          <div className="form-grid three"><Input label="GPA / average" placeholder="92/100" value={form.gpa} onChange={(event) => update("gpa", event.target.value)} /><Input label="SAT" placeholder="Optional" value={form.sat} onChange={(event) => update("sat", event.target.value)} /><Input label="IELTS" placeholder="Optional" value={form.ielts} onChange={(event) => update("ielts", event.target.value)} /></div>
        </div> : null}

        {step === 2 ? <div className="setup-fields">
          <div className="setup-reality-note"><WalletCards size={19} /><span>Private by design: these details only calibrate affordability and workload.</span></div>
          <div className="form-grid two"><Select label="Need financial aid?" value={form.needs_aid} onChange={(event) => update("needs_aid", event.target.value)}><option value="yes">Yes, important</option><option value="no">No</option></Select><Input label="Annual family budget" placeholder="$15,000 / year" value={form.annual_budget} onChange={(event) => update("annual_budget", event.target.value)} /></div>
          <div className="form-grid two"><Input label="Hours available / week" type="number" min={1} max={80} value={form.weekly_hours} onChange={(event) => update("weekly_hours", event.target.value)} /><Input label="Nearest deadline" type="date" value={form.nearest_deadline} onChange={(event) => update("nearest_deadline", event.target.value)} /></div>
          <Select label="Likely application round" value={form.application_round} onChange={(event) => update("application_round", event.target.value)}><option>Undecided</option><option>Early Decision</option><option>Early Action</option><option>Regular Decision</option><option>Rolling</option></Select>
        </div> : null}

        {error ? <ErrorBanner message={error} /> : null}
        <div className="setup-actions">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} />Back</Button> : <button className="setup-skip" disabled={loading} onClick={() => void skip()}>I’ll add this later</button>}
          {step < steps.length - 1 ? <Button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue<ArrowRight size={17} /></Button> : <Button loading={loading} disabled={!canContinue} onClick={() => void finish()}>Build my command center<ArrowRight size={17} /></Button>}
        </div>
      </Card>
    </main>
  );
}
