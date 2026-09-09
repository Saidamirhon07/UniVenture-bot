import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Home, LayoutGrid, MapPinned, Search, Sparkles, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./api";
import { Button, Card, ErrorBanner, Input, LoadingScreen, Tag } from "./components/ui";
import ProfileCopilot from "./components/ProfileCopilot";
import PracticeStudio from "./components/PracticeStudio";
import UpgradeSheet from "./components/UpgradeSheet";
import type { Navigate, ScreenId, SessionUser, SubscriptionStatus } from "./types";
import ApplicationPlanScreen from "./screens/ApplicationPlanScreen";
import EssayLabScreen from "./screens/EssayLabScreen";
import HomeScreen from "./screens/HomeScreen";
import PortfolioScreen from "./screens/PortfolioScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import SchoolFinderScreen from "./screens/SchoolFinderScreen";
import FounderAnalyticsScreen from "./screens/FounderAnalyticsScreen";
import FreeReadinessCheck from "./screens/FreeReadinessCheck";
import { BoostToolsScreen, ECBuilderScreen, IELTSWritingScreen, PortfolioBuilderScreen, RecommendationScreen } from "./screens/FocusedTools";
import { AICoachScreen, DiscoverScreen, FeedbackScreen, PrepHubScreen, SATStudioScreen } from "./screens/GrowthScreens";
import { RoadmapScreen, ToolsHubScreen } from "./screens/NavigationHubs";

const primaryNav: Array<{ screen: ScreenId; label: string; icon: typeof Home; featured?: boolean }> = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "roadmap", label: "Plan", icon: MapPinned },
  { screen: "tools", label: "Tools", icon: LayoutGrid, featured: true },
  { screen: "discover", label: "Explore", icon: Search },
  { screen: "portfolio", label: "Profile", icon: UserRound },
];

const freeScreens = new Set<ScreenId>(["home", "tools", "discover", "sat", "ielts", "feedback", "free-check"]);
const featureNames: Partial<Record<ScreenId, string>> = {
  roadmap: "your personal roadmap", portfolio: "your saved profile", essay: "Essay Review", ec: "EC Evaluation",
  recommendation: "Recommendation Letters", "portfolio-builder": "Portfolio Review", school: "School Finder",
  plan: "Application Plan", coach: "AI Coach", brainstorm: "Brainstorm Studio", rewrite: "Rewrite Studio",
  boost: "Quick Checks", prep: "the full Prep Lab",
};

