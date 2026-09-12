import { SubmissionInput, useSubmission } from "../components/SubmissionInput";
import { useEffect, useMemo, useState } from "react";
import { ScanText, ShieldCheck } from "lucide-react";
import { ApiError, api } from "../api";
import type { EvaluationResponse, Navigate } from "../types";
import ResultPanel from "../components/ResultPanel";
import { Button, Card, ErrorBanner, Input, ScreenHeader, Segmented, Tag, Textarea } from "../components/ui";

type EssayType = "personal_statement" | "supplemental";
type EssayAccess = { is_premium: boolean; free_limit: number | null; remaining: number | null };

export default function EssayLabScreen({ navigate, onChanged, isPremium, onUpgrade }: { navigate: Navigate; onChanged: () => void; isPremium: boolean; onUpgrade: () => void }) {
  const [essayType, setEssayType] = useState<EssayType>("personal_statement");
  const [content, setContent] = useState(""); const submission = useSubmission();
  const [schoolName, setSchoolName] = useState("");
  const [prompt, setPrompt] = useState("");

  const [response, setResponse] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<EssayAccess>({ is_premium: isPremium, free_limit: isPremium ? null : 1, remaining: isPremium ? null : 1 });

  useEffect(() => { void api.get<EssayAccess>("/api/evaluate/essay/access").then(setAccess).catch(() => undefined); }, []);

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  async function analyze() {
    setLoading(true); setError(""); setResponse(null);
    try {
      const data = await api.analyze<EvaluationResponse & { essay_access?: EssayAccess }>("/api/evaluate/essay", {
        essay_type: essayType,
        content,
        school_name: essayType === "supplemental" ? schoolName || null : null,
        prompt: essayType === "supplemental" ? prompt || null : null,
      }, submission.attachment);
      setResponse(data); if (data.essay_access) setAccess(data.essay_access); onChanged();
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 402) { onUpgrade(); return; }
      setError(caught instanceof Error ? caught.message : "Could not analyze this essay.");
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("error");
    } finally { setLoading(false); }
  }

  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Writing" title="Essay Review" description="Write, paste or upload. Get clear feedback." onBack={() => navigate("tools")} />

      {!access.is_premium ? <button className="free-practice-banner" onClick={onUpgrade}><span><strong>Free Essay Review</strong><small>{access.remaining ?? 0} of {access.free_limit ?? 1} complete review left</small></span><em>Unlock unlimited reviews</em></button> : null}

      <Card>
        <Segmented value={essayType} onChange={(value) => { setEssayType(value); setResponse(null); }} options={[
          { value: "personal_statement", label: "Personal Statement" },
          { value: "supplemental", label: "Supplemental" },
        ]} />
        <div className="focus-note">
          <ScanText size={18} />
          <div>
            <strong>{essayType === "personal_statement" ? "Story & inner change lens" : "Fit & specificity lens"}</strong>
            <span>{essayType === "personal_statement" ? "Voice, vulnerability, scenes, authenticity and transformation." : "School fit, contribution, intellectual direction and generic-risk checks."}</span>
          </div>
        </div>

        {essayType === "supplemental" ? (
          <div className="grid grid-cols-1 gap-3 mt-4">
            <Input label="University or program" placeholder="e.g. Northwestern University" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} />
            <Textarea label="Essay prompt" rows={3} placeholder="Paste the exact supplemental prompt…" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </div>
        ) : null}

        <div className="mt-4">
          <SubmissionInput disabled={loading} submission={submission}
            label={essayType === "personal_statement" ? "Your draft" : "Your response"}
            rows={12}
            placeholder={essayType === "personal_statement" ? "Paste the full draft. The coach will look for what this reveals about you—not just what happened." : "Paste your draft and include the university above for a truly school-specific check."}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            hint={`${wordCount} words`}
          />
        </div>

        <div className="privacy-note"><ShieldCheck size={15} /> Your draft is tied to your secure Telegram identity and existing UniVenture memory.</div>
        {error ? <ErrorBanner message={error} /> : null}
        <Button className="w-full mt-4" loading={loading} disabled={!submission.ready(content, 80)} onClick={() => access.is_premium || (access.remaining ?? 0) > 0 ? void analyze() : onUpgrade()}>
          <ScanText size={18} /> {access.is_premium || (access.remaining ?? 0) > 0 ? "Analyze My Essay" : "Unlock More Essay Reviews"}
        </Button>
      </Card>

      {response ? <ResultPanel response={response} refinementActions={access.is_premium} /> : (
        <Card className="empty-insight">
          <Tag>What you’ll get</Tag>
          <h3>{essayType === "personal_statement" ? "A story-level diagnosis—not grammar confetti." : "A school-fit diagnosis—not a recycled essay rubric."}</h3>
          <p>Five compact signals, one rewrite priority, and optional buttons for a detailed review or targeted revision.</p>
        </Card>
      )}
    </div>
  );
}
