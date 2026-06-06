// Centralized feature flag accessor. Reads NEXT_PUBLIC_FEATURE_* env vars
// inlined at build time. Defaults flip individual phases on/off per environment.

type Flag =
  | "artifacts"
  | "attachments"
  | "projects"
  | "history"
  | "branching"
  | "code_workspace"
  | "webcontainer"
  | "pyodide"
  | "github_push"
  | "share_links"
  | "command_palette"
  | "usage_telemetry";

const DEFAULTS: Record<Flag, boolean> = {
  artifacts: true,
  attachments: true,
  projects: true,
  history: true,
  branching: true,
  code_workspace: true,
  webcontainer: true,
  pyodide: true,
  github_push: true,
  share_links: true,
  command_palette: true,
  usage_telemetry: true,
};

function envValue(flag: Flag): boolean | undefined {
  // NEXT_PUBLIC_FEATURE_ARTIFACTS=0 disables, =1 enables.
  // Next inlines these constants, so the conditional reads work at build time too.
  const key = "NEXT_PUBLIC_FEATURE_" + flag.toUpperCase();
  // Dynamic (computed-key) access can't be statically inlined by Next, so
  // `process` is undefined in the browser bundle — guard it to avoid a
  // ReferenceError client-side and fall back to DEFAULTS there.
  const all = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const v = all[key];
  if (v === undefined) return undefined;
  if (v === "0" || v.toLowerCase() === "false" || v === "") return false;
  return true;
}

export function isEnabled(flag: Flag): boolean {
  const ev = envValue(flag);
  return ev ?? DEFAULTS[flag];
}

export type { Flag };
