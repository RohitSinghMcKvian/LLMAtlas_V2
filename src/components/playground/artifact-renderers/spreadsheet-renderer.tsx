"use client";

// Spreadsheet renderer — accepts CSV or a JSON shape { name, columns, rows }
// (or an array of arrays). Renders an editable HOT-style grid + Export XLSX/CSV.
// Uses SheetJS (xlsx) for real .xlsx export.

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

interface Props {
  content: string;
  reloadKey?: number;
}

interface Sheet {
  name: string;
  columns: string[];
  rows: (string | number)[][];
}

function parseCsv(text: string): Sheet {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { name: "Sheet1", columns: [], rows: [] };
  const splitLine = (l: string): string[] => {
    // Simple CSV: comma or tab, with optional double-quoted cells.
    const out: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (inQ) {
        if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === "," || c === "\t") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const cols = splitLine(lines[0]);
  const rows = lines.slice(1).map((l) => splitLine(l));
  return { name: "Sheet1", columns: cols, rows };
}

function parseInput(content: string): Sheet {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const o = JSON.parse(trimmed);
      if (Array.isArray(o)) {
        // array of arrays or array of objects
        if (o.length === 0) return { name: "Sheet1", columns: [], rows: [] };
        if (Array.isArray(o[0])) {
          return { name: "Sheet1", columns: o[0].map(String), rows: o.slice(1) as (string | number)[][] };
        }
        const cols = Array.from(new Set(o.flatMap((r) => Object.keys(r as Record<string, unknown>))));
        const rows = (o as Array<Record<string, unknown>>).map((r) => cols.map((c) => {
          const v = r[c];
          return v == null ? "" : typeof v === "number" ? v : String(v);
        }));
        return { name: "Sheet1", columns: cols, rows };
      }
      if (o.columns && o.rows) return { name: o.name ?? "Sheet1", columns: o.columns as string[], rows: o.rows as (string | number)[][] };
    } catch { /* fall through */ }
  }
  return parseCsv(trimmed);
}

export function SpreadsheetRenderer({ content, reloadKey: _ }: Props) {
  const initial = useMemo(() => parseInput(content), [content]);
  const [sheet, setSheet] = useState<Sheet>(initial);
  const [xlsx, setXlsx] = useState<any>(null);

  useEffect(() => { setSheet(initial); }, [initial]);

  // Lazy-load SheetJS only when the user actually exports.
  const ensureXlsx = async () => {
    if (xlsx) return xlsx;
    // CDN URL import — TS can't resolve, so vary the specifier through a variable
    // to keep the dynamic import opaque to type-checking while preserving the
    // /* webpackIgnore */ hint at runtime.
    const sheetjsCdn = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
    const mod = await import(/* webpackIgnore: true */ /* @vite-ignore */ sheetjsCdn);
    setXlsx(mod);
    return mod;
  };

  const aoa = useMemo(() => [sheet.columns, ...sheet.rows], [sheet]);

  const exportXlsx = async () => {
    const X = await ensureXlsx();
    const wb = X.utils.book_new();
    const ws = X.utils.aoa_to_sheet(aoa);
    X.utils.book_append_sheet(wb, ws, sheet.name);
    X.writeFile(wb, `${sheet.name || "sheet"}.xlsx`);
  };
  const exportCsv = () => {
    const csv = aoa.map((r) => r.map((cell) => {
      const s = String(cell ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${sheet.name || "sheet"}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const editCell = (r: number, c: number, v: string) => {
    setSheet((prev) => {
      const next = { ...prev, rows: prev.rows.map((row, i) => i === r ? row.map((cell, j) => j === c ? v : cell) : row) };
      return next;
    });
  };
  const editColumn = (c: number, v: string) => {
    setSheet((prev) => ({ ...prev, columns: prev.columns.map((col, j) => j === c ? v : col) }));
  };
  const addRow = () => setSheet((prev) => ({ ...prev, rows: [...prev.rows, prev.columns.map(() => "")] }));
  const addColumn = () => setSheet((prev) => ({
    ...prev,
    columns: [...prev.columns, `Col${prev.columns.length + 1}`],
    rows: prev.rows.map((r) => [...r, ""]),
  }));

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        <input
          value={sheet.name}
          onChange={(e) => setSheet((p) => ({ ...p, name: e.target.value }))}
          className="text-sm font-semibold bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-0.5 min-w-[120px]"
        />
        <span className="text-[11px] text-muted-foreground">
          {sheet.rows.length} × {sheet.columns.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={addRow} className="h-7 px-2 rounded-md text-[11px] border bg-card hover:bg-accent" title="Add row">+ Row</button>
          <button onClick={addColumn} className="h-7 px-2 rounded-md text-[11px] border bg-card hover:bg-accent" title="Add column">+ Col</button>
          <button onClick={exportCsv} className="h-7 px-2 rounded-md text-[11px] border bg-card hover:bg-accent inline-flex items-center gap-1">
            <Download className="h-3 w-3" /> CSV
          </button>
          <button onClick={exportXlsx} className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1">
            <Download className="h-3 w-3" /> XLSX
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="text-sm border-collapse w-max">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr>
              <th className="border border-border bg-muted text-[10px] text-muted-foreground font-mono w-10 h-7 text-center">#</th>
              {sheet.columns.map((c, j) => (
                <th key={j} className="border border-border bg-muted/60 font-semibold text-foreground p-0 min-w-[140px]">
                  <input
                    value={c}
                    onChange={(e) => editColumn(j, e.target.value)}
                    className="w-full h-7 px-2 bg-transparent border-0 focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, r) => (
              <tr key={r} className="hover:bg-accent/30">
                <td className="border border-border bg-muted/40 text-[10px] text-muted-foreground font-mono text-center w-10">{r + 1}</td>
                {sheet.columns.map((_, c) => {
                  const v = row[c] ?? "";
                  return (
                    <td key={c} className="border border-border p-0">
                      <input
                        value={String(v)}
                        onChange={(e) => editCell(r, c, e.target.value)}
                        className="w-full h-7 px-2 bg-transparent border-0 focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/30 text-sm tabular-nums"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
