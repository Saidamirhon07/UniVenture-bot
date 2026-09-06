import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileSearch,
  Flame,
  Gauge,
  GraduationCap,
  Languages,
  Lightbulb,
  LockKeyhole,
  PenLine,
  Route,
  Search,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { api } from "../api";
import type { DashboardData, Navigate, ScreenId } from "../types";
import { ErrorBanner, LoadingScreen, Tag } from "../components/ui";

type ToolCategory = "All" | "Writing" | "Tests" | "Profile" | "Strategy";
type ToolDefinition = {
  title: string;
  shortTitle: string;
  description: string;
  category: Exclude<ToolCategory, "All">;
  screen: ScreenId;
  icon: typeof Sparkles;
  accent: "blue" | "violet" | "teal" | "amber" | "coral";
  keywords: string;
  featured?: boolean;
  badge?: string;
};

const tools: ToolDefinition[] = [
  { title: "Essay Evaluation", shortTitle: "Evaluate", description: "Score the story, voice and admissions signal in your draft.", category: "Writing", screen: "essay", icon: FileSearch, accent: "blue", keywords: "essay review score evaluate feedback personal statement supplemental", featured: true, badge: "Popular" },
  { title: "Brainstorm Studio", shortTitle: "Brainstorm", description: "Turn real experiences into distinctive essay directions.", category: "Writing", screen: "brainstorm", icon: Lightbulb, accent: "amber", keywords: "ideas brainstorm essay topic story common app", featured: true },
  { title: "Rewrite Studio", shortTitle: "Rewrite", description: "Improve structure and clarity without inventing facts.", category: "Writing", screen: "rewrite", icon: PenLine, accent: "violet", keywords: "rewrite edit improve paragraph activity description", featured: true },
  { title: "SAT Quest", shortTitle: "SAT", description: "Daily mini-tests, mistake repair and a focused 7-day sprint.", category: "Tests", screen: "sat", icon: Calculator, accent: "violet", keywords: "sat practice math reading writing test score" },
  { title: "IELTS 4-Skill Lab", shortTitle: "IELTS", description: "Writing, speaking, reading and listening missions.", category: "Tests", screen: "ielts", icon: Languages, accent: "teal", keywords: "ielts band writing speaking reading listening" },
  { title: "EC Builder", shortTitle: "Activities", description: "Find leadership, impact and the strongest truthful wording.", category: "Profile", screen: "ec", icon: Trophy, accent: "coral", keywords: "extracurricular activities ec leadership impact common app" },
  { title: "Profile & Awards", shortTitle: "Profile", description: "Keep your Application Twin, 10 activities and 10 awards current.", category: "Profile", screen: "portfolio", icon: Award, accent: "amber", keywords: "profile awards honors activities scores memory" },
  { title: "Portfolio Builder", shortTitle: "Portfolio", description: "Diagnose project evidence and missing proof.", category: "Profile", screen: "portfolio-builder", icon: BriefcaseBusiness, accent: "blue", keywords: "portfolio projects proof github creative research" },
  { title: "Recommendation Lab", shortTitle: "Letters", description: "Plan stronger teacher stories and evaluate drafts.", category: "Profile", screen: "recommendation", icon: UsersRound, accent: "teal", keywords: "recommendation teacher letter brag sheet" },
  { title: "School Fit Map", shortTitle: "School Fit", description: "Build a profile-aware Reach, Match and Lower-risk list.", category: "Strategy", screen: "school", icon: GraduationCap, accent: "blue", keywords: "school university college finder reach match safety fit" },
  { title: "Application Flight Plan", shortTitle: "Flight Plan", description: "Sequence deadlines, dependencies and weekly capacity.", category: "Strategy", screen: "plan", icon: CalendarRange, accent: "teal", keywords: "roadmap plan timeline deadline schedule application" },
  { title: "Boost Tools", shortTitle: "Quick Boosts", description: "Check readiness, wow factor, wording and strategic gaps.", category: "Strategy", screen: "boost", icon: WandSparkles, accent: "violet", keywords: "readiness wow factor power words insider tips boost" },
];

const categoryIcons: Record<ToolCategory, typeof Sparkles> = {
  All: Sparkles,
  Writing: PenLine,
  Tests: BookOpenCheck,
  Profile: BriefcaseBusiness,
  Strategy: Compass,
};

function categoryPercent(data: DashboardData, keys: string[]) {
  const categories = data.readiness.categories.filter((item) => keys.includes(item.key));
  const score = categories.reduce((sum, item) => sum + item.score, 0);
  const max = categories.reduce((sum, item) => sum + item.max, 0);
  return max ? Math.round((score / max) * 100) : 0;
}

