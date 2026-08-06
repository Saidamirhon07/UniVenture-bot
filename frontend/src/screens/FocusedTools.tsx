import { useState } from "react";
import { Activity, BarChart3, BookOpenCheck, BriefcaseBusiness, FileCheck2, Gauge, Headphones, Languages, Lightbulb, Mic2, PenTool, Rocket, Sparkles, UsersRound, WandSparkles } from "lucide-react";
import { api } from "../api";
import type { EvaluationResponse, Navigate } from "../types";
import ResultPanel, { StructuredResult } from "../components/ResultPanel";
import { Button, Card, ErrorBanner, FileImport, Input, ScreenHeader, Segmented, Select, Tag, Textarea } from "../components/ui";

function useToolState<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return { result, setResult, loading, setLoading, error, setError };
}

export function ECBuilderScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [activity, setActivity] = useState("");
  const [role, setRole] = useState("");
  const [hours, setHours] = useState("");
  const [weeks, setWeeks] = useState("");
  const state = useToolState<EvaluationResponse>();
  async function analyze() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try {
      const result = await api.post<EvaluationResponse>("/api/evaluate/ec", { activity, role: role || null, hours_per_week: hours ? Number(hours) : null, weeks_per_year: weeks ? Number(weeks) : null });
      state.setResult(result); onChanged();
    } catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not evaluate this activity."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Impact, not adjectives" title="EC Builder" description="Find the leadership signal, proof gap and strongest truthful Common App rewrite." onBack={() => navigate("home")} />
      <Card>
        <div className="metric-ribbon"><span><Activity size={17} />Leadership</span><span><BarChart3 size={17} />Impact</span><span><Sparkles size={17} />Uniqueness</span></div>
        <Input label="Your role" placeholder="Founder, team lead, volunteer…" value={role} onChange={(e) => setRole(e.target.value)} />
        <div className="form-grid two"><Input label="Hours / week" type="number" min={0} max={168} value={hours} onChange={(e) => setHours(e.target.value)} /><Input label="Weeks / year" type="number" min={0} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} /></div>
        <Textarea label="Describe the activity" rows={9} placeholder="What did you initiate? Who changed because of it? Include real numbers, constraints and outcomes if you have them." value={activity} onChange={(e) => setActivity(e.target.value)} />
        <FileImport disabled={state.loading} onText={(text) => setActivity(text)} />
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={activity.trim().length < 30} onClick={() => void analyze()}><Rocket size={18} /> Analyze Activity Strength</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

