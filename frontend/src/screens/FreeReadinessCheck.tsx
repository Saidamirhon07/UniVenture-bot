import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Gauge, LockKeyhole } from "lucide-react";
import type { Navigate } from "../types";
import { Button, Card, ScreenHeader, Select, Tag } from "../components/ui";

export default function FreeReadinessCheck({ navigate }: { navigate: Navigate }) {
  const [grade, setGrade] = useState("11");
  const [schools, setSchools] = useState("0");
  const [essay, setEssay] = useState("0");
  const [activities, setActivities] = useState("0");
  const [shown, setShown] = useState(false);
  const score = useMemo(() => Math.min(100, Number(schools) + Number(essay) + Number(activities) + (grade === "12" ? 10 : grade === "11" ? 7 : 4)), [grade, schools, essay, activities]);
  const priority = Number(essay) < 20 ? "Build one clear personal-story direction." : Number(schools) < 20 ? "Create a balanced first school list." : Number(activities) < 20 ? "Add stronger proof and impact to your activities." : "Turn your progress into a deadline-based plan.";

  return <div className="page-enter space-y-3">
    <ScreenHeader eyebrow="Free · 60 seconds" title="Application Quick Check" description="Get one useful starting signal without saving personal data." onBack={() => navigate("home")} />
    <Card className="free-check-card">
      <div className="free-check-intro"><span><Gauge size={22} /></span><div><strong>Where are you right now?</strong><small>This is a preparation check—not an admission prediction.</small></div></div>
      <Select label="Current stage" value={grade} onChange={(event) => setGrade(event.target.value)}><option value="9">Grade 9–10</option><option value="11">Grade 11</option><option value="12">Grade 12 / gap year</option></Select>
      <Select label="School list" value={schools} onChange={(event) => setSchools(event.target.value)}><option value="0">Not started</option><option value="12">A few ideas</option><option value="22">Balanced draft list</option><option value="28">Researched and verified</option></Select>
      <Select label="Main essay" value={essay} onChange={(event) => setEssay(event.target.value)}><option value="0">Not started</option><option value="10">Ideas only</option><option value="22">Draft exists</option><option value="30">Revised with feedback</option></Select>
      <Select label="Activities and achievements" value={activities} onChange={(event) => setActivities(event.target.value)}><option value="0">Not organized</option><option value="12">Basic list</option><option value="22">Impact and proof added</option><option value="32">Strong, quantified story</option></Select>
      <Button className="w-full" onClick={() => setShown(true)}>Show my starting point<ArrowRight size={17} /></Button>
    </Card>
    {shown ? <Card className="free-check-result"><Tag tone="cyan">Your starting signal</Tag><div><strong>{score}%</strong><span>preparation snapshot</span></div><h2>{priority}</h2><p>Premium turns this quick check into a saved profile, personal roadmap, school-fit map and weekly plan.</p><Button className="w-full" onClick={() => navigate("roadmap")}><LockKeyhole size={17} />Build my personal roadmap</Button><small><CheckCircle2 size={13} />No answers from this check were saved.</small></Card> : null}
  </div>;
}
