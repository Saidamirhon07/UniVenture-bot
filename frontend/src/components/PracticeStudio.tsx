import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, Clock3, Flag, Headphones, RotateCcw, Target, Trophy } from "lucide-react";
import { api } from "../api";
import type { Navigate, PracticeStreak } from "../types";
import { Button, Card, ErrorBanner, LoadingScreen, PracticeStreakCard, ScreenHeader, Segmented, Select, Tag } from "./ui";
import IELTSWorkbench from "./IELTSWorkbench";
import { choosePractice } from "../lib/practiceSelection";

export type PracticeQuestion = { id: string; exam: "sat" | "ielts"; section: string; skill: string; level: string; prompt: string; options: string[]; answer: number; explanation: string; passage?: string; audio?: string };
type QuestionRecord = { attempts: number; correct: number; last_correct: boolean; last_choice: number | null; last_seen: string; review_due: string };
type Session = { id: string; exam: string; mode: string; correct: number; total: number; seconds: number; created_at: number; answers: { question_id: string; choice: number | null; correct: boolean }[] };
export type PracticeLibrary = { questions: PracticeQuestion[]; records: Record<string, QuestionRecord>; sessions: Session[]; drafts: Record<string, { prompt: string; content: string }>; streak: PracticeStreak };
type Mode = "learn" | "timed" | "review";
type Run = { id: string; questions: PracticeQuestion[]; mode: Mode; started: number; deadline: number | null; choices: Record<string, number>; index: number; flagged: string[] };
const handledLeaveEvents = new WeakSet<Event>();

export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const before = (event: Event) => { if (handledLeaveEvents.has(event)) return; handledLeaveEvents.add(event); if (!window.confirm("Leave this workspace? Unsaved work will be lost.")) event.preventDefault(); };
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("univenture:before-navigate", before);
    window.addEventListener("beforeunload", unload);
    return () => { window.removeEventListener("univenture:before-navigate", before); window.removeEventListener("beforeunload", unload); };
  }, [dirty]);
}


