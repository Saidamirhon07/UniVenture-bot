import EvaluationChart from "./EvaluationChart";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy, FileSearch, PenLine, Sparkles } from "lucide-react";
import { api } from "../api";
import type { EvaluationResponse } from "../types";
import { Button, Card, ErrorBanner, Tag } from "./ui";

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export function resultToText(value: unknown, label = ""): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const rendered = resultToText(item);
      return rendered ? `${index + 1}. ${rendered}` : "";
    }).filter(Boolean).join("\n\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      const rendered = resultToText(nested);
      return rendered ? `${humanize(key)}\n${rendered}` : "";
    }).filter(Boolean).join("\n\n");
  }
  return label ? `${label}: ${String(value)}` : String(value);
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* use the iOS-compatible fallback */ }
  }
  const temporary = document.createElement("textarea");
  temporary.value = text;
  temporary.setAttribute("readonly", "");
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  document.body.appendChild(temporary);
  temporary.select();
  temporary.setSelectionRange(0, temporary.value.length);
  const copied = document.execCommand("copy");
  temporary.remove();
  if (!copied) throw new Error("Copy is unavailable on this device.");
}

export function CopyAction({ text, label = "Copy" }: { text: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    try {
      await writeClipboard(text);
      setStatus("copied");
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch {
      setStatus("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 2200);
  }
  return <button type="button" className={`copy-result ${status}`} disabled={!text} onClick={() => void copy()} aria-label={status === "copied" ? "Copied" : label}>
    {status === "copied" ? <Check size={15} /> : <Copy size={15} />}
    <span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Select manually" : label}</span>
  </button>;
}

function renderValue(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    return (
      <ul className="result-list">
        {value.map((item, index) => (
          <li key={index}>
            {item && typeof item === "object" ? (
              <div>
                {Object.entries(item as Record<string, unknown>).map(([key, nested]) => (
                  <div key={key}><strong>{humanize(key)}:</strong> {renderValue(nested)}</div>
                ))}
              </div>
            ) : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="nested-result">
        {Object.entries(value as Record<string, unknown>).map(([key, nested]) => (
          <div key={key}><strong>{humanize(key)}</strong>{renderValue(nested)}</div>
        ))}
      </div>
    );
  }
  return <p>{String(value ?? "—")}</p>;
}

function ActivityPortfolioBreakdown({ result }: { result: Record<string, unknown> }) {
  const reviews = Array.isArray(result.activity_reviews) ? result.activity_reviews.filter((item) => item && typeof item === "object").slice(0, 10) as Array<Record<string, unknown>> : [];
  const order = Array.isArray(result.recommended_order) ? result.recommended_order : [];
  if (!reviews.length && !order.length) return null;
  return <section className="activity-portfolio-report">
    {reviews.length ? <><div className="portfolio-report-title"><span className="eyebrow">Activity by activity</span><h3>{reviews.length} activities reviewed</h3></div><div className="activity-review-grid">{reviews.map((review, index) => {
      const score = typeof review.score === "number" && Number.isFinite(review.score) && review.score >= 0 && review.score <= 100 ? review.score : null;
      return <article className="activity-review-card" key={`${String(review.name)}-${index}`}><header><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{String(review.name || `Activity ${index + 1}`)}</h4><small>{score === null ? "Score not assessed" : `${score}/100 presentation strength`}</small></div></header>{score !== null ? <meter min={0} max={100} value={score} aria-label={`${String(review.name)} score`} /> : null}<dl><div><dt>Leadership & initiative</dt><dd>{String(review.leadership || "Not enough evidence supplied.")}</dd></div><div><dt>Impact</dt><dd>{String(review.impact || "Not enough evidence supplied.")}</dd></div><div><dt>Main issue</dt><dd>{String(review.main_issue || "No issue supplied.")}</dd></div></dl>{review.stronger_description ? <div className="activity-rewrite"><div><strong>Stronger description</strong><CopyAction text={String(review.stronger_description)} label="Copy rewrite" /></div><p>{String(review.stronger_description)}</p></div> : null}</article>;
    })}</div></> : null}
    {order.length ? <div className="recommended-order"><span className="eyebrow">Recommended order</span><ol>{order.map((item, index) => <li key={index}>{String(item)}</li>)}</ol></div> : null}
  </section>;
}

export function StructuredResult({ result }: { result: Record<string, unknown> }) {
  const ignored = new Set(["headline", "quality_score", "sections", "next_step", "criteria", "activity_reviews", "recommended_order"]);
  const sections = result.sections && typeof result.sections === "object" ? result.sections : Object.fromEntries(Object.entries(result).filter(([key]) => !ignored.has(key)));
  return (
    <div className="result-stack">
      <div className="result-copy-row"><CopyAction text={resultToText(result)} label="Copy full feedback" /></div>
      <EvaluationChart value={result.criteria} />
      <ActivityPortfolioBreakdown result={result} />
      {Object.entries(sections as Record<string, unknown>).map(([key, value], index) => (
        <div className="result-section" key={key}>
          <div className="result-label"><span><span className="result-number">{String(index + 1).padStart(2, "0")}</span>{Array.isArray(sections) && value && typeof value === "object" && "title" in value ? String(value.title) : humanize(key)}</span><CopyAction text={resultToText(value)} /></div>
          {renderValue(value)}
        </div>
      ))}
      {result.next_step ? (
        <div className="next-step"><Sparkles size={17} /><div><span>Exact next step</span><p>{String(result.next_step)}</p></div><CopyAction text={String(result.next_step)} /></div>
      ) : null}
    </div>
  );
}

export default function ResultPanel({ response, refinementActions = true }: { response: EvaluationResponse; refinementActions?: boolean }) {
  const [fullReview, setFullReview] = useState<Record<string, unknown> | null>(null);
  const [refinement, setRefinement] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const result = response.result;
  useEffect(() => { setFullReview(null); setRefinement(null); setError(""); setLoading(""); }, [response]);

  async function getFullReview() {
    if (!response.evaluation_id) return;
    setLoading("full"); setError("");
    try {
      const data = await api.post<{ result: Record<string, unknown> }>("/api/full-review", { evaluation_id: response.evaluation_id });
      setFullReview(data.result);
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the full review.");
    } finally { setLoading(""); }
  }

  async function refine(action: string) {
    if (!response.evaluation_id) return;
    setLoading(action); setError("");
    try {
      const data = await api.post<{ result: Record<string, unknown> }>("/api/evaluate/refine", { evaluation_id: response.evaluation_id, action });
      setRefinement(data.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate the revision.");
    } finally { setLoading(""); }
  }

  return (
    <div className="space-y-3">
      <Card className="result-card">
        <div className="result-heading">
          <div>
            <Tag tone="cyan">AI diagnosis</Tag>
            <h2>{String(result.headline || "Your focused review")}</h2>
          </div>
          {typeof result.quality_score === "number" && Number.isFinite(result.quality_score) && result.quality_score >= 0 && result.quality_score <= 100 ? <div className="quality-score"><strong>{result.quality_score}</strong><span>/100</span></div> : null}
        </div>
        {response.source ? <p className="source-note">Reviewed: {response.source.filename}{response.source.requires_reupload ? " · Re-upload the PDF for another review; originals are not retained." : ""}</p> : null}
        <StructuredResult result={result} />
      </Card>

      {error ? <ErrorBanner message={error} /> : null}

      {response.can_full_review && response.evaluation_id ? (
        <Button className="w-full" variant="secondary" disabled={Boolean(loading)} loading={loading === "full"} onClick={() => void getFullReview()}>
          <FileSearch size={18} /> Get Full Detailed Review <ChevronRight size={17} />
        </Button>
      ) : null}

      {refinementActions && !response.source?.requires_reupload && response.evaluation_id ? (
        <div className="action-scroll">
          <button disabled={Boolean(loading)} onClick={() => void refine("rewrite_section")}><PenLine size={16} /> Rewrite section</button>
          <button disabled={Boolean(loading)} onClick={() => void refine("improve_hook")}><Sparkles size={16} /> Improve hook</button>
          <button disabled={Boolean(loading)} onClick={() => void refine("improve_ending")}>Improve ending</button>
          <button disabled={Boolean(loading)} onClick={() => void refine("deepen_reflection")}>Deeper reflection</button>
        </div>
      ) : null}

      {refinement ? <Card><Tag tone="good">Revision options</Tag><h3 className="mt-3">{String(refinement.headline || "Targeted rewrite")}</h3><StructuredResult result={refinement} /></Card> : null}
      {fullReview ? <Card className="full-review"><Tag tone="good">Full strategic review</Tag><h2>{String(fullReview.headline || "Detailed review")}</h2><StructuredResult result={fullReview} /></Card> : null}
    </div>
  );
}
