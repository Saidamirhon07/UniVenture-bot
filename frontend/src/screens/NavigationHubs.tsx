import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  LockKeyhole,
  Route,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { api } from "../api";
import type { DashboardData, Navigate, ScreenId } from "../types";
import { ErrorBanner, LoadingScreen } from "../components/ui";
import ToolArtwork from "../components/ToolArtwork";

type ToolDefinition = {
  title: string;
  description: string;
  screen: ScreenId;
  accent: "blue" | "violet" | "teal" | "amber" | "coral";
  keywords: string;
};

type ToolGroup = {
  title: string;
  description: string;
  tools: ToolDefinition[];
};

const toolGroups: ToolGroup[] = [
  {
    title: "Writing",
    description: "Essays and ideas",
    tools: [
      { title: "Essay Review", description: "Score your draft", screen: "essay", accent: "blue", keywords: "essay evaluation review score feedback personal statement supplemental" },
      { title: "Brainstorm", description: "Find strong ideas", screen: "brainstorm", accent: "amber", keywords: "brainstorm ideas topics stories common app" },
      { title: "Rewrite", description: "Improve your text", screen: "rewrite", accent: "violet", keywords: "rewrite edit improve paragraph wording" },
    ],
  },
  {
    title: "Profile",
    description: "Activities, letters and proof",
    tools: [
      { title: "EC Evaluation", description: "Improve activities", screen: "ec", accent: "coral", keywords: "ec extracurricular evaluation activities leadership impact" },
      { title: "Recommendation Letters", description: "Plan stronger letters", screen: "recommendation", accent: "teal", keywords: "recommendation letters teacher brag sheet" },
      { title: "Portfolio Review", description: "Find missing proof", screen: "portfolio-builder", accent: "blue", keywords: "portfolio projects evidence proof review" },
      { title: "Profile & Awards", description: "Edit saved details", screen: "portfolio", accent: "amber", keywords: "profile awards honors scores memory activities" },
    ],
  },
  {
    title: "Test Prep",
    description: "Short daily practice",
    tools: [
      { title: "SAT Practice", description: "Questions and coaching", screen: "sat", accent: "violet", keywords: "sat practice math reading writing score" },
      { title: "IELTS Practice", description: "All four skills", screen: "ielts", accent: "teal", keywords: "ielts writing speaking reading listening band" },
    ],
  },
  {
    title: "Planning",
    description: "Universities and next steps",
    tools: [
      { title: "School Finder", description: "Build your school list", screen: "school", accent: "blue", keywords: "school university college finder reach match safety fit" },
      { title: "Application Plan", description: "Create your schedule", screen: "plan", accent: "teal", keywords: "application plan roadmap timeline deadline schedule" },
      { title: "Quick Checks", description: "Readiness and wording", screen: "boost", accent: "violet", keywords: "readiness wow factor power words quick checks tips" },
    ],
  },
];

const allTools = toolGroups.flatMap((group) => group.tools);
const freeSampleTools = new Set<ScreenId>(["essay", "sat", "ielts"]);

function categoryPercent(data: DashboardData, keys: string[]) {
  const categories = data.readiness.categories.filter((item) => keys.includes(item.key));
  const score = categories.reduce((sum, item) => sum + item.score, 0);
  const max = categories.reduce((sum, item) => sum + item.max, 0);
  return max ? Math.round((score / max) * 100) : 0;
}

export function ToolsHubScreen({ navigate, isAdmin = false, isPremium = false }: { navigate: Navigate; isAdmin?: boolean; isPremium?: boolean }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const groups = useMemo(() => {
    if (!normalizedQuery) return toolGroups;
    const matches = allTools.filter((tool) => `${tool.title} ${tool.description} ${tool.keywords}`.toLowerCase().includes(normalizedQuery));
    return matches.length ? [{ title: "Results", description: `${matches.length} found`, tools: matches }] : [];
  }, [normalizedQuery]);

  return (
    <div className="page-enter simple-tools-hub">
      <header className="simple-page-header">
        <div><span>Everything in one place</span><h1>Tools</h1></div>
        <strong>{allTools.length}</strong>
      </header>

      <label className="simple-tool-search">
        <Search size={18} />
        <input aria-label="Search tools" placeholder="Search essay, EC, SAT…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button> : null}
      </label>

      {isAdmin ? <button className="founder-entry" onClick={() => navigate("founder")}><span><BarChart3 size={20} /></span><div><small>PRIVATE FOUNDER STUDIO</small><strong>Analytics &amp; Question Factory</strong></div><ChevronRight size={17} /></button> : null}

      {groups.length ? groups.map((group) => (
        <section className="simple-tool-group" key={group.title}>
          <div className="simple-section-heading"><h2>{group.title}</h2><span>{group.description}</span></div>
          <div className="simple-tool-grid">
            {group.tools.map(({ title, description, screen, accent }) => (
              <button className={`simple-tool-card tool-${accent} ${!isPremium && !freeSampleTools.has(screen) ? "tool-locked" : ""}`} key={`${title}-${screen}`} onClick={() => navigate(screen)}>
                <ToolArtwork screen={screen} />
                <div><strong>{title}</strong><small>{description}</small>{!isPremium ? <em>{freeSampleTools.has(screen) ? "FREE SAMPLE" : "PREMIUM"}</em> : null}</div>
                {!isPremium && !freeSampleTools.has(screen) ? <LockKeyhole size={15} /> : <ChevronRight size={16} />}
              </button>
            ))}
          </div>
        </section>
      )) : <div className="simple-empty"><Search size={23} /><strong>No tool found</strong><span>Try “essay”, “EC”, “SAT” or “plan”.</span></div>}
    </div>
  );
}

