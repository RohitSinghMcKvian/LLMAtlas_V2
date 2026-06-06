"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail, Building2, Github, Twitter,
  MessageCircle, Linkedin, Copy, Check, Send,
  ChevronDown, Sparkles, Zap, Globe,
  Clock, Shield, ArrowRight, Code2,
  HeartHandshake, Bug, Lightbulb, Newspaper,
  AlertCircle, Star, Users, MessageSquare,
  ExternalLink, Info, Phone,
} from "lucide-react";
import { HexMark } from "@/components/brand/logo";
import { MainNav } from "@/components/landing/main-nav";
import { LandingFooter } from "@/components/landing/footer";
import { cn } from "@/lib/utils";

/* ── Zod schema ─────────────────────────────────────────────────────────── */

const contactSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
  priority: z.enum(["low", "medium", "high"]),
});

type ContactFormData = z.infer<typeof contactSchema>;

/* ── Data ───────────────────────────────────────────────────────────────── */

const CONTACT_CHANNELS = [
  {
    id: "general",
    label: "General Inquiries",
    email: "hello@llmatlas.com",
    description: "Questions, feedback, and general conversation about LLMAtlas.",
    icon: Mail,
    iconBg: "bg-sky-500",
    glowRgb: "14, 165, 233",
    borderHover: "group-hover:border-sky-500/30",
    bgHover: "group-hover:bg-sky-500/5",
    badgeCls: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    responseTime: "< 24 hrs",
  },
  {
    id: "enterprise",
    label: "Enterprise & Partnerships",
    email: "partnerships@llmatlas.com",
    description: "Custom contracts, white-label, SSO, and enterprise SLAs.",
    icon: Building2,
    iconBg: "bg-violet-500",
    glowRgb: "139, 92, 246",
    borderHover: "group-hover:border-violet-500/30",
    bgHover: "group-hover:bg-violet-500/5",
    badgeCls: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    responseTime: "< 4 hrs",
  },
  {
    id: "support",
    label: "Technical Support",
    email: "support@llmatlas.com",
    description: "Bug reports, API issues, and hands-on technical help.",
    icon: Code2,
    iconBg: "bg-amber-500",
    glowRgb: "245, 158, 11",
    borderHover: "group-hover:border-amber-500/30",
    bgHover: "group-hover:bg-amber-500/5",
    badgeCls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    responseTime: "< 8 hrs",
  },
  {
    id: "press",
    label: "Press & Media",
    email: "press@llmatlas.com",
    description: "Media kits, interviews, analyst briefings, and press coverage.",
    icon: Newspaper,
    iconBg: "bg-emerald-500",
    glowRgb: "16, 185, 129",
    borderHover: "group-hover:border-emerald-500/30",
    bgHover: "group-hover:bg-emerald-500/5",
    badgeCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    responseTime: "< 12 hrs",
  },
];

const SOCIAL_LINKS = [
  {
    label: "GitHub",
    handle: "github.com/llmatlas",
    href: "https://github.com",
    icon: Github,
    description: "Star us, fork, and contribute",
    badge: "Open Source",
    hoverCls: "hover:border-white/25 hover:bg-white/5 hover:text-white",
  },
  {
    label: "Discord",
    handle: "Community Server",
    href: "#",
    icon: MessageCircle,
    description: "2,000+ developers, live chat",
    badge: "2k+ members",
    hoverCls: "hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-indigo-300",
  },
  {
    label: "Twitter / X",
    handle: "@llmatlas",
    href: "#",
    icon: Twitter,
    description: "Model updates, AI news, releases",
    badge: "Follow",
    hoverCls: "hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-sky-300",
  },
  {
    label: "LinkedIn",
    handle: "LLMAtlas",
    href: "#",
    icon: Linkedin,
    description: "Company news and team updates",
    badge: "Connect",
    hoverCls: "hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-300",
  },
];

const CATEGORIES = [
  { value: "general",     label: "General",     icon: MessageSquare  },
  { value: "enterprise",  label: "Enterprise",  icon: Building2      },
  { value: "bug",         label: "Bug Report",  icon: Bug            },
  { value: "feature",     label: "Feature Req", icon: Lightbulb      },
  { value: "partnership", label: "Partnership", icon: HeartHandshake },
  { value: "press",       label: "Press",       icon: Newspaper      },
  { value: "security",    label: "Security",    icon: Shield         },
  { value: "other",       label: "Other",       icon: Info           },
];

