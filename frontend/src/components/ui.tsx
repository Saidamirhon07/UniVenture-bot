import clsx from "clsx";
import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Flame, LoaderCircle, Sparkles, Upload } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { api } from "../api";
import type { PracticeStreak } from "../types";

export function Card({ children, className = "", tone = "glass" }: { children: ReactNode; className?: string; tone?: "glass" | "light" | "cyan" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("card", tone === "light" && "card-light", tone === "cyan" && "card-cyan", className)}
    >
      {children}
    </motion.section>
  );
}

export function Button({ className = "", variant = "primary", loading, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  return (
    <button
      className={clsx("button", `button-${variant}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Input({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Textarea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const generatedId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [undo, setUndo] = useState<string | null>(null);
  function replace(value: string) {
    const element = ref.current;
    if (!element) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.focus();
  }
  return (
    <div className="field writing-field">
      <div className="writing-label"><label className="field-label" htmlFor={props.id || generatedId}>{label}</label>
        {!props.readOnly && props.onChange ? <button className="clear-text" type="button" disabled={props.disabled || (!props.value && undo === null)} onClick={() => {
          if (props.value) { const previous = String(props.value); replace(""); setUndo(previous); }
          else if (undo !== null) { replace(undo); setUndo(null); }
        }}>{!props.value && undo !== null ? "Undo clear" : "Clear"}</button> : null}
      </div>
      <textarea {...props} ref={ref} id={props.id || generatedId} className="textarea" onChange={(event) => { setUndo(null); props.onChange?.(event); }} />
      <span className="field-meta"><span>{hint}</span>{typeof props.value === "string" ? <span>{props.value.length.toLocaleString()} characters</span> : null}</span>
    </div>
  );
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="input" {...props}>{children}</select>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} className={clsx("segment", value === option.value && "segment-active")} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ScreenHeader({ eyebrow, title, description, onBack }: { eyebrow: string; title: string; description: string; onBack: () => void }) {
  return (
    <header className="screen-header">
      <button type="button" className="back-button" onClick={onBack} aria-label="Back"><ArrowLeft size={19} /></button>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner" role="alert">{message}</div>;
}

export function ProgressRing({ value, size = 116 }: { value: number; size?: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 108 108" aria-hidden="true">
        <circle className="ring-track" cx="54" cy="54" r={radius} />
        <circle className="ring-value" cx="54" cy="54" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="ring-label"><strong>{value}%</strong><span>ready</span></div>
    </div>
  );
}

export function LoadingScreen({ label = "Building your command center…" }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="brand-mark"><Sparkles size={22} /></div>
      <div className="loading-line"><span /></div>
      <p>{label}</p>
    </div>
  );
}

export function PracticeStreakCard({ streak, compact = false }: { streak: PracticeStreak | null; compact?: boolean }) {
  const count = streak?.current_streak || 0;
  const done = Boolean(streak?.completed_today);
  return (
    <section className={`practice-streak ${compact ? "compact" : ""} ${done ? "complete" : ""}`} aria-label={`${count} day practice streak`}>
      <span className="streak-flame"><Flame size={compact ? 17 : 21} /></span>
      <div>
        <small>{done ? "Daily mission complete" : count ? "Keep the chain alive" : "Start your momentum"}</small>
        <strong>{count} day{count === 1 ? "" : "s"} in a row</strong>
      </div>
      <em>{done ? <><CheckCircle2 size={14} />Done today</> : "One quest today"}</em>
    </section>
  );
}

export function FileImport({ onText, disabled }: { onText: (text: string, filename: string) => void; disabled?: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) { setError("Choose a file smaller than 5 MB."); return; }
    setLoading(true);
    try {
    if ([".txt", ".md"].some((extension) => file.name.toLowerCase().endsWith(extension))) {
      onText(await file.text(), file.name);
      return;
    }
    const extracted = await api.upload<{ filename: string; text: string }>("/api/files/extract", file);
    onText(extracted.text, extracted.filename);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't import this file. Try pasting its text."); }
    finally { setLoading(false); }
  }

  return (
    <div><label className={clsx("file-import", (disabled || loading) && "opacity-50 pointer-events-none")}>
      <Upload size={17} />
      <span>{loading ? "Importing…" : "Import PDF, DOCX or TXT"}</span>
      <input type="file" accept=".pdf,.docx,.txt,.md" hidden disabled={disabled || loading} onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} />
    </label>{error && <ErrorBanner message={error}/>}</div>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "cyan" }) {
  return <span className={clsx("tag", `tag-${tone}`)}>{children}</span>;
}
