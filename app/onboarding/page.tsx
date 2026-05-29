"use client";

// Cabana onboarding — an 8-step emotional flow (hero → idea → why → who →
// goal → name → meet crew → lift-off → roadmap). Pixel-faithful port of the
// Claude Design handoff. The collection steps author the Business Brief; the
// "lift-off" payoff hands off to /chat where the crew actually goes to work.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveBrief, briefFromOnboarding, type OnboardingData } from "@/app/lib/cabana-brief";

// ─── Crew + option banks ─────────────────────────────────────────────────────
type Agent = {
  id: string; name: string; role: string; color: string; n: string;
  wake: string | ((q: Q) => string); done: string | ((q: Q) => string);
};
type Q = { segs: number; price: string; goal: string; name: string; niche: string };

const AGENTS: Agent[] = [
  { id: "scout", name: "Scout", role: "Market research", color: "var(--scout)", n: "01",
    wake: "Scanning the market…", done: (q) => `Found ${q.segs} underserved segments` },
  { id: "strategist", name: "Strategist", role: "Offer design", color: "var(--strategist)", n: "02",
    wake: "Designing your offer…", done: (q) => `${q.price} positioning locked` },
  { id: "builder", name: "Builder", role: "Landing page", color: "var(--builder)", n: "03",
    wake: (q) => `Building ${q.name}…`, done: () => `Landing page live` },
  { id: "seller", name: "Seller", role: "Outreach", color: "var(--seller)", n: "04",
    wake: (q) => `Lining up ${q.niche}…`, done: () => `47 warm leads queued` },
  { id: "creator", name: "Creator", role: "Content", color: "var(--creator)", n: "05",
    wake: "Writing your launch posts…", done: () => `12 posts drafted` },
  { id: "analyst", name: "Analyst", role: "Revenue path", color: "var(--analyst)", n: "06",
    wake: "Mapping the path to cash…", done: (q) => `${q.goal} plan ready` },
];

const WHY_OPTIONS = ["Fire my boss", "Build a real asset", "Escape the 9–5", "Fund my freedom", "Stack a side income", "Prove I can"];
const NICHE_SUGGESTIONS = ["Beginner golfers", "Real estate agents", "Wedding planners", "Busy dads losing weight", "Indie game devs", "Etsy sellers"];
const GOAL_OPTIONS = [
  { v: "$1K/mo", label: "$1K/mo", sub: "Covers the bills" },
  { v: "$5K/mo", label: "$5K/mo", sub: "Quit-the-job money" },
  { v: "$10K/mo", label: "$10K/mo", sub: "Real freedom" },
  { v: "$30K/mo", label: "$30K/mo", sub: "Change everything" },
];
const VIBE_OPTIONS = ["Bold", "Premium", "Playful", "Minimal", "Trusted", "Rebel"];
const NAME_SEEDS = ["Fairway", "Northstar", "Loop", "Daybreak", "Tidal", "Holt"];
const HERO_SUGGESTIONS = [
  "A paid community for beginner golfers",
  "A Notion template for real estate agents",
  "A micro-SaaS for wedding planners",
  "A Whop for AI automation tutorials",
  "A digital product for busy dads trying to lose weight",
];

const STEP_TOTAL = 8; // idea, why, who, goal, name, crew, wake, roadmap
const DEFAULT_DATA: OnboardingData = { idea: "", why: [], niche: "", goal: "", days: 30, name: "", vibe: "" };
const resolve = (v: string | ((q: Q) => string), q: Q) => (typeof v === "function" ? v(q) : v);

