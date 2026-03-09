"use client"

import { useState } from "react"
import { RevealOnScroll } from "./RevealOnScroll"

interface Feature {
  icon: string
  title: string
  desc: string
  ai?: boolean
  aiLabel?: string
}

interface ModuleData {
  id: string
  name: string
  pills: { label: string; style: string }[]
  title: string
  description: string
  features: Feature[]
  screen: {
    title: string
    content: React.ReactNode
  }
}

function ScreenShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-z-card border border-z-border rounded-[14px] overflow-hidden">
      <div className="bg-z-deep border-b border-z-border px-4 py-3 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-z-red" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f9c84c]" />
        <div className="w-2.5 h-2.5 rounded-full bg-z-green" />
        <span className="ml-2 font-code text-xs text-z-muted">{title}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function ScoreBar({ label, value, color = "gold" }: { label: string; value: number; color?: string }) {
  const bg =
    color === "green"
      ? "bg-gradient-to-r from-[#2eb87a] to-z-green"
      : color === "red"
        ? "bg-gradient-to-r from-[#d04030] to-z-red"
        : "bg-gradient-to-r from-z-gold to-z-gold-light"
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-z-muted">{label}</span>
        <span className="text-z-text font-semibold font-code">{value}%</span>
      </div>
      <div className="h-1.5 bg-z-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${bg}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function AIInsight({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 p-3 bg-z-deep rounded-lg border border-[rgba(201,168,76,0.2)]">
      <div className="text-[11px] text-z-gold font-bold mb-1">⚡ {title}</div>
      <div className="text-xs text-z-muted leading-[1.6]">{text}</div>
    </div>
  )
}