const RESPONSE_ROWS = [
  { label: "General inquiries",   time: "< 24 hours", dotCls: "bg-sky-400"     },
  { label: "Enterprise / Sales",  time: "< 4 hours",  dotCls: "bg-violet-400"  },
  { label: "Technical support",   time: "< 8 hours",  dotCls: "bg-amber-400"   },
  { label: "Critical / Security", time: "< 1 hour",   dotCls: "bg-red-400"     },
];

const FAQS = [
  {
    q: "Is LLMAtlas really free?",
    a: "Yes — the core platform, playground, compare lab, model tracker, and learning paths are free forever. We believe open-source AI tooling should be accessible to everyone. Optional paid plans are available for teams and enterprises that need advanced features, SSO, or dedicated support.",
  },
  {
    q: "Which AI providers and models are supported?",
    a: "LLMAtlas supports 195+ models across 13 providers including Groq, DeepSeek, Google AI, NVIDIA NIM, Mistral, Together AI, Cerebras, OpenRouter, xAI (Grok), Cloudflare AI, Hugging Face, Pollinations, and GitHub Models. New providers and models are added continuously.",
  },
  {
    q: "Can I use my own API keys?",
    a: "Absolutely. LLMAtlas is a bring-your-own-key (BYOK) platform by design. Your API keys are stored securely in your browser's local storage and are never transmitted to our servers. You pay providers directly for usage — we don't mark up tokens.",
  },
  {
    q: "Do you offer enterprise contracts or SLAs?",
    a: "Yes. For organizations that need custom SLAs, dedicated support channels, SSO integration, audit logs, or white-label deployments, reach out to partnerships@llmatlas.com. Enterprise inquiries are typically acknowledged within 4 hours with a call scheduled same-day.",
  },
  {
    q: "How can I contribute to LLMAtlas?",
    a: "We welcome all contributions — code, documentation, translations, model data, and bug reports. LLMAtlas is MIT-licensed and open source on GitHub. Check our CONTRIBUTING.md for coding standards, branch conventions, and the PR process. First-time contributors are especially welcome.",
  },
  {
    q: "How do I report a security vulnerability?",
    a: "Please do NOT file public GitHub issues for security vulnerabilities. Email security@llmatlas.com instead with a detailed description. We follow responsible disclosure, acknowledge reports within 24 hours, and provide patch timelines within 72 hours. We credit all responsible disclosures in our security hall of fame.",
  },
  {
    q: "Can I self-host LLMAtlas?",
    a: "Yes! LLMAtlas is MIT-licensed, so you can clone the repo and self-host it entirely. Instructions are in the README. For enterprise self-hosting with commercial support, SLA guarantees, and managed updates, contact partnerships@llmatlas.com.",
  },
];

const HERO_STATS = [
  { value: "< 24h",  label: "Avg. response",      icon: Clock,         color: "text-sky-400"     },
  { value: "195+",   label: "Models tracked",     icon: Zap,           color: "text-amber-400"   },
  { value: "2k+",    label: "Community members",  icon: Users,         color: "text-violet-400"  },
  { value: "MIT",    label: "Open source",        icon: Shield,        color: "text-emerald-400" },
];

/* ── Shared animation variants ──────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

function FloatingOrb({
  color, size, style,
}: {
  color: string; size: number; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none select-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        ...style,
      }}
      animate={{ y: [0, -22, 0], x: [0, 14, 0] }}
      transition={{ duration: 13 + size / 100, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.button
      onClick={copy}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 border shrink-0",
        copied
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
          : "bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-white/10 hover:text-white/70 hover:border-white/20",
      )}
      whileTap={{ scale: 0.93 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="ok"
            className="flex items-center gap-1"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
          >
            <Check className="h-3 w-3" />
            Copied!
          </motion.span>
        ) : (
          <motion.span
            key="cp"
            className="flex items-center gap-1"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
          >
            <Copy className="h-3 w-3" />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.055 }}
      className={cn(
        "rounded-2xl border overflow-hidden transition-colors duration-200",
        open ? "border-white/[0.12]" : "border-white/[0.06] hover:border-white/[0.10]",
      )}
    >
      <button
        className="w-full flex items-start justify-between gap-5 px-6 py-5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-medium text-white/85 leading-relaxed">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="shrink-0 mt-0.5"
        >
          <ChevronDown className="h-4 w-4 text-white/35" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-white/45 leading-relaxed border-t border-white/[0.05] pt-4">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main Contact Page ───────────────────────────────────────────────────── */