type IELTSSkill = "writing" | "speaking" | "reading" | "listening";
export function IELTSWritingScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [skill, setSkill] = useState<IELTSSkill>("writing");
  const [taskType, setTaskType] = useState<"task_1" | "task_2">("task_2");
  const [targetBand, setTargetBand] = useState("7.0");
  const [question, setQuestion] = useState("");
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("");
  const state = useToolState<EvaluationResponse>();
  async function analyze() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { state.setResult(await api.post<EvaluationResponse>("/api/evaluate/ielts", { skill, task_type: skill === "writing" ? taskType : null, question: question || null, content, target_band: targetBand })); onChanged(); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not check this IELTS response."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="IELTS examiner lens" title="IELTS 4-Skill Lab" description="One connected workspace for Writing, Speaking, Reading and Listening." onBack={() => navigate("prep")} />
      <div className="ielts-skill-map">
        {[{ key: "writing", label: "Writing", icon: PenTool }, { key: "speaking", label: "Speaking", icon: Mic2 }, { key: "reading", label: "Reading", icon: BookOpenCheck }, { key: "listening", label: "Listening", icon: Headphones }].map(({ key, label, icon: Icon }) => <button className={skill === key ? "active" : ""} key={key} onClick={() => { setSkill(key as IELTSSkill); state.setResult(null); }}><Icon size={19} /><span>{label}</span></button>)}
      </div>
      <Card>
        <div className="ielts-lens"><span>{skill === "writing" ? <PenTool size={20} /> : skill === "speaking" ? <Mic2 size={20} /> : skill === "reading" ? <BookOpenCheck size={20} /> : <Headphones size={20} />}</span><div><strong>{skill === "writing" ? "Band criteria + paragraph upgrade" : skill === "speaking" ? "Natural fluency + answer development" : skill === "reading" ? "Evidence path + distractor diagnosis" : "Signal words + attention recovery"}</strong><small>{skill === "writing" ? "Task response, coherence, vocabulary and grammar" : skill === "speaking" ? "Paste a transcript of what you said—imperfections included" : skill === "reading" ? "Turn one wrong answer into a repeatable solving method" : "Use a transcript, your notes and the question you missed"}</small></div></div>
        {skill === "writing" ? <Segmented value={taskType} onChange={setTaskType} options={[{ value: "task_1", label: "Task 1" }, { value: "task_2", label: "Task 2" }]} /> : null}
        <div className="form-grid two"><Input label="Target band" value={targetBand} onChange={(event) => setTargetBand(event.target.value)} /><Input label="Practice focus" placeholder={skill === "speaking" ? "Part 2 cue card" : skill === "reading" ? "True / False / Not Given" : skill === "listening" ? "Section 3 distractors" : "Opinion essay"} value={question} onChange={(event) => setQuestion(event.target.value)} /></div>
        <Textarea label={skill === "writing" ? "Your answer" : skill === "speaking" ? "Your speaking transcript" : skill === "reading" ? "Passage, question, your answer + correct answer" : "Transcript/notes, question and your answer"} rows={12} placeholder={skill === "writing" ? "Paste your full IELTS response…" : skill === "speaking" ? "Write exactly what you said, including pauses or repetitions you remember…" : skill === "reading" ? "Include enough passage context to prove the answer…" : "Paste the relevant transcript or describe what you heard and where you lost the answer…"} value={content} onChange={(e) => setContent(e.target.value)} hint={filename || "Your mistakes become a personalized micro-drill"} />
        <FileImport disabled={state.loading} onText={(text, name) => { setContent(text); setFilename(name); }} />
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={content.trim().length < 30} onClick={() => void analyze()}><Languages size={18} /> Coach My {skill[0].toUpperCase() + skill.slice(1)}</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

type RecMode = "evaluate" | "brag_sheet" | "teacher_packet";
export function RecommendationScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [mode, setMode] = useState<RecMode>("brag_sheet");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const state = useToolState<EvaluationResponse>();
  const placeholders = {
    evaluate: "Paste the recommendation letter draft…",
    brag_sheet: "Share classes taken, specific moments, projects, struggles, growth, contributions and anything the teacher personally witnessed…",
    teacher_packet: "Share your relationship with this teacher, strongest classroom stories, academic interests, projects and what you hope the letter demonstrates…",
  };
  async function run() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { state.setResult(await api.post<EvaluationResponse>("/api/evaluate/recommendation", { mode, content, teacher_subject: subject || null })); onChanged(); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not build the recommendation material."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Credible advocacy" title="Recommendation Center" description="Help a teacher tell specific, evidence-rich stories—without ghostwriting fake praise." onBack={() => navigate("home")} />
      <Card>
        <Segmented value={mode} onChange={setMode} options={[{ value: "brag_sheet", label: "Brag sheet" }, { value: "evaluate", label: "Evaluate" }, { value: "teacher_packet", label: "Teacher packet" }]} />
        <Input label="Teacher / subject" placeholder="e.g. Ms. Lee — AP Physics" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label={mode === "evaluate" ? "Letter draft" : "Your evidence bank"} rows={12} placeholder={placeholders[mode]} value={content} onChange={(e) => setContent(e.target.value)} />
        <FileImport disabled={state.loading} onText={(text) => setContent(text)} />
        <div className="ethics-note"><FileCheck2 size={17} /><span>The tool organizes truthful evidence and teacher prompts. The teacher remains the author.</span></div>
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={content.trim().length < 30} onClick={() => void run()}><UsersRound size={18} /> {mode === "evaluate" ? "Evaluate Credibility" : mode === "brag_sheet" ? "Build Brag Sheet" : "Generate Teacher Packet"}</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

export function PortfolioBuilderScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [field, setField] = useState("Computer Science");
  const [target, setTarget] = useState("");
  const [projects, setProjects] = useState("");
  const state = useToolState<EvaluationResponse>();
  async function analyze() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { state.setResult(await api.post<EvaluationResponse>("/api/evaluate/portfolio", { field, projects, target_program: target || null })); onChanged(); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not review this portfolio."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Proof of future promise" title="Portfolio Builder" description="For CS, design, art, business and research portfolios—not just pretty project lists." onBack={() => navigate("home")} />
      <Card>
        <div className="form-grid two">
          <Select label="Portfolio field" value={field} onChange={(e) => setField(e.target.value)}><option>Computer Science</option><option>Design</option><option>Art</option><option>Business</option><option>Research</option><option>Engineering</option><option>Architecture</option><option>Other</option></Select>
          <Input label="Target program" placeholder="Optional" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <Textarea label="Existing projects" rows={12} placeholder="For each project: what you built, why, your exact role, evidence of skill, users/results, and how you present it." value={projects} onChange={(e) => setProjects(e.target.value)} />
        <FileImport disabled={state.loading} onText={(text) => setProjects(text)} />
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={projects.trim().length < 30} onClick={() => void analyze()}><BriefcaseBusiness size={18} /> Diagnose Portfolio Gaps</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

type BoostTool = "wow_factor" | "power_words" | "readiness" | "insider_tips";
export function BoostToolsScreen({ navigate }: { navigate: Navigate }) {
  const [tool, setTool] = useState<BoostTool>("wow_factor");
  const [content, setContent] = useState("");
  const [context, setContext] = useState("");
  const state = useToolState<Record<string, unknown>>();
  const tools: Array<{ key: BoostTool; label: string; icon: typeof Sparkles; description: string }> = [
    { key: "wow_factor", label: "Wow Factor", icon: WandSparkles, description: "Find the defensible thread that makes your profile memorable." },
    { key: "power_words", label: "Power Words", icon: PenTool, description: "Use precise language without exaggerating impact." },
    { key: "readiness", label: "Readiness", icon: Gauge, description: "See preparation gaps—not fake acceptance odds." },
    { key: "insider_tips", label: "Insider Tips", icon: Lightbulb, description: "Get context-specific strategy moves from your profile." },
  ];
  async function run() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { const data = await api.post<{ result: Record<string, unknown> }>("/api/boost", { tool, content: content || null, context: context || null }); state.setResult(data.result); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not run this boost tool."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Small tools, high leverage" title="Boost Tools" description="Quick strategic checks that stay grounded in evidence and your saved portfolio." onBack={() => navigate("home")} />
      <div className="boost-picker">{tools.map(({ key, label, icon: Icon }) => <button key={key} className={tool === key ? "active" : ""} onClick={() => { setTool(key); state.setResult(null); }}><Icon size={18} /><span>{label}</span></button>)}</div>
      <Card>
        <Tag tone="cyan">{tools.find((item) => item.key === tool)?.label}</Tag>
        <h3 className="mt-3">{tools.find((item) => item.key === tool)?.description}</h3>
        {tool !== "readiness" ? <><Textarea label="Material to analyze" rows={8} placeholder={tool === "wow_factor" ? "Paste your activity list, profile summary or essay idea…" : "Paste the sentence, activity description or situation…"} value={content} onChange={(e) => setContent(e.target.value)} /><FileImport disabled={state.loading} onText={(text) => setContent(text)} /><Input label="Context" placeholder="Where will this appear?" value={context} onChange={(e) => setContext(e.target.value)} /></> : <p className="tool-explainer">Your readiness score uses the live application portfolio: essays, school list, testing, activities, recommendations, deadlines and workload.</p>}
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={tool !== "readiness" && !content.trim()} onClick={() => void run()}><Sparkles size={18} /> Run {tools.find((item) => item.key === tool)?.label}</Button>
      </Card>
      {state.result ? (
        <Card className="result-card"><Tag tone="good">Your result</Tag><h2 className="mt-3">{String(state.result.headline || (tool === "readiness" ? `Your preparation is ${String(state.result.score)}% ready` : "Focused boost"))}</h2><StructuredResult result={state.result} /></Card>
      ) : null}
    </div>
  );
}