const modules: ModuleData[] = [
  {
    id: "M01",
    name: "Idea Validation",
    pills: [
      { label: "Idea Stage", style: "border-[rgba(62,207,142,0.4)] text-z-green bg-[rgba(62,207,142,0.08)]" },
      { label: "Pre-Seed", style: "border-[rgba(79,156,249,0.4)] text-z-blue bg-[rgba(79,156,249,0.08)]" },
    ],
    title: "Idea & Market Validation",
    description: "Validate your business concept before investing a single dirham in legal structures or product development. A Validation Score ≥ 60% unlocks Module 02.",
    features: [
      { icon: "🧠", title: "Idea Stress-Test Engine", desc: "AI generates 5 sharp objections to your idea. You respond. AI evaluates quality and flags weak areas.", ai: true },
      { icon: "📊", title: "Market Sizing Tool", desc: "Input your industry & geography. Tool auto-populates TAM/SAM/SOM with source citations from live data.", ai: true, aiLabel: "STATISTA API" },
      { icon: "🗺️", title: "Competitive Landscape Map", desc: "Interactive drag-and-drop quadrant. Name your competitors, AI auto-enriches with additional players." },
      { icon: "👥", title: "ICP & Persona Builder", desc: "AI generates Ideal Customer Profiles. Founder reviews, edits, and confirms. Feeds into M03 automatically.", ai: true },
      { icon: "🎯", title: "Validation Scorecard", desc: "Animated radar chart across 8 dimensions. Click any axis for specific AI improvement tips.", ai: true },
    ],
    screen: {
      title: "Validation Scorecard — Mohamed's Startup",
      content: (
        <>
          <div className="text-center mb-4">
            <div className="text-[13px] text-z-muted mb-1">Overall Validation Score</div>
            <div className="font-display text-5xl font-bold text-z-green">73<span className="text-xl">%</span></div>
            <div className="inline-flex items-center gap-1.5 bg-[rgba(62,207,142,0.12)] text-z-green border border-[rgba(62,207,142,0.3)] px-3.5 py-1 rounded-full text-xs font-bold mt-2">
              ✓ MODULE 02 UNLOCKED
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <ScoreBar label="Problem Clarity" value={88} color="green" />
            <ScoreBar label="Market Size" value={75} />
            <ScoreBar label="Competitive Moat" value={62} />
            <ScoreBar label="ICP Clarity" value={80} color="green" />
            <ScoreBar label="Revenue Potential" value={70} />
            <ScoreBar label="Founder-Market Fit" value={48} color="red" />
          </div>
          <AIInsight
            title="AI COACH INSIGHT"
            text="Founder-Market Fit is your lowest dimension. Consider documenting your personal domain experience in this market to strengthen this score before proceeding."
          />
        </>
      ),
    },
  },
  {
    id: "M02",
    name: "Legal Structure",
    pills: [{ label: "All Stages", style: "border-z-border text-z-muted bg-z-card" }],
    title: "Legal Structure Engine",
    description: "Context-aware from day one. Covers 30+ MENA & global jurisdictions. Re-engaged at Scale and Pre-Exit stages for holdco restructuring and exit optimisation.",
    features: [
      { icon: "🌍", title: "Jurisdiction Intelligence", desc: "Side-by-side comparison of 30+ countries. Visual card grid with trust score badges — not a raw table." },
      { icon: "🏢", title: "Entity Recommendation Engine", desc: "AI analyses your profile and recommends entity type with confidence score and full rationale.", ai: true },
      { icon: "🏗️", title: "Holding Structure Wizard", desc: "3–4 questions to determine if a holdco layer is needed. Outputs a live org chart diagram.", ai: true },
      { icon: "📄", title: "Document Generation Suite", desc: "SHA, MOA/AOA, NDA, vesting agreements — auto-filled with your profile data and DocuSign e-signature." },
      { icon: "📅", title: "Legal Roadmap", desc: "Horizontal timeline showing legal structure evolution from now to exit. Each stage is interactive." },
    ],
    screen: {
      title: "Jurisdiction Comparison — M02",
      content: (
        <>
          <div className="text-xs text-z-muted mb-3.5">
            AI Recommendation based on your profile:{" "}
            <span className="text-z-gold font-semibold">UAE + BVI Holdco Structure</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { flag: "🇦🇪", name: "UAE — DIFC", sub: "Common law, VC-friendly", score: 92, rec: true },
              { flag: "🇻🇬", name: "BVI", sub: "Holdco layer — tax neutral", score: 88, rec: false },
              { flag: "🇸🇦", name: "Saudi Arabia", sub: "LLC — MISA licensed", score: 78, rec: false },
              { flag: "🇧🇭", name: "Bahrain", sub: "Startup-friendly, low cost", score: 72, rec: false },
            ].map((j) => (
              <div
                key={j.name}
                className={`rounded-[10px] p-3.5 border transition-colors duration-300 ${
                  j.rec ? "bg-z-gold-dim border-z-gold" : "bg-z-deep border-z-border hover:border-z-gold"
                }`}
              >
                <div className="text-[22px] mb-2">{j.flag}</div>
                <div className="text-[13px] font-bold text-z-text mb-0.5">{j.name}</div>
                <div className="text-[11px] text-z-muted mb-2.5">{j.sub}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-z-gold font-semibold font-code">
                  <div className="flex-1 h-[3px] bg-z-border rounded-full overflow-hidden">
                    <div className="h-full bg-z-gold rounded-full" style={{ width: `${j.score}%` }} />
                  </div>
                  {j.score}
                </div>
              </div>
            ))}
          </div>
          <AIInsight
            title="ENTITY RECOMMENDATION · 91% CONFIDENCE"
            text="BVI Holdco → UAE DIFC OpCo. Best structure for your VC fundraising horizon and MENA ops."
          />
        </>
      ),
    },
  },
  {
    id: "M03",
    name: "GTM & Brand",
    pills: [
      { label: "Pre-Seed", style: "border-[rgba(79,156,249,0.4)] text-z-blue bg-[rgba(79,156,249,0.08)]" },
      { label: "Seed", style: "border-[rgba(79,156,249,0.4)] text-z-blue bg-[rgba(79,156,249,0.08)]" },
      { label: "Early Growth", style: "border-[rgba(155,111,247,0.4)] text-z-purple bg-[rgba(155,111,247,0.08)]" },
    ],
    title: "GTM, Brand & Marketing",
    description: "The full commercial layer. How your business reaches customers, at what price, with what identity, and through what channel — in Arabic and English.",
    features: [
      { icon: "📡", title: "GTM Strategy Builder", desc: "AI recommends primary and secondary channels as visual cards with effort/impact scoring.", ai: true },
      { icon: "💰", title: "Pricing Strategy & LTV/CAC Simulator", desc: "Drag a slider, watch your LTV, CAC, and payback period update in real-time across 3 pricing models." },
      { icon: "🎨", title: "Brand Identity Wizard", desc: "AI generates brand name options, positioning statements, and tone-of-voice guidelines conversationally.", ai: true },
      { icon: "📅", title: "AI Content Calendar Engine", desc: "First 30 days of bilingual (AR/EN) content. LinkedIn, Instagram, email — all formatted per platform.", ai: true, aiLabel: "BILINGUAL AR/EN" },
    ],
    screen: {
      title: "Content Calendar — Week 1 Preview",
      content: (
        <div className="flex flex-col gap-2">
          {[
            { day: "MON · D1", platform: "💼", copy: "We're building the operating system for MENA founders. The problem isn't ambition — it's fragmentation.", ar: "نحن نبني نظام التشغيل لمؤسسي منطقة الشرق الأوسط وشمال أفريقيا." },
            { day: "WED · D3", platform: "📸", copy: "3 things every founder gets wrong in their first 90 days — and how to avoid them.", ar: "3 أشياء يخطئ بها كل مؤسس في أول 90 يوماً." },
            { day: "FRI · D5", platform: "📧", copy: "Subject: Your idea just passed validation — here's what's next.", ar: "فكرتك اجتازت التحقق، إليك ما يلي." },
          ].map((item) => (
            <div key={item.day} className="bg-z-deep border border-z-border rounded-lg p-3 flex items-start gap-3 hover:border-z-gold transition-colors duration-200">
              <span className="font-code text-[10px] text-z-muted bg-z-border px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                {item.day}
              </span>
              <span className="text-sm">{item.platform}</span>
              <div className="flex-1">
                <div className="text-xs text-z-text leading-[1.5]">{item.copy}</div>
                <div className="text-[11px] text-z-muted mt-1 italic" dir="rtl">{item.ar}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  },
  {
    id: "M04",
    name: "MVP & Launch",
    pills: [
      { label: "Pre-Seed", style: "border-[rgba(79,156,249,0.4)] text-z-blue bg-[rgba(79,156,249,0.08)]" },
      { label: "Seed", style: "border-[rgba(79,156,249,0.4)] text-z-blue bg-[rgba(79,156,249,0.08)]" },
    ],
    title: "MVP & Soft Launch",
    description: "Bridge the gap between validated idea and live product. Scoping, tech stack, dev partner sourcing, and a structured soft-launch playbook — all in one place.",
    features: [
      { icon: "🎯", title: "MVP Scoping Canvas (RICE + MoSCoW)", desc: "Kanban-style drag-and-drop. Features auto-ranked by RICE score. AI assists prioritisation.", ai: true },
      { icon: "⚙️", title: "Tech Stack Recommender", desc: "Answer 5 questions. AI recommends your stack with cost estimates, pros/cons, and learning curve scores.", ai: true },
      { icon: "🤝", title: "Dev Partner Marketplace", desc: "Matched vetted dev partners. Brief sent in-platform. Escrow via Stripe Connect milestone payments." },
      { icon: "✅", title: "100-Item Launch Checklist", desc: "Grouped by category with a progress ring per category. Module completes when ≥ 90% is done." },
    ],
    screen: {
      title: "MVP Feature Prioritisation — RICE Scores",
      content: (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs text-z-muted">Must Have — 8 features ranked</div>
            <div className="text-[11px] bg-[rgba(62,207,142,0.12)] text-z-green border border-[rgba(62,207,142,0.3)] px-2.5 py-0.5 rounded-full">AI Sorted ✓</div>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { rank: "#1", label: "User Authentication & Onboarding", score: 940, pct: 100 },
              { rank: "#2", label: "Service Booking Flow", score: 790, pct: 84 },
              { rank: "#3", label: "Provider Profile & Availability", score: 700, pct: 74 },
              { rank: "#4", label: "In-App Payment (Stripe)", score: 595, pct: 63 },
              { rank: "#5", label: "Reviews & Ratings System", score: 490, pct: 52 },
              { rank: "#6", label: "AI Chatbot Support", score: 380, pct: 40 },
            ].map((item, i) => (
              <div key={item.rank} className="bg-z-deep border border-z-border rounded-lg px-3.5 py-3 flex items-center gap-3" style={{ opacity: i >= 4 ? (i >= 5 ? 0.35 : 0.5) : 1 }}>
                <span className="font-code text-[11px] text-z-gold w-5 text-center shrink-0">{item.rank}</span>
                <span className="flex-1 text-[13px] text-z-text">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-15 h-1 bg-z-border rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-z-gold to-z-gold-light rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                  <span className="font-code text-[11px] text-z-muted w-7 text-right">{item.score}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  },
  {
    id: "M05",
    name: "Automation & ERP",
    pills: [
      { label: "Seed", style: "border-[rgba(79,156,249,0.4)] text-z-blue bg-[rgba(79,156,249,0.08)]" },
      { label: "Early Growth", style: "border-[rgba(155,111,247,0.4)] text-z-purple bg-[rgba(155,111,247,0.08)]" },
      { label: "Scale", style: "border-[rgba(201,168,76,0.4)] text-z-gold bg-[rgba(201,168,76,0.08)]" },
    ],
    title: "Automation & ERP Readiness",
    description: "Operationalise your business. Automate key workflows and integrate with Zoho or Odoo. Your company becomes a machine — not a manual process.",
    features: [
      { icon: "📊", title: "ERP Readiness Assessment", desc: "40-question assessment across 8 operational areas. Score ≥ 70% unlocks the ERP Config Wizard." },
      { icon: "🔄", title: "Process Automation Builder", desc: "Visual flow diagram with drag-and-drop trigger → action → condition blocks. Connects to Make & Zapier." },
      { icon: "💹", title: "Financial Model + Scenario Engine", desc: "Spreadsheet-like P&L, cash flow, balance sheet. Adjust assumptions with sliders for instant scenario modelling." },
      { icon: "📋", title: "SOP Generator", desc: "AI generates function-specific SOPs pre-loaded in a rich text editor. Assign to team members in-platform.", ai: true },
    ],
    screen: {
      title: "KPI Command Center — Live Operations",
      content: (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Monthly Revenue", value: "$42k", change: "↑ 18% vs last month", up: true },
              { label: "CAC", value: "$38", change: "↓ 12% improvement", up: true },
              { label: "Churn Rate", value: "3.2%", change: "↑ 0.4% above target", up: false },
              { label: "LTV/CAC Ratio", value: "4.8x", change: "✓ Healthy threshold", up: true },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-z-deep border border-z-border rounded-[10px] p-3.5">
                <div className="text-[11px] text-z-muted mb-1.5">{kpi.label}</div>
                <div className="font-display text-[26px] font-bold text-z-white">{kpi.value}</div>
                <div className={`text-[11px] mt-1 font-semibold ${kpi.up ? "text-z-green" : "text-z-red"}`}>
                  {kpi.change}
                </div>
              </div>
            ))}
          </div>
          <AIInsight
            title="ERP READINESS: 82% — WIZARD UNLOCKED"
            text="Zoho CRM configuration wizard is now active. 3 automation workflows pending setup."
          />
        </>
      ),
    },
  },
  {
    id: "M06",
    name: "Scale & Exit",
    pills: [
      { label: "Early Growth", style: "border-[rgba(155,111,247,0.4)] text-z-purple bg-[rgba(155,111,247,0.08)]" },
      { label: "Scale", style: "border-[rgba(201,168,76,0.4)] text-z-gold bg-[rgba(201,168,76,0.08)]" },
      { label: "Pre-Exit", style: "border-[rgba(201,168,76,0.4)] text-z-gold bg-[rgba(201,168,76,0.08)]" },
    ],
    title: "Scale & Exit Planning",
    description: "Board-level strategic guidance. From investor readiness and pitch decks to M&A data rooms and valuation modelling — the AI Coach reaches its highest-value mode here.",
    features: [
      { icon: "🗺️", title: "Exit Strategy Modeler", desc: "AI recommends M&A vs IPO path as a visual journey map with milestones and decision points.", ai: true },
      { icon: "💎", title: "Valuation Modeler", desc: "Indicative range (Low / Base / High) with the key assumptions driving each figure — not a single opaque number.", ai: true },
      { icon: "📊", title: "Pitch Deck Builder", desc: "15-slide structure pre-loaded with AI content from your platform data. Live preview. Export as PPTX and PDF.", ai: true },
      { icon: "🗂️", title: "M&A Data Room", desc: "File tree with drag-and-drop upload. Standard M&A taxonomy auto-applied. Signed URL sharing with expiry controls." },
    ],
    screen: {
      title: "Valuation Modeler — Series A Profile",
      content: (
        <>
          <div className="mb-4">
            <div className="text-xs text-z-muted mb-1">Indicative Valuation Range</div>
            <div className="font-display text-[32px] font-bold text-z-white">$4.2M — $9.8M</div>
            <div className="text-[11px] text-z-muted mt-1">Based on SaaS 6–8x ARR multiple · MENA Market</div>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: "Conservative (4x ARR)", value: "$4.2M", pct: 35, color: "bg-z-red" },
              { label: "Base Case (6.5x ARR)", value: "$6.8M", pct: 60, color: "bg-z-gold" },
              { label: "Optimistic (9x ARR)", value: "$9.8M", pct: 85, color: "bg-z-green" },
            ].map((v) => (
              <div key={v.label}>
                <div className="flex justify-between mb-1 text-xs">
                  <span className="text-z-muted">{v.label}</span>
                  <span className="text-z-text font-bold font-code">{v.value}</span>
                </div>
                <div className="h-2 bg-z-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${v.color}`} style={{ width: `${v.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <AIInsight
            title="INVESTOR READINESS: 68%"
            text="2 critical gaps: board structure documentation and audited financials. AI Coach has a remediation plan ready."
          />
        </>
      ),
    },
  },
]

export function Modules() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section id="modules" className="py-16 md:py-[100px] px-6 md:px-15 max-w-[1300px] mx-auto">
      <RevealOnScroll>
        <div className="font-code text-[11px] font-bold tracking-[2.5px] uppercase text-z-gold mb-4">
          Platform Modules
        </div>
        <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold text-z-white leading-[1.1] tracking-[-1px]">
          Six Modules.<br />Every Founder Need.
        </h2>
        <p className="text-[17px] text-z-muted leading-[1.7] max-w-[520px] mt-4 font-light">
          From validating your idea to structuring your exit — every module is AI-first and stage-aware.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mt-12 border-b border-z-border overflow-x-auto scrollbar-hide">
          {modules.map((mod, i) => (
            <button
              key={mod.id}
              onClick={() => setActiveTab(i)}
              className={`px-4 md:px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap flex items-center gap-2 rounded-t border-b-2 transition-all duration-200 bg-transparent border-l-0 border-r-0 border-t-0 font-body cursor-pointer ${
                activeTab === i
                  ? "text-z-gold border-b-z-gold"
                  : "text-z-muted border-b-transparent hover:text-z-text"
              }`}
            >
              <span
                className={`font-code text-[10px] px-1.5 py-0.5 rounded ${
                  activeTab === i ? "bg-z-gold-dim text-z-gold" : "bg-z-border text-z-muted"
                }`}
              >
                {mod.id}
              </span>
              <span className="hidden sm:inline">{mod.name}</span>
            </button>
          ))}
        </div>

        {/* Panels */}
        {modules.map((mod, i) => (
          <div
            key={mod.id}
            className={`mt-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${
              activeTab === i ? "block" : "hidden"
            }`}
          >
            {/* Info */}
            <div>
              <div className="flex gap-2 mb-5 flex-wrap">
                {mod.pills.map((pill) => (
                  <span
                    key={pill.label}
                    className={`text-[11px] font-semibold px-3 py-1 rounded-full border tracking-[0.3px] ${pill.style}`}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
              <h3 className="font-display text-[30px] font-bold text-z-white leading-[1.2] mb-4">{mod.title}</h3>
              <p className="text-[15px] text-z-muted leading-[1.75] mb-7">{mod.description}</p>
              <div className="flex flex-col gap-2.5">
                {mod.features.map((feat) => (
                  <div
                    key={feat.title}
                    className="flex items-start gap-3 p-3.5 bg-z-card border border-z-border rounded-lg hover:border-z-gold transition-colors duration-200"
                  >
                    <div className="w-8 h-8 rounded-md bg-z-gold-dim flex items-center justify-center text-base shrink-0">
                      {feat.icon}
                    </div>
                    <div>
                      <h5 className="text-[13px] font-semibold text-z-text mb-0.5">{feat.title}</h5>
                      <p className="text-xs text-z-muted leading-[1.5]">{feat.desc}</p>
                      {feat.ai && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[rgba(201,168,76,0.12)] text-z-gold border border-[rgba(201,168,76,0.3)] px-1.5 py-0.5 rounded-full mt-1 tracking-[0.5px]">
                          ⚡ {feat.aiLabel || "AI-POWERED"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Screen */}
            <ScreenShell title={mod.screen.title}>{mod.screen.content}</ScreenShell>
          </div>
        ))}
      </RevealOnScroll>
    </section>
  )
}
