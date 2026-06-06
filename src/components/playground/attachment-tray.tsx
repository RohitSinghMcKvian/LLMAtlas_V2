"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip, X, FileText, FileImage, FileCode2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { fileToAttachment, SUPPORTED_MIME } from "@/lib/attachments";
import type { Attachment } from "@/lib/store";

interface Props {
  attachments: Attachment[];
  onAdd: (a: Attachment) => void;
  onRemove: (id: string) => void;
  /** Disable adds (e.g. while busy). */
  disabled?: boolean;
}

export function AttachmentTray({ attachments, onAdd, onRemove, disabled }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(0);

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        setPending((n) => n + 1);
        try {
          const att = await fileToAttachment(file);
          onAdd(att);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't attach file");
        } finally {
          setPending((n) => n - 1);
        }
      }
    },
    [onAdd],
  );

  const onPick = () => fileInput.current?.click();

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
      }}
      className={dragOver ? "ring-2 ring-primary/40 rounded-md" : ""}
    >
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={SUPPORTED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void ingest(e.target.files);
          e.target.value = "";
        }}
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 border-b">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} att={a} onRemove={() => onRemove(a.id)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onPick}
          disabled={disabled || pending > 0}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent disabled:opacity-50"
          title="Attach files — also: drag & drop, paste image"
        >
          {pending > 0 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          <span>Attach</span>
        </button>
      </div>
    </div>
  );
}

function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  const Icon = att.kind === "image" ? FileImage : att.kind === "code" ? FileCode2 : FileText;
  return (
    <div className="group relative inline-flex items-center gap-1.5 max-w-[200px] px-2 py-1 rounded-md border bg-card text-xs">
      {att.kind === "image" ? (
        <img src={att.data} alt={att.name} className="h-6 w-6 rounded object-cover flex-shrink-0" />
      ) : (
        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{att.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="opacity-50 hover:opacity-100 hover:text-red-500"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
