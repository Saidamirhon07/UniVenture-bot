import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, CreditCard, Eye, Flame, RefreshCw, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Users } from "lucide-react";
import { api } from "../api";
import { ErrorBanner, LoadingScreen } from "../components/ui";
import type { FounderAnalytics, Navigate } from "../types";

function money(amount: number, currency: string) {
  if (currency === "XTR") return `${amount.toLocaleString()} ⭐`;
  if (currency === "UZS") return `${amount.toLocaleString("ru-RU")} UZS`;
  return `${amount.toLocaleString()} ${currency}`;
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof Users; tone: string }) {
  return <article className={`founder-metric metric-${tone}`}><span><Icon size={17} /></span><small>{label}</small><strong>{value}</strong><em>{note}</em></article>;
}

export default function FounderAnalyticsScreen({ navigate }: { navigate: Navigate }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<FounderAnalytics | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    api.get<FounderAnalytics>(`/api/admin/analytics?days=${days}`)
      .then((value) => active && setData(value))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load founder analytics."));
    return () => { active = false; };
  }, [days, refreshKey]);

  const maxActivity = useMemo(() => Math.max(1, ...(data?.timeline.map((item) => item.active_users) || [1])), [data]);
  if (!data && !error) return <LoadingScreen label="Calculating growth…" />;

  return (
    <div className="page-enter founder-dashboard">
      <header className="founder-header">
        <button onClick={() => navigate("tools")} aria-label="Back to tools"><ArrowLeft size={18} /></button>
        <div><small>PRIVATE · ADMIN ONLY</small><h1>Founder Pulse</h1></div>
        <button onClick={() => setRefreshKey((value) => value + 1)} aria-label="Refresh analytics"><RefreshCw size={18} /></button>
      </header>

      <div className="founder-window" aria-label="Analytics period">
        {[7, 30, 90].map((value) => <button className={days === value ? "active" : ""} key={value} onClick={() => { setData(null); setDays(value); }}>{value} days</button>)}
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {data ? <>
        <section className="founder-hero">
          <div><span><Activity size={16} />Live product health</span><strong>{data.audience.dau}</strong><small>active today</small></div>
          <i><Sparkles size={22} /></i>
        </section>

        <section className="founder-metric-grid">
          <Metric label="DAU" value={data.audience.dau} note="today" icon={Flame} tone="coral" />
          <Metric label="WAU" value={data.audience.wau} note="7 days" icon={Users} tone="teal" />
          <Metric label="MAU" value={data.audience.mau} note="30 days" icon={Eye} tone="blue" />
        </section>

        <section className="founder-panel">
          <div className="founder-panel-title"><div><small>REVENUE ENGINE</small><h2>Subscription health</h2></div><CreditCard size={20} /></div>
          <div className="founder-growth-grid">
            <span><small>Active paid</small><strong>{data.subscriptions.active_paid}</strong><em><TrendingUp size={13} /> subscribers</em></span>
            <span><small>Conversion</small><strong>{data.funnel.visitor_to_paid}%</strong><em>{data.funnel.paid} new payers</em></span>
            <span><small>Churn</small><strong>{data.subscriptions.churn_rate}%</strong><em className="risk"><TrendingDown size={13} /> {data.subscriptions.churned} expired</em></span>
          </div>
          <div className="founder-funnel">
            <div><span>Visitors</span><i><b style={{ width: "100%" }} /></i><strong>{data.funnel.visitors}</strong></div>
            <div><span>Upgrade viewed</span><i><b style={{ width: `${Math.max(3, data.funnel.visitor_to_upgrade)}%` }} /></i><strong>{data.funnel.upgrade_viewed}</strong></div>
            <div><span>Checkout</span><i><b style={{ width: `${Math.max(3, data.funnel.visitor_to_checkout)}%` }} /></i><strong>{data.funnel.checkout_started}</strong></div>
            <div><span>Paid</span><i><b style={{ width: `${Math.max(3, data.funnel.visitor_to_paid)}%` }} /></i><strong>{data.funnel.paid}</strong></div>
          </div>
        </section>

        <section className="founder-panel">
          <div className="founder-panel-title"><div><small>ACTIVITY</small><h2>Daily active users</h2></div><BarChart3 size={20} /></div>
          <div className="founder-bars" aria-label="Daily active users chart">
            {data.timeline.map((item, index) => <div key={item.date} title={`${item.date}: ${item.active_users} active users`}><i style={{ height: `${Math.max(5, item.active_users / maxActivity * 100)}%` }} /><small>{index % Math.max(1, Math.floor(data.timeline.length / 5)) === 0 ? item.date.slice(5) : ""}</small></div>)}
          </div>
        </section>

        <section className="founder-panel">
          <div className="founder-panel-title"><div><small>ENGAGEMENT</small><h2>Most-used tools</h2></div><Sparkles size={20} /></div>
          <div className="founder-tool-list">
            {data.tools.length ? data.tools.map((tool, index) => <div key={tool.name}><span>{index + 1}</span><strong>{tool.name}</strong><i><b style={{ width: `${Math.max(7, tool.views / Math.max(1, data.tools[0].views) * 100)}%` }} /></i><em>{tool.views}</em></div>) : <p>Tool activity will appear after students start exploring the updated app.</p>}
          </div>
        </section>

        <section className="founder-practice-grid">
          {(["sat", "ielts"] as const).map((exam) => <article key={exam}><span>{exam.toUpperCase()}</span><strong>{data.practice[exam].sessions}</strong><small>completed sessions</small><div><b>{data.practice[exam].students}</b> students <i /> <b>{data.practice[exam].accuracy}%</b> accuracy</div></article>)}
        </section>

        <section className="founder-panel">
          <div className="founder-panel-title"><div><small>ATTRIBUTION</small><h2>Revenue by campaign</h2></div><TrendingUp size={20} /></div>
          <div className="founder-source-list">
            {data.revenue_by_source.length ? data.revenue_by_source.map((row) => <div key={`${row.source}-${row.currency}`}><span>{row.source.replace(/_/g, " ")}</span><strong>{money(row.amount, row.currency)}</strong><small>{row.buyers} buyers · {row.payments} payments</small></div>) : <p>Confirmed payments and their campaign sources will appear here.</p>}
          </div>
        </section>

        <footer className="founder-privacy"><ShieldCheck size={16} /><span>{data.privacy}</span></footer>
      </> : null}
    </div>
  );
}
