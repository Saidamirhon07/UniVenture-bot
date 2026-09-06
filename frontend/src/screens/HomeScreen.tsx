import { useCallback, useEffect, useState } from "react";
import {
  AlarmClock,
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
  Flame,
  GraduationCap,
  MapPin,
  Mic2,
  MessageCircleMore,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { api } from "../api";
import { opportunities, type Opportunity } from "../data/catalogs";
import type { DashboardData, Navigate } from "../types";
import { Button, Card, ErrorBanner, LoadingScreen, Tag } from "../components/ui";

function concise(text: string, max = 96) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const firstSentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean;
  if (firstSentence.length <= max) return firstSentence;
  return `${firstSentence.slice(0, max - 1).trimEnd().replace(/[,:;\s]+$/, "")}…`;
}

function opportunityForMajor(major: string): Opportunity {
  const value = major.toLowerCase();
  const preferredTitle = /computer|software|data|artificial intelligence|\bai\b/.test(value)
    ? "Imagine Cup Junior"
    : /mathemat/.test(value)
      ? "International Mathematical Olympiad Pathway"
      : /biology|biotech|medicine|health/.test(value)
        ? "iGEM Competition"
        : /business|econom|finance|entrepreneur/.test(value)
          ? "Diamond Challenge"
          : /writing|journal|literature|history|law|humanit/.test(value)
            ? "John Locke Essay Competition"
            : /environment|sustainab|climate/.test(value)
              ? "The Earth Prize"
              : "";
  const preferred = opportunities.find((item) => item.title === preferredTitle);
  if (preferred) return preferred;
  const area: Opportunity["area"] = /business|econom|finance|entrepreneur/.test(value)
    ? "Business"
    : /writing|journal|literature|history|law|humanit/.test(value)
      ? "Writing"
      : /politic|international|global|language/.test(value)
        ? "Global"
        : /research/.test(value)
          ? "Research"
          : /service|environment|sustainab|community/.test(value)
            ? "Service"
            : "STEM";
  return opportunities.find((item) => item.area === area) || opportunities[0];
}

