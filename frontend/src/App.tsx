import { useCallback, useEffect, useState } from "react";
import { BookOpenText, BriefcaseBusiness, Compass, Home, LayoutGrid, Search, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./api";
import { Button, Card, ErrorBanner, Input, LoadingScreen, Tag } from "./components/ui";
import ProfileCopilot from "./components/ProfileCopilot";
import type { Navigate, ScreenId, SessionUser } from "./types";
import ApplicationPlanScreen from "./screens/ApplicationPlanScreen";
import EssayLabScreen from "./screens/EssayLabScreen";
import HomeScreen from "./screens/HomeScreen";
import PortfolioScreen from "./screens/PortfolioScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import SchoolFinderScreen from "./screens/SchoolFinderScreen";
import { BoostToolsScreen, ECBuilderScreen, IELTSWritingScreen, PortfolioBuilderScreen, RecommendationScreen } from "./screens/FocusedTools";
import { AICoachScreen, DiscoverScreen, FeedbackScreen, PrepHubScreen, SATStudioScreen } from "./screens/GrowthScreens";

const primaryNav: Array<{ screen: ScreenId; label: string; icon: typeof Home }> = [
  { screen: "home", label: "Today", icon: Home },
  { screen: "coach", label: "Strategy", icon: Compass },
  { screen: "prep", label: "Prep", icon: BookOpenText },
  { screen: "discover", label: "Discover", icon: Search },
  { screen: "portfolio", label: "Portfolio", icon: BriefcaseBusiness },
];

function navScreen(screen: ScreenId): ScreenId {
  if (["sat", "ielts"].includes(screen)) return "prep";
  if (["school"].includes(screen)) return "discover";
  if (["plan", "essay", "ec", "recommendation", "portfolio-builder", "boost"].includes(screen)) return "coach";
  return screen;
}

function AuthFailure({ message }: { message: string }) {
  return (
    <main className="auth-failure">
      <div className="brand-mark"><LayoutGrid size={22} /></div>
      <h1>Open inside Telegram</h1>
      <p>The Admissions Hub securely identifies you through the UniVentureAI bot. Reopen it using “🚀 Open Admissions Hub”.</p>
      <ErrorBanner message={message} />
    </main>
  );
}

function NameSetup({ onSaved }: { onSaved: (user: SessionUser) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function saveName() {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ user: SessionUser }>("/api/profile/name", { name });
      onSaved(data.user);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your name."); }
    finally { setLoading(false); }
  }
  return <main className="name-setup"><div className="name-orbit"><Sparkles size={28} /></div><Tag tone="cyan">Make it yours</Tag><h1>What should we call you?</h1><p>Enter the name you want UniVentureAI to use. We won’t copy it from Telegram.</p><Card><Input label="Your name" autoFocus autoComplete="name" placeholder="e.g. Saidamirkhon" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && name.trim().length >= 2) void saveName(); }} />{error ? <ErrorBanner message={error} /> : null}<Button className="w-full mt-4" loading={loading} disabled={name.trim().length < 2} onClick={() => void saveName()}>Continue to my hub</Button></Card><small>You can change this anytime in Academic Profile.</small></main>;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const navigate: Navigate = useCallback((next) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.Telegram?.WebApp.HapticFeedback?.impactOccurred("light");
  }, []);

  const markChanged = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    webApp?.setHeaderColor("#fbf7f1");
    webApp?.setBackgroundColor("#fbf7f1");
    webApp?.enableClosingConfirmation?.();
    api.authenticate().then(({ user: authenticatedUser }) => setUser(authenticatedUser)).catch((error) => setAuthError(error instanceof Error ? error.message : "Authentication failed."));
  }, []);

  useEffect(() => {
    const back = window.Telegram?.WebApp.BackButton;
    if (!back) return;
    const goHome = () => navigate("home");
    if (screen === "home") back.hide(); else { back.show(); back.onClick(goHome); }
    return () => back.offClick(goHome);
  }, [screen, navigate]);

  if (authError) return <AuthFailure message={authError} />;
  if (!user) return <LoadingScreen />;
  if (!user.has_manual_name || !user.name) return <NameSetup onSaved={setUser} />;
  if (!user.onboarding_complete) return <ProfileSetupScreen name={user.name} onComplete={setUser} />;

  const content = (() => {
    switch (screen) {
      case "home": return <HomeScreen navigate={navigate} reloadKey={reloadKey} />;
      case "discover": return <DiscoverScreen navigate={navigate} />;
      case "prep": return <PrepHubScreen navigate={navigate} />;
      case "coach": return <AICoachScreen navigate={navigate} />;
      case "essay": return <EssayLabScreen navigate={navigate} onChanged={markChanged} />;
      case "school": return <SchoolFinderScreen navigate={navigate} onChanged={markChanged} />;
      case "plan": return <ApplicationPlanScreen navigate={navigate} onChanged={markChanged} />;
      case "portfolio": return <PortfolioScreen navigate={navigate} onChanged={markChanged} />;
      case "ec": return <ECBuilderScreen navigate={navigate} onChanged={markChanged} />;
      case "ielts": return <IELTSWritingScreen navigate={navigate} onChanged={markChanged} />;
      case "sat": return <SATStudioScreen navigate={navigate} onChanged={markChanged} />;
      case "feedback": return <FeedbackScreen navigate={navigate} />;
      case "recommendation": return <RecommendationScreen navigate={navigate} onChanged={markChanged} />;
      case "portfolio-builder": return <PortfolioBuilderScreen navigate={navigate} onChanged={markChanged} />;
      case "boost": return <BoostToolsScreen navigate={navigate} />;
    }
  })();

  return (
    <div className={`app-shell theme-${navScreen(screen)}`}>
      <main className="app-content">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }}>
            {content}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {primaryNav.map(({ screen: target, label, icon: Icon }) => (
          <button key={target} className={navScreen(screen) === target ? "active" : ""} onClick={() => navigate(target)}>
            <span><Icon size={20} /></span><small>{label}</small>
          </button>
        ))}
      </nav>
      {(["home", "coach", "prep", "discover", "feedback"] as ScreenId[]).includes(screen) ? <ProfileCopilot screen={screen} /> : null}
    </div>
  );
}
