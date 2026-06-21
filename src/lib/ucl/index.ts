// Ultra-Capability Layer — public entry. Every surface imports from here.

export type { Capability, CapabilityId } from "./capabilities";
export {
  CAPABILITIES,
  findCapability,
  autoPickCapability,
  composeCapabilityPrimers,
} from "./capabilities";

export type { UltraMode, UltraModeInfo } from "./modes";
export {
  ULTRA_MODES,
  clampModeForSurface,
  modePrimer,
} from "./modes";

export type { ComposeSystemPromptArgs } from "./system-prompts";
export {
  UCL_BASE_PRIMER,
  composeSystemPrompt,
} from "./system-prompts";

export type { UltraPhase, UltraThinkArgs, UltraThinkResult } from "./ultra-think";
export { runUltraThink } from "./ultra-think";