// ─── Page ────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const set = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));

  const next = () => setStep((s) => Math.min(STEP_TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(-1, s - 1));
  const reset = () => { setStep(-1); setData(DEFAULT_DATA); };
  const isDark = step >= 5;

  // finale → write the brief and hand off to the real product
  const launch = () => {
    saveBrief({ content: briefFromOnboarding(data), updatedAt: Date.now() });
    router.push("/chat");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "ArrowLeft" && step > -1) back(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step]);

  const common = { state: data, set, onNext: next, onBack: step > -1 ? back : undefined };

  return (
    <div style={{ ["--accent" as string]: "#16BEE0", height: "100vh", position: "relative", colorScheme: "light" }}>
      <OnboardingStyles />
      {/* full-bleed background layer (light ↔ dark) */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundColor: isDark ? "#0a0a0a" : "#ffffff", transition: "background-color 700ms var(--ease)" }} />
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        <Chrome stepIndex={step} onLogo={reset} dark={isDark} />
        <div className="scroll" style={{ height: "100%", overflowY: "auto" }}>
          {step === -1 && <Hero {...common} />}
          {step === 0 && <IdeaStep {...common} />}
          {step === 1 && <WhyStep {...common} />}
          {step === 2 && <WhoStep {...common} />}
          {step === 3 && <GoalStep {...common} />}
          {step === 4 && <NameStep {...common} />}
          {step === 5 && <CrewStep {...common} />}
          {step === 6 && <WakeStep {...common} />}
          {step === 7 && <RoadmapStep {...common} onLaunch={launch} />}
        </div>
      </div>
    </div>
  );
}

type StepProps = {
  state: OnboardingData;
  set: (p: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
};

// ─── Shared chrome / primitives ──────────────────────────────────────────────
function Chrome({ stepIndex, onLogo, dark }: { stepIndex: number; onLogo: () => void; dark: boolean }) {
  const ink = dark ? "#fff" : "var(--fg)";
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 84, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", zIndex: 20 }}>
      <button onClick={onLogo} style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: ink }}>Cabana</button>
      {stepIndex >= 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.5)" : "var(--muted)", marginRight: 6 }}>
            {String(stepIndex + 1).padStart(2, "0")} / {String(STEP_TOTAL).padStart(2, "0")}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: STEP_TOTAL }).map((_, i) => (
              <div key={i} style={{ width: i === stepIndex ? 26 : 14, height: 4, borderRadius: 4, background: i <= stepIndex ? "var(--accent)" : dark ? "rgba(255,255,255,0.18)" : "var(--line)", transition: "all 420ms var(--ease)" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children, dark, color }: { children: React.ReactNode; dark?: boolean; color?: string }) {
  return <div style={{ fontSize: 17, color: color || (dark ? "rgba(255,255,255,0.55)" : "var(--muted)"), marginBottom: 22, fontWeight: 400 }}>{children}</div>;
}

function Display({ children, dark, size = 88 }: { children: React.ReactNode; dark?: boolean; size?: number }) {
  return <h1 style={{ margin: 0, fontSize: size, lineHeight: 0.98, letterSpacing: "-0.035em", fontWeight: 700, color: dark ? "#fff" : "var(--fg)", textWrap: "balance" }}>{children}</h1>;
}

function Chip({ active, onClick, children, dark, big }: { active?: boolean; onClick: () => void; children: React.ReactNode; dark?: boolean; big?: boolean }) {
  const [hover, setHover] = useState(false);
  const base = dark ? "#fff" : "var(--fg)";
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: big ? "16px 26px" : "13px 22px", fontSize: big ? 20 : 17, fontWeight: 500, borderRadius: 999,
        border: `1.5px solid ${active ? base : dark ? "rgba(255,255,255,0.22)" : "var(--line)"}`,
        background: active ? base : "transparent",
        color: active ? (dark ? "#0a0a0a" : "#fff") : dark ? "#fff" : "var(--fg)",
        transform: hover && !active ? "translateY(-2px)" : "none",
        boxShadow: hover && !active ? (dark ? "0 6px 20px rgba(0,0,0,0.4)" : "0 6px 20px rgba(0,0,0,0.07)") : "none",
        transition: "all 180ms var(--ease)" }}>
      {children}
    </button>
  );
}

function CircleArrow({ onClick, disabled, size = 64 }: { onClick: () => void; disabled?: boolean; size?: number }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: size, height: size, borderRadius: "50%", flex: "none", background: disabled ? "var(--line)" : "var(--accent)", display: "grid", placeItems: "center", cursor: disabled ? "not-allowed" : "pointer", transform: hover && !disabled ? "scale(1.06)" : "scale(1)", transition: "transform 200ms var(--ease), background 200ms" }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
        <path d="M5 12h13M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function PillInput({ value, onChange, onEnter, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder?: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <input ref={ref} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      style={{ flex: 1, padding: "26px 30px", fontSize: 24, fontWeight: 500, border: "1.5px solid var(--line)", borderRadius: 999, background: "#fff", transition: "border-color 200ms" }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--line)")} />
  );
}

function IdeaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ border: "1.5px solid var(--line)", borderRadius: 28, padding: "30px 34px", background: "#fff", transition: "border-color 200ms" }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--line)")}>
      <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>YOUR IDEA</div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        style={{ width: "100%", border: "none", fontSize: 30, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.02em" }} />
    </div>
  );
}

function NavFooter({ onBack, onNext, nextLabel = "Continue", nextDisabled, dark, hint }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean; dark?: boolean; hint?: string }) {
  const [hover, setHover] = useState(false);
  const ink = dark ? "#fff" : "var(--fg)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 52 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {onBack && (
          <button onClick={onBack} style={{ fontSize: 16, color: dark ? "rgba(255,255,255,0.55)" : "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H6M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
        )}
        {hint && <span className="mono" style={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.35)" : "var(--muted)" }}>{hint}</span>}
      </div>
      <button onClick={nextDisabled ? undefined : onNext} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} disabled={nextDisabled}
        style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "16px 16px 16px 30px", borderRadius: 999,
          background: nextDisabled ? (dark ? "rgba(255,255,255,0.12)" : "var(--line)") : ink,
          color: nextDisabled ? (dark ? "rgba(255,255,255,0.4)" : "var(--muted)") : dark ? "#0a0a0a" : "#fff",
          fontSize: 18, fontWeight: 600, cursor: nextDisabled ? "not-allowed" : "pointer",
          transform: hover && !nextDisabled ? "translateX(3px)" : "none", transition: "all 200ms var(--ease)" }}>
        {nextLabel}
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
    </div>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 64px", maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", animation: "fadeIn 360ms var(--ease)" }}>
      {children}
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────
function Hero({ state, set, onNext }: StepProps) {
  const go = () => { if (state.idea.trim()) onNext(); };
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "120px 48px 64px", maxWidth: 980, margin: "0 auto", animation: "fadeIn 400ms var(--ease)" }}>
      <div style={{ fontSize: 19, color: "var(--muted)", marginBottom: 28 }}>
        Your AI crew. One goal: <span style={{ color: "var(--accent)", fontWeight: 500 }}>your first sale.</span>
      </div>
      <Display size={104}>Give Cabana<br />an idea.</Display>
      <p style={{ fontSize: 24, color: "var(--muted)", lineHeight: 1.4, margin: "32px 0 56px", maxWidth: 620, textWrap: "balance" }}>
        Six agents research, build, market, and ship your idea — straight toward a paying customer.
      </p>
      <div style={{ display: "flex", gap: 14, width: "100%", maxWidth: 720, alignItems: "center" }}>
        <PillInput value={state.idea} onChange={(v) => set({ idea: v })} onEnter={go} placeholder="A paid community for…" autoFocus />
        <CircleArrow onClick={go} disabled={!state.idea.trim()} />
      </div>
      <div style={{ fontSize: 15, color: "var(--muted)", margin: "20px 0 44px" }}>Free to generate a preview. No card needed.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", maxWidth: 760 }}>
        {HERO_SUGGESTIONS.map((s) => (<Chip key={s} onClick={() => set({ idea: s })} active={state.idea === s}>{s}</Chip>))}
      </div>
    </div>
  );
}

function IdeaStep(p: StepProps) {
  return (
    <Stage>
      <Eyebrow>Step one — let&apos;s get it right</Eyebrow>
      <Display>This could be<br />the one.</Display>
      <p style={{ fontSize: 21, color: "var(--muted)", margin: "26px 0 40px", maxWidth: 620, lineHeight: 1.4 }}>
        Every business that ever mattered started as one sentence someone refused to let go of. Make yours sharp.
      </p>
      <IdeaField value={p.state.idea} onChange={(v) => p.set({ idea: v })} />
      <NavFooter onBack={p.onBack} onNext={p.onNext} nextDisabled={!p.state.idea.trim()} hint="Press it into one clear line" />
    </Stage>
  );
}