function openOfficial(url: string) {
  if (window.Telegram?.WebApp.openLink) window.Telegram.WebApp.openLink(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}

export default function HomeScreen({ navigate, reloadKey }: { navigate: Navigate; reloadKey: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [familyView, setFamilyView] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const dashboard = await api.get<DashboardData>("/api/dashboard");
      setData(dashboard); setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your dashboard.");
    }
  }, []);

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
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric", timeZone: "Asia/Tashkent" }).format(new Date());
  const currentHour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "Asia/Tashkent" }).format(new Date())) % 24;
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const scoreLabel = (score: number) => score >= 75 ? "Strong" : score >= 50 ? "On track" : "Build next";
  const weakestDimension = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const featuredOpportunity = opportunityForMajor(data.intended_major || "");
  const currentData = data;

  function startPriority() {
    if (currentData.today_action.mode === "reminder") {
      setReminderStatus("");
      setReminderOpen(true);
      return;
    }
    navigate(currentData.today_action.screen);
  }

  function openNotifications() {
    setNotificationsOpen(true);
    const unreadIds = currentData.notifications.filter((item) => item.unread).map((item) => item.id);
    if (!unreadIds.length) return;
    setData((current) => current ? {
      ...current,
      notifications: current.notifications.map((item) => ({ ...item, unread: false })),
      unread_notifications: 0,
    } : current);
    void api.post("/api/notifications/read", { ids: unreadIds });
  }

  function reminderTime(hours: number, fixedHour?: number) {
    const due = new Date();
    if (fixedHour !== undefined) {
      due.setDate(due.getDate() + hours);
      due.setHours(fixedHour, 0, 0, 0);
    } else {
      due.setHours(due.getHours() + hours);
    }
    return due;
  }

  async function saveReminder(label: string, due: Date) {
    setReminderSaving(true); setReminderStatus("");
    try {
      await api.post("/api/reminders", { title: currentData.today_priority.title, due_at: due.toISOString(), screen: currentData.today_action.screen });
      setReminderStatus(`Saved for ${label}. It will appear in your bell updates.`);
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
      await loadDashboard();
    } catch (caught) {
      setReminderStatus(caught instanceof Error ? caught.message : "Could not save this reminder.");
    } finally { setReminderSaving(false); }
  }

  return (
    <div className="home-screen page-enter">
      <header className="atelier-brandbar">
        <div><strong>UniVentureAI</strong><span>Admissions strategy atelier</span></div>
        <button aria-label={`Open updates${data.unread_notifications ? `, ${data.unread_notifications} unread` : ""}`} title="Tasks, reminders and useful updates" onClick={openNotifications}><Bell size={20} />{data.unread_notifications ? <i /> : null}{data.unread_notifications > 1 ? <b>{Math.min(data.unread_notifications, 9)}</b> : null}</button>
      </header>

      <header className="home-header atelier-home-header">
        <div>
          <p className="atelier-greeting">{greeting},</p>
          <h1>{data.name}</h1>
          <div className="atelier-context">
            <span><CalendarCheck2 size={14} />{currentDate}</span>
            <span><MapPin size={14} />{data.location || "Central Asia"}</span>
            <button onClick={() => navigate("portfolio")}><BarChart3 size={14} />Profile {data.profile_completeness.percent}%</button>
          </div>
        </div>
      </header>

      {!data.subscription.has_access ? (
        <Card tone="light" className="paywall-card">
          <Tag tone="warn">Access paused</Tag>
          <h3>Your trial has ended</h3>
          <p>Use /pay in the bot. Your work stays saved.</p>
        </Card>
      ) : null}

      <section className="next-move-card">
        <div className="next-move-copy">
          <div className="atelier-kicker">Your next best move</div>
          <div className="mission-main">
            <span className="mission-icon"><FileCheck2 size={22} /></span>
            <div><h2>{data.today_priority.title}</h2><p>{concise(data.today_priority.why)}</p></div>
          </div>
          <span className="mission-time"><Clock3 size={16} />{data.today_priority.effort || "25 min"}</span>
          <button onClick={startPriority}>{data.today_action.label} <ArrowRight size={19} /></button>
        </div>
        <div className="next-move-art" aria-hidden="true"><img src="/assets/blue-doorway.png" alt="" /></div>
      </section>

      <section className="application-twin">
        <div className="twin-heading"><div><Sparkles size={18} /><strong>Application Twin</strong></div><div className="twin-actions"><button className={familyView ? "active" : ""} onClick={() => setFamilyView((visible) => !visible)} aria-expanded={familyView}><UsersRound size={14} />Family</button><button onClick={() => navigate("portfolio")}>Details <ChevronRight size={15} /></button></div></div>
        <div className="twin-scoreboard">
          <div className="overall-readiness"><span>Overall readiness</span><strong>{data.readiness.score}<small>/100</small></strong><div><i style={{ width: `${data.readiness.score}%` }} /></div><em>{scoreLabel(data.readiness.score)}</em></div>
          <div className="dimension-grid">
            {dimensions.map(({ key, label, score, icon: Icon, screen }) => <button type="button" className={`dimension dimension-${key}`} key={key} onClick={() => navigate(screen)} aria-label={`Open ${label}: ${score} out of 100`}><Icon size={22} /><span>{label}</span><strong>{score}</strong><small>{scoreLabel(score)}</small></button>)}
          </div>
        </div>
        <p className="score-disclaimer">Preparation strength—not admission odds.</p>
        {familyView ? <div className="family-brief-panel"><strong>Focus next: {weakestDimension.label}.</strong><p>Improving this {weakestDimension.score}/100 signal gives the whole application more strength.</p><button onClick={() => navigate(weakestDimension.screen)}>Open the action <ArrowRight size={15} /></button></div> : null}
      </section>

      <section className="trajectory-section">
        <div className="atelier-kicker">Your trajectory</div>
        <button className="trajectory-card" onClick={() => navigate("roadmap")}>
          <span className="trajectory-line" />
          <span className="trajectory-step current"><i /><small>Now</small><strong>{data.trajectory?.now || `Strengthen ${data.readiness.blocker.label.toLowerCase()}`}</strong></span>
          <span className="trajectory-step"><i /><small>Next</small><strong>{data.trajectory?.next || "Secure proof & feedback"}</strong></span>
          <span className="trajectory-step deadline"><i /><small>Deadline</small><strong>{data.trajectory?.deadline || "Add your nearest deadline"}</strong></span>
        </button>
      </section>

      <section className="curated-section">
        <div className="twin-heading"><div><Award size={18} /><strong>Curated for you</strong></div><button onClick={() => navigate("discover")}>View all <ChevronRight size={17} /></button></div>
        <button className="curated-opportunity" onClick={() => openOfficial(featuredOpportunity.url)}>
          <span className="curated-emblem"><Award size={28} /></span>
          <span className="curated-copy"><small>{data.intended_major ? `Matched to ${data.intended_major}` : "Opportunity radar"}</small><strong>{featuredOpportunity.title}</strong><em>{concise(featuredOpportunity.fit, 76)}</em><b>{featuredOpportunity.signal}</b></span>
          <span className="curated-deadline"><CircleCheck size={18} /><small>Official<br />source</small><strong>{opportunities.length}</strong><em>in radar</em></span>
          <ChevronRight size={20} />
        </button>
      </section>

      <section className="agenda-section">
        <div className="agenda-title-row"><div className="atelier-kicker">Today's agenda</div><span className={data.practice_streak.completed_today ? "home-streak done" : "home-streak"}><Flame size={14} />{data.practice_streak.current_streak} day streak</span></div>
        <div className="agenda-list">
          <button onClick={startPriority}><span><FileCheck2 size={19} /></span><div><strong>{data.today_priority.title}</strong><small>{data.today_action.mode === "reminder" ? "Tap to schedule" : "Top priority"}</small></div><em>{data.today_priority.effort || "20 min"}</em><ChevronRight size={18} /></button>
          <button onClick={() => navigate("coach")}><span><Sparkles size={19} /></span><div><strong>Ask your AI strategist</strong><small>Profile-aware guidance</small></div><em>10 min</em><ChevronRight size={18} /></button>
        </div>
      </section>
      <button className="home-feedback-link" onClick={() => navigate("feedback")}><MessageCircleMore size={16} />Feedback<ChevronRight size={16} /></button>

      {notificationsOpen ? <div className="home-sheet-backdrop" onClick={() => setNotificationsOpen(false)}><section className="notification-center" aria-label="Updates and reminders" onClick={(event) => event.stopPropagation()}>
        <header><div><span><Bell size={18} /></span><div><strong>Your signal desk</strong><small>Useful now—not noisy news.</small></div></div><button aria-label="Close updates" onClick={() => setNotificationsOpen(false)}><X size={18} /></button></header>
        <div className="notification-list">{data.notifications.map((item) => <button key={item.id} onClick={() => { setNotificationsOpen(false); if (item.kind === "task" && data.today_action.mode === "reminder") startPriority(); else navigate(item.screen); }}><span className={`notification-icon notification-${item.kind}`}>{item.kind === "streak" ? <Flame size={18} /> : item.kind === "reminder" ? <AlarmClock size={18} /> : item.kind === "opportunity" ? <Award size={18} /> : <FileCheck2 size={18} />}</span><div><small>{item.kind}</small><strong>{item.title}</strong><p>{item.body}</p><em>{item.action_label}<ChevronRight size={13} /></em></div></button>)}</div>
      </section></div> : null}

      {reminderOpen ? <div className="home-sheet-backdrop" onClick={() => setReminderOpen(false)}><section className="reminder-sheet" aria-label="Plan this move" onClick={(event) => event.stopPropagation()}>
        <header><span><AlarmClock size={20} /></span><div><small>Turn logistics into an action</small><strong>When should Venture remind you?</strong></div><button aria-label="Close reminder" onClick={() => setReminderOpen(false)}><X size={18} /></button></header>
        <div className="reminder-task"><small>Your move</small><strong>{data.today_priority.title}</strong><p>{concise(data.today_priority.why, 150)}</p></div>
        <div className="reminder-choices">
          <button disabled={reminderSaving} onClick={() => void saveReminder("later today", reminderTime(3))}><strong>Later today</strong><small>In 3 hours</small></button>
          <button disabled={reminderSaving} onClick={() => void saveReminder("tomorrow at 18:00", reminderTime(1, 18))}><strong>Tomorrow</strong><small>18:00</small></button>
          <button disabled={reminderSaving} onClick={() => void saveReminder("in three days at 18:00", reminderTime(3, 18))}><strong>In 3 days</strong><small>18:00</small></button>
        </div>
        {reminderStatus ? <p className="reminder-status">{reminderStatus}</p> : null}
        <Button variant="ghost" className="w-full reminder-secondary" onClick={() => navigate(data.today_action.screen)}>{data.today_action.secondary_label || "Open the related workspace"}<ArrowRight size={16} /></Button>
      </section></div> : null}
    </div>
  );
}
