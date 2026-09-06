import { useMemo, useState } from "react";
import { ScanText, ShieldCheck } from "lucide-react";
import { api } from "../api";
import type { EvaluationResponse, Navigate } from "../types";
import ResultPanel from "../components/ResultPanel";
import { Button, Card, ErrorBanner, FileImport, Input, ScreenHeader, Segmented, Tag, Textarea } from "../components/ui";

type EssayType = "personal_statement" | "supplemental";

export default function EssayLabScreen({ navigate, onChanged }: { navigate: Navigate; onChanged: () => void }) {
  const [essayType, setEssayType] = useState<EssayType>("personal_statement");
  const [content, setContent] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [filename, setFilename] = useState("");
  const [response, setResponse] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  async function analyze() {
    setLoading(true); setError(""); setResponse(null);
    try {
      const data = await api.post<EvaluationResponse>("/api/evaluate/essay", {
        essay_type: essayType,
        content,
        school_name: essayType === "supplemental" ? schoolName || null : null,
        prompt: essayType === "supplemental" ? prompt || null : null,
      });
      setResponse(data); onChanged();
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not analyze this essay.");
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("error");
    } finally { setLoading(false); }
  }

  return (
    <div className="page-enter space-y-3">
      <ScreenHeader eyebrow="Your writing studio" title="Essay Lab" description="Short diagnosis first. Deeper review only when you ask for it." onBack={() => navigate("tools")} />

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
          <Textarea
            label={essayType === "personal_statement" ? "Your draft" : "Your response"}
            rows={12}
            placeholder={essayType === "personal_statement" ? "Paste the full draft. The coach will look for what this reveals about you—not just what happened." : "Paste your draft and include the university above for a truly school-specific check."}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            hint={`${wordCount} words${filename ? ` • ${filename}` : ""}`}
          />
          <FileImport disabled={loading} onText={(text, name) => { setContent(text); setFilename(name); }} />
        </div>

        <div className="privacy-note"><ShieldCheck size={15} /> Your draft is tied to your secure Telegram identity and existing UniVenture memory.</div>
        {error ? <ErrorBanner message={error} /> : null}
        <Button className="w-full mt-4" loading={loading} disabled={content.trim().length < 80} onClick={() => void analyze()}>
          <ScanText size={18} /> Analyze My Essay
        </Button>
      </Card>

      {response ? <ResultPanel response={response} /> : (
        <Card className="empty-insight">
          <Tag>What you’ll get</Tag>
          <h3>{essayType === "personal_statement" ? "A story-level diagnosis—not grammar confetti." : "A school-fit diagnosis—not a recycled essay rubric."}</h3>
          <p>Five compact signals, one rewrite priority, and optional buttons for a detailed review or targeted revision.</p>
        </Card>
      )}
    </div>
  );
}