function WhyStep(p: StepProps) {
  const toggle = (v: string) => {
    const has = p.state.why.includes(v);
    p.set({ why: has ? p.state.why.filter((x) => x !== v) : [...p.state.why, v] });
  };
  return (
    <Stage>
      <Eyebrow>Step two — your why</Eyebrow>
      <Display>Why this?<br />Why now?</Display>
      <p style={{ fontSize: 21, color: "var(--muted)", margin: "26px 0 40px", maxWidth: 600, lineHeight: 1.4 }}>
        The crew works harder when it knows what&apos;s at stake. What does winning this actually change for you?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {WHY_OPTIONS.map((w, i) => (
          <div key={w} style={{ animation: `riseIn 420ms var(--ease) both`, animationDelay: `${i * 50}ms` }}>
            <Chip big active={p.state.why.includes(w)} onClick={() => toggle(w)}>{w}</Chip>
          </div>
        ))}
      </div>
      <NavFooter onBack={p.onBack} onNext={p.onNext} nextDisabled={!p.state.why.length} hint="Pick all that hit" />
    </Stage>
  );
}

function WhoStep(p: StepProps) {
  return (
    <Stage>
      <Eyebrow>Step three — the customer</Eyebrow>
      <Display>Who&apos;s it for?</Display>
      <p style={{ fontSize: 21, color: "var(--muted)", margin: "26px 0 40px", maxWidth: 620, lineHeight: 1.4 }}>
        Riches are in the niches. Name the exact person who&apos;ll happily pay — Scout takes it from there.
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "center", maxWidth: 720 }}>
        <PillInput value={p.state.niche} onChange={(v) => p.set({ niche: v })} onEnter={p.state.niche.trim() ? p.onNext : undefined} placeholder="e.g. beginner golfers who just bought clubs" autoFocus />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
        {NICHE_SUGGESTIONS.map((n) => (<Chip key={n} active={p.state.niche === n} onClick={() => p.set({ niche: n })}>{n}</Chip>))}
      </div>
      <NavFooter onBack={p.onBack} onNext={p.onNext} nextDisabled={!p.state.niche.trim()} />
    </Stage>
  );
}

function GoalStep(p: StepProps) {
  return (
    <Stage>
      <Eyebrow>Step four — the goal</Eyebrow>
      <Display>What does<br />winning look like?</Display>
      <p style={{ fontSize: 21, color: "var(--muted)", margin: "26px 0 38px", maxWidth: 600, lineHeight: 1.4 }}>
        Pick the number that makes you sit up straight. We&apos;ll reverse-engineer the path to it.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {GOAL_OPTIONS.map((g, i) => {
          const active = p.state.goal === g.v;
          return (
            <button key={g.v} onClick={() => p.set({ goal: g.v })}
              style={{ textAlign: "left", padding: "26px 24px", borderRadius: 20, border: `1.5px solid ${active ? "var(--fg)" : "var(--line)"}`, background: active ? "var(--fg)" : "transparent", color: active ? "#fff" : "var(--fg)", animation: `riseIn 420ms var(--ease) both`, animationDelay: `${i * 55}ms`, transition: "border-color 180ms" }}>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{g.label}</div>
              <div style={{ fontSize: 15, color: active ? "rgba(255,255,255,0.6)" : "var(--muted)", marginTop: 6 }}>{g.sub}</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 17, color: "var(--muted)" }}>First sale within</span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{p.state.days} days</span>
        </div>
        <input type="range" min={14} max={90} step={1} value={p.state.days} onChange={(e) => p.set({ days: +e.target.value })} style={{ width: "100%", accentColor: "var(--accent)" }} />
      </div>
      <NavFooter onBack={p.onBack} onNext={p.onNext} nextDisabled={!p.state.goal} />
    </Stage>
  );
}

function NameStep(p: StepProps) {
  return (
    <Stage>
      <Eyebrow>Step five — make it real</Eyebrow>
      <Display>Give it a name.</Display>
      <p style={{ fontSize: 21, color: "var(--muted)", margin: "26px 0 36px", maxWidth: 600, lineHeight: 1.4 }}>
        The moment it has a name, it stops being a maybe. Builder will put it on a live page in minutes.
      </p>
      <div style={{ maxWidth: 560 }}>
        <PillInput value={p.state.name} onChange={(v) => p.set({ name: v })} placeholder="Name your thing…" autoFocus />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {NAME_SEEDS.map((s) => (<Chip key={s} active={p.state.name === s} onClick={() => p.set({ name: s })}>{s}</Chip>))}
        </div>
      </div>
      <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 17, color: "var(--muted)", marginBottom: 16 }}>The vibe</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {VIBE_OPTIONS.map((v) => (<Chip key={v} big active={p.state.vibe === v} onClick={() => p.set({ vibe: v })}>{v}</Chip>))}
        </div>
      </div>
      <NavFooter onBack={p.onBack} onNext={p.onNext} nextDisabled={!p.state.name.trim() || !p.state.vibe} />
    </Stage>
  );
}

