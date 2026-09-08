import { useEffect, useRef, useState } from "react";
import { Clock3, Mic, Pause, Play, RotateCcw, Save, Sparkles } from "lucide-react";
import { api } from "../api";
import type { EvaluationResponse, PracticeStreak } from "../types";
import type { PracticeLibrary } from "./PracticeStudio";
import { useLeaveGuard } from "./PracticeStudio";
import { Button, Card, ErrorBanner, Segmented, Select, Textarea } from "./ui";
import ResultPanel from "./ResultPanel";

const prompts = {
  writing_task_1: [
    "The table gives the percentage of journeys made by bicycle in three fictional cities. City A: 2010—12%, 2020—24%; City B: 2010—18%, 2020—21%; City C: 2010—8%, 2020—20%. Summarise the information by selecting the main features and making relevant comparisons.",
    "The table shows library visits per month at a fictional university. Undergraduates: January 4,200, April 5,600, July 2,100. Postgraduates: January 1,800, April 2,400, July 2,000. Staff: January 600, April 650, July 500. Summarise the main features and make comparisons.",
  ],
  writing_task_2: [
    "Some people believe universities should prepare students mainly for employment. Others believe universities should also develop students' wider knowledge and interests. Discuss both views and give your own opinion.",
    "More people now work from home. Do the advantages of this development outweigh the disadvantages? Give reasons and examples.",
    "Some cities are making their centres car-free. To what extent do you agree or disagree with this policy? Give reasons and examples.",
  ],
  speaking: [
    "Describe a skill you taught yourself. Say what it was, why you wanted to learn it, how you practised, and explain how you felt when you improved. Follow-up: How has technology changed the way people learn skills?",
    "Describe a place in your area that you enjoy visiting. Say where it is, what you do there, who you go with, and explain why it matters to you. Follow-up: What makes a public space successful?",
    "Describe a time when you solved a difficult problem. Say what happened, who was involved, what you tried, and explain what you learned. Follow-up: Should schools teach problem-solving separately from other subjects?",
  ],
};

