import { useEffect, useState } from "react";
import { ArrowRight, Check, Compass, Copy, CreditCard, FileSearch, GraduationCap, LoaderCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../api";
import type { SubscriptionStatus } from "../types";

export default function PaywallScreen({ subscription, onUnlocked }: { subscription: SubscriptionStatus; onUnlocked: (next: SubscriptionStatus) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(subscription.payment_status === "pending" ? "Your receipt is waiting for admin review." : "");

  useEffect(() => { void api.track("paywall_view"); }, []);

  async function refreshAccess() {
    setChecking(true);
    try {
      const next = await api.get<SubscriptionStatus>("/api/subscription");
      if (next.has_access) {
        window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
        onUnlocked(next);
        return;
      }
      setMessage(next.payment_status === "pending" ? "Your receipt is still waiting for admin review." : "Access is not active yet. Send your receipt to the bot after paying.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not check your access.");
    } finally {
      setChecking(false);
    }
  }

  async function copyCard() {
    if (!subscription.card_number) return;
    try {
      await navigator.clipboard.writeText(subscription.card_number.replace(/\s/g, ""));
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
      setMessage("Card number copied.");
    } catch {
      setMessage("Press and hold the card number to copy it.");
    }
  }

  function sendReceipt() {
    if (!accepted || !subscription.payment_bot_url) return;
    void api.track("checkout_started", { plan: "pro_30_days", price: subscription.price_uzs, currency: "UZS", method: "manual_card" });
    const telegram = window.Telegram?.WebApp;
    if (telegram?.openTelegramLink) telegram.openTelegramLink(subscription.payment_bot_url);
    else if (telegram?.openLink) telegram.openLink(subscription.payment_bot_url);
    else window.location.assign(subscription.payment_bot_url);
  }

  const supportName = (subscription.support_handle || "@UniVentureSupport_bot").replace(/^@/, "");
  const configured = Boolean(subscription.card_number && subscription.payment_bot_url);

  return (
    <main className="paywall-screen">
      <header className="paywall-brand"><span><Compass size={20} /></span><strong>UniVentureAI</strong><em>PRO</em></header>

      <section className="paywall-hero">
        <div className="paywall-orbit"><Sparkles size={30} /><i><CreditCard size={14} /></i></div>
        <small>YOUR APPLICATION OPERATING SYSTEM</small>
        <h1>Build the application<br />you are capable of.</h1>
        <p>One private workspace for strategy, practice and every important application decision.</p>
      </section>

      <section className="paywall-offer">
        <div className="paywall-price"><span><CreditCard size={19} /></span><strong>{(subscription.price_uzs || 199000).toLocaleString("ru-RU")}</strong><div><b>UZS</b><small>30 days · manual renewal</small></div></div>
        <em>Founding member price</em>
        <button className="payment-card-copy" onClick={() => void copyCard()} disabled={!subscription.card_number}>
          <span><small>PAY TO CARD</small><strong>{subscription.card_number || "Card details unavailable"}</strong><em>{subscription.card_holder}{subscription.bank_name ? ` · ${subscription.bank_name}` : ""}</em></span>
          <Copy size={17} />
        </button>
        <div className="paywall-benefits">
          <span><FileSearch size={18} /><b>AI feedback</b><small>Essays, ECs & letters</small></span>
          <span><GraduationCap size={18} /><b>Smart strategy</b><small>Schools, plan & profile</small></span>
          <span><Sparkles size={18} /><b>Daily practice</b><small>SAT & IELTS studios</small></span>
        </div>
        <div className="manual-payment-steps"><span><b>1</b>Transfer</span><span><b>2</b>Send receipt</span><span><b>3</b>Admin approves</span></div>
      </section>

      <label className="paywall-consent">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span><i>{accepted ? <Check size={13} /> : null}</i><b>I agree to the payment terms</b><small>This is a manual 30-day payment with no automatic renewal. Guidance does not guarantee admission or an official test score.</small></span>
      </label>

      <button className="paywall-primary" disabled={!accepted || !configured} onClick={sendReceipt}>
        <Send size={18} />Send payment receipt<ArrowRight size={18} />
      </button>
      <button className="paywall-restore" disabled={checking} onClick={() => void refreshAccess()}>{checking ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}Check approval status</button>
      {message ? <p className="paywall-message">{message}</p> : null}

      <footer><span>Manual verification by UniVentureAI</span><a href={`https://t.me/${supportName}`}>Payment help</a></footer>
    </main>
  );
}
