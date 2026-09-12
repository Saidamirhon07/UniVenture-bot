import { useState } from "react";

export type Criterion = { label: string; score: number | null; evidence: string; improvement: string };
export function validCriteria(value: unknown): Criterion[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item.label === "string").slice(0, 8).map(item => ({
    label: item.label, score: typeof item.score === "number" && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100 ? item.score : null,
    evidence: typeof item.evidence === "string" ? item.evidence : "No supporting explanation was provided.",
    improvement: typeof item.improvement === "string" ? item.improvement : "Ask for specific evidence in your next review.",
  }));
}
export default function EvaluationChart({ value }: { value: unknown }) {
  const criteria = validCriteria(value);
  const [selected, setSelected] = useState(0);
  if (!criteria.length) return null;
  const focus = criteria[Math.min(selected, criteria.length - 1)];
  const point = (index: number, radius: number) => {
    const angle = 2 * Math.PI * index / criteria.length - Math.PI / 2;
    return [160 + radius * Math.cos(angle), 145 + radius * Math.sin(angle)];
  };
  const polygon = (radius: number) => criteria.map((_, index) => point(index, radius).join(",")).join(" ");
  const canPlot = criteria.length >= 3 && criteria.every(item => item.score !== null);
  return <section className="evaluation-visual" aria-label="Evaluation criteria">
    <div className="visual-heading"><span className="eyebrow">Your work, at a glance</span><h3>Strengths & next steps</h3><p>AI coaching estimates · 0–100 · Not admission odds or official test scores</p></div>
    <div className="criteria-overview">
      {canPlot ? <svg className="evaluation-radar" viewBox="0 0 320 300" role="img" aria-label="Radar chart of criterion scores. Exact values and explanations appear below.">
        {[.25,.5,.75,1].map(level => <polygon key={level} points={polygon(100*level)} fill="none" stroke="currentColor" opacity=".2"/>)}
        {criteria.map((_,i) => { const [x,y] = point(i,100); return <line key={i} x1="160" y1="145" x2={x} y2={y} stroke="currentColor" opacity=".18"/>; })}
        <polygon points={criteria.map((item,i) => point(i,item.score!).join(",")).join(" ")} fill="#65d9d2" fillOpacity=".28" stroke="#138f91" strokeWidth="3" strokeLinejoin="round"/>
        {criteria.map((item,i) => { const [x,y] = point(i,item.score!); const [lx,ly] = point(i,122); return <g key={i}><circle cx={x} cy={y} r="4" fill="#138f91" stroke="white" strokeWidth="2"/><text x={lx} y={ly+4} textAnchor="middle" fontSize="12" fill="currentColor">{i+1}</text></g>; })}
      </svg> : null}
      <div className="criterion-scores">{criteria.map((item,i) => <button type="button" key={i} aria-pressed={focus === item} onClick={() => setSelected(i)}>
        <span><b>{i+1}. {item.label}</b><strong>{item.score === null ? "Not assessed" : `${item.score}/100`}</strong></span>
        {item.score !== null ? <meter min={0} max={100} value={item.score} aria-label={`${item.label} score`}/> : null}
      </button>)}</div>
    </div>
    <div className="criterion-detail" aria-live="polite"><span className="eyebrow">Focus · {focus.label}</span><h4>What your work shows</h4><p>{focus.evidence}</p><h4>Make your next version stronger</h4><p>{focus.improvement}</p></div>
    <details className="all-criteria"><summary>Read all criterion explanations</summary>{criteria.map((item,i)=><section key={i}><h4>{item.label} · {item.score === null ? "Not assessed" : `${item.score}/100`}</h4><p>{item.evidence}</p><p><strong>Try next: </strong>{item.improvement}</p></section>)}</details>
  </section>;
}