function VoiceRecorder() {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const timer = useRef<number>();
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useLeaveGuard(recording);
  useEffect(() => { alive.current = true; return () => { alive.current = false; window.clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t=>t.stop()); }; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function start() {
    if (requesting || recording) return;
    setError(""); setRequesting(true);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Recording is unavailable here. Use your phone recorder, then type a transcript below."); setRequesting(false); return; }
    try {
      const source = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { source.getTracks().forEach(t=>t.stop()); return; }
      stream.current = source;
      const media = new MediaRecorder(source);
      const chunks: BlobPart[] = [];
      media.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      media.onstop = () => { window.clearTimeout(timer.current); source.getTracks().forEach(t=>t.stop()); if (alive.current) { setUrl(URL.createObjectURL(new Blob(chunks,{type:media.mimeType}))); setRecording(false); } };
      media.onerror = () => { source.getTracks().forEach(t=>t.stop()); if (alive.current) { setRecording(false); setError("Recording failed. Try again or use your phone recorder."); } };
      recorder.current = media; media.start(); setRecording(true);
      timer.current = window.setTimeout(() => { if (media.state === "recording") media.stop(); }, 180000);
    } catch { stream.current?.getTracks().forEach(t=>t.stop()); if (alive.current) setError("Microphone access was not available. You can still practise aloud and type your transcript."); }
    finally { if (alive.current) setRequesting(false); }
  }
  return <div className="voice-recorder"><Button variant="secondary" loading={requesting} onClick={() => recording ? recorder.current?.stop() : void start()}><Mic size={18}/>{recording ? "Stop recording" : url ? "Record again" : "Record my answer"}</Button><small>Local playback only · stops after 3 minutes · download before leaving</small>{recording && <p role="status">Recording…</p>}{error && <ErrorBanner message={error}/ >}{url && <><audio controls src={url}/><a href={url} download="ielts-speaking-practice">Download recording</a></>}</div>;
}

export default function IELTSWorkbench({ skill, library, onChanged, onCompleted }: { skill: "writing" | "speaking"; library: PracticeLibrary; onChanged: () => void; onCompleted: (streak: PracticeStreak) => void }) {
  const [task, setTask] = useState<"task_1" | "task_2">("task_2");
  const key = skill === "speaking" ? "speaking" : `writing_${task}` as const;
  const savedDraft = library.drafts[key];
  const [prompt, setPrompt] = useState(savedDraft?.prompt || prompts[key][0]);
  const [content, setContent] = useState(savedDraft?.content || "");
  const [baseline, setBaseline] = useState({prompt:savedDraft?.prompt || prompts[key][0],content:savedDraft?.content || ""});
  const [seconds, setSeconds] = useState(skill === "speaking" ? 60 : 2400);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [status, setStatus] = useState(savedDraft ? "Saved draft restored" : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [band, setBand] = useState("7.0");
  const dirty = content !== baseline.content || prompt !== baseline.prompt;
  useLeaveGuard(dirty);
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => { const remaining = Math.max(0,Math.ceil((deadline-Date.now())/1000)); setSeconds(remaining); if (!remaining) setDeadline(null); };
    tick(); const id = window.setInterval(tick,500); return () => window.clearInterval(id);
  }, [deadline]);
  function changeTask(value: "task_1" | "task_2") {
    if (dirty && !confirm("Switch tasks? Save your draft first to keep it.")) return;
    const nextKey = `writing_${value}` as const;
    const draft = library.drafts[nextKey];
    const next = {prompt:draft?.prompt || prompts[nextKey][0],content:draft?.content || ""};
    setTask(value); setPrompt(next.prompt); setContent(next.content); setBaseline(next); setSeconds(value === "task_1" ? 1200 : 2400); setDeadline(null); setResult(null); setError(""); setStatus(draft ? "Saved draft restored" : "");
  }
  async function saveDraft(complete = false) {
    setSaving(true); setError("");
    const snapshot = {prompt,content};
    try {
      await api.post("/api/practice/draft",{key,...snapshot}); library.drafts[key] = snapshot; setBaseline(snapshot); setStatus("Draft saved to your account");
      if (complete) { const streak = await api.post<PracticeStreak>("/api/practice/complete",{skill:"ielts"}); onCompleted(streak); setStatus("Draft saved · today's IELTS practice recorded"); }
      onChanged();
    }
    catch(e) { setError(e instanceof Error ? e.message : "Draft not saved. Please retry."); }
    finally { setSaving(false); }
  }
  async function coach() {
    setLoading(true); setError(""); setResult(null);
    try { setResult(await api.post<EvaluationResponse>("/api/evaluate/ielts",{skill,task_type:skill === "writing" ? task : null,question:prompt,content,target_band:band})); onChanged(); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not load feedback."); }
    finally { setLoading(false); }
  }
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return <><Card className="ielts-workbench">{skill === "writing" && <Segmented value={task} onChange={changeTask} options={[{value:"task_1",label:"Academic Task 1"},{value:"task_2",label:"Task 2"}]}/>}
    <div className="practice-kicker"><strong>{skill === "writing" ? "Writing room" : "Speaking room · Part 2"}</strong><small>Original prompts</small></div>
    <Select label="Choose a prompt" value={prompts[key].includes(prompt) ? prompt : "custom"} onChange={e=>{if (e.target.value !== "custom") {setPrompt(e.target.value);setResult(null);}}}>{!prompts[key].includes(prompt) && <option value="custom">Saved / custom prompt</option>}{prompts[key].map((p,index)=><option key={p} value={p}>Prompt {index+1}: {p.slice(0,62)}…</option>)}</Select>
    <p className="practice-passage">{prompt}</p><details><summary>Use my own prompt</summary><Textarea label="Task or cue card" value={prompt} maxLength={3000} onChange={e=>{setPrompt(e.target.value);setResult(null);}} /></details>
    <div className="workbench-timer"><Clock3 size={22}/><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</strong><Button variant="ghost" onClick={()=>setDeadline(deadline ? null : Date.now()+seconds*1000)} disabled={!seconds}>{deadline ? <Pause size={16}/> : <Play size={16}/ >}{deadline ? "Pause" : "Start"}</Button><Button variant="ghost" aria-label="Reset timer" onClick={()=>{setDeadline(null);setSeconds(skill === "speaking" ? 60 : task === "task_1" ? 1200 : 2400);}}><RotateCcw size={16}/></Button></div>
    {seconds === 0 && <p role="status">Time is up. You can keep editing in practice mode.</p>}
    {skill === "speaking" ? <><p className="practice-disclaimer">Prepare for 1 minute, then speak for up to 2 minutes.</p><Button variant="secondary" onClick={()=>{setSeconds(120);setDeadline(Date.now()+120000);}}>Start 2-minute response</Button><VoiceRecorder/></> : <p className="practice-disclaimer">{task === "task_1" ? "Aim for 150+ words in about 20 minutes." : "Aim for 250+ words in about 40 minutes."} Timer is a practice aid, not an exam lock.</p>}
    <Textarea label={skill === "writing" ? "Your response" : "Your transcript"} value={content} maxLength={20000} rows={10} placeholder={skill === "writing" ? "Build your response here…" : "After listening back, type what you actually said. Audio is not transcribed or uploaded."} onChange={e=>{setContent(e.target.value);setResult(null);}} hint={`${words} words · ${dirty ? "Unsaved changes" : "No unsaved changes"}`}/>
    <Button variant="secondary" loading={saving} onClick={()=>void saveDraft()}><Save size={16}/>Save draft</Button>
    <Button variant="ghost" loading={saving} disabled={words < (skill === "speaking" ? 40 : task === "task_1" ? 150 : 250)} onClick={()=>void saveDraft(true)}>Save & complete practice</Button><p className="practice-disclaimer">Completion unlocks at {skill === "speaking" ? 40 : task === "task_1" ? 150 : 250} words. This records practice, not proficiency.</p><p role="status" className="practice-disclaimer">{status}</p>
    <Select label="Target band" value={band} onChange={e=>setBand(e.target.value)}>{["5.5","6.0","6.5","7.0","7.5","8.0","8.5","9.0"].map(b=><option key={b}>{b}</option>)}</Select>
    <details className="workbench-checklist"><summary>Before requesting feedback</summary>{(skill === "writing" ? ["I answered every part of the task.","Each paragraph has a clear purpose.","I checked grammar and repeated words."] : ["I used a real example.","I explained why the experience mattered.","I listened for repetition and long pauses."]).map(t=><label key={t}><input type="checkbox"/>{t}</label>)}</details>
    {error && <ErrorBanner message={error}/>}<Button className="w-full" loading={loading} disabled={content.trim().length<30 || !prompt.trim()} onClick={()=>void coach()}><Sparkles size={17}/>Get {skill === "writing" ? "writing" : "transcript"} feedback</Button>
    <p className="practice-disclaimer">AI feedback is an estimate, not an official band score.{skill === "speaking" ? " Text cannot assess pronunciation or real-time fluency. Recordings stay on this device and are lost when you leave unless downloaded." : " Practice word targets are guidance; short drafts can still receive feedback."}</p>
  </Card>{result && <ResultPanel response={result} refinementActions={false}/>}</>;
}
