"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Code2, Search, GraduationCap, Briefcase, ArrowRight, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const USE_CASES = [
  { id: "developer", label: "Developer", icon: Code2, desc: "Building AI-powered apps" },
  { id: "researcher", label: "Researcher", icon: Search, desc: "Studying LLMs & AI" },
  { id: "student", label: "Student", icon: GraduationCap, desc: "Learning AI concepts" },
  { id: "professional", label: "Professional", icon: Briefcase, desc: "Using AI at work" },
]

const SKILL_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "New to LLMs and AI" },
  { id: "intermediate", label: "Intermediate", desc: "Familiar with basic concepts" },
  { id: "expert", label: "Expert", desc: "Deep technical knowledge" },
]

export function OnboardingModal() {
  const { data: session, update } = useSession()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [useCase, setUseCase] = useState("")
  const [skillLevel, setSkillLevel] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    // Check if onboarding completed
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.onboardingCompleted) {
          setTimeout(() => setOpen(true), 1000)
        }
      })
      .catch(() => {})
  }, [session])

  const complete = async () => {
    setIsSaving(true)
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true, useCase, skillLevel }),
      })
      setOpen(false)
      toast.success("Welcome to LLMAtlas!")
    } catch {
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (!session?.user) return null

  const firstName = session.user.name?.split(" ")[0] || "there"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-white/10 bg-[hsl(222,47%,8%)]">
        {/* Accessible title/description (visually hidden — design uses custom headings) */}
        <DialogTitle className="sr-only">Personalize your LLMAtlas experience</DialogTitle>
        <DialogDescription className="sr-only">A quick three-step setup to tailor LLMAtlas to how you work.</DialogDescription>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`rounded-full transition-all duration-300 ${i === step ? "w-6 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-white/10"}`}
            />
          ))}
        </div>

        <div className="p-8 pt-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Welcome, {firstName}!</h2>
                  <p className="text-muted-foreground text-sm">Let&apos;s personalize your LLMAtlas experience. It takes 30 seconds.</p>
                </div>

                <Button
                  onClick={() => setStep(1)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 gap-2"
                >
                  Get started <ArrowRight className="w-4 h-4" />
                </Button>
                <button onClick={complete} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Skip for now
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold">What brings you here?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Helps us show you the most relevant features</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {USE_CASES.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setUseCase(item.id)}
                        className={`relative p-4 rounded-xl border text-left transition-all ${
                          useCase === item.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/8"
                        }`}
                      >
                        {useCase === item.id && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <Icon className="w-5 h-5 mb-2 text-primary" />
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!useCase}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold">Your experience level?</h2>
                  <p className="text-muted-foreground text-sm mt-1">With LLMs and AI in general</p>
                </div>

                <div className="space-y-2">
                  {SKILL_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setSkillLevel(level.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                        skillLevel === level.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{level.label}</p>
                        <p className="text-xs text-muted-foreground">{level.desc}</p>
                      </div>
                      {skillLevel === level.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button
                    onClick={complete}
                    disabled={!skillLevel || isSaving}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Let&apos;s go!
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
