import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
/* Geist Sans body font via @fontsource */
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: {
    default: "LLMAtlas — The Open Ecosystem Workspace for LLMs",
    template: "%s · LLMAtlas",
  },
  description:
    "Learn, research, and build with 195+ LLMs in one workspace. 13 providers, free tier included — no credit card required.",
  keywords: [
    "LLM", "AI", "LLM workspace", "free LLM", "AI playground", "model comparison",
    "Llama 4", "DeepSeek", "Gemini 2.5", "Groq", "NVIDIA", "Mistral", "OpenRouter",
    "compare models", "Qwen", "Grok", "xAI", "Together AI", "Cerebras", "Hugging Face",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "LLMAtlas — Power LLMs",
    description: "195+ models. 13 providers. One workspace. Free, open-source.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* General Sans display font — Fontshare CDN */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        {/* refetchOnWindowFocus disabled: avoids next-auth re-fetching /api/auth/session every
            time focus returns (e.g. from an artifact iframe), whose interrupted requests surface
            as a transient "ClientFetchError: Failed to fetch" in the dev error overlay. */}
        <SessionProvider refetchOnWindowFocus={false}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {children}
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
