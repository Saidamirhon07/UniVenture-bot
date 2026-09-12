import { useState, type ComponentProps } from "react";
import { FileText, Upload, X } from "lucide-react";
import { ErrorBanner, Textarea } from "./ui";

export function useSubmission() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);
  return { mode, setMode, file, setFile, attachment: mode === "file" ? file : null,
    ready: (text: string, min: number) => mode === "file" ? Boolean(file) : text.trim().length >= min };
}
export function SubmissionInput({ submission, ...props }: ComponentProps<typeof Textarea> & { submission: ReturnType<typeof useSubmission> }) {
  const [error, setError] = useState("");
  const { mode, setMode, file, setFile } = submission;
  function choose(selected?: File) {
    if (!selected) return;
    if (!/\.(pdf|docx|txt|md)$/i.test(selected.name)) { setError("Choose a PDF, DOCX or text file."); return; }
    if (!selected.size || selected.size > 5 * 1024 * 1024) { setError("Choose a non-empty file up to 5 MB."); return; }
    setError(""); setFile(selected);
  }
  return <div className="submission-input">
    <div className="submission-tabs" role="group" aria-label="Submission method">
      <button type="button" disabled={props.disabled} aria-pressed={mode === "text"} onClick={() => setMode("text")}>Write or paste</button>
      <button type="button" disabled={props.disabled} aria-pressed={mode === "file"} onClick={() => setMode("file")}><Upload size={16} /> Upload file</button>
    </div>
    {mode === "text" ? <Textarea {...props} /> : <div className="document-input">
      <strong>{props.label}</strong>
      {file ? <div className="selected-document"><FileText size={27} /><div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(0)} KB · Ready for analysis</small></div><button type="button" disabled={props.disabled} onClick={() => setFile(null)} aria-label="Remove attachment"><X size={20} /></button></div> : null}
      <label className="document-picker"><Upload size={21}/><span>{file ? "Replace file" : "Choose your document"}</span><input aria-label="Upload document" type="file" accept=".pdf,.docx,.txt,.md" disabled={props.disabled} onChange={e => { choose(e.target.files?.[0]); e.target.value = ""; }} /></label>
      <p className="field-hint">PDF, DOCX or TXT · Up to 5 MB. PDFs: up to 20 pages, including images. DOCX: text and tables; export to PDF for visual work.</p>
      <p className="field-hint">Only this file is submitted in file mode. Your typed draft stays separate. The file is sent for AI processing; feedback and readable text may be saved with your account.</p>
      {error ? <ErrorBanner message={error}/> : null}
    </div>}
  </div>;
}