export function RoadmapScreen({ navigate, reloadKey }: { navigate: Navigate; reloadKey: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<DashboardData>("/api/dashboard")
      .then((value) => active && setData(value))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load your plan."));
    return () => { active = false; };
  }, [reloadKey]);

  if (!data && !error) return <LoadingScreen label="Opening your plan…" />;
  if (!data) return <ErrorBanner message={error} />;

  const academic = categoryPercent(data, ["academics", "testing"]);
  const story = categoryPercent(data, ["essays", "activities"]);
  const strategy = categoryPercent(data, ["schools", "recommendations", "planning"]);
  const xp = Math.min(2499, data.readiness.score * 8 + data.profile_completeness.percent * 2 + data.practice_streak.total_sessions * 20);
  const level = Math.min(10, Math.floor(xp / 250) + 1);
  const steps = [
    { title: "Foundation", score: data.profile_completeness.percent, screen: "portfolio" as ScreenId, icon: Target, accent: "blue" },
    { title: "Test scores", score: academic, screen: "sat" as ScreenId, icon: Calculator, accent: "violet" },
    { title: "Story & impact", score: story, screen: story < 50 ? "essay" as ScreenId : "ec" as ScreenId, icon: BrainCircuit, accent: "coral" },
    { title: "School strategy", score: strategy, screen: strategy < 50 ? "school" as ScreenId : "plan" as ScreenId, icon: Route, accent: "teal" },
    { title: "Submit ready", score: data.readiness.score, screen: "plan" as ScreenId, icon: Trophy, accent: "amber" },
  ];

  return (
    <div className="page-enter simple-roadmap">
      <header className="simple-page-header plan-header">
        <div><span>Your admission journey</span><h1>Plan</h1></div>
        <strong><Trophy size={15} />{level}</strong>
      </header>

      <section className="simple-score-strip">
        <div><strong>{data.readiness.score}%</strong><small>Ready</small></div>
        <div><strong>{xp}</strong><small>XP</small></div>
        <div><strong><Flame size={15} />{data.practice_streak.current_streak}</strong><small>Day streak</small></div>
      </section>

      <section className="simple-mission">
        <div><span><Target size={18} /></span><small>Today</small><em>{data.today_priority.effort || "20 min"}</em></div>
        <h2>{data.today_priority.title}</h2>
        <button onClick={() => navigate(data.today_action.screen)}>{data.today_action.mode === "reminder" ? data.today_action.secondary_label || "Open" : data.today_action.label}<ArrowRight size={17} /></button>
      </section>

      <section className="simple-steps">
        <div className="simple-section-heading"><h2>Your 5 steps</h2><span>Tap any step</span></div>
        <div>
          {steps.map(({ title, score, screen, icon: Icon, accent }, index) => (
            <button className={`simple-step step-${accent}`} key={title} onClick={() => navigate(screen)}>
              <span className="step-number">{score >= 70 ? <CheckCircle2 size={17} /> : index + 1}</span>
              <span className="step-icon"><Icon size={19} /></span>
              <strong>{title}</strong>
              <span className="step-progress"><i style={{ width: `${Math.min(100, score)}%` }} /></span>
              <em>{score}%</em>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="simple-week">
        <div className="simple-section-heading"><h2>This week</h2><span>{data.weekly_path.length} tasks</span></div>
        <div>{data.weekly_path.slice(0, 2).map((task, index) => <button key={task.key || task.title} onClick={() => navigate(index === 0 ? data.today_action.screen : "plan")}><span>{index + 1}</span><strong>{task.title}</strong><em>{task.effort || "20 min"}</em><ChevronRight size={16} /></button>)}</div>
      </section>

      <button className="simple-plan-cta" onClick={() => navigate("plan")}><CalendarDays size={19} /><span><small>Need the full schedule?</small><strong>Open Application Plan</strong></span><ArrowRight size={17} /></button>
      <p className="simple-xp-note">XP tracks completed preparation—not admission odds.</p>
    </div>
  );
}
