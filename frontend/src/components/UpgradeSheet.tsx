import { useEffect, useState } from "react";
import { Check, Copy, CreditCard, LoaderCircle, LockKeyhole, Send, Sparkles, X } from "lucide-react";
import { api } from "../api";
import type { SubscriptionStatus } from "../types";

export default function UpgradeSheet({ feature, subscription, onClose, onUnlocked }: { feature: string; subscription: SubscriptionStatus; onClose: () => void; onUnlocked: (next: SubscriptionStatus) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(subscription.payment_status === "pending" ? "Your receipt is waiting for admin review." : "");

  useEffect(() => {
    void api.track("upgrade_view", { feature });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [feature, onClose]);

  async function copyCard() {
    if (!subscription.card_number) return;
    try {
      await navigator.clipboard.writeText(subscription.card_number.replace(/\s/g, ""));
      setMessage("Card number copied.");
    } catch { setMessage("Press and hold the card number to copy it."); }
  }

  async function startPayment() {
    if (!accepted) return;
    setLoading(true); setMessage("");
    void api.track("upgrade_clicked", { feature, price: subscription.price_uzs, currency: "UZS" });
    try {
      await api.post<{ started: boolean; message: string }>("/api/payment/start", {});
      setMessage("Receipt mode is ready. Returning you to the bot…");
      window.setTimeout(() => window.Telegram?.WebApp.close(), 450);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not start payment. Please try again.");
      setLoading(false);
    }
  }

  async function checkAccess() {
    setChecking(true);
    try {
      const next = await api.get<SubscriptionStatus>("/api/subscription");
      if (next.is_premium) { onUnlocked(next); onClose(); return; }
      setMessage(next.payment_status === "pending" ? "Your receipt is still waiting for admin review." : "Premium is not active yet.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Could not check your access."); }
    finally { setChecking(false); }
  }

  return <div className="upgrade-backdrop" role="presentation" onClick={onClose}>
    <section className="upgrade-sheet" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onClick={(event) => event.stopPropagation()}>
      <header><span><LockKeyhole size={18} /></span><div><small>UNLOCK PREMIUM</small><strong id="upgrade-title">Continue with {feature}</strong></div><button aria-label="Close upgrade" onClick={onClose}><X size={18} /></button></header>
      <div className="upgrade-value"><Sparkles size={22} /><div><strong>Your complete admissions workspace</strong><small>Full AI reviews, personal roadmap, saved profile, school matching, unlimited SAT/IELTS practice and mistake history.</small></div></div>
      <div className="upgrade-price"><strong>{(subscription.price_uzs || 199000).toLocaleString("ru-RU")}</strong><span>UZS<small>30 days · no automatic renewal</small></span></div>
      <button className="upgrade-card" onClick={() => void copyCard()} disabled={!subscription.card_number}><span><small>PAY TO CARD</small><strong>{subscription.card_number || "Payment details unavailable"}</strong><em>{subscription.card_holder}{subscription.bank_name ? ` · ${subscription.bank_name}` : ""}</em></span><Copy size={17} /></button>
      <label className="upgrade-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><i aria-hidden="true">{accepted ? <Check size={14} strokeWidth={3} /> : null}</i><span><strong>I agree to the payment terms</strong><small>Admin-verified payment for 30 days of Premium access.</small></span></label>
      <button className="upgrade-pay" disabled={!accepted || loading || !subscription.card_number} onClick={() => void startPayment()}>{loading ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}Send payment receipt</button>
      <button className="upgrade-check" disabled={checking} onClick={() => void checkAccess()}>{checking ? <LoaderCircle className="spin" size={16} /> : null}Check approval status</button>
      {message ? <p className="upgrade-message" role="status">{message}</p> : null}
    </section>
  </div>;
}
