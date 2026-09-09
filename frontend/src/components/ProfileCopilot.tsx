import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Sparkles, X } from "lucide-react";
import { ApiError, api } from "../api";
import type { ScreenId } from "../types";

type ChatMessage = { role: "user" | "assistant"; content: string; bullets?: string[]; nextAction?: string };
type CopilotAccess = { is_premium: boolean; daily_limit: number | null; used_today: number; remaining_today: number | null };
type CopilotResponse = { answer: string; bullets?: unknown; next_action?: unknown; access: CopilotAccess };

function cleanResponse(payload: CopilotResponse): ChatMessage {
  let answer = String(payload.answer || "").trim();
  let bullets = Array.isArray(payload.bullets) ? payload.bullets.map(String).filter(Boolean).slice(0, 3) : [];
  let nextAction = typeof payload.next_action === "string" ? payload.next_action.trim() : "";
  if (answer.startsWith("{") && answer.endsWith("}")) {
    try {
      const legacy = JSON.parse(answer) as Record<string, unknown>;
      answer = String(legacy.answer || legacy.headline || legacy.summary || answer).trim();
      const rawBullets = legacy.bullets || legacy.actions || legacy.moves;
      if (Array.isArray(rawBullets)) {
        bullets = rawBullets.map((item) => typeof item === "object" && item ? String((item as Record<string, unknown>).title || (item as Record<string, unknown>).action || (item as Record<string, unknown>).text || "") : String(item)).filter(Boolean).slice(0, 3);
      }
      nextAction = String(legacy.next_action || legacy.next_step || nextAction || "").trim();
    } catch {
      // Keep the plain response when an older server returns non-JSON text.
    }
  }
  return { role: "assistant", content: answer || "I’m ready—try that question once more.", bullets, nextAction };
}

const promptByScreen: Partial<Record<ScreenId, string[]>> = {
  home: ["What should I do today?", "What is my biggest profile gap?", "Explain my readiness score"],
  plan: ["Is this workload realistic?", "What should I postpone?", "Which task unlocks the others?"],
  school: ["How balanced is my school list?", "What profile detail is missing?", "Where is aid most risky?"],
  prep: ["Should I prioritize SAT or IELTS?", "Build a 20-minute study move", "What score should I verify?"],
  sat: ["Diagnose my SAT plateau", "Choose today’s SAT skill", "How should I review errors?"],
  ielts: ["Choose today’s IELTS skill", "How can I reach my target band?", "Give me a speaking warm-up"],
  portfolio: ["What makes my profile memorable?", "Which evidence is weakest?", "What should I add next?"],
};

export default function ProfileCopilot({ screen, isPremium, onUpgrade }: { screen: ScreenId; isPremium: boolean; onUpgrade: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: isPremium
      ? "Ask me anything about your applications. I’ll use your saved profile and tell you when information is missing."
      : "Ask me a general admissions question. You have 3 free Venture questions each day." },
  ]);
  const [access, setAccess] = useState<CopilotAccess>({ is_premium: isPremium, daily_limit: isPremium ? null : 3, used_today: 0, remaining_today: isPremium ? null : 3 });
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, loading]);
  useEffect(() => {
    if (!open) return;
    void api.get<CopilotAccess>("/api/copilot/access").then(setAccess).catch(() => undefined);
  }, [open]);

  async function ask(text = question) {
    const clean = text.trim();
    if (clean.length < 2 || loading) return;
    const nextUser: ChatMessage = { role: "user", content: clean };
    const history = [...messages.filter((item) => item.content), nextUser];
    setMessages(history); setQuestion(""); setLoading(true); setError("");
    try {
      const data = await api.post<CopilotResponse>("/api/copilot", { question: clean, current_screen: screen, history: messages.slice(-6).map(({ role, content }) => ({ role, content })) });
      setMessages((items) => [...items, cleanResponse(data)]);
      setAccess(data.access);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 402 && caught.detail && typeof caught.detail === "object" && (caught.detail as { code?: string }).code === "free_copilot_limit") {
        const serverAccess = (caught.detail as { access?: CopilotAccess }).access;
        if (serverAccess) setAccess(serverAccess);
        setMessages((items) => items.filter((item, index) => index !== items.length - 1 || item.role !== "user"));
        onUpgrade();
        return;
      }
      setError(caught instanceof Error ? caught.message : "Your copilot could not answer just now.");
    } finally { setLoading(false); }
  }

  const prompts = promptByScreen[screen] || promptByScreen.home || [];
  return <>
    <button className={`copilot-fab ${open ? "active" : ""}`} aria-label={open ? "Close Venture copilot" : "Ask Venture copilot"} onClick={() => setOpen((value) => !value)}>
      {open ? <X size={22} /> : <><MessageCircle size={23} /><i /></>}
    </button>
    {open ? <section className="copilot-panel" aria-label="Venture admissions copilot">
      <header><span><Sparkles size={18} /></span><div><strong>Venture</strong><small>{access.is_premium ? "Profile-aware copilot" : `${access.remaining_today ?? 0} free questions left today`}</small></div><button aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button></header>
      <div className="copilot-messages">
        {messages.map((message, index) => <div className={`copilot-message ${message.role}`} key={`${message.role}-${index}`}><span><p>{message.content}</p>{message.bullets?.length ? <ul>{message.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}{message.nextAction ? <b><Sparkles size={12} />Next: {message.nextAction}</b> : null}</span></div>)}
        {loading ? <div className="copilot-message assistant typing"><span><i /><i /><i /></span></div> : null}
        {error ? <p className="copilot-error">{error}</p> : null}
        <div ref={endRef} />
      </div>
      {messages.length < 3 && (access.is_premium || (access.remaining_today ?? 0) > 0) ? <div className="copilot-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)}>{prompt}</button>)}</div> : null}
      {!access.is_premium && access.remaining_today === 0
        ? <div className="copilot-upgrade"><p>Daily questions used. Premium gives you profile-aware Venture guidance.</p><button onClick={onUpgrade}><Sparkles size={15} />Unlock Premium</button></div>
        : <div className="copilot-composer"><textarea rows={1} aria-label="Ask your admissions copilot" placeholder={access.is_premium ? "Ask about your plan, schools, essays…" : "Ask a general admissions question…"} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} /><button aria-label="Send" disabled={question.trim().length < 2 || loading} onClick={() => void ask()}><ArrowUp size={18} /></button></div>}
      <small className="copilot-note">{access.is_premium ? "Uses your saved profile. No admission guarantees." : "General guidance only. Premium adds your saved profile."}</small>
    </section> : null}
  </>;
}
