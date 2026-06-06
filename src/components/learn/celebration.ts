"use client";

import confetti from "canvas-confetti";

/** Fire a celebration burst tinted with the level color. */
export function fireCelebration(color: string) {
  const colors = [color, "#FFFFFF", color + "AA"];
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999, colors };

  function shoot() {
    confetti({ ...defaults, particleCount: 80, origin: { x: 0.2, y: 0.6 } });
    confetti({ ...defaults, particleCount: 80, origin: { x: 0.8, y: 0.6 } });
    confetti({ ...defaults, particleCount: 100, origin: { x: 0.5, y: 0.4 } });
  }
  shoot();
  setTimeout(shoot, 250);
  setTimeout(shoot, 500);
}

/** Master cert: bigger, gold-themed celebration. */
export function fireMasterCelebration() {
  const colors = ["#D4AF37", "#FFD700", "#FFFFFF"];
  const defaults = { startVelocity: 35, spread: 360, ticks: 80, zIndex: 999, colors };

  function shoot() {
    confetti({ ...defaults, particleCount: 120, origin: { x: 0.15, y: 0.65 } });
    confetti({ ...defaults, particleCount: 120, origin: { x: 0.85, y: 0.65 } });
    confetti({ ...defaults, particleCount: 160, origin: { x: 0.5, y: 0.3 } });
  }
  shoot();
  setTimeout(shoot, 300);
  setTimeout(shoot, 600);
  setTimeout(shoot, 900);
}