function navScreen(screen: ScreenId): ScreenId {
  if (screen === "free-check") return "home";
  if (["sat", "ielts", "prep", "coach", "brainstorm", "rewrite", "essay", "ec", "recommendation", "portfolio-builder", "boost", "founder"].includes(screen)) return "tools";
  if (["school"].includes(screen)) return "discover";
  if (["plan"].includes(screen)) return "roadmap";
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
    const cleanName = name.trim();
    if (loading || cleanName.length < 2) return;
    setLoading(true); setError("");
    try {
      const data = await api.post<{ user: SessionUser }>("/api/profile/name", { name: cleanName });
      onSaved(data.user);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your name."); }
    finally { setLoading(false); }
  }
  return <main className="name-setup"><div className="name-orbit"><Sparkles size={28} /></div><Tag tone="cyan">Make it yours</Tag><h1>What should we call you?</h1><p>Enter the name you want UniVentureAI to use. We won’t copy it from Telegram.</p><Card><form className="name-form" onSubmit={(event) => { event.preventDefault(); void saveName(); }}><Input label="Your name" autoComplete="name" enterKeyHint="go" maxLength={40} placeholder="e.g. Saidamirkhon" value={name} onChange={(event) => setName(event.target.value)} />{error ? <ErrorBanner message={error} /> : null}<Button type="submit" className="name-continue" loading={loading} disabled={name.trim().length < 2}>Continue<ArrowRight size={18} /></Button></form></Card><small>You can change this anytime in Academic Profile.</small></main>;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [authError, setAuthError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  const navigate: Navigate = useCallback((next) => {
    if (!window.dispatchEvent(new Event("univenture:before-navigate", { cancelable: true }))) return;
    if (subscription && !subscription.is_premium && !freeScreens.has(next)) {
      setUpgradeFeature(featureNames[next] || "this feature");
      window.Telegram?.WebApp.HapticFeedback?.impactOccurred("medium");
      return;
    }
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.Telegram?.WebApp.HapticFeedback?.impactOccurred("light");
  }, [subscription]);

  const markChanged = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    webApp?.setHeaderColor("#fbf7f1");
    webApp?.setBackgroundColor("#fbf7f1");
    webApp?.enableClosingConfirmation?.();
    api.authenticate()
      .then(({ user: authenticatedUser, subscription: access }) => {
        setUser(authenticatedUser); setSubscription(access);
        const params = new URLSearchParams(window.location.search);
        const requestedScreen = params.get("screen") as ScreenId | null;
        if (requestedScreen && freeScreens.has(requestedScreen)) setScreen(requestedScreen);
        if (params.get("upgrade") === "premium" && !access.is_premium) setUpgradeFeature("Premium access");
        const source = webApp?.initDataUnsafe?.start_param || params.get("startapp") || undefined;
        void api.track("app_open", { session_id: crypto.randomUUID?.() || String(Date.now()) }, source);
      })
      .catch((error) => setAuthError(error instanceof Error ? error.message : "Authentication failed."));
  }, []);

  useEffect(() => {
    if (user) void api.track("screen_view", { screen });
  }, [screen, user]);

  useEffect(() => {
    const back = window.Telegram?.WebApp.BackButton;
    if (!back) return;
    const goHome = () => navigate("home");
    if (screen === "home") back.hide(); else { back.show(); back.onClick(goHome); }
    return () => back.offClick(goHome);
  }, [screen, navigate]);

  if (authError) return <AuthFailure message={authError} />;
  if (!user || !subscription) return <LoadingScreen />;
  if (!user.has_manual_name || !user.name) return <NameSetup onSaved={setUser} />;
  if (subscription.is_premium && !user.onboarding_complete) return <ProfileSetupScreen name={user.name} onComplete={setUser} />;

  const content = (() => {
    switch (screen) {
      case "home": return <HomeScreen navigate={navigate} reloadKey={reloadKey} />;
      case "roadmap": return <RoadmapScreen navigate={navigate} reloadKey={reloadKey} />;
      case "tools": return <ToolsHubScreen navigate={navigate} isAdmin={Boolean(user.is_admin)} isPremium={subscription.is_premium} />;
      case "discover": return <DiscoverScreen navigate={navigate} />;
      case "prep": return <PrepHubScreen navigate={navigate} />;
      case "coach": return <AICoachScreen navigate={navigate} />;
      case "brainstorm": return <AICoachScreen navigate={navigate} initialMode="brainstorm" />;
      case "rewrite": return <AICoachScreen navigate={navigate} initialMode="rewrite" />;
      case "essay": return <EssayLabScreen navigate={navigate} onChanged={markChanged} />;
      case "school": return <SchoolFinderScreen navigate={navigate} onChanged={markChanged} />;
      case "plan": return <ApplicationPlanScreen navigate={navigate} onChanged={markChanged} />;
      case "portfolio": return <PortfolioScreen navigate={navigate} onChanged={markChanged} />;
      case "ec": return <ECBuilderScreen navigate={navigate} onChanged={markChanged} />;
      case "ielts": return <PracticeStudio exam="ielts" navigate={navigate} onChanged={markChanged} isPremium={subscription.is_premium} onUpgrade={() => setUpgradeFeature("unlimited IELTS practice")} coach={<IELTSWritingScreen navigate={navigate} onChanged={markChanged} coachOnly />} />;
      case "sat": return <PracticeStudio exam="sat" navigate={navigate} onChanged={markChanged} isPremium={subscription.is_premium} onUpgrade={() => setUpgradeFeature("unlimited SAT practice")} coach={<SATStudioScreen navigate={navigate} onChanged={markChanged} />} />;
      case "feedback": return <FeedbackScreen navigate={navigate} />;
      case "free-check": return <FreeReadinessCheck navigate={navigate} />;
      case "recommendation": return <RecommendationScreen navigate={navigate} onChanged={markChanged} />;
      case "portfolio-builder": return <PortfolioBuilderScreen navigate={navigate} onChanged={markChanged} />;
      case "boost": return <BoostToolsScreen navigate={navigate} />;
      case "founder": return user.is_admin ? <FounderAnalyticsScreen navigate={navigate} /> : <ToolsHubScreen navigate={navigate} isAdmin={false} />;
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
        {primaryNav.map(({ screen: target, label, icon: Icon, featured }) => (
          <button key={target} className={`${navScreen(screen) === target ? "active" : ""}${featured ? " nav-tools" : ""}`} onClick={() => navigate(target)}>
            <span><Icon size={20} /></span><small>{label}</small>
          </button>
        ))}
      </nav>
      {subscription.is_premium && (["home", "roadmap", "tools", "discover", "feedback"] as ScreenId[]).includes(screen) ? <ProfileCopilot screen={screen} /> : null}
      {upgradeFeature ? <UpgradeSheet feature={upgradeFeature} subscription={subscription} onClose={() => setUpgradeFeature("")} onUnlocked={setSubscription} /> : null}
    </div>
  );
}
