import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  CalendarCheck2,
  ChevronRight,
  FilePenLine,
  GraduationCap,
  Languages,
  Lightbulb,
  ListChecks,
  Palette,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { api } from "../api";
import type { DashboardData, Navigate } from "../types";
import { Card, ErrorBanner, LoadingScreen, ProgressRing, Tag } from "../components/ui";

const quickActions = [
  { label: "Evaluate essay", icon: FilePenLine, screen: "essay" as const, accent: "cyan" },
  { label: "Find schools", icon: GraduationCap, screen: "school" as const, accent: "violet" },
  { label: "Build plan", icon: CalendarCheck2, screen: "plan" as const, accent: "green" },
  { label: "Improve ECs", icon: Target, screen: "ec" as const, accent: "orange" },
  { label: "IELTS check", icon: Languages, screen: "ielts" as const, accent: "blue" },
];

const modules = [
  { title: "Essay Lab", description: "Story, fit and rewrite coaching", icon: BookOpenText, screen: "essay" as const },
  { title: "EC Builder", description: "Turn activity into proof of impact", icon: Target, screen: "ec" as const },
  { title: "Recommendation Center", description: "Brag sheets and teacher packets", icon: UsersRound, screen: "recommendation" as const },
  { title: "Portfolio Builder", description: "Projects that signal real skill", icon: Palette, screen: "portfolio-builder" as const },
  { title: "Boost Tools", description: "Wow factor, tips and readiness", icon: Lightbulb, screen: "boost" as const },
];

export default function HomeScreen({ navigate, reloadKey }: { navigate: Navigate; reloadKey: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<DashboardData>("/api/dashboard")
      .then((dashboard) => active && setData(dashboard))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load your dashboard."));
    return () => { active = false; };
  }, [reloadKey]);

  if (!data && !error) return <LoadingScreen label="Reading your application journey…" />;
  if (!data) return <ErrorBanner message={error} />;

  return (
    <div className="home-screen page-enter">
      <header className="home-header">
        <div>
          <div className="eyebrow">Admissions command center</div>
          <h1>Good to see you, {data.name}.</h1>
          <p>One focused move today can change the strength of your whole application.</p>
        </div>
        <div className="avatar-orb">{data.name.slice(0, 1).toUpperCase()}</div>
      </header>

      {!data.subscription.has_access ? (
        <Card tone="light" className="paywall-card">
          <Tag tone="warn">Access paused</Tag>
          <h3>Your trial has ended</h3>
          <p>Open the chatbot and use /pay to send payment proof. Your saved work stays safe.</p>
        </Card>
      ) : null}

      <Card className="readiness-card">
        <div className="readiness-copy">
          <Tag tone="cyan">Application readiness</Tag>
          <h2>{data.readiness.score < 35 ? "Build the foundation" : data.readiness.score < 70 ? "Momentum is building" : "Polish the final gaps"}</h2>
          <p>{data.readiness.blocker.message} This score tracks preparation—not admission odds.</p>
        </div>
        <ProgressRing value={data.readiness.score} />
      </Card>

      <Card tone="light" className="priority-card">
        <div className="priority-icon"><Sparkles size={20} /></div>
        <div className="min-w-0">
          <div className="priority-label">Today’s priority</div>
          <h3>{data.today_priority.title}</h3>
          <p>{data.today_priority.why}</p>
          {data.today_priority.effort ? <Tag>{data.today_priority.effort}</Tag> : null}
        </div>
        <button aria-label="Open application plan" onClick={() => navigate("plan")}><ArrowRight size={19} /></button>
      </Card>

      <section>
        <div className="section-title"><h2>Make progress now</h2><span>Choose one</span></div>
        <div className="quick-grid">
          {quickActions.map(({ label, icon: Icon, screen, accent }) => (
            <button key={screen} className={`quick-action quick-${accent}`} onClick={() => navigate(screen)}>
              <span><Icon size={20} /></span>{label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Your application</h2><button onClick={() => navigate("portfolio")}>Edit all</button></div>
        <div className="status-grid">
          {data.status_cards.map((item) => (
            <Card key={item.key} className="status-card">
              <div className="status-top"><span>{item.label}</span><strong>{item.progress}%</strong></div>
              <h3>{item.value}</h3>
              <div className="mini-progress"><span style={{ width: `${item.progress}%` }} /></div>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-4">
        <div className="section-title"><h2>Specialist tools</h2><span>Built for each task</span></div>
        <Card className="module-list">
          {modules.map(({ title, description, icon: Icon, screen }) => (
            <button key={screen} onClick={() => navigate(screen)}>
              <span className="module-icon"><Icon size={19} /></span>
              <span className="module-copy"><strong>{title}</strong><small>{description}</small></span>
              <ChevronRight size={18} />
            </button>
          ))}
        </Card>
      </section>
    </div>
  );
}

