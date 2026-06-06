"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import { MotionConfig } from "framer-motion";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {/* reducedMotion="user" makes every Framer Motion component honour the
          OS "reduce motion" setting automatically — transforms/opacity are
          stilled for users who ask for it, complementing the CSS rule in
          globals.css for non-Framer animations. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
