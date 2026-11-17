import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { translate, useLanguage } from "../../i18n";

const tourPreference = (userId: string) => `savingsos-tour-v1:${userId}`;

const steps = [
  {
    title: "A tiny tour. Big money energy.",
    text: "Let's give your money a plan. First stop: Accounts. No spreadsheets were harmed in the making of this tour.",
    route: undefined,
    targets: ['.sidebar nav a[href$="/accounts"]', '.mobile-nav a[href$="/accounts"]', '.topbar'],
  },
  {
    title: "First, give your money a home.",
    text: "Add your everyday, bills, and savings accounts here. Give each a name and a starting balance. No bank connection needed.",
    route: "/accounts",
    targets: ['.accounts-page .page-actions .button.primary'],
  },
  {
    title: "Next, set your current balances.",
    text: "Use Edit or Update balance to match what you actually have. These are manual snapshots. If you have no accounts yet, add one after the tour.",
    route: "/accounts",
    targets: ['.account-cards .account-card', '.accounts-page .page-actions .button.primary'],
  },
  {
    title: "Move it with intention.",
    text: "Record money moving between your accounts here. Transfers adjust both balances, without counting as income or spending. Same money, new pocket.",
    route: "/transfers",
    targets: ['.transfers-page .expense-heading-actions .button.primary', '.transfers-page .page-heading'],
  },
  {
    title: "Spend wisely, plan ahead.",
    text: "Add one-time, monthly, or yearly expenses. Choose an account and due date, then record payments as you make them. Your future self says thanks.",
    route: "/expenses",
    targets: ['.expenses-page .expense-heading-actions .button.primary'],
  },
  {
    title: "Your month, at a glance.",
    text: "Last month's income funds this month's plan. Overview shows what's paid, what's coming, and what's left after planned expenses. That estimate is separate from your account balances.",
    route: "/dashboard",
    targets: ['.remaining-summary', '.concept-amount', '.dashboard-stats'],
  },
] as const;

type Spotlight = { x: number; y: number; width: number; height: number; vw: number; vh: number };

