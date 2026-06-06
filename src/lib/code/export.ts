"use client";

import type { Workspace } from "@/lib/store";

export async function exportWorkspaceAsZip(ws: Workspace): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const file of ws.files) {
    zip.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(ws.name)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "workspace";
}
