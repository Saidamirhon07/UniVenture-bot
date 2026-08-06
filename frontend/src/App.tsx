import { useCallback, useEffect, useState } from "react";
import { BookOpenText, CalendarCheck2, Home, LayoutGrid, Sparkles, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./api";
import { ErrorBanner, LoadingScreen } from "./components/ui";
import type { Navigate, ScreenId, SessionUser } from "./types";
import ApplicationPlanScreen from "./screens/ApplicationPlanScreen";
import EssayLabScreen from "./screens/EssayLabScreen";
import HomeScreen from "./screens/HomeScreen";
import PortfolioScreen from "./screens/PortfolioScreen";
import SchoolFinderScreen from "./screens/SchoolFinderScreen";
import { BoostToolsScreen, ECBuilderScreen, IELTSWritingScreen, PortfolioBuilderScreen, RecommendationScreen } from "./screens/FocusedTools";

const primaryNav: Array<{ screen: ScreenId; label: string; icon: typeof Home }> = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "essay", label: "Essay", icon: BookOpenText },
  { screen: "plan", label: "Plan", icon: CalendarCheck2 },
  { screen: "portfolio", label: "Portfolio", icon: UserRound },
  { screen: "boost", label: "Boost", icon: Sparkles },
];

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
    webApp?.setHeaderColor("#06101f");
    webApp?.setBackgroundColor("#06101f");
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

  const content = (() => {
    switch (screen) {
      case "home": return <HomeScreen navigate={navigate} reloadKey={reloadKey} />;
      case "essay": return <EssayLabScreen navigate={navigate} onChanged={markChanged} />;
      case "school": return <SchoolFinderScreen navigate={navigate} onChanged={markChanged} />;
      case "plan": return <ApplicationPlanScreen navigate={navigate} onChanged={markChanged} />;
      case "portfolio": return <PortfolioScreen navigate={navigate} onChanged={markChanged} />;
      case "ec": return <ECBuilderScreen navigate={navigate} onChanged={markChanged} />;
      case "ielts": return <IELTSWritingScreen navigate={navigate} onChanged={markChanged} />;
      case "recommendation": return <RecommendationScreen navigate={navigate} onChanged={markChanged} />;
      case "portfolio-builder": return <PortfolioBuilderScreen navigate={navigate} onChanged={markChanged} />;
      case "boost": return <BoostToolsScreen navigate={navigate} />;
    }
  })();

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <main className="app-content">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }}>
            {content}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {primaryNav.map(({ screen: target, label, icon: Icon }) => (
          <button key={target} className={screen === target ? "active" : ""} onClick={() => navigate(target)}>
            <span><Icon size={20} /></span><small>{label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