export function WelcomeTour({ userId, replay = false }: { userId: string; replay?: boolean }) {
  useLanguage();
  const navigate = useNavigate();
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return replay || localStorage.getItem(tourPreference(userId)) !== "done"; }
    catch { return true; }
  });
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [cardHeight, setCardHeight] = useState(300);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const marker = useId().replace(/:/g, "");
  const tip = steps[step];

  function finish() {
    try { localStorage.setItem(tourPreference(userId), "done"); } catch { /* Still dismiss for this visit. */ }
    setActive(false);
    navigate("/dashboard");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.setTimeout(() => document.getElementById("main-content")?.focus({ preventScroll: true }), 0);
  }

  useEffect(() => {
    if (!active) return;
    const app = document.querySelector<HTMLElement>(".finance-app");
    const previousInert = app?.inert ?? false;
    const previousTour = app?.getAttribute("data-tour-active");
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    if (app) { app.inert = true; app.setAttribute("data-tour-active", "true"); }
    document.body.style.overflow = "hidden";
    return () => {
      if (app) {
        app.inert = previousInert;
        if (previousTour == null) app.removeAttribute("data-tour-active");
        else app.setAttribute("data-tour-active", previousTour);
      }
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let scrolled = false;
    let viewportSize = "";
    function measure() {
      setCardHeight(cardRef.current?.offsetHeight || 300);
      const vw = window.innerWidth, vh = window.innerHeight;
      const size = `${vw}:${vh}`;
      if (viewportSize !== size) { scrolled = false; viewportSize = size; }
      const target = tip.targets.map(selector => document.querySelector<HTMLElement>(selector)).find(el => {
        const r = el?.getBoundingClientRect();
        return r && r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw;
      });
      if (target && !scrolled) {
        scrolled = true;
        const r = target.getBoundingClientRect();
        if (vw < 768 && vh < 740 && !target.closest('.mobile-nav, .topbar')) {
          target.scrollIntoView?.({ block: "start", behavior: "instant" });
          window.scrollBy?.({ top: target.getBoundingClientRect().top - 24, behavior: "instant" });
        } else if (r.top < 16 || r.bottom > vh - 300) target.scrollIntoView?.({ block: "center", behavior: "instant" });
      }
      const r = target?.getBoundingClientRect();
      const x = r ? Math.max(8, r.left - 8) : vw / 2 - 40;
      const y = r ? Math.max(8, Math.min(vh - 90, r.top - 8)) : 80;
      const value = { x, y, width: r ? Math.max(0, Math.min(vw - x - 8, r.width + 16)) : 80, height: r ? Math.min(r.height + 16, vh * .4, vh - y - 8) : 48, vw, vh };
      setSpot(previous => JSON.stringify(previous) === JSON.stringify(value) ? previous : value);
    }
    const timer = window.setTimeout(measure, 0);
    const observer = new MutationObserver(measure);
    const app = document.querySelector(".finance-app");
    if (app) observer.observe(app, { childList: true, subtree: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (app) resize?.observe(app);
    if (cardRef.current) resize?.observe(cardRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    nextRef.current?.focus({ preventScroll: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, tip]);

  if (!active) return null;
  const vw = spot?.vw ?? window.innerWidth, vh = spot?.vh ?? window.innerHeight;
  const cardWidth = Math.min(370, vw - 32);
  const side = spot && vw >= 900 && spot.x + spot.width + cardWidth + 60 < vw;
  const left = side ? spot.x + spot.width + 44 : Math.max(16, Math.min(vw - cardWidth - 16, (spot?.x ?? vw / 2) + (spot?.width ?? 0) / 2 - cardWidth / 2));
  const below = spot && spot.y + spot.height + cardHeight + 54 < vh;
  const mobileTop = spot && spot.y > vh - cardHeight - 24 ? Math.max(16, spot.y - cardHeight - 48) : Math.max(16, vh - cardHeight - 24);
  const top = vw < 768 ? mobileTop : side ? Math.max(24, Math.min(vh - cardHeight - 24, spot.y)) : below ? spot.y + spot.height + 48 : Math.max(24, (spot?.y ?? 320) - cardHeight - 48);
  const endX = spot ? side ? spot.x + spot.width + 10 : spot.x + spot.width / 2 : vw / 2;
  const endY = spot ? side ? spot.y + spot.height / 2 : top > spot.y ? spot.y + spot.height + 10 : spot.y - 10 : 140;
  const startX = side ? left - 10 : left + cardWidth / 2;
  const startY = side ? top + Math.min(85, cardHeight / 2) : top > endY ? top - 8 : top + cardHeight + 8;
  const hole = spot ? `M0 0H${vw}V${vh}H0Z M${spot.x} ${spot.y}h${spot.width}v${spot.height}h-${spot.width}Z` : `M0 0H${vw}V${vh}H0Z`;

  function changeStep(next: number) {
    setStep(next);
    const route = steps[next].route;
    if (route) navigate(route);
  }

  return createPortal(
    <div className="welcome-tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); finish(); }
      if (event.key === "Tab") {
        const controls = [...(cardRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="tour-shade" style={{ clipPath: `path(evenodd, "${hole}")` }} />
      {spot && <div className="tour-spotlight" style={{ left: spot.x, top: spot.y, width: spot.width, height: spot.height }} />}
      <svg className="tour-arrow" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} aria-hidden="true">
        <defs><marker id={marker} markerWidth="15" markerHeight="15" refX="12" refY="7" orient="auto"><path d="M2 2 12 7 2 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></marker></defs>
        {spot && <path d={`M${startX} ${startY} Q${side ? (startX + endX) / 2 : startX - 35} ${side ? startY - 35 : (startY + endY) / 2} ${endX} ${endY}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" markerEnd={`url(#${marker})`} />}
      </svg>
      <div ref={cardRef} className="tour-tip" style={{ left, top, width: cardWidth }}>
        <div className="tour-progress" aria-live="polite">✦ {translate("Tip {{current}} of {{total}}", { current: String(step + 1), total: String(steps.length) })}</div>
        <h2 id="tour-title">{translate(tip.title)}</h2>
        <p id="tour-description">{translate(tip.text)}</p>
        <div className="tour-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i === step ? "active" : ""} />)}</div>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={finish}>{translate("Skip tutorial")}</button>
          {step > 0 && <button type="button" className="tour-back" onClick={() => changeStep(step - 1)}>{translate("Back")}</button>}
          <button type="button" className="tour-next" ref={nextRef} onClick={() => step === steps.length - 1 ? finish() : changeStep(step + 1)}>{translate(step === steps.length - 1 ? "Finish tutorial" : "Next")} <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>, document.body,
  );
}