function CrewStep(p: StepProps) {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 64px", maxWidth: 1240, margin: "0 auto", width: "100%", animation: "fadeIn 500ms var(--ease)" }}>
      <Eyebrow dark>Meet your crew</Eyebrow>
      <Display dark size={92}>Six agents.<br />One goal.</Display>
      <p style={{ fontSize: 21, color: "rgba(255,255,255,0.55)", margin: "26px 0 50px", maxWidth: 600, lineHeight: 1.4 }}>
        They&apos;re briefed on {p.state.name || "your idea"} and ready. The second you say go, all six get to work — at once.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid rgba(255,255,255,0.12)", borderLeft: "1px solid rgba(255,255,255,0.12)" }}>
        {AGENTS.map((a, i) => (
          <div key={a.id} style={{ borderRight: "1px solid rgba(255,255,255,0.12)", borderBottom: "1px solid rgba(255,255,255,0.12)", padding: "30px 34px 38px", minHeight: 178, animation: `riseIn 480ms var(--ease) both`, animationDelay: `${i * 70}ms` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: a.color, display: "inline-block" }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{a.n}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: a.color, marginTop: 34, letterSpacing: "-0.02em" }}>{a.name}</div>
            <div style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{a.role}</div>
          </div>
        ))}
      </div>
      <NavFooter dark onBack={p.onBack} onNext={p.onNext} nextLabel="Wake the crew" />
    </div>
  );
}