export function ToolsHubScreen({ navigate }: { navigate: Navigate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory>("All");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    void api.get<DashboardData>("/api/dashboard").then(setDashboard).catch(() => undefined);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTools = useMemo(() => {
    const filtered = tools.filter((tool) => {
      const inCategory = category === "All" || tool.category === category;
      const inSearch = !normalizedQuery || `${tool.title} ${tool.description} ${tool.keywords}`.toLowerCase().includes(normalizedQuery);
      return inCategory && inSearch;
    });
    if (category === "All" && !normalizedQuery) return filtered.filter((tool) => !tool.featured);
    return filtered;
  }, [category, normalizedQuery]);

  const featured = tools.filter((tool) => tool.featured);
  const recommendedScreen = dashboard?.today_action.screen || "plan";

  return (
    <div className="page-enter tools-hub">
      <header className="hub-header">
        <div><span>Your admissions workspace</span><h1>Tools</h1><p>Find the right move in seconds.</p></div>
        <span className="hub-count"><strong>{tools.length}</strong><small>focused tools</small></span>
      </header>

      <label className="tool-search">
        <Search size={19} />
        <input aria-label="Search tools" placeholder="Try “essay”, “rewrite” or “SAT”…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button> : null}
      </label>

      {dashboard && !normalizedQuery && category === "All" ? (
        <button className="smart-shortcut" onClick={() => navigate(recommendedScreen)}>
          <span><Target size={18} /></span>
          <div><small>Recommended for you</small><strong>{dashboard.today_priority.title}</strong></div>
          <ArrowRight size={18} />
        </button>
      ) : null}

      {!normalizedQuery && category === "All" ? (
        <section className="key-tools-section">
          <div className="hub-section-title"><div><span>Start here</span><h2>Key writing tools</h2></div><small>One tap away</small></div>
          <div className="key-tools-grid">
            {featured.map(({ title, shortTitle, description, screen, icon: Icon, accent, badge }) => (
              <button className={`key-tool key-tool-${accent}`} key={screen} onClick={() => navigate(screen)}>
                <span className="key-tool-icon"><Icon size={21} /></span>
                <span className="key-tool-copy">{badge ? <em>{badge}</em> : null}<strong>{shortTitle}</strong><small>{description}</small></span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="browse-tools">
        <div className="hub-section-title"><div><span>{normalizedQuery ? "Search results" : "Browse by goal"}</span><h2>{normalizedQuery ? `${visibleTools.length} tools found` : "All your workspaces"}</h2></div></div>
        <div className="tool-categories" aria-label="Tool categories">
          {(["All", "Writing", "Tests", "Profile", "Strategy"] as ToolCategory[]).map((item) => {
            const Icon = categoryIcons[item];
            return <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}><Icon size={15} />{item}</button>;
          })}
        </div>

        {visibleTools.length ? <div className="tool-directory">{visibleTools.map(({ title, description, category: toolCategory, screen, icon: Icon, accent }) => (
          <button className="tool-directory-item" key={`${screen}-${title}`} onClick={() => navigate(screen)}>
            <span className={`directory-icon directory-${accent}`}><Icon size={20} /></span>
            <span><small>{toolCategory}</small><strong>{title}</strong><p>{description}</p></span>
            <ChevronRight size={18} />
          </button>
        ))}</div> : <div className="tool-empty"><Search size={24} /><strong>No matching tool yet</strong><p>Try a broader word such as “essay”, “test”, “profile” or “plan”.</p></div>}
      </section>
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
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load your roadmap."));
    return () => { active = false; };
  }, [reloadKey]);

  if (!data && !error) return <LoadingScreen label="Mapping your next milestones…" />;
  if (!data) return <ErrorBanner message={error} />;

  const academics = categoryPercent(data, ["academics", "testing"]);
  const story = categoryPercent(data, ["essays", "activities"]);
  const strategy = categoryPercent(data, ["schools", "recommendations", "planning"]);
  const xp = Math.min(2499, data.readiness.score * 8 + data.profile_completeness.percent * 2 + data.practice_streak.total_sessions * 20);
  const level = Math.min(10, Math.floor(xp / 250) + 1);
  const levelProgress = xp % 250;
  const chapters = [
    { title: "Build your foundation", subtitle: "Profile, goals and real constraints", score: data.profile_completeness.percent, screen: "portfolio" as ScreenId, icon: Compass, accent: "blue" },
    { title: "Prove academic readiness", subtitle: "Scores, testing and focused practice", score: academics, screen: academics < 50 ? "sat" as ScreenId : "prep" as ScreenId, icon: GraduationCap, accent: "violet" },
    { title: "Shape your story", subtitle: "Essays, activities and authentic impact", score: story, screen: categoryPercent(data, ["essays"]) <= categoryPercent(data, ["activities"]) ? "essay" as ScreenId : "ec" as ScreenId, icon: BrainCircuit, accent: "coral" },
    { title: "Build the right strategy", subtitle: "School fit, recommendations and timing", score: strategy, screen: categoryPercent(data, ["schools"]) <= categoryPercent(data, ["planning"]) ? "school" as ScreenId : "plan" as ScreenId, icon: Route, accent: "teal" },
    { title: "Enter submission runway", subtitle: "Polish, verify and close every loop", score: data.readiness.score, screen: "plan" as ScreenId, icon: Trophy, accent: "amber" },
  ];
  const currentChapter = Math.max(0, chapters.findIndex((chapter) => chapter.score < 70));

  return (
    <div className="page-enter roadmap-hub">
      <header className="roadmap-header">
        <div><span>Your personal journey</span><h1>Admission Roadmap</h1><p>Every useful action moves your application forward.</p></div>
        <span className="roadmap-level"><Trophy size={18} /><small>Level</small><strong>{level}</strong></span>
      </header>

      <section className="momentum-card">
        <div className="momentum-top">
          <div><span>Momentum XP</span><strong>{xp.toLocaleString()} XP</strong></div>
          <div className={data.practice_streak.completed_today ? "streak-pill complete" : "streak-pill"}><Flame size={16} /><strong>{data.practice_streak.current_streak}</strong><span>day streak</span></div>
        </div>
        <div className="xp-track"><i style={{ width: `${Math.round((levelProgress / 250) * 100)}%` }} /></div>
        <div className="xp-caption"><span>{level >= 10 ? "Top momentum level reached" : `${250 - levelProgress} XP to Level ${level + 1}`}</span><span>{data.readiness.score}% ready</span></div>
      </section>

      <section className="daily-quest-card">
        <div className="daily-quest-top"><span><Target size={19} /></span><div><small>Today’s main quest</small><Tag tone="warn">+40 XP</Tag></div></div>
        <h2>{data.today_priority.title}</h2>
        <p>{data.today_priority.why}</p>
        <button onClick={() => navigate(data.today_action.screen)}>{data.today_action.mode === "reminder" ? data.today_action.secondary_label || "Open workspace" : data.today_action.label}<ArrowRight size={18} /></button>
      </section>

      <section className="journey-map-section">
        <div className="hub-section-title"><div><span>Your five chapters</span><h2>Journey map</h2></div><small>{chapters.filter((item) => item.score >= 70).length}/5 strong</small></div>
        <div className="journey-map">
          {chapters.map(({ title, subtitle, score, screen, icon: Icon, accent }, index) => {
            const complete = score >= 70;
            const current = index === currentChapter;
            return <button className={`journey-node journey-${accent} ${complete ? "complete" : current ? "current" : "future"}`} key={title} onClick={() => navigate(screen)}>
              <span className="journey-rail">{complete ? <CheckCircle2 size={17} /> : current ? <Target size={17} /> : <LockKeyhole size={15} />}</span>
              <span className="journey-node-icon"><Icon size={21} /></span>
              <span className="journey-node-copy"><small>Chapter {index + 1} · {complete ? "Strong" : current ? "Now" : "Ahead"}</small><strong>{title}</strong><p>{subtitle}</p><i><span style={{ width: `${Math.min(100, score)}%` }} /></i></span>
              <span className="journey-score">{score}<small>%</small></span>
            </button>;
          })}
        </div>
      </section>

      <section className="weekly-questline">
        <div className="hub-section-title"><div><span>Small wins, real progress</span><h2>This week’s questline</h2></div></div>
        <div>{data.weekly_path.slice(0, 3).map((task, index) => <button key={task.key || task.title} onClick={() => navigate(index === 0 ? data.today_action.screen : "plan")}><span>{index + 1}</span><div><small>{task.category || "Application"} · {task.effort || "20 min"}</small><strong>{task.title}</strong></div><em>+{30 - index * 5} XP</em><ChevronRight size={17} /></button>)}</div>
      </section>

      <button className="roadmap-plan-button" onClick={() => navigate("plan")}><span><CalendarRange size={20} /></span><div><small>Need a detailed schedule?</small><strong>Build or recalibrate your Flight Plan</strong></div><ArrowRight size={18} /></button>
      <p className="xp-note"><Gauge size={14} />Momentum XP reflects profile completion, preparation strength and completed SAT/IELTS sessions—not admission odds.</p>
    </div>
  );
}
