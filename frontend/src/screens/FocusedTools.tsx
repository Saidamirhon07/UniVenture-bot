import { SubmissionInput, useSubmission } from "../components/SubmissionInput";
import { useEffect, useState } from "react";
import { Activity, BarChart3, BookOpenCheck, BriefcaseBusiness, Check, FileCheck2, Gauge, Headphones, Languages, Lightbulb, Mic2, PenTool, Play, Rocket, RotateCcw, Sparkles, Timer, UsersRound, WandSparkles } from "lucide-react";
import { api } from "../api";
import type { EvaluationResponse, Navigate, PracticeStreak } from "../types";
import ResultPanel, { StructuredResult } from "../components/ResultPanel";
import { Button, Card, ErrorBanner, Input, PracticeStreakCard, ScreenHeader, Segmented, Select, Tag, Textarea } from "../components/ui";

function useToolState<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return { result, setResult, loading, setLoading, error, setError };
}

export function ECBuilderScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [scope, setScope] = useState<"single" | "portfolio">("single");
  const [singleActivity, setSingleActivity] = useState("");
  const [activities, setActivities] = useState("");
  const activity = scope === "single" ? singleActivity : activities;
  const setActivity = scope === "single" ? setSingleActivity : setActivities;
  const submission = useSubmission();
  const [role, setRole] = useState("");
  const [hours, setHours] = useState("");
  const [weeks, setWeeks] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const state = useToolState<EvaluationResponse>();
  async function analyze() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try {
      const result = await api.analyze<EvaluationResponse>("/api/evaluate/ec", { analysis_scope: scope, activity, role: scope === "single" ? role || null : null, hours_per_week: scope === "single" && hours ? Number(hours) : null, weeks_per_year: scope === "single" && weeks ? Number(weeks) : null }, submission.attachment);
      state.setResult(result); onChanged();
    } catch (caught) { state.setError(caught instanceof Error ? caught.message : `Could not evaluate ${scope === "single" ? "this activity" : "these activities"}.`); }
    finally { state.setLoading(false); }
  }
  async function loadSavedActivities() {
    setLoadingSaved(true); state.setError("");
    try {
      const data = await api.get<{ portfolio: { application: { ecs?: { activities?: Array<Record<string, unknown>> } } } }>("/api/portfolio");
      const saved = data.portfolio.application.ecs?.activities || [];
      if (!saved.length) { state.setError("No activities are saved yet. Add them in Profile, paste them here, or upload a file."); return; }
      setActivities(saved.slice(0, 10).map((item, index) => [
        `Activity ${index + 1}: ${String(item.name || "Untitled")}`,
        item.role ? `Role: ${String(item.role)}` : "",
        item.organization ? `Organization: ${String(item.organization)}` : "",
        item.time ? `Time: ${String(item.time)}` : "",
        item.description ? `Description: ${String(item.description)}` : "",
      ].filter(Boolean).join("\n")).join("\n\n"));
      submission.setMode("text"); submission.setFile(null); state.setResult(null);
    } catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not load saved activities."); }
    finally { setLoadingSaved(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Activities" title="EC Evaluation" description="Show your impact clearly." onBack={() => navigate("tools")} />
      <Card>
        <div className="metric-ribbon"><span><Activity size={17} />Leadership</span><span><BarChart3 size={17} />Impact</span><span><Sparkles size={17} />Uniqueness</span></div>
        <Segmented value={scope} onChange={(value) => { setScope(value); submission.setFile(null); state.setResult(null); state.setError(""); }} options={[{ value: "single", label: "One activity" }, { value: "portfolio", label: "Full activities list" }]} />
        {scope === "portfolio" ? <div className="activity-list-intro"><div><strong>Review your complete EC portfolio</strong><span>Get an individual review for each activity plus balance, repetition, gaps and ordering advice.</span></div><Button variant="secondary" loading={loadingSaved} disabled={state.loading} onClick={() => void loadSavedActivities()}>Load saved activities</Button></div> : null}
        {scope === "single" ? <><Input label="Your role" placeholder="Founder, team lead, volunteer…" value={role} onChange={(e) => setRole(e.target.value)} />
        <div className="form-grid two"><Input label="Hours / week" type="number" min={0} max={168} value={hours} onChange={(e) => setHours(e.target.value)} /><Input label="Weeks / year" type="number" min={0} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} /></div></> : null}
        <SubmissionInput disabled={state.loading} submission={submission} label={scope === "single" ? "Describe the activity" : "All your activities"} rows={scope === "single" ? 9 : 15} placeholder={scope === "single" ? "What did you initiate? Who changed because of it? Include real numbers, constraints and outcomes if you have them." : "List up to 10 activities. For each one include its name, role, organization, grades or dates, hours/week, weeks/year, what you did, and measurable results. Separate activities with a blank line."} value={activity} onChange={(e) => setActivity(e.target.value)} hint={scope === "portfolio" ? "Separate each activity with a blank line · Up to 10 activities" : undefined} />
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={!submission.ready(activity, scope === "single" ? 30 : 80)} onClick={() => void analyze()}><Rocket size={18} /> {scope === "single" ? "Analyze Activity Strength" : "Analyze My Full Activities List"}</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

type IELTSSkill = "writing" | "speaking" | "reading" | "listening";
type IELTSQuestItem = { prompt: string; options: string[]; answer: number; explanation: string; mission: string; audio?: string };
const ieltsQuests: Record<IELTSSkill, IELTSQuestItem> = {
  writing: { prompt: "Task 2: Cities should invest more in public parks. Which thesis gives the clearest position and roadmap?", options: ["Parks are important and cities have many problems.", "Although housing remains urgent, cities should protect park funding because green spaces improve public health and community life.", "This essay will discuss parks and give my opinion.", "There are advantages and disadvantages to every public investment."], answer: 1, explanation: "It takes a qualified position and previews two defensible reasons. It is specific without trying to sound complicated.", mission: "Write one thesis with a position, concession and two reasons." },
  speaking: { prompt: "Part 2: Describe a skill you taught yourself. Which opening creates the strongest natural answer?", options: ["I have learned many skills in my life.", "The skill I want to talk about is coding because coding is important.", "Last winter, our school club needed a website and nobody knew how to build one, so I volunteered before I knew what I was doing.", "It is an interesting question and I will answer it now."], answer: 2, explanation: "A specific moment creates an easy story path: situation, action, difficulty, result and reflection.", mission: "Use the 60-second timer: tell the story as situation → struggle → turning point → result." },
  reading: { prompt: "Passage: ‘The museum extended Friday hours in May. Attendance rose that month, but researchers noted that a new exhibition opened simultaneously.’ Claim: Longer hours caused the attendance increase.", options: ["True", "False", "Not Given", "Both True and False"], answer: 2, explanation: "Attendance rose, but the passage does not isolate the cause because a new exhibition opened at the same time.", mission: "Underline only the words that prove or limit causation." },
  listening: { prompt: "Listen once, then choose the corrected meeting time.", options: ["Tuesday at 3:30", "Tuesday at 4:00", "Thursday at 3:30", "Thursday at 4:00"], answer: 2, explanation: "The speaker replaces Tuesday with Thursday but keeps 3:30. IELTS distractors often preserve one old detail.", mission: "Write the first answer lightly; confirm after the correction signal.", audio: "We originally planned the project meeting for Tuesday at three thirty. That clashes with the science fair rehearsal, so let's keep the same time but move it to Thursday." },
};

function IELTSQuest({ skill, onComplete }: { skill: IELTSSkill; onComplete: () => Promise<void> }) {
  const item = ieltsQuests[skill];
  const [selected, setSelected] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => { setSelected(null); setSeconds(null); }, [skill]);
  useEffect(() => { if (seconds === null || seconds <= 0) return; const timer = window.setInterval(() => setSeconds((value) => value === null ? null : Math.max(0, value - 1)), 1_000); return () => window.clearInterval(timer); }, [seconds]);
  function play() { if (!item.audio || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(item.audio)); }
  function choose(index: number) { if (selected !== null) return; setSelected(index); window.Telegram?.WebApp.HapticFeedback?.notificationOccurred(index === item.answer ? "success" : "warning"); void onComplete(); }
  return <Card className="ielts-quest"><div className="quest-head"><div><Tag tone="cyan">{skill} mission</Tag><strong>Skill arcade</strong></div><span>+20 focus</span></div>{skill === "listening" ? <button className="listen-button" onClick={play}><Play size={17} />Play the briefing once</button> : null}{skill === "speaking" ? <div className="speaking-timer"><Timer size={19} /><div><strong>{seconds === null ? "60" : seconds}s</strong><small>response sprint</small></div><button onClick={() => setSeconds(60)}>{seconds === null || seconds === 0 ? "Start" : "Restart"}</button></div> : null}<h2>{item.prompt}</h2><div className="quest-options">{item.options.map((option, index) => <button className={selected === null ? "" : index === item.answer ? "correct" : index === selected ? "wrong" : "muted"} key={option} onClick={() => choose(index)}><span>{String.fromCharCode(65 + index)}</span>{option}{selected !== null && index === item.answer ? <Check size={16} /> : null}</button>)}</div>{selected !== null ? <div className="quest-feedback"><strong>{selected === item.answer ? "Examiner logic unlocked" : "Repair the method"}</strong><p>{item.explanation}</p><small>Micro-mission: {item.mission}</small><button className="quest-reset" onClick={() => setSelected(null)}><RotateCcw size={14} />Try again</button></div> : <p className="quest-nudge">Commit to an answer before seeing the examiner logic.</p>}</Card>;
}

export function IELTSWritingScreen({ navigate, onChanged, coachOnly = false }: { navigate: Navigate; onChanged: () => void; coachOnly?: boolean }) {
  const [skill, setSkill] = useState<IELTSSkill>("writing");
  const [lab, setLab] = useState<"quest" | "coach">(coachOnly ? "coach" : "quest");
  const [taskType, setTaskType] = useState<"task_1" | "task_2">("task_2");
  const [targetBand, setTargetBand] = useState("7.0");
  const [question, setQuestion] = useState("");
  const [content, setContent] = useState(""); const submission = useSubmission();

  const [streak, setStreak] = useState<PracticeStreak | null>(null);
  const state = useToolState<EvaluationResponse>();
  useEffect(() => { void api.get<PracticeStreak>("/api/practice/streak").then(setStreak).catch(() => undefined); }, []);
  async function completeQuest() { const value = await api.post<PracticeStreak>("/api/practice/complete", { skill: "ielts" }); setStreak(value); onChanged(); }
  async function analyze() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { state.setResult(await api.analyze<EvaluationResponse>("/api/evaluate/ielts", { skill, task_type: skill === "writing" ? taskType : null, question: question || null, content, target_band: targetBand }, submission.attachment)); onChanged(); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not check this IELTS response."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      {!coachOnly && <ScreenHeader eyebrow="Test prep" title="IELTS Practice" description="Practice all four skills." onBack={() => navigate("tools")} />}
      {!coachOnly && <PracticeStreakCard streak={streak} compact />}
      <div className="ielts-skill-map">
        {[{ key: "writing", label: "Writing", icon: PenTool }, { key: "speaking", label: "Speaking", icon: Mic2 }, { key: "reading", label: "Reading", icon: BookOpenCheck }, { key: "listening", label: "Listening", icon: Headphones }].map(({ key, label, icon: Icon }) => <button className={skill === key ? "active" : ""} key={key} onClick={() => { setSkill(key as IELTSSkill); state.setResult(null); }}><Icon size={19} /><span>{label}</span></button>)}
      </div>
      {!coachOnly && <Segmented value={lab} onChange={setLab} options={[{ value: "quest", label: "Practice quest" }, { value: "coach", label: "Coach my work" }]} />}
      {lab === "quest" ? <IELTSQuest skill={skill} onComplete={completeQuest} /> : <Card>
        <div className="ielts-lens"><span>{skill === "writing" ? <PenTool size={20} /> : skill === "speaking" ? <Mic2 size={20} /> : skill === "reading" ? <BookOpenCheck size={20} /> : <Headphones size={20} />}</span><div><strong>{skill === "writing" ? "Band criteria + paragraph upgrade" : skill === "speaking" ? "Natural fluency + answer development" : skill === "reading" ? "Evidence path + distractor diagnosis" : "Signal words + attention recovery"}</strong><small>{skill === "writing" ? "Task response, coherence, vocabulary and grammar" : skill === "speaking" ? "Paste a transcript of what you said—imperfections included" : skill === "reading" ? "Turn one wrong answer into a repeatable solving method" : "Use a transcript, your notes and the question you missed"}</small></div></div>
        {skill === "writing" ? <Segmented value={taskType} onChange={setTaskType} options={[{ value: "task_1", label: "Task 1" }, { value: "task_2", label: "Task 2" }]} /> : null}
        <div className="form-grid two"><Input label="Target band" value={targetBand} onChange={(event) => setTargetBand(event.target.value)} /><Input label="Practice focus" placeholder={skill === "speaking" ? "Part 2 cue card" : skill === "reading" ? "True / False / Not Given" : skill === "listening" ? "Section 3 distractors" : "Opinion essay"} value={question} onChange={(event) => setQuestion(event.target.value)} /></div>
        <SubmissionInput disabled={state.loading} submission={submission} label={skill === "writing" ? "Your answer" : skill === "speaking" ? "Your speaking transcript" : skill === "reading" ? "Passage, question, your answer + correct answer" : "Transcript/notes, question and your answer"} rows={12} placeholder={skill === "writing" ? "Paste your full IELTS response…" : skill === "speaking" ? "Write exactly what you said, including pauses or repetitions you remember…" : skill === "reading" ? "Include enough passage context to prove the answer…" : "Paste the relevant transcript or describe what you heard and where you lost the answer…"} value={content} onChange={(e) => setContent(e.target.value)} hint={"Your mistakes become a personalized micro-drill"} />
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={!submission.ready(content, 30)} onClick={() => void analyze()}><Languages size={18} /> Coach My {skill[0].toUpperCase() + skill.slice(1)}</Button>
      </Card>}
      {lab === "coach" && state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

type RecMode = "evaluate" | "brag_sheet" | "teacher_packet";
export function RecommendationScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [mode, setMode] = useState<RecMode>("brag_sheet");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState(""); const submission = useSubmission();
  const state = useToolState<EvaluationResponse>();
  const placeholders = {
    evaluate: "Paste the recommendation letter draft…",
    brag_sheet: "Share classes taken, specific moments, projects, struggles, growth, contributions and anything the teacher personally witnessed…",
    teacher_packet: "Share your relationship with this teacher, strongest classroom stories, academic interests, projects and what you hope the letter demonstrates…",
  };
  async function run() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { state.setResult(await api.analyze<EvaluationResponse>("/api/evaluate/recommendation", { mode, content, teacher_subject: subject || null }, submission.attachment)); onChanged(); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not build the recommendation material."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Your supporters" title="Recommendation Letters" description="Plan stronger, specific letters." onBack={() => navigate("tools")} />
      <Card>
        <Segmented value={mode} onChange={setMode} options={[{ value: "brag_sheet", label: "Brag sheet" }, { value: "evaluate", label: "Evaluate" }, { value: "teacher_packet", label: "Teacher packet" }]} />
        <Input label="Teacher / subject" placeholder="e.g. Ms. Lee — AP Physics" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <SubmissionInput disabled={state.loading} submission={submission} label={mode === "evaluate" ? "Letter draft" : "Your evidence bank"} rows={12} placeholder={placeholders[mode]} value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="ethics-note"><FileCheck2 size={17} /><span>The tool organizes truthful evidence and teacher prompts. The teacher remains the author.</span></div>
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={!submission.ready(content, 30)} onClick={() => void run()}><UsersRound size={18} /> {mode === "evaluate" ? "Evaluate Credibility" : mode === "brag_sheet" ? "Build Brag Sheet" : "Generate Teacher Packet"}</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

export function PortfolioBuilderScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [field, setField] = useState("Computer Science");
  const [target, setTarget] = useState("");
  const [projects, setProjects] = useState(""); const submission = useSubmission();
  const state = useToolState<EvaluationResponse>();
  async function analyze() {
    state.setLoading(true); state.setError(""); state.setResult(null);
    try { state.setResult(await api.analyze<EvaluationResponse>("/api/evaluate/portfolio", { field, projects, target_program: target || null }, submission.attachment)); onChanged(); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not review this portfolio."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Projects" title="Portfolio Review" description="Find the proof your portfolio is missing." onBack={() => navigate("tools")} />
      <Card>
        <div className="form-grid two">
          <Select label="Portfolio field" value={field} onChange={(e) => setField(e.target.value)}><option>Computer Science</option><option>Design</option><option>Art</option><option>Business</option><option>Research</option><option>Engineering</option><option>Architecture</option><option>Other</option></Select>
          <Input label="Target program" placeholder="Optional" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <SubmissionInput disabled={state.loading} submission={submission} label="Existing projects" rows={12} placeholder="For each project: what you built, why, your exact role, evidence of skill, users/results, and how you present it." value={projects} onChange={(e) => setProjects(e.target.value)} />
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={!submission.ready(projects, 30)} onClick={() => void analyze()}><BriefcaseBusiness size={18} /> Diagnose Portfolio Gaps</Button>
      </Card>
      {state.result ? <ResultPanel response={state.result} refinementActions={false} /> : null}
    </div>
  );
}

type BoostTool = "wow_factor" | "power_words" | "readiness" | "insider_tips";
export function BoostToolsScreen({ navigate }: { navigate: Navigate }) {
  const [tool, setTool] = useState<BoostTool>("wow_factor");
  const [content, setContent] = useState(""); const submission = useSubmission();
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
    try { const data = await api.analyze<{ result: Record<string, unknown> }>("/api/boost", { tool, content: content || null, context: context || null }, tool === "readiness" ? null : submission.attachment); state.setResult(data.result); }
    catch (caught) { state.setError(caught instanceof Error ? caught.message : "Could not run this boost tool."); }
    finally { state.setLoading(false); }
  }
  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Fast help" title="Quick Checks" description="Readiness, wording and profile checks." onBack={() => navigate("tools")} />
      <div className="boost-picker">{tools.map(({ key, label, icon: Icon }) => <button key={key} className={tool === key ? "active" : ""} onClick={() => { setTool(key); state.setResult(null); }}><Icon size={18} /><span>{label}</span></button>)}</div>
      <Card>
        <Tag tone="cyan">{tools.find((item) => item.key === tool)?.label}</Tag>
        <h3 className="mt-3">{tools.find((item) => item.key === tool)?.description}</h3>
        {tool !== "readiness" ? <><SubmissionInput disabled={state.loading} submission={submission} label="Material to analyze" rows={8} placeholder={tool === "wow_factor" ? "Paste your activity list, profile summary or essay idea…" : "Paste the sentence, activity description or situation…"} value={content} onChange={(e) => setContent(e.target.value)} /><Input label="Context" placeholder="Where will this appear?" value={context} onChange={(e) => setContext(e.target.value)} /></> : <p className="tool-explainer">Your readiness score uses the live application portfolio: essays, school list, testing, activities, recommendations, deadlines and workload.</p>}
        {state.error ? <ErrorBanner message={state.error} /> : null}
        <Button className="w-full" loading={state.loading} disabled={tool !== "readiness" && !submission.ready(content, 1)} onClick={() => void run()}><Sparkles size={18} /> Run {tools.find((item) => item.key === tool)?.label}</Button>
      </Card>
      {state.result ? (
        <Card className="result-card"><Tag tone="good">Your result</Tag><h2 className="mt-3">{String(state.result.headline || (tool === "readiness" ? `Your preparation is ${String(state.result.score)}% ready` : "Focused boost"))}</h2><StructuredResult result={state.result} /></Card>
      ) : null}
    </div>
  );
}
