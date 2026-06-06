"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Code2, BookOpen, BarChart2, FlaskConical, Pen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all",      label: "All",     icon: Sparkles,  color: "text-amber-500"   },
  { id: "code",     label: "Code",    icon: Code2,     color: "text-blue-500"    },
  { id: "learn",    label: "Learn",   icon: BookOpen,  color: "text-violet-500"  },
  { id: "analyze",  label: "Analyze", icon: BarChart2, color: "text-emerald-500" },
  { id: "creative", label: "Creative",icon: Pen,       color: "text-rose-500"    },
];

const PROMPTS = [
  { id: "1",  category: "code",     text: "Write a Python script to scrape news headlines and save to CSV",         icon: "🐍" },
  { id: "2",  category: "code",     text: "Create a responsive React card component with dark mode support",        icon: "⚛️" },
  { id: "3",  category: "code",     text: "Build a SQL query to find the top 10 customers by revenue last quarter", icon: "🗄️" },
  { id: "4",  category: "code",     text: "Write a regex to extract all emails from a block of text",              icon: "🔍" },
  { id: "5",  category: "learn",    text: "Explain transformer attention mechanisms like I'm a software engineer",  icon: "🧠" },
  { id: "6",  category: "learn",    text: "What's the difference between RAG and fine-tuning? When to use each?",  icon: "📚" },
  { id: "7",  category: "learn",    text: "Explain quantum computing to a high schooler with analogies",            icon: "⚛️" },
  { id: "8",  category: "learn",    text: "What is prompt engineering and what are the best techniques?",           icon: "💡" },
  { id: "9",  category: "analyze",  text: "Summarize the pros and cons of microservices vs monolithic architecture",icon: "📊" },
  { id: "10", category: "analyze",  text: "Design a database schema for a multi-tenant SaaS product",              icon: "🏗️" },
  { id: "11", category: "analyze",  text: "Compare GPT-4, Claude 3.5, and Gemini 2.5 on reasoning tasks",          icon: "⚖️" },
  { id: "12", category: "analyze",  text: "Analyze the Stripe pricing model and summarize for a startup",          icon: "💳" },
  { id: "13", category: "creative", text: "Write a compelling product launch email for a developer tool",           icon: "✉️" },
  { id: "14", category: "creative", text: "Create a technical blog post outline about LLM fine-tuning",            icon: "📝" },
  { id: "15", category: "creative", text: "Write a short story that explains recursion using a fairy tale",         icon: "🧚" },
  { id: "16", category: "creative", text: "Brainstorm 10 SaaS product ideas for developers in 2025",               icon: "🚀" },
];

/* ── variants ─────────────────────────────────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const cardGrid = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.35, ease: "easeOut" } },
};

interface Props {
  modelName: string;
  providerName: string;
  onPrompt: (p: string) => void;
}

export function EnhancedEmptyState({ modelName, providerName, onPrompt }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered  = activeCategory === "all" ? PROMPTS : PROMPTS.filter((p) => p.category === activeCategory);
  const displayed = filtered.slice(0, 6);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 select-none"
    >
      {/* Floating icon */}
      <motion.div variants={fadeUp} className="relative mb-6">
        <motion.div
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-primary/20 to-violet-500/20 flex items-center justify-center border border-primary/10 shadow-lg shadow-primary/5"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
          >
            <Sparkles className="h-10 w-10 text-amber-500" />
          </motion.div>
        </motion.div>

        {/* Badge */}
        <motion.div
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm border-2 border-background"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <FlaskConical className="h-3 w-3 text-white" />
        </motion.div>
      </motion.div>

      {/* Heading */}
      <motion.h2 variants={fadeUp} className="text-2xl font-bold mb-1 tracking-tight">
        Start a conversation
      </motion.h2>
      <motion.p variants={fadeUp} className="text-muted-foreground text-sm mb-2 text-center max-w-sm leading-relaxed">
        Chatting with{" "}
        <span className="font-semibold text-foreground">{modelName || "the model"}</span>
        {providerName && (
          <> via <span className="font-medium text-foreground">{providerName}</span></>
        )}
      </motion.p>
      <motion.p variants={fadeUp} className="text-xs text-muted-foreground/60 mb-8">
        Free tier · No credit card required
      </motion.p>

      {/* Category pills */}
      <motion.div variants={fadeUp} className="flex items-center gap-1.5 mb-4 flex-wrap justify-center">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <cat.icon
                className={cn("h-3 w-3", active ? "text-primary-foreground" : cat.color)}
              />
              {cat.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Prompt cards — AnimatePresence so cards swap on category change */}
      <div className="max-w-3xl w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            variants={cardGrid}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
          >
            {displayed.map((p) => (
              <motion.button
                key={p.id}
                variants={cardItem}
                whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onPrompt(p.text)}
                className={cn(
                  "text-left p-4 rounded-xl border bg-card",
                  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                  "hover:bg-accent/50 transition-colors group",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">{p.icon}</span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed line-clamp-2">
                    {p.text}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.p variants={fadeUp} className="mt-8 text-xs text-muted-foreground/40">
        Press{" "}
        <kbd className="px-1 py-0.5 rounded border border-border/60 bg-muted text-[10px] font-mono">?</kbd>{" "}
        for keyboard shortcuts
      </motion.p>
    </motion.div>
  );
}
