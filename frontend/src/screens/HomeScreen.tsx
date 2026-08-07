import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  CalendarCheck2,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileCheck2,
  Fingerprint,
  GraduationCap,
  Mic2,
  MapPin,
  Sparkles,
  UsersRound,
  MessageCircleMore,
} from "lucide-react";
import { api } from "../api";
import type { DashboardData, Navigate } from "../types";
import { Card, ErrorBanner, LoadingScreen, Tag } from "../components/ui";

export default function HomeScreen({ navigate, reloadKey }: { navigate: Navigate; reloadKey: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [familyView, setFamilyView] = useState(false);

  useEffect(() => {
    let active = true;
    api.get<DashboardData>("/api/dashboard")
      .then((dashboard) => active && setData(dashboard))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load your dashboard."));
    return () => { active = false; };
  }, [reloadKey]);

  if (!data && !error) return <LoadingScreen label="Reading your application journey…" />;
  if (!data) return <ErrorBanner message={error} />;

  const category = (key: string) => data.readiness.categories.find((item) => item.key === key);
  const percent = (...keys: string[]) => {
    const items = keys.map(category).filter((item): item is NonNullable<ReturnType<typeof category>> => Boolean(item));
    const score = items.reduce((sum, item) => sum + item.score, 0);
    const max = items.reduce((sum, item) => sum + item.max, 0);
    return max ? Math.round((score / max) * 100) : 0;
  };
  const dimensions = [
    { key: "identity", label: "Identity", score: percent("essays", "planning"), icon: Fingerprint, screen: "portfolio" as const },
    { key: "evidence", label: "Evidence", score: percent("activities"), icon: BarChart3, screen: "ec" as const },
    { key: "academics", label: "Academics", score: percent("academics", "testing"), icon: GraduationCap, screen: "prep" as const },
    { key: "voice", label: "Voice", score: percent("essays", "recommendations"), icon: Mic2, screen: "essay" as const },
  ];
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Tashkent" }).format(new Date());
  const currentHour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "Asia/Tashkent" }).format(new Date())) % 24;
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const scoreLabel = (score: number) => score >= 75 ? "Strong" : score >= 50 ? "On track" : "Build next";
  const weakestDimension = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const priorityRoute = ({ essays: "essay", activities: "ec", academics: "prep", testing: "prep", schools: "school", recommendations: "recommendation", planning: "plan" } as const)[data.readiness.blocker.key] || "plan";
  const mitDeadline = new Date("2026-11-01T23:59:59+05:00");
  const deadlineDays = Math.max(0, Math.ceil((mitDeadline.getTime() - Date.now()) / 86_400_000));

  return (
    <div className="home-screen page-enter">
      <header className="atelier-brandbar">
        <div><strong>UniVentureAI</strong><span>Admissions strategy atelier</span></div>
        <button aria-label="Open verified updates" title="Verified opportunities and deadlines" onClick={() => navigate("discover")}><Bell size={20} /><i /></button>
      </header>

      <header className="home-header atelier-home-header">
        <div>
          <p className="atelier-greeting">{greeting},</p>
          <h1>{data.name}</h1>
          <div className="atelier-context"><span><CalendarCheck2 size={14} />{currentDate}</span><span><MapPin size={14} />Tashkent, Uzbekistan</span></div>
        </div>
      </header>

      {!data.subscription.has_access ? (
        <Card tone="light" className="paywall-card">
          <Tag tone="warn">Access paused</Tag>
          <h3>Your trial has ended</h3>
          <p>Open the chatbot and use /pay to send payment proof. Your saved work stays safe.</p>
        </Card>
      ) : null}

      <section className="next-move-card">
        <div className="next-move-copy">
          <div className="atelier-kicker">Your next best move</div>
          <div className="mission-main">
            <span className="mission-icon"><FileCheck2 size={22} /></span>
            <div><h2>{data.today_priority.title}</h2><p>{data.today_priority.why}</p></div>
          </div>
          <span className="mission-time"><Clock3 size={16} />{data.today_priority.effort || "25 min"}</span>
          <button onClick={() => navigate(priorityRoute)}>Start this move <ArrowRight size={19} /></button>
        </div>
        <div className="next-move-art" aria-hidden="true">
          <img src="/assets/blue-doorway.png" alt="" />
        </div>
      </section>

      <section className="application-twin">
        <div className="twin-heading"><div><Sparkles size={18} /><strong>Application Twin</strong></div><div className="twin-actions"><button className={familyView ? "active" : ""} onClick={() => setFamilyView((visible) => !visible)} aria-expanded={familyView}><UsersRound size={14} />Family</button><button onClick={() => navigate("portfolio")}>Details <ChevronRight size={15} /></button></div></div>
        <div className="twin-scoreboard">
          <div className="overall-readiness"><span>Overall readiness</span><strong>{data.readiness.score}<small>/100</small></strong><div><i style={{ width: `${data.readiness.score}%` }} /></div><em>{scoreLabel(data.readiness.score)}</em></div>
          <div className="dimension-grid">
            {dimensions.map(({ key, label, score, icon: Icon, screen }) => <button type="button" className={`dimension dimension-${key}`} key={key} onClick={() => navigate(screen)} aria-label={`Open ${label}: ${score} out of 100`}><Icon size={22} /><span>{label}</span><strong>{score}</strong><small>{scoreLabel(score)}</small></button>)}
          </div>
        </div>
        <p className="score-disclaimer">Measures preparation strength—not admission odds.</p>
        {familyView ? <div className="family-brief-panel"><strong>{data.name} is building a {scoreLabel(data.readiness.score).toLowerCase()} application foundation.</strong><p>The highest-value next investment is {weakestDimension.label.toLowerCase()}. Improving it from {weakestDimension.score}/100 will make the whole profile more convincing and reduce last-minute application risk.</p><button onClick={() => navigate(weakestDimension.screen)}>Open the recommended action <ArrowRight size={15} /></button></div> : null}
      </section>

      <section className="trajectory-section">
        <div className="atelier-kicker">Your trajectory</div>
        <button className="trajectory-card" onClick={() => navigate("plan")}>
          <span className="trajectory-line" />
          <span className="trajectory-step current"><i /><small>Now</small><strong>{data.trajectory?.now || `Strengthen ${data.readiness.blocker.label.toLowerCase()}`}</strong></span>
          <span className="trajectory-step"><i /><small>Next</small><strong>{data.trajectory?.next || "Secure proof & feedback"}</strong></span>
          <span className="trajectory-step deadline"><i /><small>Deadline</small><strong>{data.trajectory?.deadline || "Add your nearest deadline"}</strong></span>
        </button>
      </section>

      <section className="curated-section">
        <div className="twin-heading"><div><Award size={18} /><strong>Curated for you</strong></div><button onClick={() => navigate("discover")}>View all <ChevronRight size={17} /></button></div>
        <button className="curated-opportunity" onClick={() => navigate("discover")}>
          <span className="curated-emblem"><Award size={28} /></span>
          <span className="curated-copy"><small>Verified university deadline</small><strong>MIT Early Action · Nov 1</strong><em>Open the official requirements page and add it to your roadmap.</em><b>2026–27 cycle</b></span>
          <span className="curated-deadline"><CircleCheck size={18} /><small>Official<br/>source</small><strong>{deadlineDays}</strong><em>days left</em></span>
          <ChevronRight size={20} />
        </button>
      </section>

      <section className="agenda-section">
        <div className="atelier-kicker">Today's agenda</div>
        <div className="agenda-list">
          <button onClick={() => navigate("plan")}><span><FileCheck2 size={19} /></span><div><strong>{data.today_priority.title}</strong><small>{data.today_priority.why}</small></div><em>{data.today_priority.effort || "20 min"}</em><ChevronRight size={18} /></button>
          <button onClick={() => navigate("coach")}><span><Sparkles size={19} /></span><div><strong>Ask your AI strategist</strong><small>Pressure-test the next step before you spend time on it.</small></div><em>10 min</em><ChevronRight size={18} /></button>
        </div>
      </section>
      <button className="home-feedback-link" onClick={() => navigate("feedback")}><MessageCircleMore size={16} />Help shape UniVentureAI<ChevronRight size={16} /></button>
    </div>
  );
}
