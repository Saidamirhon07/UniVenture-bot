import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlarmClock,
  ArrowRight,
  Award,
  Bell,
  Calculator,
  CalendarCheck2,
  ChevronRight,
  FileCheck2,
  Flame,
  LayoutGrid,
  MapPin,
  MessageCircleMore,
  Languages,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { api } from "../api";
import type { DashboardData, Navigate, ScreenId } from "../types";
import { Button, ErrorBanner, LoadingScreen } from "../components/ui";
import ToolArtwork from "../components/ToolArtwork";

function concise(text: string, max = 105) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd().replace(/[,:;\s]+$/, "")}…`;
}

export default function HomeScreen({ navigate, reloadKey }: { navigate: Navigate; reloadKey: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setData(await api.get<DashboardData>("/api/dashboard"));
      setError("");
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

  if (!data && !error) return <LoadingScreen label="Opening your hub…" />;
  if (!data) return <ErrorBanner message={error} />;

  const currentData = data;
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Tashkent" }).format(new Date());
  const currentHour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "Asia/Tashkent" }).format(new Date())) % 24;
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = data.name.trim().split(/\s+/)[0] || "Student";

  function startPriority() {
    if (!currentData.subscription.is_premium) {
      navigate(currentData.today_action.screen);
      return;
    }
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
    void api.post("/api/notifications/read", { ids: unreadIds }).catch(() => { setError("Couldn't save update status. Please try again."); void loadDashboard(); });
  }

  function reminderTime(days: number, fixedHour?: number) {
    const due = new Date();
    if (fixedHour !== undefined) {
      due.setDate(due.getDate() + days);
      due.setHours(fixedHour, 0, 0, 0);
    } else {
      due.setHours(due.getHours() + days);
    }
    return due;
  }

  async function saveReminder(label: string, due: Date) {
    setReminderSaving(true);
    setReminderStatus("");
    try {
      await api.post("/api/reminders", { title: currentData.today_priority.title, due_at: due.toISOString(), screen: currentData.today_action.screen });
      setReminderStatus(`Saved for ${label}.`);
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
      await loadDashboard();
    } catch (caught) {
      setReminderStatus(caught instanceof Error ? caught.message : "Could not save this reminder.");
    } finally {
      setReminderSaving(false);
    }
  }

  const quickTools = [
    { title: "Essay Review", screen: "essay" as const, accent: "blue" },
    { title: "EC Evaluation", screen: "ec" as const, accent: "coral" },
    { title: "School Finder", screen: "school" as const, accent: "teal" },
    { title: "Recommendation Letters", screen: "recommendation" as const, accent: "teal" },
    { title: "Brainstorm", screen: "brainstorm" as const, accent: "violet" },
    { title: "Rewrite", screen: "rewrite" as const, accent: "blue" },
  ];
  const spotlights: Array<{ eyebrow: string; title: string; note: string; cta: string; screen: ScreenId }> = [
    { eyebrow: "APPLICATION COMMAND CENTER", title: "Know your next move.", note: "A personal plan shaped around your profile and deadlines.", cta: "View roadmap", screen: "roadmap" },
    { eyebrow: "STORY THAT STANDS OUT", title: "Turn experience into impact.", note: "Review essays, activities and recommendation strategy.", cta: "Review an essay", screen: "essay" },
    { eyebrow: "DAILY SCORE-BUILDING", title: "Practise. Review. Improve.", note: "Short SAT and IELTS sessions with clear explanations.", cta: "Start practice", screen: "sat" },
    { eyebrow: "BETTER-FIT UNIVERSITIES", title: "Build a smarter school list.", note: "Balance ambition, fit, aid and application strategy.", cta: "Find schools", screen: "school" },
  ];

  function syncSpotlight() {
    const track = spotlightRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - track.scrollLeft) < Math.abs(cards[best].offsetLeft - track.scrollLeft) ? index : best, 0);
    setSpotlightIndex(closest);
  }

  function showSpotlight(index: number) {
    const card = spotlightRef.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setSpotlightIndex(index);
  }

  return (
    <div className="home-screen simple-home home-v8 page-enter">
      <header className="simple-brandbar">
        <strong>UniVentureAI</strong>
        <button aria-label={`Open updates${data.unread_notifications ? `, ${data.unread_notifications} unread` : ""}`} onClick={openNotifications}>
          <Bell size={19} />{data.unread_notifications ? <i /> : null}
        </button>
      </header>

      {error && <ErrorBanner message={error} />}

      <header className="simple-home-greeting">
        <h1>{greeting}, {firstName}</h1>
        <div><span><CalendarCheck2 size={13} />{currentDate}</span><span><MapPin size={13} />{data.location || "Central Asia"}</span></div>
      </header>

      <section className="home-spotlight" aria-label="Featured UniVentureAI tools">
        <div className="home-spotlight-track" ref={spotlightRef} onScroll={syncSpotlight}>
          {spotlights.map((item, index) => <button className={`home-spotlight-card spotlight-${index + 1}`} key={item.title} onClick={() => navigate(item.screen)}>
            <span className="home-spotlight-copy"><small>{item.eyebrow}</small><strong>{item.title}</strong><p>{item.note}</p><em>{item.cta}<ArrowRight size={14} /></em></span>
            <ToolArtwork screen={item.screen} className="home-spotlight-art" />
          </button>)}
        </div>
        <div className="home-spotlight-dots" aria-label="Choose featured tool">{spotlights.map((item, index) => <button type="button" className={spotlightIndex === index ? "active" : ""} key={item.title} aria-label={`Show ${item.title}`} onClick={() => showSpotlight(index)} />)}</div>
      </section>

      {!data.subscription.is_premium ? <button className="free-tier-card" onClick={() => navigate("portfolio")}><span><Sparkles size={18} /></span><div><small>FREE EXPLORER</small><strong>Try daily practice. Unlock your full application workspace when ready.</strong></div><em>See Premium<ChevronRight size={15} /></em></button> : null}
      {!data.subscription.is_premium ? <button className="free-check-entry" onClick={() => navigate("free-check")}><Target size={20} /><span><small>FREE · 60 SECONDS</small><strong>Check your application readiness</strong><em>No profile required or saved</em></span><ArrowRight size={17} /></button> : null}

      <section className="simple-today-card mission-v8">
        <div className="simple-today-copy">
          <div><span><Sparkles size={16} />Your next move</span><em>{data.today_priority.effort || "20 min"}</em></div>
          <h2>{data.today_priority.title}</h2>
          <p>{concise(data.today_priority.why)}</p>
          <button onClick={startPriority}>{data.today_action.label}<ArrowRight size={17} /></button>
        </div>
        <img src="/assets/blue-doorway.png" alt="" aria-hidden="true" />
      </section>

      <section className="home-momentum-v8" aria-label="Your momentum">
        <button onClick={() => navigate("roadmap")}><Target size={17}/><strong>{data.readiness.score}%</strong><small>Preparation</small></button>
        <button onClick={() => navigate("prep")}><Flame size={17}/><strong>{data.practice_streak.current_streak} days</strong><small>Practice streak</small></button>
        <button onClick={() => navigate("portfolio")}><Trophy size={17}/><strong>{data.profile_completeness.percent}%</strong><small>Profile complete</small></button>
      </section>

      <section className="home-practice-v8">
        <div className="simple-section-heading"><h2>Build your daily edge</h2><span>Small steps count</span></div>
        <div className="home-practice-grid">{([{screen:"sat",title:"SAT Studio",note:"Learn · time · review",icon:Calculator},{screen:"ielts",title:"IELTS Studio",note:"Four skills, one place",icon:Languages}] as const).map(({screen,title,note,icon:Icon})=><button key={screen} onClick={()=>navigate(screen)}><Icon size={23}/><small>{data.practice_streak.today_skills.includes(screen) ? "Practiced today" : "Ready when you are"}</small><strong>{title}</strong><span>{note}</span><ArrowRight size={19}/></button>)}</div>
      </section>

      <section className="simple-home-tools">
        <div className="simple-section-heading"><h2>Quick tools</h2><button onClick={() => navigate("tools")}>See all <ChevronRight size={15} /></button></div>
        <div>{quickTools.map(({ title, screen, accent }) => <button className={`home-tool home-tool-${accent}`} key={screen} onClick={() => navigate(screen)}><ToolArtwork screen={screen} /><strong>{title}</strong></button>)}</div>
      </section>

      <section className="simple-home-progress home-path-v8">
        <div className="progress-top"><div><small>Application progress</small><strong>{data.readiness.score}%</strong></div><button onClick={() => navigate("roadmap")}>View plan <ChevronRight size={15} /></button></div>
        <div className="simple-progress-bar"><i style={{ width: `${data.readiness.score}%` }} /></div>
        <div className="progress-signals">
          <span><small>Focus</small><strong>{data.readiness.blocker.label}</strong></span>
          <span><small>Profile</small><strong>{data.profile_completeness.percent}%</strong></span>
          <span><small>Streak</small><strong><Flame size={13} />{data.practice_streak.current_streak} days</strong></span>
        </div>
        <div className="home-path-stops">{[{label:"Now",text:data.trajectory?.now || data.today_priority.title},{label:"Next",text:data.trajectory?.next || "Strengthen your application"},{label:"Deadline",text:data.trajectory?.deadline || "Set your target date"}].map((step,index)=><button key={step.label} onClick={()=>navigate("roadmap")}><i>{index+1}</i><small>{step.label}</small><strong>{concise(step.text,60)}</strong></button>)}</div>
        <small className="practice-disclaimer">Preparation signals, not admission chances.</small>
      </section>

      <button className="home-discover-v8" onClick={()=>navigate("discover")}><Award size={27}/><span><small>BEYOND THE CHECKLIST</small><strong>Find something worth pursuing.</strong><em>Explore programs, competitions & projects</em></span><ChevronRight size={18}/></button>

      <button className="simple-all-tools" onClick={() => navigate("tools")}><span><LayoutGrid size={19} /></span><div><strong>Open all tools</strong><small>Essay, EC, letters, tests and more</small></div><ArrowRight size={17} /></button>
      <button className="home-feedback-link" onClick={() => navigate("feedback")}><MessageCircleMore size={16} />Feedback<ChevronRight size={16} /></button>

      {notificationsOpen ? <div className="home-sheet-backdrop" onClick={() => setNotificationsOpen(false)}><section className="notification-center" aria-label="Updates and reminders" onClick={(event) => event.stopPropagation()}>
        <header><div><span><Bell size={18} /></span><div><strong>Updates</strong><small>Tasks and reminders</small></div></div><button aria-label="Close updates" onClick={() => setNotificationsOpen(false)}><X size={18} /></button></header>
        <div className="notification-list">{data.notifications.map((item) => <button key={item.id} onClick={() => { setNotificationsOpen(false); if (item.kind === "task" && data.today_action.mode === "reminder") startPriority(); else navigate(item.screen); }}><span className={`notification-icon notification-${item.kind}`}>{item.kind === "streak" ? <Flame size={18} /> : item.kind === "reminder" ? <AlarmClock size={18} /> : item.kind === "opportunity" ? <Award size={18} /> : <FileCheck2 size={18} />}</span><div><small>{item.kind}</small><strong>{item.title}</strong><p>{item.body}</p><em>{item.action_label}<ChevronRight size={13} /></em></div></button>)}</div>
      </section></div> : null}

      {reminderOpen ? <div className="home-sheet-backdrop" onClick={() => setReminderOpen(false)}><section className="reminder-sheet" aria-label="Plan this move" onClick={(event) => event.stopPropagation()}>
        <header><span><AlarmClock size={20} /></span><div><small>Reminder</small><strong>When should we remind you?</strong></div><button aria-label="Close reminder" onClick={() => setReminderOpen(false)}><X size={18} /></button></header>
        <div className="reminder-task"><strong>{data.today_priority.title}</strong></div>
        <div className="reminder-choices">
          <button disabled={reminderSaving} onClick={() => void saveReminder("later today", reminderTime(3))}><strong>Later today</strong><small>In 3 hours</small></button>
          <button disabled={reminderSaving} onClick={() => void saveReminder("tomorrow", reminderTime(1, 18))}><strong>Tomorrow</strong><small>18:00</small></button>
          <button disabled={reminderSaving} onClick={() => void saveReminder("in three days", reminderTime(3, 18))}><strong>In 3 days</strong><small>18:00</small></button>
        </div>
        {reminderStatus ? <p className="reminder-status">{reminderStatus}</p> : null}
        <Button variant="ghost" className="w-full reminder-secondary" onClick={() => navigate(data.today_action.screen)}>{data.today_action.secondary_label || "Open workspace"}<ArrowRight size={16} /></Button>
      </section></div> : null}
    </div>
  );
}