export default function ContactPage() {
  const formSectionRef = useRef<HTMLDivElement>(null);
  const formInView = useInView(formSectionRef, { once: true, margin: "-80px" });

  const [submitted, setSubmitted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { priority: "medium" },
  });

  async function onSubmit(_data: ContactFormData) {
    await new Promise((r) => setTimeout(r, 1600));
    setSubmitted(true);
    reset();
    setCharCount(0);
    setSelectedCategory("");
    setPriority("medium");
  }

  function resetForm() {
    setSubmitted(false);
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "hsl(260 87% 3%)", color: "hsl(40 6% 95%)" }}
    >
      <MainNav />

      {/* ─────────────────────────────────────── HERO ── */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <FloatingOrb color="hsl(217 91% 60% / 0.20)" size={720} style={{ top: "-18%", left: "8%"  }} />
          <FloatingOrb color="hsl(258 90% 66% / 0.14)" size={520} style={{ top: "15%",  right: "3%" }} />
          <FloatingOrb color="hsl(38 92% 50% / 0.09)"  size={380} style={{ bottom: "-5%", left: "45%" }} />
        </div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 80% 65% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 65% at 50% 50%, black, transparent)",
          }}
        />

        {/* Shimmer top line */}
        <div className="absolute top-0 inset-x-0 h-px overflow-hidden">
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(217 91% 60% / 0.9) 30%, hsl(258 90% 66% / 0.9) 50%, hsl(38 92% 50% / 0.9) 70%, transparent 100%)",
            }}
          />
        </div>

        <div className="container relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.10] bg-white/[0.04] text-sm text-white/55 mb-8 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <MessageSquare className="h-3.5 w-3.5" />
            We respond to every message — usually within 24 hours
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.08 }}
            className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            Let&apos;s{" "}
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(199 89% 60%) 0%, hsl(217 91% 65%) 30%, hsl(258 90% 70%) 60%, hsl(38 92% 60%) 100%)",
              }}
            >
              Build
            </span>{" "}
            Together
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.17 }}
            className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Whether you&apos;re exploring a partnership, need technical help, want to contribute
            to open source, or just have a question — we&apos;re a message away.
          </motion.p>

          {/* Hero stats */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {HERO_STATS.map(({ value, label, icon: Icon, color }) => (
              <motion.div key={label} variants={fadeUp} className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-sm font-bold text-white">{value}</span>
                <span className="text-sm text-white/35">{label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mt-14 flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1.5 text-white/20 text-xs font-medium tracking-widest uppercase"
            >
              <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              scroll
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────── CONTACT CHANNELS ── */}
      <section className="relative py-6">
        <div className="container px-4">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25 mb-8"
          >
            Four ways to reach us
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {CONTACT_CHANNELS.map((ch, i) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.09 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={cn(
                  "group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 overflow-hidden cursor-default transition-all duration-300",
                  ch.borderHover, ch.bgHover,
                )}
                style={{ "--glow": `rgba(${ch.glowRgb}, 0.18)` } as React.CSSProperties}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-2xl"
                  style={{ boxShadow: `0 12px 40px -12px rgba(${ch.glowRgb}, 0.35)` }}
                />

                {/* Top-right glow spot */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle, rgba(${ch.glowRgb}, 0.25) 0%, transparent 70%)`, transform: "translate(40%, -40%)" }}
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-5 shadow-lg", ch.iconBg)}>
                    <ch.icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Label */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-1.5">
                    {ch.label}
                  </p>

                  {/* Email */}
                  <p className="text-sm font-mono text-white/75 mb-2.5 break-all">{ch.email}</p>

                  {/* Description */}
                  <p className="text-xs text-white/38 leading-relaxed mb-5">{ch.description}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", ch.badgeCls)}>
                      ⚡ {ch.responseTime}
                    </span>
                    <CopyEmailButton email={ch.email} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── FORM + RIGHT SIDEBAR ── */}
      <section className="relative py-20" id="contact-form" ref={formSectionRef}>
        {/* Background accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 20% 50%, hsl(217 91% 60% / 0.05) 0%, transparent 70%)",
          }}
        />

        <div className="container px-4 relative z-10">
          <div className="grid lg:grid-cols-[1fr_360px] gap-10 xl:gap-14 items-start">

            {/* ── CONTACT FORM ── */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              animate={formInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 md:p-10 overflow-hidden"
            >
              {/* Corner glow */}
              <div
                className="absolute -top-32 -left-32 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(217 91% 60% / 0.09) 0%, transparent 70%)" }}
              />
              <div
                className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(258 90% 66% / 0.07) 0%, transparent 70%)" }}
              />

              <AnimatePresence mode="wait">
                {/* ── SUCCESS STATE ── */}
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.4 }}
                    className="relative z-10 flex flex-col items-center justify-center py-24 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.15 }}
                      className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                      style={{
                        background: "linear-gradient(135deg, hsl(142 76% 36% / 0.25), hsl(142 76% 36% / 0.08))",
                        border: "1.5px solid hsl(142 76% 36% / 0.4)",
                        boxShadow: "0 0 60px -10px hsl(142 76% 36% / 0.3)",
                      }}
                    >
                      <Check className="h-12 w-12 text-emerald-400" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <h3 className="text-3xl font-bold text-white mb-3">Message sent!</h3>
                      <p className="text-white/45 max-w-sm mx-auto leading-relaxed mb-8">
                        Thanks for reaching out. We&apos;ll reply to your email address — usually
                        within 24 hours, often sooner.
                      </p>
                      <motion.button
                        onClick={resetForm}
                        className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white/55 hover:text-white hover:border-white/25 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Send another message
                      </motion.button>
                    </motion.div>
                  </motion.div>
                ) : (

                  /* ── THE FORM ── */
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSubmit(onSubmit)}
                    className="relative z-10 space-y-7"
                    noValidate
                  >
                    {/* Header */}
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-1.5">
                        Send us a message
                      </h2>
                      <p className="text-sm text-white/38">
                        Fill in the form below and we&apos;ll get back to you promptly.
                      </p>
                    </div>

                    {/* ── Category picker ── */}
                    <fieldset>
                      <legend className="block text-[11px] font-bold uppercase tracking-[0.17em] text-white/35 mb-3">
                        Inquiry type <span className="text-red-400">*</span>
                      </legend>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CATEGORIES.map((cat) => (
                          <motion.button
                            key={cat.value}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              setSelectedCategory(cat.value);
                              setValue("category", cat.value, { shouldValidate: true });
                            }}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[11px] font-semibold transition-all duration-180",
                              selectedCategory === cat.value
                                ? "border-blue-500/50 bg-blue-500/12 text-blue-300"
                                : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/15 hover:bg-white/[0.04] hover:text-white/65",
                            )}
                          >
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </motion.button>
                        ))}
                      </div>
                      <input type="hidden" {...register("category")} />
                      {errors.category && (
                        <p className="flex items-center gap-1 text-xs text-red-400 mt-2">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors.category.message}
                        </p>
                      )}
                    </fieldset>

                    {/* ── Name + Email ── */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.17em] text-white/35 mb-2">
                          Full name <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("name")}
                          autoComplete="name"
                          placeholder="Jane Smith"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white/[0.04] text-sm text-white placeholder:text-white/18 transition-all duration-200 focus:outline-none focus:bg-white/[0.07]",
                            errors.name
                              ? "border-red-500/50 focus:border-red-500/60"
                              : "border-white/[0.09] focus:border-blue-500/50",
                          )}
                        />
                        {errors.name && (
                          <p className="text-[11px] text-red-400 mt-1.5">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.17em] text-white/35 mb-2">
                          Email address <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("email")}
                          type="email"
                          autoComplete="email"
                          placeholder="jane@company.com"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white/[0.04] text-sm text-white placeholder:text-white/18 transition-all duration-200 focus:outline-none focus:bg-white/[0.07]",
                            errors.email
                              ? "border-red-500/50 focus:border-red-500/60"
                              : "border-white/[0.09] focus:border-blue-500/50",
                          )}
                        />
                        {errors.email && (
                          <p className="text-[11px] text-red-400 mt-1.5">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Company + Subject ── */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.17em] text-white/35 mb-2">
                          Company{" "}
                          <span className="normal-case font-normal text-white/18">(optional)</span>
                        </label>
                        <input
                          {...register("company")}
                          autoComplete="organization"
                          placeholder="Acme Corp"
                          className="w-full h-11 px-4 rounded-xl border border-white/[0.09] bg-white/[0.04] text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.17em] text-white/35 mb-2">
                          Subject <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("subject")}
                          placeholder="How can we help?"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white/[0.04] text-sm text-white placeholder:text-white/18 transition-all duration-200 focus:outline-none focus:bg-white/[0.07]",
                            errors.subject
                              ? "border-red-500/50 focus:border-red-500/60"
                              : "border-white/[0.09] focus:border-blue-500/50",
                          )}
                        />
                        {errors.subject && (
                          <p className="text-[11px] text-red-400 mt-1.5">{errors.subject.message}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Message ── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[11px] font-bold uppercase tracking-[0.17em] text-white/35">
                          Message <span className="text-red-400">*</span>
                        </label>
                        <span
                          className={cn(
                            "text-[11px] font-mono transition-colors",
                            charCount > 1800
                              ? "text-red-400"
                              : charCount > 1400
                              ? "text-amber-400"
                              : "text-white/20",
                          )}
                        >
                          {charCount} / 2000
                        </span>
                      </div>
                      <textarea
                        {...register("message", {
                          onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setCharCount(e.target.value.length),
                        })}
                        rows={6}
                        placeholder="Describe your project, question, or how we can help. The more detail you share, the faster we can respond."
                        className={cn(
                          "w-full px-4 py-3.5 rounded-xl border bg-white/[0.04] text-sm text-white placeholder:text-white/18 transition-all duration-200 focus:outline-none focus:bg-white/[0.07] resize-none leading-relaxed",
                          errors.message
                            ? "border-red-500/50 focus:border-red-500/60"
                            : "border-white/[0.09] focus:border-blue-500/50",
                        )}
                      />
                      {errors.message && (
                        <p className="text-[11px] text-red-400 mt-1.5">{errors.message.message}</p>
                      )}
                    </div>

                    {/* ── Priority ── */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-white/35 mb-3">
                        Priority
                      </p>
                      <div className="flex gap-2.5">
                        {(["low", "medium", "high"] as const).map((p) => {
                          const meta = {
                            low:    { dot: "bg-emerald-400", active: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300", idle: "hover:border-emerald-500/25 hover:text-emerald-400/70" },
                            medium: { dot: "bg-amber-400",   active: "border-amber-500/50 bg-amber-500/10 text-amber-300",   idle: "hover:border-amber-500/25 hover:text-amber-400/70"   },
                            high:   { dot: "bg-red-400",     active: "border-red-500/50 bg-red-500/10 text-red-300",         idle: "hover:border-red-500/25 hover:text-red-400/70"         },
                          }[p];

                          return (
                            <motion.button
                              key={p}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setPriority(p);
                                setValue("priority", p);
                              }}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-all duration-180",
                                priority === p
                                  ? meta.active
                                  : cn("border-white/[0.07] text-white/30", meta.idle),
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Submit ── */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-13 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed select-none"
                      style={{
                        height: "52px",
                        background: "linear-gradient(135deg, hsl(222 89% 55%) 0%, hsl(258 90% 60%) 100%)",
                      }}
                      whileHover={{ scale: isSubmitting ? 1 : 1.015, boxShadow: isSubmitting ? undefined : "0 8px 36px -8px hsl(217 91% 60% / 0.55)" }}
                      whileTap={{ scale: isSubmitting ? 1 : 0.985 }}
                    >
                      {isSubmitting ? (
                        <>
                          <motion.span
                            className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                          />
                          Sending your message…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Message
                          <ArrowRight className="h-3.5 w-3.5 opacity-65" />
                        </>
                      )}
                    </motion.button>

                    <p className="text-center text-[11px] text-white/20">
                      By submitting this form you agree to our{" "}
                      <Link href="#" className="underline underline-offset-2 hover:text-white/40 transition-colors">
                        Privacy Policy
                      </Link>
                      . We never sell or share your data.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── RIGHT SIDEBAR ── */}
            <motion.aside
              initial={{ opacity: 0, x: 32 }}
              animate={formInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-5 lg:sticky lg:top-24"
            >
              {/* ── Community & social ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25 mb-5">
                  Community &amp; Social
                </p>
                <div className="space-y-2.5">
                  {SOCIAL_LINKS.map((s) => (
                    <motion.div key={s.label} whileHover={{ x: 3 }} transition={{ duration: 0.18 }}>
                      <Link
                        href={s.href}
                        target={s.href.startsWith("http") ? "_blank" : undefined}
                        rel={s.href.startsWith("http") ? "noreferrer" : undefined}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] transition-all duration-200 group",
                          s.hoverCls,
                        )}
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0 group-hover:bg-white/[0.07] transition-colors">
                          <s.icon className="h-4 w-4 text-white/45 group-hover:text-inherit transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold text-white/75 group-hover:text-inherit transition-colors truncate">
                              {s.label}
                            </span>
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/[0.09] text-white/25 tracking-wider uppercase">
                              {s.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/30 truncate">{s.description}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-white/18 group-hover:text-inherit/40 shrink-0 transition-colors" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── Response times ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
                  Response times
                </p>
                <div className="space-y-3.5">
                  {RESPONSE_ROWS.map(({ label, time, dotCls }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 animate-pulse", dotCls)} />
                        <span className="text-sm text-white/45 truncate">{label}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-white/28 shrink-0">{time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Company info ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <HexMark size={32} />
                  <span className="text-sm font-bold text-white/80">LLMAtlas</span>
                </div>

                <div className="space-y-4 text-sm">
                  {[
                    {
                      icon: Globe,
                      iconCls: "text-sky-400",
                      title: "Remote-first, global team",
                      sub: "Distributed across US · EU · APAC",
                    },
                    {
                      icon: Clock,
                      iconCls: "text-amber-400",
                      title: "Support hours",
                      sub: "Mon – Fri · 9 am – 6 pm UTC",
                    },
                    {
                      icon: Phone,
                      iconCls: "text-violet-400",
                      title: "Enterprise hotline",
                      sub: "Available to paid plan customers",
                    },
                    {
                      icon: Shield,
                      iconCls: "text-emerald-400",
                      title: "Security disclosures",
                      sub: "security@llmatlas.com",
                      mono: true,
                    },
                    {
                      icon: Star,
                      iconCls: "text-pink-400",
                      title: "Open source · MIT",
                      sub: "PRs, issues & forks welcome",
                    },
                  ].map(({ icon: Icon, iconCls, title, sub, mono }) => (
                    <div key={title} className="flex items-start gap-3">
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconCls)} />
                      <div>
                        <p className="text-white/65 font-medium">{title}</p>
                        <p className={cn("text-xs text-white/30 mt-0.5", mono && "font-mono")}>{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Quick links ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25 mb-4">
                  Quick links
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: "Documentation",    href: "#"            },
                    { label: "API Reference",    href: "#"            },
                    { label: "Status Page",      href: "/status"      },
                    { label: "Source on GitHub", href: "https://github.com", ext: true },
                    { label: "Roadmap",          href: "#"            },
                    { label: "Changelog",        href: "#"            },
                  ].map(({ label, href, ext }) => (
                    <Link
                      key={label}
                      href={href}
                      target={ext ? "_blank" : undefined}
                      rel={ext ? "noreferrer" : undefined}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg text-sm text-white/40 hover:text-white/75 hover:bg-white/[0.04] transition-all duration-150 group"
                    >
                      <span>{label}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── FAQ ── */}
      <section className="relative py-20">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 60%, hsl(258 90% 66% / 0.07) 0%, transparent 70%)",
          }}
        />
        <div className="container px-4 max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-center mb-12"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/25 mb-3">
              FAQ
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-white/38 text-sm leading-relaxed">
              Still have questions?{" "}
              <a
                href="#contact-form"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
              >
                Send us a message
              </a>{" "}
              and we&apos;ll get back to you.
            </p>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── BOTTOM CTA ── */}
      <section className="relative py-16 pb-24">
        <div className="container px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65 }}
            className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 md:p-16 overflow-hidden text-center"
          >
            {/* CTA background gradients */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 110%, hsl(217 91% 60% / 0.12) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.7) 30%, hsl(258 90% 66% / 0.7) 70%, transparent)",
              }}
            />

            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 mb-5"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                  Free forever · Open source
                </span>
              </motion.div>

              <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-5 leading-tight">
                Ready to explore the LLM ecosystem?
              </h2>

              <p className="text-white/40 mb-10 max-w-xl mx-auto leading-relaxed">
                Join thousands of developers building with LLMAtlas — 195+ models, 13 providers,
                MIT licensed, no vendor lock-in, free forever.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/playground"
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white"
                    style={{
                      background: "linear-gradient(135deg, hsl(222 89% 55%), hsl(258 90% 60%))",
                      boxShadow: "0 4px 24px -4px hsl(217 91% 60% / 0.4)",
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    Start for free
                    <ArrowRight className="h-3.5 w-3.5 opacity-65" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white/65 border border-white/[0.12] hover:border-white/25 hover:text-white/85 transition-all duration-200"
                  >
                    <Github className="h-4 w-4" />
                    View on GitHub
                  </Link>
                </motion.div>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
                {[
                  { icon: Shield,    text: "MIT Licensed"           },
                  { icon: Globe,     text: "12+ AI Providers"       },
                  { icon: Users,     text: "2,000+ Community members" },
                  { icon: Star,      text: "No vendor lock-in"      },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-white/25">
                    <Icon className="h-3.5 w-3.5" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