function WakeStep(p: StepProps) {
  const q: Q = { segs: 3, price: p.state.goal || "$5K/mo", goal: p.state.goal || "$5K/mo", name: p.state.name || "your idea", niche: p.state.niche || "your niche" };
  const stepMs = 850, workMs = 1150;
  const [status, setStatus] = useState<Record<string, string>>({});
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    AGENTS.forEach((a, i) => {
      timers.push(setTimeout(() => setStatus((s) => ({ ...s, [a.id]: "working" })), 500 + i * stepMs));
      timers.push(setTimeout(() => setStatus((s) => ({ ...s, [a.id]: "done" })), 500 + i * stepMs + workMs));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const doneCount = AGENTS.filter((a) => status[a.id] === "done").length;
  const allDone = doneCount === AGENTS.length;
  const pct = Math.round((doneCount / AGENTS.length) * 100);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "112px 48px 56px", maxWidth: 1080, margin: "0 auto", width: "100%", animation: "fadeIn 500ms var(--ease)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <Eyebrow dark color={allDone ? "var(--strategist)" : "rgba(255,255,255,0.55)"}>{allDone ? "Lift-off complete" : "Lift-off — the crew is working"}</Eyebrow>
        <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{pct}%</span>
      </div>
      <Display dark size={76}>{allDone ? <>It&apos;s <span style={{ color: "var(--accent)" }}>alive.</span></> : <>Building {q.name}.</>}</Display>
      <div style={{ height: 4, background: "rgba(255,255,255,0.14)", borderRadius: 4, margin: "34px 0 8px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 4, transition: "width 600ms var(--ease)" }} />
      </div>
      <div style={{ marginTop: 18 }}>
        {AGENTS.map((a) => {
          const st = status[a.id] || "idle";
          const text = st === "done" ? resolve(a.done, q) : st === "working" ? resolve(a.wake, q) : "Standing by";
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 22, padding: "20px 4px", borderBottom: "1px solid rgba(255,255,255,0.1)", opacity: st === "idle" ? 0.4 : 1, transition: "opacity 400ms" }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", flex: "none", background: st === "idle" ? "rgba(255,255,255,0.25)" : a.color, boxShadow: st === "working" ? `0 0 0 6px ${a.color}22` : "none", animation: st === "working" ? "pulseGlow 1.1s ease-in-out infinite" : "none" }} />
              <span style={{ fontSize: 24, fontWeight: 700, color: st === "idle" ? "rgba(255,255,255,0.5)" : a.color, width: 168, letterSpacing: "-0.02em" }}>{a.name}</span>
              <span style={{ flex: 1, fontSize: 18, color: "rgba(255,255,255,0.7)" }}>{text}</span>
              <span style={{ width: 28, textAlign: "right" }}>
                {st === "done" ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={a.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : st === "working" ? (
                  <span className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>···</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 76, marginTop: 8 }}>
        {allDone && (
          <div style={{ animation: "riseIn 460ms var(--ease) both" }}>
            <NavFooter dark onBack={p.onBack} onNext={p.onNext} nextLabel="See your path to first sale" />
          </div>
        )}
      </div>
    </div>
  );
}

function RoadmapStep(p: StepProps & { onLaunch: () => void }) {
  const name = p.state.name || "Your idea";
  const goal = p.state.goal || "$5K/mo";
  const days = p.state.days;
  const milestones = [
    { d: "Day 1", t: "Landing page live", c: "var(--builder)" },
    { d: `Day ${Math.max(2, Math.round(days * 0.25))}`, t: "First 47 leads reached", c: "var(--seller)" },
    { d: `Day ${Math.max(3, Math.round(days * 0.55))}`, t: "Content engine running", c: "var(--creator)" },
    { d: `Day ${days}`, t: "Your first sale", c: "var(--accent)" },
  ];
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "112px 48px 56px", maxWidth: 1080, margin: "0 auto", width: "100%", animation: "fadeIn 500ms var(--ease)" }}>
      <Eyebrow dark>The path — {name}</Eyebrow>
      <Display dark size={80}>Your first sale is<br /><span style={{ color: "var(--accent)" }}>{days} days away.</span></Display>
      <p style={{ fontSize: 21, color: "rgba(255,255,255,0.55)", margin: "26px 0 50px", maxWidth: 600, lineHeight: 1.4 }}>
        Six agents, one plan, aimed at {goal}. You bring the decisions. They bring the work.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, marginBottom: 56 }}>
        {milestones.map((m, i) => (
          <div key={i} style={{ position: "relative", paddingRight: 24, animation: "riseIn 460ms var(--ease) both", animationDelay: `${i * 90}ms` }}>
            <div style={{ height: 2, background: "rgba(255,255,255,0.15)", marginBottom: 22, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, top: -5, width: 12, height: 12, borderRadius: "50%", background: m.c }} />
            </div>
            <div className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>{m.d}</div>
            <div style={{ fontSize: 21, fontWeight: 600, color: i === milestones.length - 1 ? m.c : "#fff", lineHeight: 1.2 }}>{m.t}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <PrimaryCTA label="Claim your crew" onClick={p.onLaunch} />
        <button onClick={p.onBack} style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>Back</button>
        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>Free preview ready · No card needed</span>
      </div>
    </div>
  );
}

function PrimaryCTA({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "20px 22px 20px 34px", borderRadius: 999, background: "#fff", color: "#0a0a0a", fontSize: 20, fontWeight: 600, transform: h ? "translateY(-2px)" : "none", boxShadow: h ? "0 14px 40px rgba(255,255,255,0.18)" : "none", transition: "all 220ms var(--ease)" }}>
      {label}
      <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </button>
  );
}

// ─── Design tokens + keyframes (ported from index.html :root) ────────────────
function OnboardingStyles() {
  return (
    <style>{`
      [style*="--accent"] {
        --fg: #0a0a0a; --muted: #8a8a8a; --line: #e6e6e6;
        --scout: #16A9CE; --strategist: #16E06A; --builder: #F5C84A;
        --seller: #D9C6A3; --creator: #2B4FB8; --analyst: #19C6E6;
        --maxw: 1120px; --ease: cubic-bezier(0.22, 1, 0.36, 1);
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      }
      .mono { font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
      .scroll { scrollbar-width: thin; }
      .scroll::-webkit-scrollbar { width: 8px; }
      .scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 8px; }
      @keyframes riseIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 0 6px rgba(255,255,255,0.06); } }
    `}</style>
  );
}
