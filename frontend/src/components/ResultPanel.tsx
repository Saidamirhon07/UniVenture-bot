import EvaluationChart from "./EvaluationChart";
import { useEffect, useState } from "react";
import { ChevronRight, FileSearch, PenLine, Sparkles } from "lucide-react";
import { api } from "../api";
import type { EvaluationResponse } from "../types";
import { Button, Card, ErrorBanner, Tag } from "./ui";

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
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

export function StructuredResult({ result }: { result: Record<string, unknown> }) {
  const ignored = new Set(["headline", "quality_score", "sections", "next_step", "criteria"]);
  const sections = result.sections && typeof result.sections === "object" ? result.sections : Object.fromEntries(Object.entries(result).filter(([key]) => !ignored.has(key)));
  return (
    <div className="result-stack">
      <EvaluationChart value={result.criteria} />
      {Object.entries(sections as Record<string, unknown>).map(([key, value], index) => (
        <div className="result-section" key={key}>
          <div className="result-label"><span className="result-number">{String(index + 1).padStart(2, "0")}</span>{Array.isArray(sections) && value && typeof value === "object" && "title" in value ? String(value.title) : humanize(key)}</div>
          {renderValue(value)}
        </div>
      ))}
      {result.next_step ? (
        <div className="next-step"><Sparkles size={17} /><div><span>Exact next step</span><p>{String(result.next_step)}</p></div></div>
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