function Briefing({ question, revealed }: { question: PracticeQuestion; revealed: boolean }) {
  const [audioError, setAudioError] = useState("");
  useEffect(() => { setAudioError(""); return () => { window.speechSynthesis?.cancel(); }; }, [question.id]);
  if (!question.audio) return null;
  const play = () => {
    if (!("speechSynthesis" in window)) { setAudioError("Audio is unavailable here. Use the transcript below for text-based practice."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.audio);
    utterance.lang = "en-GB";
    utterance.onerror = () => setAudioError("Audio could not play. Use the transcript below or open in a supported browser.");
    window.speechSynthesis.speak(utterance);
  };
  return <div className="practice-briefing"><Button variant="secondary" onClick={play}><Headphones size={17} />Play briefing</Button><small>Synthetic speech · replay allowed for learning</small>{audioError && <ErrorBanner message={audioError} />}{(revealed || audioError) && <p>{question.audio}</p>}</div>;
}

export default function PracticeStudio({ exam, navigate, onChanged, coach }: { exam: "sat" | "ielts"; navigate: Navigate; onChanged: () => void; coach?: ReactNode }) {
  const [data, setData] = useState<PracticeLibrary | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"practice" | "history" | "coach">("practice");
  const [section, setSection] = useState(exam === "sat" ? "math" : "writing");
  const [skill, setSkill] = useState("all");
  const [mode, setMode] = useState<Mode>("learn");
  const [run, setRun] = useState<Run | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  useLeaveGuard(!!run && !saved);
  const load = () => { setError(""); void api.get<PracticeLibrary>("/api/practice/library").then(setData).catch(e => setError(e.message)); };
  useEffect(load, [exam]);
  useEffect(() => {
    if (!run || finished) return;
    const timer = window.setInterval(() => setClock(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [run?.id, finished]);
  const expired = !!run?.deadline && clock >= run.deadline;
  if (!data) return error ? <Card><ErrorBanner message={error} /><Button onClick={load}>Retry loading practice</Button></Card> : <LoadingScreen label="Preparing your practice studio…" />;
  const questions = data.questions.filter(q => q.exam === exam);
  const recent = data.sessions.filter(s => s.exam === exam);
  const answered = recent.reduce((n,s) => n + s.total, 0);
  const correct = recent.reduce((n,s) => n + s.correct, 0);
  const mistakes = questions.filter(q => data.records[q.id] && !data.records[q.id].last_correct);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const today = ["year","month","day"].map(type=>parts.find(p=>p.type===type)?.value).join("-");
  const pool = questions.filter(q => q.section === section && (skill === "all" || q.skill === skill));
  const start = () => {
    const chosen = choosePractice(pool, data.records, mode, today, recent.length * 5);
    if (!chosen.length) { setError("Nothing is due in this skill yet. Choose Learn or another skill."); return; }
    const now = Date.now();
    setRun({ id: crypto.randomUUID(), questions: chosen, mode, started: now, deadline: mode === "timed" ? now + chosen.length * 90000 : null, choices: {}, index: 0, flagged: [] });
    setClock(now); setRevealed(false); setFinished(false); setSaved(false); setError("");
  };
  const save = async () => {
    if (!run || saveLock.current || saved) return;
    saveLock.current = true; setSaving(true); setFinished(true); setError("");
    try {
      const result = await api.post<{ session: Session; records: PracticeLibrary["records"]; streak: PracticeStreak }>("/api/practice/session", {
        session_id: run.id, exam, mode: run.mode, seconds: Math.min(14400, Math.max(0, Math.floor(((run.deadline ? Math.min(Date.now(),run.deadline) : Date.now()) - run.started) / 1000))),
        answers: run.questions.map(q => ({ question_id: q.id, choice: run.choices[q.id] ?? null })),
      });
      setData(current => current && ({ ...current, records: result.records, streak: result.streak, sessions: [...current.sessions.filter(s => s.id !== result.session.id), result.session].slice(-60) }));
      setSaved(true); onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save. Your answers are still here; retry below."); }
    finally { saveLock.current = false; setSaving(false); }
  };
  const review = (session: Session) => {
    setRun({ id: session.id, questions: session.answers.map(a => data.questions.find(q => q.id === a.question_id)!).filter(Boolean), choices: Object.fromEntries(session.answers.filter(a => a.choice !== null).map(a => [a.question_id,a.choice as number])), index: 0, mode: session.mode as Mode, started: Date.now(), deadline: null, flagged: [] });
    setFinished(true); setSaved(true); setError("");
  };
  if (run && finished) {
    const score = run.questions.filter(q => run.choices[q.id] === q.answer).length;
    return <div className="practice-studio"><ScreenHeader eyebrow="Practice complete" title={`${score} / ${run.questions.length}`} description="Your next improvement is in the review." onBack={() => { if (saved || confirm("Leave without saving this result?")) setRun(null); }} /><Card className="practice-result"><Trophy size={30} /><h2>{score === run.questions.length ? "Strong run. Keep building." : "Every miss is a next step."}</h2><p role="status">{saved ? "Saved to your practice history." : saving ? "Saving your result…" : "Result not saved yet."}</p>{error && <ErrorBanner message={error} />}{!saved && <Button loading={saving} onClick={() => void save()}>Retry saving result</Button>}<Button variant="secondary" onClick={() => { if (saved || confirm("Leave without saving this result?")) setRun(null); }}>Back to practice</Button></Card>{run.questions.map(q => <Card key={q.id} className="practice-review"><Tag tone={run.choices[q.id] === q.answer ? "good" : "warn"}>{run.choices[q.id] === q.answer ? "Correct" : "Review"} · {q.skill}</Tag>{q.passage && <p className="practice-passage">{q.passage}</p>}<h3>{q.prompt}</h3><p>Your answer: {q.options[run.choices[q.id]] ?? "Unanswered"}</p><strong>Answer: {q.options[q.answer]}</strong><p>{q.explanation}</p>{q.audio && <details><summary>Transcript</summary><p>{q.audio}</p></details>}</Card>)}</div>;
  }
  if (run) {
    const q = run.questions[run.index];
    const choice = run.choices[q.id];
    const seconds = Math.max(0, Math.ceil(((run.deadline || clock) - clock) / 1000));
    return <div className="practice-studio"><ScreenHeader eyebrow={`${exam.toUpperCase()} · ${run.mode}`} title="Focus session" description="One question. One useful insight." onBack={() => { if (confirm("End this set? Unsaved answers will be lost.")) setRun(null); }} />
      <div className="practice-session-top"><strong>{run.index + 1} / {run.questions.length}</strong>{run.deadline ? <span><Clock3 size={16} />{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</span> : <span>Untimed</span>}<button aria-pressed={run.flagged.includes(q.id)} onClick={() => setRun({ ...run, flagged: run.flagged.includes(q.id) ? run.flagged.filter(id => id !== q.id) : [...run.flagged,q.id] })}><Flag size={16} />{run.flagged.includes(q.id) ? "Flagged" : "Flag"}</button></div>
      <progress className="practice-progress" value={Object.keys(run.choices).length} max={run.questions.length} aria-label="Answered questions" />
      {expired && <div className="practice-expired" role="status">Time is up. Submit to review your answers.</div>}
      <Card className="practice-question"><div className="practice-kicker"><Tag tone="cyan">{q.skill}</Tag><small>{q.level}</small></div>{q.passage && <p className="practice-passage">{q.passage}</p>}<Briefing question={q} revealed={revealed} /><h2>{q.prompt}</h2><div className="practice-options">{q.options.map((option,index) => <button key={option} disabled={expired || revealed} aria-pressed={choice === index} className={`${choice === index ? "selected" : ""} ${revealed && index === q.answer ? "correct" : ""}`} onClick={() => setRun({ ...run, choices: { ...run.choices, [q.id]: index } })}><span>{String.fromCharCode(65+index)}</span>{option}{revealed && index === q.answer && <Check size={17} />}</button>)}</div>
      {run.mode !== "timed" && !revealed && <Button className="w-full" disabled={choice === undefined} onClick={() => setRevealed(true)}>Check answer</Button>}
      {revealed && <div className="practice-explanation" role="status"><strong>{choice === q.answer ? "That's right." : "Let's unpack it."}</strong><p>{q.explanation}</p></div>}
      <div className="practice-actions"><Button variant="ghost" disabled={!run.index} onClick={() => { setRun({ ...run,index:run.index-1 }); setRevealed(false); }}>Previous</Button>{run.index < run.questions.length-1 ? <Button onClick={() => { setRun({ ...run,index:run.index+1 }); setRevealed(false); }}>Next<ArrowRight size={16} /></Button> : <Button onClick={() => void save()}>Finish & review</Button>}</div></Card>
      <div className="practice-jump" aria-label="Question navigator">{run.questions.map((item,index) => <button key={item.id} aria-label={`Question ${index+1}${run.flagged.includes(item.id) ? ", flagged" : ""}`} aria-current={index === run.index ? "step" : undefined} className={`${run.choices[item.id] !== undefined ? "answered" : ""} ${index === run.index ? "current" : ""}`} onClick={() => { setRun({...run,index}); setRevealed(false); }}>{index+1}{run.flagged.includes(item.id) && <Flag size={10} />}</button>)}</div><Button variant="ghost" className="w-full" onClick={() => void save()}>{expired ? "Submit timed set" : "Finish this set now"}</Button><p className="practice-disclaimer">Unanswered questions count as incorrect. Short original drills, not an official test.</p></div>;
  }
  const sections = exam === "sat" ? [{value:"math",label:"Math"},{value:"reading_writing",label:"Reading & Writing"}] : [{value:"writing",label:"Writing"},{value:"speaking",label:"Speaking"},{value:"reading",label:"Reading"},{value:"listening",label:"Listening"}];
  return <div className={`practice-studio studio-${exam}`}><ScreenHeader eyebrow="Your daily edge" title={exam === "sat" ? "SAT Studio" : "IELTS Studio"} description={exam === "sat" ? "Build the skill. Then build the pace." : "Four skills. One steady rhythm."} onBack={() => navigate("tools")} />
    <section className="studio-hero"><div><span>{exam === "sat" ? "FOCUS → PRACTICE → REVIEW" : "WRITE · SPEAK · READ · LISTEN"}</span><h2>{exam === "sat" ? "Small sessions. Stronger reasoning." : "Find your voice. Build your range."}</h2></div>{exam === "sat" ? <Target size={42} /> : <Headphones size={42} />}</section>
    <div className="studio-stats"><span><strong>{answered ? `${Math.round(100*correct/answered)}%` : "—"}</strong><small>Practice accuracy</small></span><span><strong>{recent.length}</strong><small>Saved sets</small></span><span><strong>{mistakes.length}</strong><small>To revisit</small></span></div>
    <PracticeStreakCard streak={data.streak} compact /><Segmented value={tab} onChange={value=>{if(window.dispatchEvent(new Event("univenture:before-navigate",{cancelable:true})))setTab(value);}} options={[{value:"practice",label:"Practice"},{value:"history",label:"My progress"},...(coach ? [{value:"coach" as const,label:"AI coach"}] : [])]} />
    {error && <ErrorBanner message={error} />}
    {tab === "coach" ? coach : tab === "history" ? <>
      <Card><h2>Your skill map</h2><p className="practice-disclaimer">Based on saved practice, not an exam score.</p>{[...new Set(questions.map(q => q.skill))].map(name => { const records = questions.filter(q => q.skill === name).map(q => data.records[q.id]).filter(Boolean); const n = records.reduce((a,r) => a+r.attempts,0); const c = records.reduce((a,r) => a+r.correct,0); return <div className="studio-skill" key={name}><span>{name}</span><strong>{n ? `${Math.round(100*c/n)}% · ${n} attempts` : "Not practiced"}</strong><progress value={c} max={n || 1} aria-label={`${name} practice accuracy`} /></div>; })}</Card>
      <Card><h2>Recent sessions</h2>{recent.length ? [...recent].reverse().slice(0,10).map(s => <button className="studio-history" key={s.id} onClick={() => review(s)}><span><strong>{s.mode === "review" ? "Mistake review" : s.mode === "timed" ? "Timed set" : "Learning set"}</strong><small>{new Date(s.created_at*1000).toLocaleDateString()} · {Math.ceil(s.seconds/60)} min</small></span><b>{s.correct}/{s.total}</b><ArrowRight size={16} /></button>) : <p>Finish your first set to start your learning history.</p>}</Card></> : <>
      <Segmented value={section} onChange={value => { if(!window.dispatchEvent(new Event("univenture:before-navigate",{cancelable:true})))return; setSection(value); setSkill("all"); setError(""); }} options={sections} />
      {(section === "writing" || section === "speaking") ? <IELTSWorkbench key={section} skill={section} library={data} onChanged={onChanged} onCompleted={streak=>setData(current=>current && ({...current,streak}))} /> : <Card className="studio-launch"><Select label="Practice focus" value={skill} onChange={e=>setSkill(e.target.value)}><option value="all">Mix my skills</option>{[...new Set(questions.filter(q=>q.section===section).map(q=>q.skill))].map(s=><option key={s}>{s}</option>)}</Select>
      <div className="studio-modes">{([{id:"learn",icon:BookOpen,title:"Learn",note:"Feedback after each answer"},{id:"timed",icon:Clock3,title:"Timed",note:"90 seconds per question"},{id:"review",icon:RotateCcw,title:"Review",note:"Missed + due questions"}] as const).map(({id,icon:Icon,title,note})=><button key={id} aria-pressed={mode===id} className={mode===id ? "active" : ""} onClick={()=>setMode(id)}><Icon size={21}/><strong>{title}</strong><small>{note}</small></button>)}</div><Button className="w-full" onClick={start}>Start {mode === "review" ? "review" : "a short set"}<ArrowRight size={17}/></Button><p className="practice-disclaimer">Up to 5 questions. New questions come first; repeated practice is clearly reflected in your history.</p></Card>}
      <p className="practice-disclaimer">Original learning exercises, not affiliated with {exam === "sat" ? "College Board" : "the IELTS Partners"}. No official score prediction. {exam === "sat" ? <a href="https://satsuite.collegeboard.org/practice/practice-tests/bluebook" target="_blank" rel="noreferrer">Use Bluebook for full-length official tests.</a> : <a href="https://ielts.org/take-a-test/preparation-resources" target="_blank" rel="noreferrer">Official IELTS preparation.</a>}</p></>}
  </div>;
}
